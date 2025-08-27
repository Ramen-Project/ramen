# Ramen

Ramen is a next-generation visual programming environment for Python. It enables users to design, compile, and execute computational graphs using an intuitive node-based interface within Visual Studio Code. Ramen graphs are compiled/JIT-compiled into Python bytecode and executed in isolated, reproducible Python environments managed by `uv`.

## Features

- Visual, node-based graph editor (VSCode extension)
- Graphs are compiled/JIT to Python bytecode for efficient execution
- Each project runs in its own isolated uv-managed environment
- Extensible via "toppings" (plugins) for numpy, pandas, torch, plots, and more
- Command-line execution for production and automation
- Python API for programmatic graph execution (with `ramen` or minimal `ramenrt`)
- Project management and dependency isolation via `uv`
- Real-time logs, error reporting, and result streaming
- Single session per graph: prevents conflicting edits
- Full integration with VSCode ecosystem

## Installation

### 1. Install the Python Package
```sh
# Full installation (authoring + runtime)
pip install ramen

# Or minimal installation (for embedding/CI/CD)
pip install ramenrt
```

### 2. Install VSCode Extension
Install the "Ramen Visual Programming" extension from the VSCode marketplace.

### 3. Install Toppings (Optional)
```sh
pip install ramen-topping-numpy
pip install ramen-topping-pandas
pip install ramen-topping-torch
pip install ramen-topping-plots
```

## Quickstart

1. **Create a new project**
    ```sh
    uv venv my-ramen-project
    cd my-ramen-project
    uv pip install ramen
    ```
2. **Install toppings as needed**
    ```sh
    uv pip install ramen-topping-numpy
    ```
3. **Open VSCode in your project directory**
    ```sh
    code .
    ```
4. **Create a new .ramen file**
    - Right-click in Explorer → "New File" → `my_graph.ramen`
5. **Start designing your graph**
    - The Ramen graph editor will open automatically
    - Use the node library to add nodes
    - Connect nodes to create your workflow
6. **Execute your graph**
    - Press F5 or use Ctrl+R in the graph editor
    - Or use the command line: `ramen-cli run my_graph`

## Usage Examples

### Command-Line Execution

Execute graphs from the command line with parameters:

```bash
# Basic graph execution (auto-resolves to my_pipeline.ramen)
ramen-cli run my_pipeline input=data.csv output=results.json

# ML training with hyperparameters  
ramen-cli run train_model dataset=mnist.pkl learning_rate=0.01 epochs=100

# Data processing pipeline
ramen-cli run process_data source=raw.csv target=clean.csv batch_size=1000
```

### Python API

```python
import ramen

graph = ramen.load_graph("my_graph.ramen")
result = ramen.execute_graph(graph, inputs={"x": 42})
print(result)
```

## Documentation

- See `docs/technical-design/` for detailed technical specs, architecture, and extensibility.

## License

MIT License
