import {
  AlertTriangle,
  Bot,
  Boxes,
  CalendarClock,
  Image as ImageIcon,
  Layers3,
  Network,
  Package,
  Plug,
  ScrollText,
  TerminalSquare
} from "lucide-react";
import type { ComponentType } from "react";

export type AppModule = "gallery" | "capabilities";
export type CapabilitySection = "overview" | "skills" | "plugins" | "mcp" | "commands" | "automations" | "issues";

export interface GlobalModuleItem {
  description: string;
  icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  id: AppModule;
  label: string;
}

export interface CapabilityMenuItem {
  icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  id: CapabilitySection;
  label: string;
}

export const GLOBAL_MODULES: GlobalModuleItem[] = [
  {
    description: "Codex generated image library",
    icon: ImageIcon,
    id: "gallery",
    label: "图片浏览"
  },
  {
    description: "Codex abilities and runtime entries",
    icon: Network,
    id: "capabilities",
    label: "能力图谱"
  }
];

export const CAPABILITY_MENU_ITEMS: CapabilityMenuItem[] = [
  { icon: Layers3, id: "overview", label: "Overview" },
  { icon: Bot, id: "skills", label: "Skills" },
  { icon: Package, id: "plugins", label: "Plugins" },
  { icon: Plug, id: "mcp", label: "MCP" },
  { icon: TerminalSquare, id: "commands", label: "Commands" },
  { icon: CalendarClock, id: "automations", label: "Automations" },
  { icon: AlertTriangle, id: "issues", label: "Issues" }
];

export function getModuleTitle(module: AppModule): string {
  return module === "gallery" ? "图片浏览" : "能力图谱";
}

export function getCapabilitySectionKind(section: CapabilitySection): "skill" | "plugin" | "mcp" | "command" | "automation" | null {
  switch (section) {
    case "skills":
      return "skill";
    case "plugins":
      return "plugin";
    case "mcp":
      return "mcp";
    case "commands":
      return "command";
    case "automations":
      return "automation";
    default:
      return null;
  }
}

export function getCapabilitySectionLabel(section: CapabilitySection): string {
  return CAPABILITY_MENU_ITEMS.find((item) => item.id === section)?.label ?? "Overview";
}

export const GALLERY_MODULE_ICON = Boxes;
export const GALLERY_SESSIONS_ICON = ScrollText;
