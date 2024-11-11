import { app, BrowserWindow, clipboard, ipcMain, nativeTheme } from "electron";
import path from "path";
import started from "electron-squirrel-startup";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // setInterval(() => {
  //   const text = clipboard.readText();
  //   // console.log(text);
  // }, 1000);

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    // icon: path.join(process.cwd(), "icon.icns"),
    width: 1280,
    height: 720,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      sandbox: false,
      // scrollBounce: true,
    },
    useContentSize: true,
    // backgroundColor: "#00000090",
    // backgroundColor: "#00000000",
    // backgroundColor: "transparent",
    // transparent: true,
    // vibrancy: "under-window", // on MacOS
    // vibrancy: "under-page", // on MacOS
    // titleBarOverlay: false,
    // titleBarStyle: "hidden",
    // transparent: true,
    // frame: false,
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  }
};

ipcMain.handle("dark-mode:system", () => {
  nativeTheme.themeSource = "system";
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
