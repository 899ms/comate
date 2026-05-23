import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import type {
  CapabilityDependency,
  CapabilityIssue,
  CapabilityKind,
  CapabilityRecord,
  CapabilityScanResult,
  CapabilitySource,
  CapabilityStatus,
  CapabilitySummary
} from "../../shared/types.js";

const execFileAsync = promisify(execFile);

const EMPTY_COUNTS_BY_KIND: Record<CapabilityKind, number> = {
  automation: 0,
  command: 0,
  mcp: 0,
  plugin: 0,
  skill: 0
};

const EMPTY_COUNTS_BY_SOURCE: Record<CapabilitySource, number> = {
  plugin: 0,
  project: 0,
  runtime: 0,
  system: 0,
  user: 0
};

const EMPTY_COUNTS_BY_STATUS: Record<CapabilityStatus, number> = {
  disabled: 0,
  enabled: 0,
  unknown: 0,
  warning: 0
};

const SKILL_DESCRIPTION_WARNING_LENGTH = 650;
const SKIPPED_DIRECTORIES = new Set([".git", "dist", "node_modules", "out", "output"]);

interface Frontmatter {
  description: string | null;
  name: string | null;
}

interface PluginManifest {
  description?: string;
  interface?: {
    category?: string;
    displayName?: string;
    shortDescription?: string;
  };
  name?: string;
  version?: string;
}

interface AutomationToml {
  executionEnvironment: string | null;
  id: string | null;
  kind: string | null;
  name: string | null;
  prompt: string | null;
  rrule: string | null;
  status: string | null;
}

export interface CodexCapabilityScannerOptions {
  codexRoot: string;
  projectRoot?: string;
  readMcpList?: () => Promise<string>;
}

export class CodexCapabilityScanner {
  private readonly codexRoot: string;
  private readonly projectRoot: string;
  private readonly readMcpList: () => Promise<string>;

  constructor(options: CodexCapabilityScannerOptions) {
    this.codexRoot = path.resolve(options.codexRoot);
    this.projectRoot = path.resolve(options.projectRoot ?? process.cwd());
    this.readMcpList = options.readMcpList ?? readCodexMcpList;
  }

  async scan(): Promise<CapabilityScanResult> {
    const scanIssues: CapabilityIssue[] = [];
    const pluginStates = await this.readPluginStates();
    const groups = await Promise.all([
      this.scanSkills(),
      this.scanPlugins(pluginStates),
      this.scanMcpServers(scanIssues),
      this.scanCommands(),
      this.scanAutomations()
    ]);
    const items = groups.flat().sort(compareCapabilities);

    markDuplicateCapabilities(items);

    return {
      items,
      issues: scanIssues,
      scannedAt: new Date().toISOString(),
      summary: summarizeCapabilities(items, scanIssues)
    };
  }

  private async scanSkills(): Promise<CapabilityRecord[]> {
    const skillFiles = await uniquePaths([
      ...(await findFiles(path.join(this.codexRoot, "skills"), (filePath) => path.basename(filePath) === "SKILL.md")),
      ...(await findFiles(path.join(this.codexRoot, "vendor_imports"), (filePath) => path.basename(filePath) === "SKILL.md")),
      ...(await findFiles(path.join(this.codexRoot, "plugins", "cache"), (filePath) => path.basename(filePath) === "SKILL.md"))
    ]);

    const records = await Promise.all(skillFiles.map((filePath) => this.readSkill(filePath)));
    return records.filter(Boolean) as CapabilityRecord[];
  }

  private async readSkill(filePath: string): Promise<CapabilityRecord | null> {
    const text = await readTextFile(filePath);
    if (text === null) {
      return null;
    }

    const frontmatter = parseSkillFrontmatter(text);
    const name = frontmatter.name ?? path.basename(path.dirname(filePath));
    const description = frontmatter.description ?? firstNonEmptyLineWithoutMarkdown(text);
    const source = getCapabilitySource(this.codexRoot, this.projectRoot, filePath);
    const dependencies = await this.readFolderDependencies(path.dirname(filePath), [
      ["agents", "Agents"],
      ["assets", "Assets"],
      ["references", "References"],
      ["scripts", "Scripts"]
    ]);
    const issues = getSkillIssues(frontmatter, description);
    const updatedAt = await readModifiedIso(filePath);

    return {
      id: stableCapabilityId("skill", source, filePath),
      name,
      kind: "skill",
      source,
      status: issues.some((issue) => issue.severity !== "info") ? "warning" : "enabled",
      description,
      path: filePath,
      origin: getOriginLabel(this.codexRoot, filePath),
      trigger: description,
      updatedAt,
      issues,
      dependencies,
      metadata: {
        folder: path.basename(path.dirname(filePath))
      }
    };
  }

