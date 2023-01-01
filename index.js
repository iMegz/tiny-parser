const { app, BrowserWindow, screen, Menu } = require("electron");
const { ipcMain } = require("electron/main");
const path = require("path");
const AppMenu = require("./src/js/menu");
const fs = require("fs");

let savePath = path.join(__dirname, "result");

function createLoadWindow() {
    const window = new BrowserWindow({
        width: 500,
        height: 180,
        center: true,
        frame: false,
        closable: false,
        alwaysOnTop: true,
        focusable: false,
        movable: false,
        resizable: false,
    });

    window.loadFile("./src/loader.html");

    return window;
}

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    const window = new BrowserWindow({
        width: width - 50,
        height: height - 50,
        minHeight: 700,
        minWidth: 1200,
        center: true,
        webPreferences: {
            preload: path.join(__dirname, "src/js/preload.js"),
        },
        icon: "icon.ico",
    });

    const appMenu = new AppMenu(window);
    const menu = appMenu.menu();
    Menu.setApplicationMenu(menu);

    window.loadFile("./src/index.html");

    return window;
}

function startApp() {
    ipcMain.on("save", (event, data) => {
        const tokens = JSON.stringify(data.tokens, null, 4);
        const dir = savePath;

        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(path.join(savePath, "parseTree.svg"), data.image);
        fs.writeFileSync(path.join(savePath, "code.txt"), data.code);
        fs.writeFileSync(path.join(savePath, "tokens.json"), tokens);
    });
    createWindow();
}
app.whenReady().then(() => {
    const loadWindow = createLoadWindow();
    setTimeout(() => {
        startApp();
        loadWindow.destroy();
    }, 3500);
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on("window-all-closed", () => app.quit());
