# Ramen Project Roadmap

## Phase 1: Core MVP ✅ COMPLETED

- [x] **Graph Model & Serialization**
  - ✅ Implemented node, edge, port, and graph data structures
  - ✅ JSON-based serialization/deserialization with RamenGraphFile format
  - ✅ Versioning support with schema migration tools

- [x] **Basic Frontend**
  - ✅ Node-based graph editor with React + @xyflow/react
  - ✅ VSCode extension with custom editor for .ramen files
  - ✅ Drag-and-drop node library and property panels

- [x] **Backend & Kernel**
  - ✅ Graph parsing and in-memory representation
  - ✅ JIT compilation to Python bytecode
  - ✅ Execution engine in uv-managed environment
  - ✅ Real-time WebSocket communication for execution updates

- [x] **Project Management**
  - ✅ VSCode workspace integration
  - ✅ Automatic uv environment management
  - ✅ Project dependency tracking

- [x] **Single Session Enforcement**
  - ✅ Session manager with graph locking
  - ✅ Session takeover prompts for conflicting access

---

## Phase 2: Extensibility & Toppings ✅ COMPLETED

- [x] **Topping System**
  - ✅ Comprehensive ToppingBase API with NodeFunction and NodeMetadata
  - ✅ Entry points system for automatic topping discovery
  - ✅ 196+ built-in nodes across 10 namespaces
  - ✅ Modular toppings: numpy, pandas, torch, plots, nn-builder

- [x] **Topping Management UI**
  - ✅ Node library panel with topping categorization
  - ✅ Dynamic topping loading and error handling
  - ✅ Integrated dependency management with uv

- [x] **Custom Node/Edge Types**
  - ✅ Full support for user-defined nodes via toppings
  - ✅ Extensible type system with TypeRegistry
  - ✅ Custom port definitions and metadata

---

## Phase 3: Advanced Execution & Usability 🚧 IN PROGRESS

- [ ] **AOT Compilation & Caching**
  - Ahead-of-time compilation for faster repeated execution
  - Bytecode caching with graph hash versioning

- [ ] **Resource Management**
  - Optional CPU/memory/time limits per execution
  - Process isolation and monitoring

- [x] **Improved Error Handling** 
  - ✅ Node/edge context in error messages via WebSocket streaming
  - ✅ Real-time execution status and error propagation
  - ✅ VSCode integrated error display and debugging

- [x] **Graph Versioning & Migration**
  - ✅ Schema version tracking in GraphMetadata
  - ✅ Migration tools for format compatibility
  - ✅ Backward compatibility support

- [x] **Git Integration & Version Control** ✅ COMPLETED
  - ✅ Semantic diff system for .ramen files
  - ✅ Node-level change detection and analysis
  - ✅ VSCode Git integration commands (diff, status, log)
  - ✅ REST API for graph diff computation
  - ✅ Visual diff viewer with HTML webview
  - [ ] Conflict resolution for graph merging (Phase 3 next)
  - [ ] Graph history and version comparison UI (Phase 3 next)

- [ ] **Frontend Components with Toppings** 🆕 NEW FEATURE
  - Package-bundled frontend components for rich UI nodes
  - React components distributed with topping packages
  - Automatic component discovery from installed toppings
  - Custom UI elements for data visualization and interaction
  - Self-contained topping architecture (backend + frontend)

- [ ] **Session Persistence**
  - Restore session state after browser refresh/crash
  - Persistent execution contexts

---

## Phase 4: Collaboration & Deployment

- [ ] **Multi-Session Support**
  - Multiple projects open in different tabs
  - Real-time updates for session state

- [ ] **Remote/Server Deployment**
  - CLI/server mode for remote access
  - Configurable host/port

- [ ] **Authentication (Optional/Future)**
  - If needed, add basic user authentication for remote deployments

---

## Phase 5: Community & Ecosystem

- [ ] **Documentation & Tutorials**
  - User guide, developer guide, topping/plugin guide

- [ ] **Example Projects & Templates**
  - Pre-built graphs for common data science/ML tasks

- [ ] **Community Topping Registry**
  - Discover and share toppings/plugins

- [ ] **API Stability & LTS**
  - Freeze core APIs, provide long-term support

---

## Ongoing

- [ ] **Testing & CI**
  - Automated tests for frontend, backend, and toppings
  - Continuous integration setup

- [ ] **Performance Optimization**
  - Profiling and tuning for large graphs and heavy workloads

- [ ] **Feedback & Iteration**
  - Gather user feedback, iterate on features and UX

---

## Visual Roadmap (Mermaid)

```mermaid
gantt
    title Ramen Project Roadmap (Updated 2025-08)
    dateFormat  YYYY-MM-DD
    section Core MVP ✅
    Graph Model & Serialization      :done,    des1, 2024-07-01, 2024-12-01
    Basic Frontend                   :done,    des2, 2024-07-01, 2024-12-01
    Backend & Kernel                 :done,    des3, 2024-07-01, 2024-12-01
    Project Management               :done,    des4, 2024-07-01, 2024-12-01
    Single Session Enforcement      :done,    des5, 2024-07-01, 2024-12-01
    section Extensibility & Toppings ✅
    Topping System                   :done,    des6, 2024-10-01, 2025-01-01
    Topping Management UI            :done,    des7, 2024-10-01, 2025-01-01
    Custom Node/Edge Types           :done,    des8, 2024-10-01, 2025-01-01
    section Advanced Execution & Usability 🚧
    AOT Compilation & Caching        :         des9, 2025-02-01, 2025-02-15
    Resource Management              :         des10, 2025-02-15, 2025-03-01
    Improved Error Handling          :done,    des11, 2024-12-01, 2025-01-15
    Graph Versioning & Migration     :done,    des12, 2024-12-01, 2025-01-15
    Git Integration & Version Control :active, des13, 2025-01-15, 2025-02-15
    Session Persistence              :         des14, 2025-03-01, 2025-03-15
    section Collaboration & Deployment
    Multi-Session Support            :         des15, 2025-03-15, 2025-04-01
    Remote/Server Deployment         :         des16, 2025-04-01, 2025-04-15
    Authentication (Optional)        :         des17, 2025-04-15, 2025-05-01
    section Community & Ecosystem
    Documentation & Tutorials        :         des18, 2025-05-01, 2025-05-15
    Example Projects & Templates     :         des19, 2025-05-15, 2025-06-01
    Community Topping Registry       :         des20, 2025-06-01, 2025-06-15
    API Stability & LTS              :         des21, 2025-06-15, 2025-07-01
    section Ongoing
    Testing & CI                     :active,  des22, 2024-07-01, 2025-12-31
    Performance Optimization         :         des23, 2025-01-01, 2025-12-31
    Feedback & Iteration             :active,  des24, 2024-07-01, 2025-12-31
``` 