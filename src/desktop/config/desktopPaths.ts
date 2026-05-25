import fs from "node:fs/promises";
import path from "node:path";

import { app } from "electron";

import {
  formatMissingDesktopStaticAssetsMessage,
  getRequiredDesktopStaticAssets
} from "../domain/staticAssets.js";

export function resolveDesktopStaticDir(): string {
  if (app.isPackaged) {
    return path.join(app.getAppPath(), "dist-web");
  }

  return path.resolve(process.cwd(), "dist-web");
}

export async function assertDesktopStaticDir(staticDir: string): Promise<void> {
  const missingAssets: string[] = [];

  for (const asset of getRequiredDesktopStaticAssets(staticDir)) {
    try {
      await fs.access(asset.absolutePath);
    } catch {
      missingAssets.push(asset.relativePath);
    }
  }

  if (missingAssets.length > 0) {
    throw new Error(formatMissingDesktopStaticAssetsMessage(staticDir, missingAssets));
  }
}
