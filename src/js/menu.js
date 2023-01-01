const { app, Menu, dialog, BrowserWindow } = require("electron");
const fs = require("fs");

module.exports = class AppMenu {
    window;

    template = [
        {
            label: "File",
            submenu: [
                {
                    label: "Upload File",
                    accelerator: "CmdorCtrl+O",
                    click: this.uploadFile.bind(this),
                },
                {
                    label: "Settings",
                    accelerator: "CmdorCtrl+Alt+S",
                    click: this.showSettings.bind(this),
                },
                { label: "Exit", click: this.exit.bind(this) },
            ],
        },
        {
            label: "Compiler",
            submenu: [
                {
                    label: "Save",
                    accelerator: "CmdorCtrl+S",
                    click: this.savePST.bind(this),
                },
                {
                    label: "Clear",
                    accelerator: "CmdorCtrl+Alt+c",
                    click: this.clear.bind(this),
                },
            ],
        },
        {
            label: "About",
            submenu: [{ label: "Github", click: this.showGithub.bind(this) }],
        },
    ];

    /**
     * Initizlize app window
     * @param {BrowserWindow} window
     */
    constructor(window) {
        this.window = window;
    }

    uploadFile() {
        const files = dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [
                { name: "Text Files", extensions: ["txt"] },
                { name: "All Files", extensions: ["*"] },
            ],
        });

        files.then((result) => {
            if (result.canceled) return null;
            else {
                const path = result.filePaths[0];
                const content = fs.readFileSync(path).toString();
                this.window.webContents.send("fileUpload", content);
                return content;
            }
        });
    }
    showSettings() {}
    exit() {
        app.quit();
    }
    savePST() {
        this.window.webContents.send("saveHandle");
    }
    clear() {
        this.window.webContents.send("clear");
    }
    showGithub() {}

    menu() {
        return Menu.buildFromTemplate(this.template);
    }
};
