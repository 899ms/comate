import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import {
  clampSidebarWidth,
  getSidebarDragResult,
  SIDEBAR_WIDTH_CONFIG,
  type SidebarWidthConfig
} from "../domain/sidebarResize.js";
import type { WorkspacePanelState } from "../domain/workspaceLayout.js";

interface UseSidebarResizeOptions {
  config?: SidebarWidthConfig;
  panelState: WorkspacePanelState;
  width: number;
  onPanelStateChange: (state: WorkspacePanelState) => void;
  onWidthChange: (width: number) => void;
}

interface SidebarResizeDrag {
  pointerId: number;
  startPanelState: WorkspacePanelState;
  startPointerX: number;
  startWidth: number;
  target: HTMLDivElement;
}

export function useSidebarResize({
  config = SIDEBAR_WIDTH_CONFIG,
  panelState,
  width,
  onPanelStateChange,
  onWidthChange
}: UseSidebarResizeOptions) {
  const dragRef = useRef<SidebarResizeDrag | null>(null);
  const widthRef = useRef(width);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  const completeDrag = useCallback(() => {
    const drag = dragRef.current;
    if (drag && drag.target.hasPointerCapture(drag.pointerId)) {
      drag.target.releasePointerCapture(drag.pointerId);
    }

    dragRef.current = null;
    setIsResizing(false);
  }, []);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }

      const result = getSidebarDragResult(
        {
          currentWidth: widthRef.current,
          pointerX: clientX,
          startPanelState: drag.startPanelState,
          startPointerX: drag.startPointerX,
          startWidth: drag.startWidth
        },
        config
      );

      onPanelStateChange(result.panelState);
      if (result.panelState === "expanded") {
        onWidthChange(result.width);
      }

      if (result.shouldCompleteDrag) {
        completeDrag();
      }
    },
    [completeDrag, config, onPanelStateChange, onWidthChange]
  );

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    const handlePointerMove = (event: globalThis.PointerEvent) => updateFromClientX(event.clientX);
    const handleMouseMove = (event: MouseEvent) => updateFromClientX(event.clientX);
    const handleEnd = () => completeDrag();

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
    };
  }, [completeDrag, isResizing, updateFromClientX]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        startPanelState: panelState,
        startPointerX: event.clientX,
        startWidth: width,
        target: event.currentTarget
      };
      setIsResizing(true);
    },
    [panelState, width]
  );

  const handlePointerUp = useCallback(
    () => {
      completeDrag();
    },
    [completeDrag]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        const nextWidth = width - (event.shiftKey ? 24 : 12);
        if (nextWidth < config.collapseThreshold) {
          onPanelStateChange("collapsed");
          return;
        }
        onPanelStateChange("expanded");
        onWidthChange(clampSidebarWidth(nextWidth, config));
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        onPanelStateChange("expanded");
        onWidthChange(clampSidebarWidth(width + (event.shiftKey ? 24 : 12), config));
      }
    },
    [config, onPanelStateChange, onWidthChange, width]
  );

  return useMemo(
    () => ({
      handleProps: {
        "aria-label": "Resize sidebar",
        "aria-orientation": "vertical" as const,
        "aria-valuemax": config.maxWidth,
        "aria-valuemin": config.minWidth,
        "aria-valuenow": panelState === "expanded" ? clampSidebarWidth(width, config) : config.collapsedWidth,
        onKeyDown: handleKeyDown,
        onPointerCancel: handlePointerUp,
        onPointerDown: handlePointerDown,
        onPointerUp: handlePointerUp,
        role: "separator",
        tabIndex: 0
      },
      isResizing
    }),
    [config, handleKeyDown, handlePointerDown, handlePointerUp, isResizing, panelState, width]
  );
}
