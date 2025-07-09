# Ramen Project Tasks

## Phase 1: Core MVP

### 1.1 Graph Model & Serialization
- [ ] **graph-structures** - Define node, edge, port, and graph data structures (Python & TypeScript)
- [ ] **json-schema** - Implement JSON schema for graph serialization/deserialization (depends: graph-structures)
- [ ] **graph-versioning** - Add versioning to graph schema (depends: json-schema)
- [ ] **serialization-tests** - Unit tests for serialization/deserialization (depends: json-schema)
- [ ] **custom-metadata** - Support for custom metadata in nodes/edges/ports (depends: graph-structures)

### 1.2 Basic Frontend
- [ ] **react-setup** - Set up React project with Vite and TypeScript
- [ ] **xyflow-integration** - Integrate @xyflow/react for graph editing (depends: react-setup)
- [ ] **node-palette** - Implement node palette and drag-to-canvas (depends: xyflow-integration)
- [ ] **node-operations** - Node/edge creation, deletion, and movement (depends: node-palette)
- [ ] **port-connections** - Port-based connection logic and validation (depends: node-operations)
- [ ] **project-dialogs** - Project open/save dialogs (local filesystem) (depends: port-connections)
- [ ] **ui-polish** - Minimal UI/UX polish (layout, theming, error messages) (depends: project-dialogs)
- [ ] **metadata-ui** - Display node/edge metadata in UI (depends: ui-polish)

### 1.3 Backend & Kernel
- [ ] **backend-api** - Implement backend API (FastAPI or similar)
- [ ] **graph-parsing** - Parse and validate incoming graph JSON (depends: backend-api, json-schema)
- [ ] **jit-compilation** - JIT compile graph to Python bytecode (depends: graph-parsing)
- [ ] **uv-execution** - Launch execution in uv-managed environment (depends: jit-compilation)
- [ ] **websocket-streaming** - Stream logs/results/errors to frontend (WebSocket) (depends: uv-execution)
- [ ] **error-propagation** - Error propagation and context (node/edge info) (depends: websocket-streaming)
- [ ] **kernel-api** - Kernel API for node/edge execution (depends: error-propagation)

### 1.4 Project Management
- [ ] **project-management** - Create/open/switch projects (UI and backend) (depends: project-dialogs)
- [ ] **project-metadata** - Store project metadata (name, path, toppings, etc.) (depends: project-management)
- [ ] **uv-sync** - Run uv sync on project load/switch (depends: project-metadata)
- [ ] **project-ui** - UI for project switching and recent projects (depends: uv-sync)

### 1.5 Single Session Enforcement
- [ ] **session-tracking** - Track active sessions per graph/project (depends: project-ui)
- [ ] **session-prompt** - Prompt user to terminate/take over if already open (depends: session-tracking)
- [ ] **session-cleanup** - Handle session termination and cleanup (depends: session-prompt)
- [ ] **session-ui** - UI feedback for session status (depends: session-cleanup)

## Phase 2: Extensibility & Toppings

### 2.1 Topping System
- [ ] **topping-api** - Define topping/plugin API (Python) (depends: kernel-api)
- [ ] **dynamic-registration** - Kernel support for dynamic node/edge registration (depends: topping-api)
- [ ] **numpy-topping** - Example topping: numpy (array ops) (depends: dynamic-registration)
- [ ] **pandas-topping** - Example topping: pandas (dataframe ops) (depends: dynamic-registration)
- [ ] **torch-topping** - Example topping: torch (ML ops) (depends: dynamic-registration)
- [ ] **plots-topping** - Example topping: plots (visualization nodes) (depends: dynamic-registration)
- [ ] **topping-tests** - Unit tests for topping loading and execution (depends: numpy-topping, pandas-topping, torch-topping, plots-topping)

### 2.2 Topping Management UI
- [ ] **topping-list** - List installed toppings in project (depends: topping-tests)
- [ ] **topping-management** - Install/uninstall toppings from frontend (calls backend) (depends: topping-list)
- [ ] **topping-ui** - UI for topping details and documentation (depends: topping-management)

### 2.3 Custom Node/Edge Types
- [ ] **custom-types** - User-defined node/edge types via toppings (depends: topping-ui)
- [ ] **custom-ports** - Support for custom port types and validation (depends: custom-types)
- [ ] **custom-ui** - UI for configuring custom nodes/edges (depends: custom-ports)

## Phase 3: Advanced Execution & Usability

