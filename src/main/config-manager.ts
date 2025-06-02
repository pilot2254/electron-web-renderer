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
function validateConfigStructure(config: unknown): config is Config {
  if (!config || typeof config !== "object" || config === null) {
    console.warn("Config validation failed: Not a non-null object.")
    return false
  }

  const potentialConfig = config as Record<string, unknown>

  // Check top-level sections
  const sections: Array<keyof Config> = ["app", "window", "target"]
  for (const section of sections) {
    if (
      !potentialConfig[section] ||
      typeof potentialConfig[section] !== "object" ||
      potentialConfig[section] === null
    ) {
      console.warn(`Config validation failed: Section '${section}' is missing or not a non-null object.`)
      return false
    }
  }

  const appConfig = potentialConfig.app as Record<string, unknown>
  if (typeof appConfig.title !== "string" || typeof appConfig.openDevTools !== "boolean") {
    console.warn("Config validation failed: Invalid types in 'app' section.")
    return false
  }

  const targetConfig = potentialConfig.target as Record<string, unknown>
  if (typeof targetConfig.url !== "string") {
    console.warn("Config validation failed: target.url is not a string.")
    return false
  }
  try {
    new URL(targetConfig.url as string)
  } catch (e) {
    console.warn(`Config validation failed: target.url '${targetConfig.url}' is not a valid URL.`)
    return false
  }

  const domainConfig = targetConfig.domainConfig as Record<string, unknown>
  if (!domainConfig || typeof domainConfig !== "object" || domainConfig === null) {
    console.warn("Config validation failed: target.domainConfig is missing or not a non-null object.")
    return false
  }
  if (
    !Array.isArray(domainConfig.allowedDomains) ||
    !Array.isArray(domainConfig.blockedDomains) ||
    typeof domainConfig.allowSubdomains !== "boolean"
  ) {
    console.warn("Config validation failed: Invalid structure or types in target.domainConfig.")
    return false
  }
  // Ensure array elements are strings for domain lists
  if (
    !domainConfig.allowedDomains.every((item) => typeof item === "string") ||
    !domainConfig.blockedDomains.every((item) => typeof item === "string")
  ) {
    console.warn("Config validation failed: Domain lists must contain only strings.")
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
        const userSection = userConf[sectionKey]
        if (userSection && userSection[propKey as keyof typeof userSection] !== undefined) {
          // @ts-expect-error This dynamic assignment is tricky for TS but correct for deep merge
          merged[sectionKey][propKey as keyof (typeof merged)[typeof sectionKey]] =
            userSection[propKey as keyof typeof userSection]
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
      let userConfigFromFile: unknown // Use unknown for initial parsing

      try {
        userConfigFromFile = JSON.parse(configData)

        let tempConfig: Record<string, unknown> = {}
        if (typeof userConfigFromFile === "object" && userConfigFromFile !== null) {
          tempConfig = { ...userConfigFromFile } // Shallow copy to modify
        }

        // Remove helper fields before validation and merging
        if (tempConfig._comment) delete tempConfig._comment
        if (tempConfig._instructions) delete tempConfig._instructions

        console.log("Parsed user configuration (after removing comments):", JSON.stringify(tempConfig, null, 2))

        // Now validate the cleaned structure
        if (validateConfigStructure(tempConfig)) {
          const merged = mergeConfig(tempConfig as Partial<Config>) // Cast after validation
          console.log("Using merged configuration:", JSON.stringify(merged, null, 2))
          return merged
        } else {
          console.warn("Invalid configuration structure after parsing. Backing up and creating new default config.")
          fs.copyFileSync(configFilePath, `${configFilePath}.bak-${Date.now()}`)
          await createDefaultConfigFile(configFilePath)
          return defaultConfig
        }
      } catch (parseError) {
        console.error("Invalid JSON in configuration file. Backing up and creating new default config.", parseError)
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
    return defaultConfig
  }
}