  private async scanPlugins(pluginStates: Map<string, boolean>): Promise<CapabilityRecord[]> {
    const manifestFiles = await findFiles(
      path.join(this.codexRoot, "plugins", "cache"),
      (filePath) => path.basename(filePath) === "plugin.json" && path.basename(path.dirname(filePath)) === ".codex-plugin"
    );
    const records = await Promise.all(manifestFiles.map((filePath) => this.readPlugin(filePath, pluginStates)));
    return records.filter(Boolean) as CapabilityRecord[];
  }

  private async readPlugin(filePath: string, pluginStates: Map<string, boolean>): Promise<CapabilityRecord | null> {
    const manifest = await readJsonFile<PluginManifest>(filePath);
    if (!manifest?.name) {
      return null;
    }

    const pluginRoot = path.dirname(path.dirname(filePath));
    const marketplace = getPluginMarketplace(this.codexRoot, pluginRoot);
    const configuredId = marketplace ? `${manifest.name}@${marketplace}` : manifest.name;
    const configuredState = pluginStates.get(configuredId);
    const displayName = manifest.interface?.displayName ?? manifest.name;
    const description = manifest.interface?.shortDescription ?? manifest.description ?? null;
    const dependencies = await this.readPluginDependencies(pluginRoot);
    const issues: CapabilityIssue[] = [];

    if (configuredState === undefined) {
      issues.push({
        code: "plugin-state-unknown",
        message: "插件存在于本地缓存，但未在 config.toml 中发现启用状态。",
        severity: "info"
      });
    }

    return {
      id: stableCapabilityId("plugin", "plugin", pluginRoot),
      name: displayName,
      kind: "plugin",
      source: "plugin",
      status: configuredState === false ? "disabled" : configuredState === true ? "enabled" : "unknown",
      description,
      path: pluginRoot,
      origin: marketplace ? `${marketplace} plugin` : "Plugin cache",
      trigger: manifest.description ?? null,
      updatedAt: await readModifiedIso(filePath),
      issues,
      dependencies,
      metadata: {
        id: configuredId,
        version: manifest.version ?? "unknown",
        category: manifest.interface?.category ?? "unknown"
      }
    };
  }

  private async scanMcpServers(scanIssues: CapabilityIssue[]): Promise<CapabilityRecord[]> {
    let output = "";
    try {
      output = await this.readMcpList();
    } catch (error) {
      scanIssues.push({
        code: "mcp-list-failed",
        message: error instanceof Error ? error.message : "Unable to read MCP server list.",
        severity: "warning"
      });
      return [];
    }

    return parseMcpList(output).map((server) => ({
      id: stableCapabilityId("mcp", "runtime", server.name),
      name: server.name,
      kind: "mcp",
      source: "runtime",
      status: server.status === "enabled" ? "enabled" : server.status === "disabled" ? "disabled" : "unknown",
      description: server.command ? `${server.command}${server.args ? ` ${server.args}` : ""}` : null,
      path: server.cwd ?? null,
      origin: "codex mcp list",
      trigger: null,
      updatedAt: null,
      issues: server.status === "unknown" ? [{ code: "mcp-status-unknown", message: "MCP 状态无法识别。", severity: "info" }] : [],
      dependencies: server.cwd
        ? [
            {
              kind: "workspace",
              label: "Working directory",
              path: server.cwd,
              status: "available"
            }
          ]
        : [],
      metadata: {
        auth: server.auth ?? "unknown",
        command: server.command ?? "-",
        status: server.status
      }
    }));
  }

  private async scanCommands(): Promise<CapabilityRecord[]> {
    const commandFiles = await uniquePaths([
      ...(await findMarkdownFiles(path.join(this.codexRoot, "commands"))),
      ...(await findMarkdownFiles(path.join(this.projectRoot, ".codex", "commands"))),
      ...(await findFiles(path.join(this.codexRoot, "plugins", "cache"), (filePath) => {
        return path.extname(filePath).toLowerCase() === ".md" && path.basename(path.dirname(filePath)) === "commands";
      }))
    ]);

    const records = await Promise.all(commandFiles.map((filePath) => this.readCommand(filePath)));
    return records.filter(Boolean) as CapabilityRecord[];
  }

