import fs from "node:fs/promises";
import path from "node:path";

import type { BrowserWindow as BrowserWindowType } from "electron";

import {
  sanitizeWindowBounds,
  toPersistedWindowBounds,
  type DesktopWindowBounds
} from "../domain/windowState.js";

const WINDOW_STATE_FILE = "window-state.json";
const SAVE_DEBOUNCE_MS = 300;

export async function readWindowState(userDataDir: string): Promise<DesktopWindowBounds | null> {
  try {
    const raw = await fs.readFile(getWindowStatePath(userDataDir), "utf8");
    return sanitizeWindowBounds(JSON.parse(raw));
  } catch (error) {
    if (isMissingFileError(error) || error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

export async function saveWindowState(userDataDir: string, window: BrowserWindowType): Promise<void> {
  if (window.isDestroyed()) {
    return;
  }

  const bounds = toPersistedWindowBounds(window.getNormalBounds());
  await fs.mkdir(userDataDir, { recursive: true });
  await fs.writeFile(getWindowStatePath(userDataDir), `${JSON.stringify(bounds, null, 2)}\n`);
}

export function registerWindowStatePersistence(userDataDir: string, window: BrowserWindowType): void {
  let saveTimer: NodeJS.Timeout | null = null;

  const clearSaveTimer = (): void => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  };

  const scheduleSave = (): void => {
    clearSaveTimer();
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void saveWindowState(userDataDir, window).catch((error) => console.error(error));
    }, SAVE_DEBOUNCE_MS);
  };

  window.on("resize", scheduleSave);
  window.on("move", scheduleSave);
  window.on("close", () => {
    clearSaveTimer();
    void saveWindowState(userDataDir, window).catch((error) => console.error(error));
  });
}

function getWindowStatePath(userDataDir: string): string {
  return path.join(userDataDir, WINDOW_STATE_FILE);
}

function isMissingFileError(error: unknown): boolean {
  return isNodeError(error) && error.code === "ENOENT";
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
