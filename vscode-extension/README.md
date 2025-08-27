# Ramen VSCode Extension

Visual programming environment for Python with node-based graph editor, directly integrated into Visual Studio Code.

## Features

- **Visual Graph Editor**: Open and edit `.ramen` graph files with a full-featured node-based editor
- **Language Server Protocol**: Get intelligent code assistance including:
  - Syntax validation for graph files
  - Auto-completion for node types
  - Hover information
  - Document symbols
  - Graph formatting
- **Integrated Backend Server**: Automatically manages the Ramen Python backend
- **Graph Execution**: Run graphs directly from VSCode with output in the integrated terminal
- **Project Management**: Manage dependencies with `uv` integration
- **Tree View**: Browse all graphs in your workspace with the dedicated Ramen sidebar

## Requirements

- **VSCode**: Version 1.85.0 or later
- **Python**: Version 3.12 or later
- **uv**: Python package manager (for dependency management)
- **Ramen**: The Ramen package must be installed in your Python environment

## Installation

1. Install the extension from the VSCode Marketplace (when published)
2. Or install from VSIX file:
   ```bash
   code --install-extension ramen-vscode-0.1.0.vsix
   ```

## Quick Start

1. Open a folder containing `.ramen` files or create a new one
2. Use `Ctrl+Alt+R` (or `Cmd+Alt+R` on Mac) to open the graph editor for a `.ramen` file
3. Or right-click on any `.ramen` file and select "Ramen: Open Graph Editor"
4. Create new graphs with the command "Ramen: Create New Graph"

## Extension Settings

This extension contributes the following settings:

- `ramen.pythonPath`: Path to Python interpreter (defaults to system Python)
- `ramen.serverPort`: Port for Ramen backend server (default: 8000)
- `ramen.autoStartServer`: Automatically start server when opening .ramen files (default: true)
- `ramen.enableLanguageServer`: Enable Language Server Protocol features (default: true)
- `ramen.theme`: UI theme for graph editor (light/dark/auto, default: auto)
- `ramen.debugMode`: Enable debug logging (default: false)

## Commands

- **Ramen: Open Graph Editor** - Opens the visual graph editor for a `.ramen` file
- **Ramen: Create New Graph** - Creates a new graph file
- **Ramen: Execute Graph** - Runs the current graph
- **Ramen: Manage Project Dependencies** - Opens terminal to manage dependencies with `uv`
- **Ramen: Stop Server** - Stops the Ramen backend server
- **Ramen: Restart Server** - Restarts the Ramen backend server

## Keyboard Shortcuts

- `Ctrl+Alt+R` / `Cmd+Alt+R`: Open graph editor
- `F5`: Execute current graph

## Development

### Building the Extension

1. Install dependencies:
   ```bash
   cd vscode-extension
   npm install
   ```

2. Compile TypeScript:
   ```bash
   npm run compile
   ```

3. Package the extension:
   ```bash
   npm run package
   ```

### Testing

1. Open the extension folder in VSCode
2. Press `F5` to launch a new Extension Development Host window
3. Open a folder with `.ramen` files to test the extension

### Project Structure

```
vscode-extension/
├── src/
│   ├── extension/
│   │   ├── extension.ts          # Main extension entry point
│   │   ├── commands.ts           # Command implementations
│   │   ├── webview/
│   │   │   └── webviewManager.ts # Webview panel management
│   │   ├── server/
│   │   │   └── serverManager.ts  # Backend server management
│   │   ├── language/
│   │   │   └── languageClient.ts # Language Server client
│   │   └── providers/
│   │       └── graphProvider.ts  # Tree view provider
│   ├── language-server/
│   │   └── server.py             # Python Language Server
│   └── webview/
│       └── (React app bundle)    # Frontend application
├── media/                        # Static resources
├── resources/                    # Icons and images
├── package.json                  # Extension manifest
└── tsconfig.json                # TypeScript configuration
```

## Known Issues

- Language Server requires `pygls` Python package to be installed
- Webview content security policy may need adjustment for some environments
- Server auto-start may fail if Python is not in PATH

## Contributing

Please report issues and feature requests on the [GitHub repository](https://github.com/yourusername/ramen).

## License

MIT