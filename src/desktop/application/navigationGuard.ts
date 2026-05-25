import electron from "electron";
import type { BrowserWindow as BrowserWindowType } from "electron";

import { getNavigationDecision } from "../domain/navigationPolicy.js";

const { shell } = electron;

export function installNavigationGuard(window: BrowserWindowType, appUrl: string): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    const decision = getNavigationDecision(url, appUrl);

    if (decision.disposition === "open-external") {
      void shell.openExternal(decision.url);
    }

    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    const decision = getNavigationDecision(url, appUrl);

    if (decision.disposition === "allow-app") {
      return;
    }

    event.preventDefault();

    if (decision.disposition === "open-external") {
      void shell.openExternal(decision.url);
    }
  });
}