### 3.1 AOT Compilation & Caching
- [ ] **aot-pipeline** - Implement AOT compilation pipeline (depends: jit-compilation)
- [ ] **bytecode-cache** - Cache compiled bytecode per graph version/hash (depends: aot-pipeline)
- [ ] **jit-fallback** - Fallback to JIT if cache is invalid (depends: bytecode-cache)

### 3.2 Resource Management
- [ ] **resource-limits** - Optional CPU/memory/time limits per execution (configurable) (depends: jit-fallback)
- [ ] **resource-ui** - UI for resource usage and limits (depends: resource-limits)
- [ ] **graceful-termination** - Graceful termination on resource exhaustion (depends: resource-ui)

### 3.3 Improved Error Handling
- [ ] **error-context** - Node/edge context in error messages (depends: error-propagation)
- [ ] **error-ui** - UI for error inspection, stack traces, and quick navigation (depends: error-context)
- [ ] **error-suggestions** - Suggestions for common errors (depends: error-ui)

### 3.4 Graph Versioning & Migration
- [ ] **schema-migration** - Tools for upgrading graph schemas (depends: graph-versioning)
- [ ] **migration-scripts** - Migration scripts for breaking changes (depends: schema-migration)

### 3.5 Session Persistence
- [ ] **session-persistence** - Save/restore session state after browser refresh/crash (depends: session-ui)
- [ ] **recovery-ui** - UI for recovering unsaved work (depends: session-persistence)

## Phase 4: Collaboration & Deployment

### 4.1 Multi-Session Support
- [ ] **multi-tabs** - Multiple projects open in different tabs (depends: recovery-ui)
- [ ] **realtime-updates** - Real-time updates for session state (WebSocket) (depends: multi-tabs)
- [ ] **session-management-ui** - UI for managing open sessions (depends: realtime-updates)

### 4.2 Remote/Server Deployment
- [ ] **cli-server** - CLI/server mode for remote access (depends: session-management-ui)
- [ ] **server-config** - Configurable host/port and CORS (depends: cli-server)
- [ ] **deployment-scripts** - Deployment scripts (Docker, systemd, etc.) (depends: server-config)

### 4.3 Authentication (Optional/Future)
- [ ] **auth-basic** - Basic user authentication (if needed) (depends: deployment-scripts)
- [ ] **auth-roles** - Role-based access (admin/editor, if needed) (depends: auth-basic)
- [ ] **auth-ui** - UI for login/logout (depends: auth-roles)

## Phase 5: Community & Ecosystem

### 5.1 Documentation & Tutorials
- [ ] **user-guide** - User guide (graph editing, execution, troubleshooting) (depends: auth-ui)
- [ ] **dev-guide** - Developer guide (API, plugin/topping development) (depends: user-guide)
- [ ] **plugin-guide** - Topping/plugin guide (best practices, examples) (depends: dev-guide)
- [ ] **video-tutorials** - Video tutorials and walkthroughs (depends: plugin-guide)

### 5.2 Example Projects & Templates
- [ ] **example-graphs** - Pre-built graphs for data science, ML, ETL, etc. (depends: video-tutorials)
- [ ] **project-templates** - Project templates for common use cases (depends: example-graphs)

### 5.3 Community Topping Registry
- [ ] **topping-registry** - Web portal for discovering and sharing toppings/plugins (depends: project-templates)
- [ ] **community-process** - Submission/review process for community contributions (depends: topping-registry)

### 5.4 API Stability & LTS
- [ ] **api-freeze** - Freeze core APIs for long-term support (depends: community-process)
- [ ] **deprecation-policy** - Deprecation policy and migration guides (depends: api-freeze)

## Ongoing

### 6.1 Testing & CI
- [ ] **automated-tests** - Automated unit/integration tests for frontend, backend, and toppings (depends: serialization-tests, topping-tests)
- [ ] **ci-setup** - Continuous integration setup (GitHub Actions, etc.) (depends: automated-tests)
- [ ] **code-quality** - Code coverage and quality checks (depends: ci-setup)

### 6.2 Performance Optimization
- [ ] **performance-profiling** - Profiling for large graphs and heavy workloads (depends: code-quality)
- [ ] **performance-optimization** - Optimizations for graph rendering and execution (depends: performance-profiling)

### 6.3 Feedback & Iteration
- [ ] **user-feedback** - Gather user feedback (issues, surveys, analytics) (depends: performance-optimization)
- [ ] **feature-iteration** - Regularly iterate on features and UX (depends: user-feedback)

## Task Status Legend
- [ ] Pending
- [x] Completed
- [~] In Progress
- [!] Blocked

## Dependency Graph
Tasks are listed with their dependencies in parentheses. Complete dependencies before starting dependent tasks. 