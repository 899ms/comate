import electron from "electron";
import type { BrowserWindow as BrowserWindowType } from "electron";

import { createMainWindow } from "./application/mainWindow.js";
import { startDesktopServer } from "./application/desktopServer.js";
import { resolveDesktopStaticDir } from "./config/desktopPaths.js";
import { waitForHttp } from "./utils/waitForHttp.js";
import type { CoMateRuntime } from "../server/application/serverRuntime.js";

const { app, BrowserWindow, dialog } = electron;

app.setName("CoMate");
app.commandLine.appendSwitch("password-store", "basic");
app.commandLine.appendSwitch("use-mock-keychain");

let mainWindow: BrowserWindowType | null = null;
let runtime: CoMateRuntime | null = null;
let closingRuntime = false;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    focusMainWindow();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && runtime) {
      openMainWindow(runtime.url);
    } else {
      focusMainWindow();
    }
  });

  app.on("before-quit", (event) => {
    if (!runtime || closingRuntime) {
      return;
    }

    event.preventDefault();
    closingRuntime = true;
    BrowserWindow.getAllWindows().forEach((window) => window.destroy());
    runtime
      .close()
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        runtime = null;
        app.exit(0);
      });
  });

  void bootstrap();
}

async function bootstrap(): Promise<void> {
  await app.whenReady();

  try {
    runtime = await startDesktopServer({
      staticDir: resolveDesktopStaticDir()
    });
    await waitForHttp(`${runtime.url}/api/health`);
    openMainWindow(runtime.url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected startup error.";
    dialog.showErrorBox("CoMate failed to start", message);
    app.quit();
  }
}

function openMainWindow(url: string): void {
  mainWindow = createMainWindow(url);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function focusMainWindow(): void {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
}
