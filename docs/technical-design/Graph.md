# Ramen Graph Model

## Overview
The Ramen Graph Model defines the structure, serialization, and semantics of computational graphs in Ramen. Each graph consists of nodes (operations, data, control structures) and edges (data flow, control flow), supporting advanced features such as generics, metadata, and plugin extensions.

---

## Core Concepts

- **Node:** Represents an operation, function, or data source/sink. Nodes can be built-in, provided by toppings, or user-defined.
- **Group Node:** A special node type that contains other nodes (children), creating visual and logical scopes. Used for control structures like Map/Filter/Reduce, context managers, and conditionals. See [GroupNodes.md](./GroupNodes.md) for details.
- **Edge:** Represents a connection between nodes, typically modeling data flow or control flow.
- **Port:** Each node has input and output ports, which define the types and semantics of data that can flow through edges.
- **Graph:** A collection of nodes and edges, with optional metadata and configuration.
- **Embedded Graph:** A subgraph contained within a Group Node, defining the logic executed within that group's scope.

---

## Node Model

### Node Properties
- `id`: Unique identifier (string/UUID)
- `type`: Node type (e.g., "operator", "map_group", "filter_group", "context_group")
- `name`: Human-readable name
- `namespace`: (optional) Logical grouping or plugin/topping source
- `inputs`: List of input ports
- `outputs`: List of output ports
- `position`: (x, y) coordinates for UI layout
- `parent_id`: (optional) Parent group node ID (for child nodes)
- `embedded_graph`: (optional) Embedded subgraph (for group nodes)
- `data`: Arbitrary node-specific data (parameters, configuration, etc.)
- `metadata`: (optional) Additional info for UI, debugging, or plugins
  - `iteration_vars`: (for collection groups) List of iteration variable names
  - `context_type`: (for context managers) Type of context (file, lock, transaction, etc.)

### Port Properties
- `name`: Port name (string)
- `typeId`: Data type identifier (e.g., "int", "float", "custom_type")
- `default`: (optional) Default value
- `metadata`: (optional) Additional info (e.g., UI hints, validation)

---

## Edge Model

### Edge Properties
- `id`: Unique identifier (string/UUID)
- `source`: Source node ID
- `sourcePort`: Source port name or ID
- `target`: Target node ID
- `targetPort`: Target port name or ID
- `metadata`: (optional) Additional info (e.g., edge type, UI hints)

---

## Graph Serialization

- **Format:** JSON (default), with possible support for other formats (YAML, binary) in the future.
- **Schema:** Versioned schema to ensure forward/backward compatibility.
- **Example:**
  ```json
  {
    "version": "1.0",
    "nodes": [
      {
        "id": "node1",
        "type": "operator",
        "name": "Add",
        "inputs": [{ "name": "a", "typeId": "int" }, { "name": "b", "typeId": "int" }],
        "outputs": [{ "name": "result", "typeId": "int" }],
        "position": { "x": 100, "y": 200 },
        "data": { "operation": "+" }
      }
    ],
    "edges": [
      {
        "id": "edge1",
        "source": "node1",
        "sourcePort": "result",
        "target": "node2",
        "targetPort": "a"
      }
    ],
    "metadata": {
      "projectName": "My Ramen Project",
      "created": "2024-07-09T12:00:00Z"
    }
  }
  ```

---

## Advanced Features

- **Generics:** Nodes and ports can support generic types, allowing for reusable, type-parameterized operations.
- **Custom Metadata:** Both nodes and edges can include arbitrary metadata for UI, debugging, or plugin use.
- **Versioning:** Each graph includes a version field for schema migration and compatibility.
- **Plugin/Topping Extensions:** Toppings can define new node/edge types, port types, and custom serialization logic.

---

## Compilation/JIT Process

- **Parsing:** The backend parses the serialized graph into an internal representation.
- **Type Checking:** Ensures all connections are type-safe, including generics and custom types.
- **Dependency Resolution:** Determines execution order based on data/control dependencies.
- **Bytecode Generation:** Compiles the graph into Python bytecode, with support for JIT (on-the-fly) and AOT (cached) modes.
- **Runtime Metadata:** Embeds execution hints, required packages, and environment info into the compiled artifact.

---

## Graph Model Extensibility

- **Custom Node/Edge Types:** Plugins/toppings can register new node and edge types, with custom properties and behaviors.
- **Schema Evolution:** The graph model is designed to support future extensions without breaking existing graphs.

---

## Session Model

- **Single Session per Graph:**
  - Each graph can only be actively edited or executed in one session at a time.
  - If a user (or browser tab) attempts to open a graph that is already open in another session, the system will prompt the user to either:
    - Terminate the existing session and take over, or
    - Cancel the operation and leave the existing session active.
  - The active session is considered the “owner” of the graph until it is closed or released.
  - When a session ends (tab closed, user disconnects, or explicit close), the graph becomes available for a new session.
  - Prevents conflicting edits, race conditions, and data loss.

--- 