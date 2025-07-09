# Ramen Toppings (Plugin System)

## Overview
Toppings are Ramen's plugin system, allowing users and developers to extend the platform with new node types, data processing capabilities, integrations, and UI components. Toppings are Python packages that can be installed per-project and loaded dynamically by the Ramen kernel.

---

## Key Concepts

- **Topping:** A Python package that registers new node/edge types, port types, and/or runtime logic with the Ramen kernel.
- **Node/Edge Extensions:** Toppings can define new node and edge types, including custom properties, behaviors, and UI.
- **Environment Integration:** Toppings are installed into the project's uv-managed environment and loaded at runtime.
- **API Hooks:** Toppings can provide hooks for graph compilation, execution, and (optionally) frontend UI extensions.

---

## Topping Structure

A typical topping package includes:
- Python code for new node/edge types and runtime logic
- Registration code for the Ramen kernel
- (Optional) UI components or configuration for the frontend
- Metadata for discovery and versioning

---

## Example: Topping Registration

```python
# ramen_topping_example/__init__.py
from ramen.kernel import register_node_type

class ExampleNode:
    # Node implementation
    ...

register_node_type(
    name="ExampleNode",
    implementation=ExampleNode,
    inputs=[...],
    outputs=[...],
    metadata={...}
)
```

---

## Topping API

- **Node/Edge Registration:**
  - Register new node/edge types with the kernel, specifying input/output ports, types, and runtime logic.
- **Execution Hooks:**
  - Provide custom execution logic for nodes, including support for async, streaming, or external integrations.
- **UI Extensions (Optional):**
  - Toppings can expose configuration schemas or UI hints for the frontend to render custom controls.
- **Versioning & Metadata:**
  - Toppings declare their version, dependencies, and compatibility in their package metadata.

---

## Installation & Management

- **Per-Project Installation:**
  - Toppings are installed into the project's uv-managed environment using pip or uv.
  - Example:
    ```sh
    pip install ramen-topping-numpy
    pip install ramen-topping-pandas
    ```
- **Discovery:**
  - The kernel discovers installed toppings at runtime and loads their registrations.
- **Uninstallation:**
  - Toppings can be removed from a project by uninstalling the package and re-syncing the environment.

---

## Extensibility

- **Custom Data Types:**
  - Toppings can define new data types for ports and edges.
- **Custom Serialization:**
  - Toppings can provide custom serialization/deserialization logic for their nodes/edges.
- **Integration with External Systems:**
  - Toppings can integrate with databases, APIs, ML frameworks, etc.

---

## Example Use Cases

- Data science (numpy, pandas, torch, plots)
- Machine learning (custom model nodes)
- Visualization (plotting, dashboards)
- External integrations (APIs, databases)

---

## Best Practices

- Use clear, versioned APIs for node/edge registration
- Document all custom node/edge types and their parameters
- Ensure compatibility with the Ramen kernel and graph model version
- Test toppings in isolated uv environments

--- 