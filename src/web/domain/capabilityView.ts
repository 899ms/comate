import type { CapabilityKind, CapabilityRecord, CapabilityScanResult, CapabilitySummary } from "../../shared/types.js";
import type { CapabilitySection } from "./navigation.js";
import { getCapabilitySectionKind } from "./navigation.js";

export interface CapabilityStatCard {
  label: string;
  value: number;
}

const KIND_LABELS: Record<CapabilityKind, string> = {
  automation: "Automations",
  command: "Commands",
  mcp: "MCP",
  plugin: "Plugins",
  skill: "Skills"
};

export function getCapabilityStatCards(summary: CapabilitySummary | null): CapabilityStatCard[] {
  return [
    { label: "Skills", value: summary?.byKind.skill ?? 0 },
    { label: "Plugins", value: summary?.byKind.plugin ?? 0 },
    { label: "MCP", value: summary?.byKind.mcp ?? 0 },
    { label: "Automations", value: summary?.byKind.automation ?? 0 },
    { label: "Issues", value: summary?.issueCount ?? 0 }
  ];
}

export function filterCapabilities(
  capabilities: CapabilityScanResult | null,
  section: CapabilitySection,
  query: string
): CapabilityRecord[] {
  if (!capabilities) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();
  const kind = getCapabilitySectionKind(section);

  return capabilities.items.filter((item) => {
    if (section === "issues" && item.issues.length === 0) {
      return false;
    }
    if (kind && item.kind !== kind) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }

    return [item.name, item.description, item.origin, item.path, item.trigger]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedQuery));
  });
}

export function groupCapabilities(items: CapabilityRecord[]): Array<{ kind: CapabilityKind; label: string; items: CapabilityRecord[] }> {
  const groups = new Map<CapabilityKind, CapabilityRecord[]>();
  for (const item of items) {
    groups.set(item.kind, [...(groups.get(item.kind) ?? []), item]);
  }

  return (["skill", "plugin", "mcp", "command", "automation"] as CapabilityKind[])
    .map((kind) => ({ kind, label: KIND_LABELS[kind], items: groups.get(kind) ?? [] }))
    .filter((group) => group.items.length > 0);
}

export function getCapabilityMenuCount(summary: CapabilitySummary | null, section: CapabilitySection): number {
  if (!summary) {
    return 0;
  }
  if (section === "overview") {
    return summary.total;
  }
  if (section === "issues") {
    return summary.issueCount;
  }

  const kind = getCapabilitySectionKind(section);
  return kind ? summary.byKind[kind] : 0;
}

export function getSelectedCapability(
  items: CapabilityRecord[],
  selectedId: string | null
): CapabilityRecord | null {
  return items.find((item) => item.id === selectedId) ?? items[0] ?? null;
}
