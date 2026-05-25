import path from "node:path";

export const REQUIRED_DESKTOP_STATIC_ASSETS = ["index.html"] as const;

export interface RequiredDesktopStaticAsset {
  absolutePath: string;
  relativePath: string;
}

export function getRequiredDesktopStaticAssets(staticDir: string): RequiredDesktopStaticAsset[] {
  return REQUIRED_DESKTOP_STATIC_ASSETS.map((relativePath) => ({
    absolutePath: path.join(staticDir, relativePath),
    relativePath
  }));
}

export function formatMissingDesktopStaticAssetsMessage(staticDir: string, missingAssets: string[]): string {
  const missing = missingAssets.length > 0 ? missingAssets.join(", ") : "unknown files";
  return `CoMate desktop assets are not ready. Missing ${missing} in ${staticDir}. Run npm run build before starting or packaging the desktop app.`;
}
