import electron from "electron";
import type { BrowserWindow as BrowserWindowType } from "electron";

import { installApplicationMenu } from "./application/appMenu.js";
import { createMainWindow } from "./application/mainWindow.js";
import { startDesktopServer } from "./application/desktopServer.js";
import {
  readWindowState,
  registerWindowStatePersistence,
  saveWindowState
} from "./application/windowStateStore.js";
import { assertDesktopStaticDir, resolveDesktopStaticDir } from "./config/desktopPaths.js";
import { waitForHttp } from "./utils/waitForHttp.js";
import type { CoMateRuntime } from "../server/application/serverRuntime.js";

const { app, BrowserWindow, dialog } = electron;

app.setName("CoMate");
app.commandLine.appendSwitch("password-store", "basic");
app.commandLine.appendSwitch("use-mock-keychain");

let mainWindow: BrowserWindowType | null = null;
let openingMainWindow: Promise<void> | null = null;
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
      void ensureMainWindow(runtime.url);
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
    const windows = BrowserWindow.getAllWindows();
    const activeRuntime = runtime;
    void Promise.all(windows.map((window) => saveWindowState(app.getPath("userData"), window).catch((error) => console.error(error))))
      .finally(() => {
        windows.forEach((window) => window.destroy());
      })
      .then(() => activeRuntime.close())
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
  installApplicationMenu({ isDevelopment: !app.isPackaged });

  try {
    const staticDir = resolveDesktopStaticDir();
    await assertDesktopStaticDir(staticDir);
    runtime = await startDesktopServer({
      staticDir
    });
    await waitForHttp(`${runtime.url}/api/health`);
    await ensureMainWindow(runtime.url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected startup error.";
    dialog.showErrorBox("CoMate failed to start", message);
    app.quit();
  }
}

async function ensureMainWindow(url: string): Promise<void> {
  if (mainWindow) {
    focusMainWindow();
    return;
  }

  if (openingMainWindow) {
    await openingMainWindow;
    focusMainWindow();
    return;
  }

  openingMainWindow = openMainWindow(url).finally(() => {
    openingMainWindow = null;
  });
  await openingMainWindow;
}

async function openMainWindow(url: string): Promise<void> {
  const userDataDir = app.getPath("userData");
  const initialBounds = await readWindowState(userDataDir);
  const window = createMainWindow(url, { initialBounds });
  registerWindowStatePersistence(userDataDir, window);
  window.on("closed", () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });
  mainWindow = window;
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
