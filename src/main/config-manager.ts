// This file handles the logic for loading, saving, validating,
// and merging application configuration.

import * as fs from "fs"
import * as path from "path"
import { type Config, defaultConfig } from "./config-types" // Import types and defaults

// Function to get the path to the configuration file
export function getConfigPath(userDataPath: string): string {
  return path.join(userDataPath, "config.json")
}

// Validate the structure and types of the loaded configuration object
function validateConfigStructure(config: any): config is Config {
  if (!config || typeof config !== "object") {
    console.warn("Config validation failed: Not an object.")
    return false
  }

  // Check top-level sections
  const sections: Array<keyof Config> = ["app", "window", "target"]
  for (const section of sections) {
    if (!config[section] || typeof config[section] !== "object") {
      console.warn(`Config validation failed: Section '${section}' is missing or not an object.`)
      return false
    }
  }

  // Check specific properties and types (example for 'app' section)
  if (typeof config.app.title !== "string" || typeof config.app.openDevTools !== "boolean") {
    console.warn("Config validation failed: Invalid types in 'app' section.")
    return false
  }
  // Add more specific checks for other sections and properties as needed

  // Validate URL format in target section
  if (typeof config.target.url !== "string") {
    console.warn("Config validation failed: target.url is not a string.")
    return false
  }
  try {
    new URL(config.target.url)
  } catch (e) {
    console.warn(`Config validation failed: target.url '${config.target.url}' is not a valid URL.`)
    return false
  }

  // Validate domainConfig structure
  if (!config.target.domainConfig || typeof config.target.domainConfig !== "object") {
    console.warn("Config validation failed: target.domainConfig is missing or not an object.")
    return false
  }
  if (
    !Array.isArray(config.target.domainConfig.allowedDomains) ||
    !Array.isArray(config.target.domainConfig.blockedDomains) ||
    typeof config.target.domainConfig.allowSubdomains !== "boolean"
  ) {
    console.warn("Config validation failed: Invalid structure or types in target.domainConfig.")
    return false
  }

  return true
}

// Safely merge user configuration with default configuration
function mergeConfig(userConf: Partial<Config>): Config {
  // Deep merge ensuring all nested objects are handled
  const merged: Config = JSON.parse(JSON.stringify(defaultConfig)) // Deep clone defaults

  for (const sectionKey of Object.keys(defaultConfig) as Array<keyof Config>) {
    if (userConf[sectionKey]) {
      for (const propKey of Object.keys(defaultConfig[sectionKey])) {
        if (userConf[sectionKey]![propKey as keyof (typeof userConf)[typeof sectionKey]] !== undefined) {
          // @ts-ignore
          merged[sectionKey][propKey as keyof (typeof merged)[typeof sectionKey]] =
            userConf[sectionKey]![propKey as keyof (typeof userConf)[typeof sectionKey]]
        }
      }
    }
  }
  // Ensure domainConfig is properly merged if it exists in userConf
  if (userConf.target?.domainConfig) {
    merged.target.domainConfig = {
      ...defaultConfig.target.domainConfig,
      ...userConf.target.domainConfig,
    }
  }

  return merged
}

// Create the default configuration file if it doesn't exist
async function createDefaultConfigFile(configFilePath: string): Promise<void> {
  try {
    const configDir = path.dirname(configFilePath)
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }

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

    fs.writeFileSync(configFilePath, JSON.stringify(configWithComments, null, 2))
    console.log(`Created default configuration file at: ${configFilePath}`)
  } catch (error) {
    console.error("Failed to create default configuration file:", error)
  }
}

// Load configuration from file, or use defaults if file doesn't exist or is invalid
export async function loadConfiguration(userDataPath: string): Promise<Config> {
  const configFilePath = getConfigPath(userDataPath)

  try {
    if (fs.existsSync(configFilePath)) {
      console.log(`Loading configuration from: ${configFilePath}`)
      const configData = fs.readFileSync(configFilePath, "utf8")
      let userConfig: any

      try {
        userConfig = JSON.parse(configData)
        // Remove helper fields before validation and merging
        if (userConfig._comment) delete userConfig._comment
        if (userConfig._instructions) delete userConfig._instructions

        console.log("Parsed user configuration:", JSON.stringify(userConfig, null, 2))
      } catch (parseError) {
        console.error("Invalid JSON in configuration file. Backing up and creating new default config.", parseError)
        // Optionally, backup the malformed config file
        fs.copyFileSync(configFilePath, `${configFilePath}.bak-${Date.now()}`)
        await createDefaultConfigFile(configFilePath)
        return defaultConfig
      }

      if (validateConfigStructure(userConfig)) {
        const merged = mergeConfig(userConfig)
        console.log("Using merged configuration:", JSON.stringify(merged, null, 2))
        return merged
      } else {
        console.warn("Invalid configuration structure. Backing up and creating new default config.")
        fs.copyFileSync(configFilePath, `${configFilePath}.bak-${Date.now()}`)
        await createDefaultConfigFile(configFilePath)
        return defaultConfig
      }
    } else {
      console.log("No configuration file found. Creating default configuration.")
      await createDefaultConfigFile(configFilePath)
      return defaultConfig
    }
  } catch (error) {
    console.error("Error loading configuration:", error)
    // Fallback to default config in case of any other errors
    return defaultConfig
  }
}
