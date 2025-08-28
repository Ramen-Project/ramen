# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ramen is a **VSCode Extension** for visual programming with Python. It provides a node-based graph editor integrated directly into VSCode, allowing users to visually design and execute Python workflows.

## Common Development Commands

### VSCode Extension (Primary Focus)
- **Location**: `vscode-extension/` directory
- **Webview Build**: `cd vscode-extension/webview-build && bun run build`
- **Extension Build**: `cd vscode-extension && npm run compile`
- **Package Extension**: `cd vscode-extension && npm run package`
- **Development**: Edit extension TypeScript files and webview React app separately
- **Testing Extension**: Press F5 in VSCode to launch Extension Development Host

### Python Backend (Supporting Service)
- **Development**: Use `uv` as the Python package manager
- **Environment**: `uv venv` to create virtual environments
- **Run scripts**: `uv run <script>` to execute Python scripts in the uv project
- **Install dependencies**: `uv add <package>` or `uv pip install <package>`
- **Main entry**: `uv run ramen` or `python -m ramen.entrypoint`
- **CLI mode**: `ramen-cli` (launches backend service)
- **Server mode**: `ramen-cli server` for remote deployment
- **Execute graphs**: `ramen-cli run <graph_name> <kwargs>` for command-line execution

### Testing and Quality
- **TDD Approach**: Use Test-Driven Development (TDD) on this project
- **Frontend Testing**: `bun run test` (watch mode), `bun run test:run` (single run), `bun run test:ui` (UI mode)
- **Testing Framework**: Vitest + React Testing Library + jsdom
- Always use the linter to check code before committing

## Architecture Overview

Ramen is a **VSCode Extension** that provides visual programming capabilities for Python directly within the IDE.

### VSCode Extension (`vscode-extension/`) - Main Component
- **Extension Host**: TypeScript extension providing custom editor for `.ramen` files
- **Webview Graph Editor**: React + TypeScript visual editor (in `webview-build/`)
  - Visual node-based editor using @xyflow/react
  - Node library panel for adding components
  - Real-time graph execution and visualization
- **State Management**: Zustand stores for application state
- **UI Components**: Radix UI + VSCode theme integration
- **Communication**: VSCode webview API for extension ↔ webview messaging

### Python Backend (`src/ramen/`) - Supporting Service
- **Execution Engine**: Graph compilation and runtime
- **API Server**: REST API and WebSocket for real-time updates
- **CLI Interface**: Command-line tools for headless execution
- **Toppings**: Plugin system for extending functionality (numpy, pandas, torch, plots)
- **Environment Management**: UV integration for dependency isolation

### Project Structure
- **VSCode Extension**: `vscode-extension/` - Main deliverable, VSCode extension with graph editor
- **Python Backend**: `src/ramen/` - Supporting service for graph execution
- **Toppings**: `toppings/` - Plugin packages (numpy, pandas, torch, plots)
- **Documentation**: `docs/technical-design/` - Architecture and design specifications
- **Build script**: `build.py` - Build automation for both extension and backend

## Key Technical Details

### VSCode Integration
- Custom editor provider for `.ramen` files
- Webview-based graph editor embedded in VSCode
- Automatic backend service lifecycle management
- Native VSCode theming and command palette integration
- File system integration for graph persistence

### Session Management
- Single session per graph to prevent conflicting edits
- Automatic session handling when opening `.ramen` files
- WebSocket communication for real-time execution updates

### Execution Model
- Python backend service started automatically by extension
- Graphs compiled to Python bytecode for performance
- Isolated execution in uv-managed environments
- Support for both interactive (in VSCode) and headless execution
- Command-line execution: `ramen-cli run my_graph` for automation

### Plugin System ("Toppings")
- Extensible via workspace packages in `toppings/`
- Entry points defined in `pyproject.toml`
- Each topping provides specialized node types and operations

### Build and Dependencies
- Python: uv workspace with `pyproject.toml`
- Frontend: Vite + TypeScript with standard npm/bun workflow
- Monorepo structure with workspace members for toppings

## Development Guidelines

### Core Principles
- **VSCode Extension First**: Primary focus on VSCode extension development and UX
- **TDD + KANBAN**: Follow Test-Driven Development with KANBAN workflow management
- Use npm for VSCode extension dependencies
- Use bun for webview React app development
- Use uv for Python backend package management
- Always lint and test before committing
- Follow VSCode extension best practices and guidelines
- Check `docs/technical-design/` for architectural details

### TDD + KANBAN Workflow
1. **Before starting any feature**:
   - Update KANBAN.md with new tasks
   - Move task to "IN PROGRESS"
   - Write failing tests first (TDD Red phase)
   
2. **During development**:
   - Write minimal code to make tests pass (TDD Green phase)
   - Refactor code while keeping tests green (TDD Refactor phase)
   - Update KANBAN.md task status as you progress
   
3. **Before completing a feature**:
   - Ensure all tests pass
   - Run linter and fix any issues
   - Move KANBAN task to "TESTING" or "DONE"
   - Update task with completion notes if needed

### KANBAN Management
- **TO DO**: New tasks, planned features, bug reports
- **IN PROGRESS**: Currently working on (limit to 1-2 items)
- **TESTING**: Code complete, needs verification
- **DONE**: Completed and verified tasks

### Testing Strategy
- Write tests before implementation (TDD)
- Use appropriate testing frameworks for each component:
  - VSCode Extension: Mocha test framework (VSCode standard)
  - React Webview: Vitest + React Testing Library
  - Python backend: pytest or unittest
  - End-to-end: Extension Development Host testing
- Maintain test coverage and update tests when refactoring

## Usage Scenarios

### VSCode Extension (Primary Use)
1. **Open VSCode** and install Ramen extension
2. **Create/Open** `.ramen` files to launch visual editor
3. **Design graphs** using drag-and-drop node interface
4. **Execute graphs** directly within VSCode
5. **View results** in integrated output panels

### CLI Execution (Automation & CI/CD)
Execute saved graphs from command line:

```bash
# Basic execution
ramen-cli run my_pipeline input=data.csv output=results.json

# ML training with parameters
ramen-cli run train_model dataset=mnist.pkl learning_rate=0.01

# Data processing pipeline
ramen-cli run process_data source=raw.csv target=clean.csv
```

Benefits:
- Design visually in VSCode, execute anywhere
- Headless execution for automation and CI/CD
- Batch processing and scheduled execution
- Production deployment without VSCode dependency

## Project Purpose

- **VSCode Extension** for visual programming with Python
- Enables visual workflow design directly within VSCode IDE
- Supports data processing, machine learning, and general Python automation
- Interactive development in VSCode with optional headless execution via CLI
- Seamless integration with VSCode's development environment

## Feature Request and Development Guidelines

- When user requests new features, you should always put it to the KANBAN.md first.