  private async readCommand(filePath: string): Promise<CapabilityRecord | null> {
    const text = await readTextFile(filePath);
    if (text === null) {
      return null;
    }

    const name = path.basename(filePath, path.extname(filePath));
    const source = getCapabilitySource(this.codexRoot, this.projectRoot, filePath);

    return {
      id: stableCapabilityId("command", source, filePath),
      name,
      kind: "command",
      source,
      status: "enabled",
      description: firstNonEmptyLineWithoutMarkdown(text),
      path: filePath,
      origin: getOriginLabel(this.codexRoot, filePath),
      trigger: `/${name}`,
      updatedAt: await readModifiedIso(filePath),
      issues: [],
      dependencies: [],
      metadata: {
        file: path.basename(filePath)
      }
    };
  }

  private async scanAutomations(): Promise<CapabilityRecord[]> {
    const automationFiles = await findFiles(
      path.join(this.codexRoot, "automations"),
      (filePath) => path.basename(filePath) === "automation.toml"
    );
    const records = await Promise.all(automationFiles.map((filePath) => this.readAutomation(filePath)));
    return records.filter(Boolean) as CapabilityRecord[];
  }

  private async readAutomation(filePath: string): Promise<CapabilityRecord | null> {
    const text = await readTextFile(filePath);
    if (text === null) {
      return null;
    }

    const automation = parseAutomationToml(text);
    const id = automation.id ?? path.basename(path.dirname(filePath));
    const status = automation.status?.toUpperCase() === "PAUSED" ? "disabled" : "enabled";
    const dependencies: CapabilityDependency[] = automation.executionEnvironment
      ? [
          {
            kind: "config",
            label: "Execution environment",
            status: "available"
          }
        ]
      : [];

    return {
      id: stableCapabilityId("automation", "user", filePath),
      name: automation.name ?? id,
      kind: "automation",
      source: "user",
      status,
      description: automation.prompt ? trimText(automation.prompt, 180) : null,
      path: filePath,
      origin: "Codex automation",
      trigger: automation.rrule,
      updatedAt: await readModifiedIso(filePath),
      issues: status === "disabled" ? [{ code: "automation-paused", message: "自动化当前为暂停状态。", severity: "info" }] : [],
      dependencies,
      metadata: {
        environment: automation.executionEnvironment ?? "unknown",
        kind: automation.kind ?? "unknown",
        status: automation.status ?? "unknown"
      }
    };
  }

  private async readPluginStates(): Promise<Map<string, boolean>> {
    const text = await readTextFile(path.join(this.codexRoot, "config.toml"));
    return text ? parsePluginStates(text) : new Map<string, boolean>();
  }

  private async readFolderDependencies(
    root: string,
    folders: Array<[CapabilityDependency["kind"], string]>
  ): Promise<CapabilityDependency[]> {
    const dependencies = await Promise.all(
      folders.map(async ([kind, label]) => {
        const folderPath = path.join(root, kind);
        const exists = await pathExists(folderPath);
        return {
          count: exists ? await countFiles(folderPath) : 0,
          kind,
          label,
          path: exists ? folderPath : undefined,
          status: exists ? "available" : "missing"
        } satisfies CapabilityDependency;
      })
    );

    return dependencies.filter((dependency) => dependency.status === "available");
  }

  private async readPluginDependencies(pluginRoot: string): Promise<CapabilityDependency[]> {
    const dependencies = await this.readFolderDependencies(pluginRoot, [
      ["skills", "Skills"],
      ["commands", "Commands"],
      ["assets", "Assets"]
    ]);

    for (const [fileName, kind, label] of [
      [".mcp.json", "mcp", "MCP config"],
      [".app.json", "app", "App connector"],
      ["agents/openai.yaml", "agents", "Agent config"]
    ] as const) {
      const filePath = path.join(pluginRoot, fileName);
      if (await pathExists(filePath)) {
        dependencies.push({ kind, label, path: filePath, status: "available" });
      }
    }

    return dependencies;
  }
}

async function readCodexMcpList(): Promise<string> {
  const { stdout } = await execFileAsync("codex", ["mcp", "list"], {
    timeout: 3_500,
    windowsHide: true
  });
  return stdout;
}

async function findMarkdownFiles(root: string): Promise<string[]> {
  return findFiles(root, (filePath) => path.extname(filePath).toLowerCase() === ".md");
}

async function findFiles(root: string, isMatch: (filePath: string) => boolean): Promise<string[]> {
  if (!(await pathExists(root))) {
    return [];
  }

  const matches: string[] = [];
  await walk(root, matches, isMatch);
  return matches;
}

