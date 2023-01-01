const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("API", {
    openFileHandle: (callback) => ipcRenderer.on("fileUpload", callback),
    clearHandle: (callback) => ipcRenderer.on("clear", callback),
    saveHandle: (callback) => ipcRenderer.on("saveHandle", callback),
    save: (data) => {
        ipcRenderer.send("save", data);
    },
});
