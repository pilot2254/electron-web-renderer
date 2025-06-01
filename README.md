# Electron Web Renderer

A configurable Electron application that renders web content with advanced domain restrictions. This app allows you to wrap any website in a desktop application with granular control over navigation and security.

## Features

- 🌐 Render any website in a desktop application
- 🔒 Advanced domain restriction with allowlists and blocklists
- 🎯 Subdomain control for fine-grained access management
- ⚙️ Highly configurable through a JSON configuration file
- 🛡️ Security-focused with Electron best practices
- 🎨 Optional custom CSS injection
- 🔧 TypeScript for better code quality and developer experience

## Quick Start

### Prerequisites

- Node.js (v16 or later)
- npm or yarn

### Installation & Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd electron-web-renderer
   npm install
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

The app will create a default configuration file on first run and load your GitHub profile.

## Configuration

### Configuration File Location

The configuration file is automatically created at:
- **Windows:** `%APPDATA%\electron-web-renderer\config.json`
- **macOS:** `~/Library/Application Support/electron-web-renderer/config.json`
- **Linux:** `~/.config/electron-web-renderer/config.json`

### Basic Configuration

```json
{
  "app": {
    "title": "GitHub Profile Viewer",
    "iconPath": "path/to/icon.png",
    "openDevTools": false
  },
  "window": {
    "width": 1200,
    "height": 800,
    "minWidth": 800,
    "minHeight": 600,
    "maximized": false,
    "fullscreen": false
  },
  "target": {
    "url": "https://github.com/pilot2254",
    "openLinksExternally": true,
    "restrictToDomain": true,
    "domainConfig": {
      "allowedDomains": ["github.com", "githubusercontent.com"],
      "blockedDomains": [],
      "allowSubdomains": true
    },
    "injectCSS": false,
    "cssPath": "path/to/custom.css"
  }
}
```

## Advanced Domain Configuration

### Domain Configuration Options

- **`allowedDomains`**: Array of domains that are permitted within the app
- **`blockedDomains`**: Array of domains that should always open externally (takes precedence over allowedDomains)
- **`allowSubdomains`**: Whether to allow subdomains of allowed domains

### Configuration Examples

#### 1. GitHub Only (Strict)
```json
{
  "target": {
    "restrictToDomain": true,
    "domainConfig": {
      "allowedDomains": ["github.com"],
      "blockedDomains": [],
      "allowSubdomains": true
    }
  }
}
```
**Result**: Only GitHub and its subdomains (api.github.com, docs.github.com) are allowed.

#### 2. Development Tools
```json
{
  "target": {
    "restrictToDomain": true,
    "domainConfig": {
      "allowedDomains": [
        "github.com",
        "stackoverflow.com",
        "developer.mozilla.org",
        "nodejs.org",
        "npmjs.com"
      ],
      "blockedDomains": ["facebook.com", "twitter.com"],
      "allowSubdomains": true
    }
  }
}
```
**Result**: Multiple development-related sites are allowed, but social media is blocked.

#### 3. Company Mode (Ultra Strict)
```json
{
  "target": {
    "restrictToDomain": true,
    "domainConfig": {
      "allowedDomains": ["github.com"],
      "blockedDomains": [
        "facebook.com",
        "twitter.com",
        "instagram.com",
        "youtube.com",
        "reddit.com",
        "tiktok.com"
      ],
      "allowSubdomains": false
    }
  }
}
```
**Result**: Only exact GitHub domain allowed, all social media blocked, no subdomains.

#### 4. Unrestricted Mode
```json
{
  "target": {
    "restrictToDomain": false,
    "domainConfig": {
      "allowedDomains": [],
      "blockedDomains": [],
      "allowSubdomains": true
    }
  }
}
```
**Result**: No restrictions, users can navigate anywhere.

### How Domain Checking Works

1. **Blocked Domains First**: If a domain is in `blockedDomains`, it's always blocked (takes precedence)
2. **Allowed Domains**: If `allowedDomains` is not empty, only those domains are permitted
3. **Empty Allowed List**: If `allowedDomains` is empty, only the original domain from `url` is allowed
4. **Subdomain Handling**: If `allowSubdomains` is true, subdomains of allowed domains are also permitted

### Subdomain Examples

With `"allowSubdomains": true` and `"allowedDomains": ["github.com"]`:
- ✅ `github.com` - Allowed
- ✅ `api.github.com` - Allowed (subdomain)
- ✅ `docs.github.com` - Allowed (subdomain)
- ❌ `gitlab.com` - Blocked (different domain)

With `"allowSubdomains": false`:
- ✅ `github.com` - Allowed
- ❌ `api.github.com` - Blocked (subdomain not allowed)
- ❌ `docs.github.com` - Blocked (subdomain not allowed)

## Development

### Available Scripts

- `npm run dev`: Build and start with development logging
- `npm run build`: Build TypeScript to JavaScript
- `npm run build:watch`: Watch for changes and rebuild
- `npm run dev:watch`: Development mode with auto-restart
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Fix linting issues automatically

### Development Tips

1. **Enable Developer Tools**: Set `"openDevTools": true` in config for debugging
2. **Watch Mode**: Use `npm run dev:watch` for development with auto-reload
3. **Domain Testing**: Check console output for detailed domain checking logs
4. **Configuration Testing**: The app logs all navigation attempts and decisions

## Building for Distribution

### Build for Current Platform
```bash
npm run pack    # Creates unpacked app in dist/
npm run dist    # Creates installer/package
```

### Build for All Platforms
```bash
npm run dist:all    # Creates packages for Windows, macOS, and Linux
```

## Troubleshooting

### Domain Navigation Issues
1. Check console output for domain checking logs
2. Verify domain names in config don't include protocols (use `github.com`, not `https://github.com`)
3. Check if `allowSubdomains` setting matches your needs
4. Ensure `blockedDomains` doesn't conflict with `allowedDomains`

### Configuration Problems
1. Validate JSON syntax in config file
2. Check console output for configuration loading errors
3. Delete config file to regenerate defaults
4. Use examples from `examples/config-examples.json`

### Performance Issues
- Disable `openDevTools` in production
- Consider enabling `injectCSS` to hide unnecessary page elements
- Use specific domains instead of allowing all subdomains if possible

## Security Notes

- The app follows Electron security best practices
- Context isolation and sandboxing are enabled
- Node.js integration is disabled in the renderer
- Domain restrictions help prevent malicious navigation
- Blocked domains take precedence over allowed domains for security

## Use Cases

- **GitHub Profile Viewer**: Browse GitHub while blocking distracting sites
- **Company Development Environment**: Allow work-related sites only
- **Educational Tool**: Restrict students to educational domains
- **Focused Browsing**: Block social media while allowing work sites
- **Kiosk Mode**: Restrict navigation to specific company domains

## License

MIT License - feel free to modify and distribute.
