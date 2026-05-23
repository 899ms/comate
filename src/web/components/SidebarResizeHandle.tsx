import type { HTMLAttributes } from "react";

import type { WorkspacePanelState } from "../domain/workspaceLayout.js";

interface SidebarResizeHandleProps extends HTMLAttributes<HTMLDivElement> {
  isResizing: boolean;
  panelState: WorkspacePanelState;
}

export function SidebarResizeHandle({ isResizing, panelState, ...handleProps }: SidebarResizeHandleProps) {
  const className = ["sidebar-resize-handle", isResizing ? "resizing" : "", panelState === "collapsed" ? "collapsed" : ""]
    .filter(Boolean)
    .join(" ");

  return <div {...handleProps} className={className} />;
}
