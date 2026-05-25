import electron from "electron";
import type { MenuItemConstructorOptions } from "electron";

const { Menu } = electron;

export interface InstallApplicationMenuOptions {
  isDevelopment: boolean;
  platform?: NodeJS.Platform;
}

export function installApplicationMenu(options: InstallApplicationMenuOptions): void {
  const platform = options.platform ?? process.platform;
  Menu.setApplicationMenu(Menu.buildFromTemplate(createApplicationMenuTemplate(options.isDevelopment, platform)));
}

function createApplicationMenuTemplate(
  isDevelopment: boolean,
  platform: NodeJS.Platform
): MenuItemConstructorOptions[] {
  const isMac = platform === "darwin";
  const template: MenuItemConstructorOptions[] = [];

  if (isMac) {
    template.push({
      label: "CoMate",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" }
      ]
    });
  }

  template.push(
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: createViewMenu(isDevelopment)
    },
    {
      label: "Window",
      submenu: isMac
        ? [{ role: "minimize" }, { role: "zoom" }, { type: "separator" }, { role: "front" }]
        : [{ role: "minimize" }, { role: "close" }]
    }
  );

  return template;
}

function createViewMenu(isDevelopment: boolean): MenuItemConstructorOptions[] {
  const menu: MenuItemConstructorOptions[] = [
    { role: "resetZoom" },
    { role: "zoomIn" },
    { role: "zoomOut" },
    { type: "separator" },
    { role: "togglefullscreen" }
  ];

  if (isDevelopment) {
    menu.unshift(
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" }
    );
  }

  return menu;
}
