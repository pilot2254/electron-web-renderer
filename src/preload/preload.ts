import { contextBridge, ipcRenderer } from "electron"

// Expose a minimal API to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // Add any specific APIs you want to expose to the web content
  // For example:
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // You can add more functions here as needed
})

// You can also inject custom scripts or styles here if needed
console.log("Preload script loaded")
