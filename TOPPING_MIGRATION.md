# Topping Migration Guide

The Ramen toppings have been moved to separate repositories for better maintainability and version control. This document explains the migration and how to work with external toppings.

## What Changed

- All toppings have been moved from `toppings/` folder to separate repositories
- Toppings are now installed as separate Python packages  
- Each topping has its own versioning and release cycle
- The main Ramen project no longer includes toppings by default

## Repository Structure (After Migration)

### Main Repository
```
ramen/
├── src/ramen/           # Core Ramen framework
├── vscode-extension/    # VSCode extension
├── docs/               # Documentation
└── pyproject.toml      # Core dependencies only
```

### Separate Topping Repositories
- `ramen-topping-torch`    - PyTorch deep learning nodes
- `ramen-topping-pandas`   - Pandas DataFrame operations  
- `ramen-topping-numpy`    - NumPy numerical computation
- `ramen-topping-plots`    - Matplotlib plotting nodes
- `ramen-topping-nn-builder` - Neural network builder

## Installing Toppings

### As User
```bash
# Install specific toppings you need
uv add ramen-topping-torch
uv add ramen-topping-pandas  
uv add ramen-topping-plots

# Or using pip
pip install ramen-topping-torch ramen-topping-pandas
```

### As Developer
```bash
# Clone topping repository
git clone https://github.com/your-org/ramen-topping-torch.git
cd ramen-topping-torch

# Install in development mode
uv add -e .
# or
pip install -e .
```

## Creating New Toppings

### 1. Repository Setup
Create a new repository with this structure:
```
ramen-topping-mytopping/
├── src/
│   └── ramen_topping_mytopping/
│       └── __init__.py
├── pyproject.toml
├── README.md
└── LICENSE
```

### 2. pyproject.toml Template
```toml
[build-system]
requires = ["setuptools>=61.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "ramen-topping-mytopping"
version = "1.0.0"
description = "My custom topping for Ramen visual programming"
authors = [
    {name = "Your Name", email = "your.email@example.com"}
]
dependencies = [
    # Add your dependencies here
]
requires-python = ">=3.8"

[project.entry-points."ramen.toppings"]
mytopping = "ramen_topping_mytopping:get_topping"

[tool.setuptools.packages.find]
where = ["src"]
include = ["ramen_topping_mytopping*"]

[tool.setuptools.package-dir]
"" = "src"
```

### 3. Implement Topping
```python
# src/ramen_topping_mytopping/__init__.py
from ramen.topping.topping_base import (
    ToppingBase, NodeFunction, NodeMetadata, NodeContext,
    PortDefinition, PortType
)

class MyNode(NodeFunction):
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="mytopping",
            node_type="my_node",
            display_name="My Node",
            category="My Category",
            description="Description of my node",
            icon="🔧",
            color="#FF6B35",
            inputs=[
                PortDefinition(
                    name="input", 
                    port_type=PortType.ANY,
                    description="Input data"
                )
            ],
            outputs=[
                PortDefinition(
                    name="output",
                    port_type=PortType.ANY, 
                    description="Output data"
                )
            ]
        )
    
    def execute(self, context: NodeContext):
        input_data = context.get_input("input")
        # Process input_data
        result = process(input_data)
        context.set_output("output", result)
        return result

class MyTopping(ToppingBase):
    def get_name(self) -> str:
        return "My Topping"
    
    def get_version(self) -> str:
        return "1.0.0"
    
    def get_description(self) -> str:
        return "My custom topping description"
    
    def initialize(self):
        self.register_node(MyNode)

def get_topping() -> ToppingBase:
    return MyTopping()
```

## Discovery and Loading

Toppings are discovered through:

1. **Entry Points**: Automatically discovered when installed
2. **Module Loading**: Explicit loading by module name
3. **File System**: Loading from local directories (for development)

## Migration Checklist

### For Main Repository
- [x] Remove `toppings/` folder from main repo
- [x] Update `pyproject.toml` to remove workspace members
- [x] Update topping loader to handle missing toppings gracefully
- [x] Add migration documentation

### For Each Topping Repository  
- [ ] Create separate repository
- [ ] Copy topping source code
- [ ] Add proper `pyproject.toml` with entry points
- [ ] Add README with installation and usage instructions
- [ ] Add LICENSE file
- [ ] Set up CI/CD for releases
- [ ] Publish to PyPI

### Testing
- [ ] Test core Ramen works without any toppings
- [ ] Test topping installation via pip/uv
- [ ] Test entry point discovery
- [ ] Verify VSCode extension works with external toppings

## Benefits of Separate Repositories

1. **Independent Versioning**: Each topping can have its own release cycle
2. **Reduced Core Size**: Main Ramen installation is lighter
3. **Optional Dependencies**: Users install only what they need
4. **Better Maintenance**: Each topping can have dedicated maintainers
5. **Community Contributions**: Easier for community to create custom toppings

## Troubleshooting

### Topping Not Found
```bash
# Check if topping is installed
uv list | grep ramen-topping
pip list | grep ramen-topping

# Install missing topping
uv add ramen-topping-torch
```

### Development Mode Issues
```bash
# Reinstall in development mode
cd path/to/topping
uv add -e .
```