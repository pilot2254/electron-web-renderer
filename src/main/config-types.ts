// This file defines the structure and default values for the application configuration.
// It should not contain any file I/O or complex logic.

// Configuration interface
export interface Config {
  app: {
    title: string // The title of the application window
    iconPath?: string // Optional path to an application icon (e.g., .png, .ico)
    openDevTools: boolean // Whether to open browser developer tools on startup
  }
  window: {
    width: number // Initial width of the application window in pixels
    height: number // Initial height of the application window in pixels
    minWidth: number // Minimum width the window can be resized to
    minHeight: number // Minimum height the window can be resized to
    maximized: boolean // Whether the window should start maximized
    fullscreen: boolean // Whether the window should start in fullscreen mode
  }
  target: {
    url: string // The initial URL the application will load
    openLinksExternally: boolean // If true, all links that would open a new window/tab are opened in the system's default browser
    restrictToDomain: boolean // If true, navigation is restricted based on domainConfig settings
    domainConfig: {
      allowedDomains: string[] // List of domains (e.g., "example.com") allowed for in-app navigation
      blockedDomains: string[] // List of domains explicitly blocked (will always open externally, takes precedence over allowedDomains)
      allowSubdomains: boolean // If true, subdomains of entries in allowedDomains are also permitted (e.g., "sub.example.com")
    }
    injectCSS: boolean // If true, custom CSS from cssPath will be injected into the loaded page
    cssPath?: string // Optional path to a custom CSS file to inject
  }
}

// Default configuration values - This serves as a showcase example.
// Users can modify their own config.json based on this structure.
export const defaultConfig: Config = {
  app: {
    // Application-specific settings
    title: "My Web App Viewer (Dev Mode)", // Window title, clearly indicating it's a showcase
    iconPath: "./assets/app-icon.png", // Example path: ensure this file exists or remove/update path
    openDevTools: true, // Open developer tools by default for this showcase config
  },
  window: {
    // Window behavior and appearance settings
    width: 1280, // A common default width
    height: 800, // A common default height
    minWidth: 600, // Minimum reasonable width
    minHeight: 400, // Minimum reasonable height
    maximized: false, // Start windowed, not maximized
    fullscreen: false, // Start windowed, not fullscreen
  },
  target: {
    // Settings related to the web content being displayed
    url: "https://github.com/pilot2254", // Default URL to load (user's GitHub profile)
    openLinksExternally: true, // Good default for security and usability: external links open in the main browser
    restrictToDomain: true, // Enable domain restriction by default for this showcase
    domainConfig: {
      // Configuration for domain restriction
      allowedDomains: [
        "github.com", // Allow navigation within github.com
        "githubusercontent.com", // Often needed for GitHub assets like images
        "docs.github.com", // Example of allowing a specific subdomain directly
        "pilot2254.github.io", // Allow navigation to the user's GitHub Pages
      ],
      blockedDomains: [
        "ads.example.com", // Example: explicitly block an ad domain even if it's a subdomain of an allowed one (if allowSubdomains is true)
        "malicious.example.net", // Example: block a known problematic domain
      ],
      allowSubdomains: true, // Allow subdomains of `allowedDomains` (e.g., `gist.github.com` would be allowed)
    },
    injectCSS: true, // Enable CSS injection for this showcase
    cssPath: "./assets/custom-styles.css", // Example path: ensure this file exists or remove/update path
  },
}
