import { app, BrowserWindow, shell, ipcMain, type Event } from "electron"
import * as path from "path"
// Removed fs import as it's no longer needed here after removing CSS injection
// import * as fs from "fs";
import type { Config } from "./config-types"
import { loadConfiguration, getConfigPath } from "./config-manager"

// Keep a global reference of the window object to avoid garbage collection
let mainWindow: BrowserWindow | null = null

// Configuration object, will be populated by loadConfiguration
let config: Config

// Set up IPC handlers
function setupIpcHandlers() {
  ipcMain.handle("get-app-version", () => {
    return app.getVersion()
  })

  ipcMain.handle("get-config-path", () => {
    // Use app.getPath('userData') which is available after app is ready
    return getConfigPath(app.getPath("userData"))
  })

  ipcMain.handle("reload-config", async () => {
    console.log("Reloading configuration via IPC...")
    config = await loadConfiguration(app.getPath("userData"))
    // Potentially notify the window to re-render or apply new settings
    if (mainWindow) {
      // Example: Reload the current page if URL changed, or apply other settings
      // For simplicity, we might just log or require a restart for some changes.
      // mainWindow.loadURL(config.target.url); // Be careful with this, might be disruptive
    }
    return config
  })
}

function isDomainAllowed(url: string, currentConfig: Config): boolean {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.toLowerCase()

    if (!currentConfig.target.restrictToDomain) {
      return true // Restriction disabled
    }

    const domainSettings = currentConfig.target.domainConfig

    // Check blocked domains first
    if (
      domainSettings.blockedDomains.some(
        (blocked) =>
          domain === blocked.toLowerCase() ||
          (domainSettings.allowSubdomains && domain.endsWith(`.${blocked.toLowerCase()}`)),
      )
    ) {
      console.log(`Domain ${domain} is explicitly blocked.`)
      return false
    }

    // If allowedDomains is empty, only the initial target URL's domain is allowed
    if (domainSettings.allowedDomains.length === 0) {
      const initialDomain = new URL(currentConfig.target.url).hostname.toLowerCase()
      const isInitial =
        domain === initialDomain || (domainSettings.allowSubdomains && domain.endsWith(`.${initialDomain}`))
      if (isInitial) console.log(`Domain ${domain} matches initial target domain.`)
      else console.log(`Domain ${domain} does not match initial target domain (no other allowed domains).`)
      return isInitial
    }

    // Check allowed domains
    if (
      domainSettings.allowedDomains.some(
        (allowed) =>
          domain === allowed.toLowerCase() ||
          (domainSettings.allowSubdomains && domain.endsWith(`.${allowed.toLowerCase()}`)),
      )
    ) {
      console.log(`Domain ${domain} is in the allowed list.`)
      return true
    }

    console.log(`Domain ${domain} is not in the allowed list and not the initial target domain.`)
    return false
  } catch (error) {
    console.error("Error in isDomainAllowed:", error)
    return false // Default to not allowed in case of error
  }
}

async function createWindow() {
  try {
    console.log("Loading configuration for window creation...")
    config = await loadConfiguration(app.getPath("userData")) // Use the new loader
    console.log("Configuration loaded successfully for window creation.")

    mainWindow = new BrowserWindow({
      width: config.window.width,
      height: config.window.height,
      minWidth: config.window.minWidth,
      minHeight: config.window.minHeight,
      title: config.app.title,
      icon: config.app.iconPath ? path.resolve(config.app.iconPath) : undefined,
      webPreferences: {
        preload: path.join(__dirname, "../preload/preload.js"), // Adjusted path
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    })

    if (config.window.maximized) mainWindow.maximize()
    if (config.window.fullscreen) mainWindow.setFullScreen(true)

    console.log(`Attempting to load URL: ${config.target.url}`)
    try {
      await mainWindow.loadURL(config.target.url)
      console.log("URL loaded successfully.")
    } catch (loadError) {
      console.error("Failed to load target URL:", loadError)
      mainWindow.loadFile(path.join(__dirname, "../renderer/error.html")) // Adjusted path
    }

    // Navigation handling
    const handleNavigation = (urlToNavigate: string, event?: Event) => {
      if (!isDomainAllowed(urlToNavigate, config)) {
        if (event) event.preventDefault()
        shell.openExternal(urlToNavigate)
        console.log(`Blocked navigation to ${urlToNavigate}, opened in external browser.`)
        return false // Indicate navigation was blocked/redirected
      }
      console.log(`Allowing navigation to ${urlToNavigate}.`)
      return true // Indicate navigation is allowed
    }

    mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
      handleNavigation(navigationUrl, event)
    })

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (config.target.openLinksExternally || !handleNavigation(url)) {
        shell.openExternal(url) // Ensure external opening if not allowed or configured
        console.log(`Opening ${url} in external browser due to config or domain restriction.`)
        return { action: "deny" }
      }
      console.log(`Allowing ${url} to open in a new app window.`)
      return { action: "allow" } // Or configure new window options
    })

    mainWindow.on("closed", () => {
      mainWindow = null
    })

    // Removed CSS injection logic block from here

    if (config.app.openDevTools) {
      mainWindow.webContents.openDevTools()
    }
  } catch (error) {
    console.error("Critical error during createWindow:", error)
    // Consider showing an error dialog to the user before quitting
    app.quit()
  }
}

// Ensure setupIpcHandlers is called once app is ready or before window creation
app.on("ready", () => {
  setupIpcHandlers() // Call it here to ensure app paths are available
  createWindow()
})

app.on("activate", () => {
  if (mainWindow === null && app.isReady()) {
    // Ensure app is ready before creating window
    createWindow()
  }
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

// Handle potential unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason)
  // Application specific logging, throwing an error, or other logic here
})