async function walk(
  currentPath: string,
  matches: string[],
  isMatch: (filePath: string) => boolean
): Promise<void> {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) {
        await walk(entryPath, matches, isMatch);
      }
    } else if (entry.isFile() && isMatch(entryPath)) {
      matches.push(entryPath);
    }
  }
}

async function uniquePaths(paths: string[]): Promise<string[]> {
  return [...new Set(paths.map((filePath) => path.resolve(filePath)))];
}

async function readTextFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  const text = await readTextFile(filePath);
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function readModifiedIso(filePath: string): Promise<string | null> {
  try {
    const stat = await fs.stat(filePath);
    return stat.mtime.toISOString();
  } catch {
    return null;
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function countFiles(root: string): Promise<number> {
  if (!(await pathExists(root))) {
    return 0;
  }

  let count = 0;
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      count += await countFiles(entryPath);
    } else if (entry.isFile()) {
      count += 1;
    }
  }
  return count;
}

function parseSkillFrontmatter(text: string): Frontmatter {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return { description: null, name: null };
  }

  const fields = parseSimpleKeyValues(match[1] ?? "");
  return {
    description: fields.get("description") ?? null,
    name: fields.get("name") ?? null
  };
}

function parseAutomationToml(text: string): AutomationToml {
  const fields = parseSimpleKeyValues(text);
  return {
    executionEnvironment: fields.get("execution_environment") ?? null,
    id: fields.get("id") ?? null,
    kind: fields.get("kind") ?? null,
    name: fields.get("name") ?? null,
    prompt: fields.get("prompt") ?? null,
    rrule: fields.get("rrule") ?? null,
    status: fields.get("status") ?? null
  };
}

