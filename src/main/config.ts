import * as fs from "fs"
import * as path from "path"

// Configuration interface
export interface Config {
  app: {
    title: string
    iconPath?: string
    openDevTools: boolean
  }
  window: {
    width: number
    height: number
    minWidth: number
    minHeight: number
    maximized: boolean
    fullscreen: boolean
  }
  target: {
    url: string
    openLinksExternally: boolean
    restrictToDomain: boolean
    domainConfig: {
      allowedDomains: string[]
      blockedDomains: string[]
      allowSubdomains: boolean
    }
    injectCSS: boolean
    cssPath?: string
  }
}

// Default configuration
const defaultConfig: Config = {
  app: {
    title: "GitHub Profile Viewer",
    openDevTools: false,
  },
  window: {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    maximized: false,
    fullscreen: false,
  },
  target: {
    url: "https://github.com/pilot2254",
    openLinksExternally: true,
    restrictToDomain: true,
    domainConfig: {
      allowedDomains: ["github.com", "githubusercontent.com"],
      blockedDomains: [],
      allowSubdomains: true,
    },
    injectCSS: false,
  },
}

// Validate configuration values
function validateConfig(config: any): config is Config {
  if (!config || typeof config !== "object") return false

  // Validate required properties exist and have correct types
  const requiredStructure = {
    app: ["title", "openDevTools"],
    window: ["width", "height", "minWidth", "minHeight", "maximized", "fullscreen"],
    target: ["url", "openLinksExternally", "restrictToDomain", "injectCSS"],
  }

  for (const [section, props] of Object.entries(requiredStructure)) {
    if (!config[section] || typeof config[section] !== "object") return false

    for (const prop of props) {
      if (!(prop in config[section])) return false
    }
  }

  // Validate URL format
  try {
    new URL(config.target.url)
  } catch {
    return false
  }

  // Validate domain config if it exists
  if (config.target.domainConfig) {
    const domainConfig = config.target.domainConfig
    if (!Array.isArray(domainConfig.allowedDomains) || !Array.isArray(domainConfig.blockedDomains)) {
      return false
    }
  }

  return true
}

// Load configuration from file or use defaults
export async function loadConfig(userDataPath: string): Promise<Config> {
  const configPath = path.join(userDataPath, "config.json")

  try {
    // Check if config file exists
    if (fs.existsSync(configPath)) {
      console.log(`Loading config from: ${configPath}`)
      const configData = fs.readFileSync(configPath, "utf8")

      let userConfig: any
      try {
        userConfig = JSON.parse(configData)
        console.log("Parsed config:", JSON.stringify(userConfig, null, 2))
      } catch (parseError) {
        console.error("Invalid JSON in config file, creating new default config:", parseError)
        await createDefaultConfig(configPath)
        return defaultConfig
      }

      // Remove comment field if it exists
      if (userConfig._comment) {
        delete userConfig._comment
      }

      // Validate and merge with default config
      if (validateConfig(userConfig)) {
        const mergedConfig = mergeConfig(defaultConfig, userConfig)
        console.log("Using merged config:", JSON.stringify(mergedConfig, null, 2))
        return mergedConfig
      } else {
        console.warn("Invalid config structure, using defaults")
        await createDefaultConfig(configPath)
        return defaultConfig
      }
    } else {
      // Create default config file if it doesn't exist
      console.log("No config file found, creating default")
      await createDefaultConfig(configPath)
      return defaultConfig
    }
  } catch (error) {
    console.error("Error loading config:", error)
    return defaultConfig
  }
}

// Safely merge user config with defaults
function mergeConfig(defaultConf: Config, userConf: Partial<Config>): Config {
  return {
    app: { ...defaultConf.app, ...userConf.app },
    window: { ...defaultConf.window, ...userConf.window },
    target: { ...defaultConf.target, ...userConf.target },
  }
}

// Create default configuration file
async function createDefaultConfig(configPath: string): Promise<void> {
  try {
    const configDir = path.dirname(configPath)

    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }

    // Write default config with detailed comments
    const configWithComments = {
      _comment: "Configuration file for Web Renderer. Edit this file to customize the application.",
      _instructions: {
        url: "The website URL to load",
        restrictToDomain: "If true, navigation is controlled by domainConfig settings",
        openLinksExternally: "If true, links open in the default browser instead of the app",
        domainConfig: {
          allowedDomains: "List of domains that are allowed within the app (e.g., ['github.com', 'stackoverflow.com'])",
          blockedDomains: "List of domains that should always open externally (takes precedence over allowedDomains)",
          allowSubdomains: "If true, subdomains of allowed domains are also permitted (e.g., api.github.com)",
        },
        injectCSS: "If true, inject custom CSS from the specified cssPath",
      },
      ...defaultConfig,
    }

    fs.writeFileSync(configPath, JSON.stringify(configWithComments, null, 2))

    console.log(`Created default config at: ${configPath}`)
  } catch (error) {
    console.error("Failed to create default config:", error)
  }
}

// Export function to get config file path for external use
export function getConfigPath(userDataPath: string): string {
  return path.join(userDataPath, "config.json")
}
