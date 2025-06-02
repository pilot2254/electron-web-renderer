// This file defines the structure and default values for the application configuration.
// It should not contain any file I/O or complex logic.

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

// Default configuration values
export const defaultConfig: Config = {
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
      allowedDomains: ["github.com", "githubusercontent.com"], // Default to allow GitHub and its assets
      blockedDomains: [],
      allowSubdomains: true,
    },
    injectCSS: false,
  },
}
