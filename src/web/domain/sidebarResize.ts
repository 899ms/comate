import type { WorkspacePanelState } from "./workspaceLayout.js";

export interface SidebarWidthConfig {
  collapsedWidth: number;
  collapseThreshold: number;
  defaultWidth: number;
  maxWidth: number;
  minWidth: number;
}

export interface SidebarDragInput {
  currentWidth: number;
  pointerX: number;
  startPanelState: WorkspacePanelState;
  startPointerX: number;
  startWidth: number;
}

export interface SidebarDragResult {
  panelState: WorkspacePanelState;
  shouldCompleteDrag: boolean;
  width: number;
}

export const SIDEBAR_WIDTH_CONFIG: SidebarWidthConfig = {
  collapsedWidth: 68,
  collapseThreshold: 156,
  defaultWidth: 212,
  maxWidth: 300,
  minWidth: 176
};

export function clampSidebarWidth(width: number, config = SIDEBAR_WIDTH_CONFIG): number {
  if (!Number.isFinite(width)) {
    return config.defaultWidth;
  }

  return Math.min(config.maxWidth, Math.max(config.minWidth, Math.round(width)));
}

export function getSidebarDragResult(input: SidebarDragInput, config = SIDEBAR_WIDTH_CONFIG): SidebarDragResult {
  const deltaX = input.pointerX - input.startPointerX;
  const baseWidth = input.startPanelState === "collapsed" ? config.collapsedWidth : input.startWidth;
  const rawWidth = baseWidth + deltaX;

  if (rawWidth < config.collapseThreshold) {
    return {
      panelState: "collapsed",
      shouldCompleteDrag: input.startPanelState === "expanded",
      width: clampSidebarWidth(input.currentWidth, config)
    };
  }

  return {
    panelState: "expanded",
    shouldCompleteDrag: false,
    width: clampSidebarWidth(rawWidth, config)
  };
}

export function getSidebarWidthCssValue(width: number, config = SIDEBAR_WIDTH_CONFIG): string {
  return `${clampSidebarWidth(width, config)}px`;
}
