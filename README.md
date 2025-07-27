# Ramen

Ramen is a next-generation visual programming environment for Python. It enables users to design, compile, and execute computational graphs using an intuitive node-based interface. Ramen graphs are compiled/JIT-compiled into Python bytecode and executed in isolated, reproducible Python environments managed by `uv`.

## Features

- Visual, node-based graph editor (web UI)
- Graphs are compiled/JIT to Python bytecode for efficient execution
- Each project runs in its own isolated uv-managed environment
- Supports both local and remote (server) deployment
- Extensible via "toppings" (plugins) for numpy, pandas, torch, plots, and more
- Command-line execution for production and automation
- Python API for programmatic graph execution (with `ramen` or minimal `ramenrt`)
- Project management and dependency isolation via `uv`
- Real-time logs, error reporting, and result streaming
- Single session per graph: prevents conflicting edits

## Installation

### Full Installation (authoring + runtime)
```sh
pip install ramen
```

### Minimal/Runtime Installation (for embedding/CI/CD)
```sh
pip install ramenrt
```

### Topping Installation
```sh
pip install ramen-topping-numpy
pip install ramen-topping-pandas
# ...and more
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
3. **Launch the Ramen editor**
    ```sh
    ramen-cli
    # or for remote/server: ramen-cli server
    ```
4. **Open the web UI** (usually at http://localhost:xxxx)
5. **Create and edit graphs visually**
6. **Execute graphs** (compiled/JIT in isolated environment)

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
