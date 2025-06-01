import { app, BrowserWindow, shell, ipcMain } from "electron"
import * as path from "path"
import * as fs from "fs"
import { type Config, loadConfig, getConfigPath } from "./config"

// Keep a global reference of the window object to avoid garbage collection
let mainWindow: BrowserWindow | null = null

// Load configuration
let config: Config

// Set up IPC handlers
function setupIpcHandlers() {
  ipcMain.handle("get-app-version", () => {
    return app.getVersion()
  })

  ipcMain.handle("get-config-path", () => {
    return getConfigPath(app.getPath("userData"))
  })

  ipcMain.handle("reload-config", async () => {
    config = await loadConfig(app.getPath("userData"))
    return config
  })
}

// Add this function after the imports and before createWindow
function isDomainAllowed(url: string, config: Config): boolean {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.toLowerCase()

    // If domain restriction is disabled, allow everything
    if (!config.target.restrictToDomain) {
      return true
    }

    const domainConfig = config.target.domainConfig

    // Check blocked domains first (takes precedence)
    if (domainConfig.blockedDomains.length > 0) {
      for (const blockedDomain of domainConfig.blockedDomains) {
        const normalizedBlocked = blockedDomain.toLowerCase()
        if (
          domain === normalizedBlocked ||
          (domainConfig.allowSubdomains && domain.endsWith("." + normalizedBlocked))
        ) {
          console.log(`Domain ${domain} is in blocked list`)
          return false
        }
      }
    }

    // If no allowed domains specified, allow the original domain only
    if (domainConfig.allowedDomains.length === 0) {
      const originalDomain = new URL(config.target.url).hostname.toLowerCase()
      const isAllowed =
        domain === originalDomain || (domainConfig.allowSubdomains && domain.endsWith("." + originalDomain))
      console.log(`No allowed domains specified, checking against original domain ${originalDomain}: ${isAllowed}`)
      return isAllowed
    }

    // Check allowed domains
    for (const allowedDomain of domainConfig.allowedDomains) {
      const normalizedAllowed = allowedDomain.toLowerCase()
      if (domain === normalizedAllowed || (domainConfig.allowSubdomains && domain.endsWith("." + normalizedAllowed))) {
        console.log(`Domain ${domain} is in allowed list`)
        return true
      }
    }

    console.log(`Domain ${domain} is not in allowed list`)
    return false
  } catch (error) {
    console.error("Error checking domain:", error)
    return false
  }
}

async function createWindow() {
  try {
    // Load config before creating the window
    console.log("Loading configuration...")
    config = await loadConfig(app.getPath("userData"))
    console.log("Configuration loaded successfully")

    // Create the browser window with config settings
    mainWindow = new BrowserWindow({
      width: config.window.width,
      height: config.window.height,
      minWidth: config.window.minWidth,
      minHeight: config.window.minHeight,
      title: config.app.title,
      icon: config.app.iconPath ? path.resolve(config.app.iconPath) : undefined,
      webPreferences: {
        preload: path.join(__dirname, "../preload/preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    })

    // Set additional window options from config
    if (config.window.maximized) {
      mainWindow.maximize()
    }

    if (config.window.fullscreen) {
      mainWindow.setFullScreen(true)
    }

    // Load the target URL with error handling
    console.log(`Loading URL: ${config.target.url}`)

    try {
      await mainWindow.loadURL(config.target.url)
      console.log("URL loaded successfully")
    } catch (loadError) {
      console.error("Failed to load URL:", loadError)
      // Load a fallback page or show an error
      mainWindow.loadFile(path.join(__dirname, "../renderer/error.html"))
    }

    // Set up navigation restrictions if enabled
    if (config.target.restrictToDomain) {
      console.log("Domain restriction enabled with configuration:", config.target.domainConfig)

      mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
        if (!isDomainAllowed(navigationUrl, config)) {
          event.preventDefault()
          shell.openExternal(navigationUrl)
          console.log(`Blocked navigation to ${navigationUrl}, opened in external browser`)
        } else {
          console.log(`Allowing navigation to ${navigationUrl}`)
        }
      })

      // Also handle new window requests
      mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (config.target.openLinksExternally || !isDomainAllowed(url, config)) {
          shell.openExternal(url)
          console.log(`Opening ${url} in external browser`)
          return { action: "deny" }
        }
        console.log(`Allowing ${url} to open in app`)
        return { action: "allow" }
      })
    } else {
      console.log("Domain restriction disabled")
      // Original behavior when domain restriction is disabled
      mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (config.target.openLinksExternally) {
          shell.openExternal(url)
          return { action: "deny" }
        }
        return { action: "allow" }
      })
    }

    // Handle window close
    mainWindow.on("closed", () => {
      mainWindow = null
    })

    // Apply custom CSS if specified
    if (config.target.injectCSS && config.target.cssPath) {
      try {
        const cssContent = fs.readFileSync(path.resolve(config.target.cssPath), "utf8")
        mainWindow.webContents.insertCSS(cssContent)
        console.log("Custom CSS injected successfully")
      } catch (error) {
        console.error("Failed to inject CSS:", error)
      }
    }

    // Show developer tools if enabled
    if (config.app.openDevTools) {
      mainWindow.webContents.openDevTools()
    }
  } catch (error) {
    console.error("Error creating window:", error)
    app.quit()
  }
}

// Set up IPC handlers before app is ready
setupIpcHandlers()

// Create window when Electron is ready
app.whenReady().then(() => {
  createWindow()

  app.on("activate", () => {
    // On macOS it's common to re-create a window when the dock icon is clicked
    if (mainWindow === null) {
      createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