function parseSimpleKeyValues(text: string): Map<string, string> {
  const fields = new Map<string, string>();
  const lines = text.split(/\r?\n/);
  let pendingKey: string | null = null;
  let pendingValue: string[] = [];

  for (const line of lines) {
    if (pendingKey) {
      const endIndex = line.indexOf('"""');
      if (endIndex >= 0) {
        pendingValue.push(line.slice(0, endIndex));
        fields.set(pendingKey, pendingValue.join("\n"));
        pendingKey = null;
        pendingValue = [];
      } else {
        pendingValue.push(line);
      }
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_.-]+)\s*[:=]\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1]!;
    const rawValue = match[2]!.trim();
    if (rawValue.startsWith('"""')) {
      const afterStart = rawValue.slice(3);
      const endIndex = afterStart.indexOf('"""');
      if (endIndex >= 0) {
        fields.set(key, afterStart.slice(0, endIndex));
      } else {
        pendingKey = key;
        pendingValue = [afterStart];
      }
    } else {
      fields.set(key, stripQuotes(rawValue.replace(/\s+#.*$/, "")));
    }
  }

  return fields;
}

function parsePluginStates(text: string): Map<string, boolean> {
  const states = new Map<string, boolean>();
  const lines = text.split(/\r?\n/);
  let currentPlugin: string | null = null;

  for (const line of lines) {
    const section = line.match(/^\[plugins\."([^"]+)"\]$/);
    if (section) {
      currentPlugin = section[1]!;
      continue;
    }

    if (!line.startsWith("[") && currentPlugin) {
      const enabled = line.match(/^enabled\s*=\s*(true|false)\s*$/);
      if (enabled) {
        states.set(currentPlugin, enabled[1] === "true");
      }
    }
  }

  return states;
}

function parseMcpList(output: string): Array<{ args: string | null; auth: string | null; command: string | null; cwd: string | null; name: string; status: string }> {
  const rows: Array<{ args: string | null; auth: string | null; command: string | null; cwd: string | null; name: string; status: string }> = [];
  for (const line of output.split(/\r?\n/).slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const cells = trimmed.split(/\s{2,}/);
    if (cells.length < 2) {
      continue;
    }

    const name = cells[0]!;
    const statusIndex = cells.findIndex((cell) => cell === "enabled" || cell === "disabled");
    rows.push({
      args: valueOrNull(cells[2]),
      auth: statusIndex >= 0 ? valueOrNull(cells[statusIndex + 1]) : valueOrNull(cells.at(-1)),
      command: valueOrNull(cells[1]),
      cwd: statusIndex >= 1 ? valueOrNull(cells[statusIndex - 1]) : null,
      name,
      status: statusIndex >= 0 ? cells[statusIndex]! : "unknown"
    });
  }

  return rows;
}

function valueOrNull(value: string | undefined): string | null {
  return value && value !== "-" ? value : null;
}

function getSkillIssues(frontmatter: Frontmatter, description: string | null): CapabilityIssue[] {
  const issues: CapabilityIssue[] = [];
  if (!frontmatter.name) {
    issues.push({ code: "skill-name-missing", message: "SKILL.md frontmatter 缺少 name。", severity: "warning" });
  }
  if (!description) {
    issues.push({
      code: "skill-description-missing",
      message: "缺少 description，Codex 很难判断何时触发这个 skill。",
      severity: "warning"
    });
  } else if (description.length > SKILL_DESCRIPTION_WARNING_LENGTH) {
    issues.push({
      code: "skill-description-long",
      message: "description 偏长，skill 较多时更容易消耗上下文预算。",
      severity: "warning"
    });
  }

  return issues;
}

function markDuplicateCapabilities(items: CapabilityRecord[]): void {
  const buckets = new Map<string, CapabilityRecord[]>();
  for (const item of items) {
    const key = `${item.kind}:${item.name.toLowerCase()}`;
    buckets.set(key, [...(buckets.get(key) ?? []), item]);
  }

  for (const matches of buckets.values()) {
    if (matches.length < 2) {
      continue;
    }

    for (const item of matches) {
      item.issues.push({
        code: "duplicate-capability-name",
        message: `发现 ${matches.length} 个同名 ${item.kind}，可能造成查找或触发混淆。`,
        severity: "warning"
      });
      if (item.status === "enabled") {
        item.status = "warning";
      }
    }
  }
}

function summarizeCapabilities(items: CapabilityRecord[], scanIssues: CapabilityIssue[]): CapabilitySummary {
  const byKind = { ...EMPTY_COUNTS_BY_KIND };
  const bySource = { ...EMPTY_COUNTS_BY_SOURCE };
  const byStatus = { ...EMPTY_COUNTS_BY_STATUS };
  let itemIssueCount = 0;

  for (const item of items) {
    byKind[item.kind] += 1;
    bySource[item.source] += 1;
    byStatus[item.status] += 1;
    itemIssueCount += item.issues.length;
  }

  return {
    total: items.length,
    issueCount: itemIssueCount + scanIssues.length,
    byKind,
    bySource,
    byStatus
  };
}

function compareCapabilities(a: CapabilityRecord, b: CapabilityRecord): number {
  const kindOrder = capabilityKindRank(a.kind) - capabilityKindRank(b.kind);
  return kindOrder || a.name.localeCompare(b.name, "zh-Hans-CN");
}

function capabilityKindRank(kind: CapabilityKind): number {
  return ["skill", "plugin", "mcp", "command", "automation"].indexOf(kind);
}

function getCapabilitySource(codexRoot: string, projectRoot: string, filePath: string): CapabilitySource {
  const resolved = path.resolve(filePath);
  if (isPathInside(resolved, path.join(codexRoot, "plugins", "cache"))) {
    return "plugin";
  }
  if (isPathInside(resolved, path.join(codexRoot, "skills", ".system"))) {
    return "system";
  }
  if (isPathInside(resolved, projectRoot)) {
    return "project";
  }
  return "user";
}

function getPluginMarketplace(codexRoot: string, pluginRoot: string): string | null {
  const relative = path.relative(path.join(codexRoot, "plugins", "cache"), pluginRoot);
  const parts = relative.split(path.sep).filter(Boolean);
  return parts[0] ?? null;
}

function getOriginLabel(codexRoot: string, filePath: string): string {
  const resolved = path.resolve(filePath);
  const pluginCacheRoot = path.join(codexRoot, "plugins", "cache");
  if (isPathInside(resolved, pluginCacheRoot)) {
    const parts = path.relative(pluginCacheRoot, resolved).split(path.sep).filter(Boolean);
    return parts.length >= 2 ? `${parts[1]} @ ${parts[0]}` : "Plugin";
  }

  const relative = path.relative(codexRoot, resolved);
  return relative.startsWith("..") ? path.dirname(resolved) : relative.split(path.sep)[0] ?? "Codex";
}

function stableCapabilityId(kind: CapabilityKind, source: CapabilitySource, value: string): string {
  return `${kind}:${source}:${Buffer.from(value).toString("base64url")}`;
}

function firstNonEmptyLineWithoutMarkdown(text: string): string | null {
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
  for (const line of body.split(/\r?\n/)) {
    const cleaned = line.replace(/^#+\s*/, "").trim();
    if (cleaned) {
      return trimText(cleaned, 180);
    }
  }
  return null;
}

function trimText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function isPathInside(candidate: string, root: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
