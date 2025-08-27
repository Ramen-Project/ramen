# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Python Backend
- **Development**: Use `uv` as the Python package manager
- **Environment**: `uv venv` to create virtual environments
- **Run scripts**: `uv run <script>` to execute Python scripts in the uv project
- **Install dependencies**: `uv add <package>` or `uv pip install <package>`
- **Main entry**: `uv run ramen` or `python -m ramen.entrypoint`
- **GUI mode**: `ramen-cli` (launches local web interface)
- **Server mode**: `ramen-cli server` for remote deployment
- **Execute graphs**: `ramen-cli run <graph_name> <kwargs>` for command-line execution

### VSCode Extension
- **Location**: `vscode-extension/` directory
- **Webview Build**: `cd vscode-extension/webview-build && bun run build`
- **Extension Build**: `cd vscode-extension && npm run compile`
- **Package Extension**: `cd vscode-extension && npm run package`
- **Development**: Edit extension TypeScript files and webview React app separately

### Testing and Quality
- **TDD Approach**: Use Test-Driven Development (TDD) on this project
- **Frontend Testing**: `bun run test` (watch mode), `bun run test:run` (single run), `bun run test:ui` (UI mode)
- **Testing Framework**: Vitest + React Testing Library + jsdom
- Always use the linter to check code before committing

## Architecture Overview

Ramen is a visual programming environment for Python with the following key components:

### Backend (`src/ramen/`)
- **Core**: Graph execution engine, compilation/JIT, module system
- **API**: REST API and WebSocket communication
- **CLI**: Command-line interface and server management
- **Toppings**: Plugin system for extending functionality (numpy, pandas, torch, plots)
- **UV Wrapper**: Integration with uv for environment management

### VSCode Extension (`vscode-extension/`)
- **Extension Backend**: TypeScript extension host, custom editor providers
- **Webview Frontend**: React + TypeScript graph editor (in `webview-build/`)
- **Graph Editor**: Visual node-based editor using @xyflow/react
- **Components**: Node system, bottom node library, graph management
- **State Management**: Zustand stores for app state
- **Styling**: Radix UI components with VSCode theming
- **Communication**: VSCode webview API + REST API to backend

### Project Structure
- **Main Python package**: `src/ramen/` - core backend functionality
- **VSCode Extension**: `vscode-extension/` - VSCode extension with embedded graph editor
- **Toppings**: `toppings/` - plugin packages (numpy, pandas, torch, plots)
- **Documentation**: `docs/technical-design/` - detailed architecture specs
- **Build script**: `build.py` - custom build automation

## Key Technical Details

### Session Management
- Single session per graph - prevents conflicting edits
- Session conflicts prompt user to terminate existing or cancel
- WebSocket communication for real-time updates

### Execution Model
- Graphs compiled/JIT to Python bytecode for performance
- Isolated execution in uv-managed environments per project
- Support for both local and remote (server) deployment
- Command-line execution: graphs can be run headlessly with `ramen-cli run`
- File extension optional: `ramen-cli run my_graph` auto-resolves to `my_graph.ramen`

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
- **TDD + KANBAN**: Follow Test-Driven Development with KANBAN workflow management
- Use uv for all Python package management
- Use bun for Node.js package management (frontend)
- Write PoC code before production implementation
- Always lint code before committing
- Follow existing patterns in component structure and naming
- Check `docs/technical-design/` for detailed architectural guidance
- Always ask questions for implementation details

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
  - Python backend: pytest or unittest
  - React frontend: Jest + React Testing Library
  - Integration tests for API endpoints
- Maintain test coverage and update tests when refactoring

## CLI Graph Execution Examples

Execute graphs from command line with parameters:

```bash
# Basic execution (auto-resolves my_pipeline.ramen)
ramen-cli run my_pipeline input=data.csv output=results.json

# ML training with hyperparameters
ramen-cli run train_model dataset=mnist.pkl learning_rate=0.01 epochs=100

# Data processing pipeline
ramen-cli run process_data source=raw.csv target=clean.csv batch_size=1000

# Analysis with date parameter
ramen-cli run daily_report date=$(date +%Y-%m-%d) email=team@company.com
```

Benefits:
- Design graphs visually, execute programmatically
- Production deployment without GUI dependencies
- CI/CD integration and automation
- Batch processing and scheduled execution

## Project Purpose

- This project is mainly for Machine Learning usage, but not limited to.
- Supports both visual development (GUI) and programmatic execution (CLI)
- Planned VSCode extension for IDE integration

## Feature Request and Development Guidelines

- When user requests new features, you should always put it to the KANBAN.md first.