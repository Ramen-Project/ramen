"""Example of simple decorator-based topping API."""

import pandas as pd
import numpy as np
from ramen.topping import ramen_node, input_port, output_port, PortType


# Simple CSV Reader Node
@ramen_node(
    name="Simple CSV Reader",
    category="Data I/O",
    description="Read CSV files with basic options",
    icon="📄",
    color="#4CAF50"
)
@input_port("file_path", PortType.STRING, description="Path to CSV file")
@input_port("encoding", PortType.STRING, default="utf-8", description="File encoding")
@input_port("separator", PortType.STRING, default=",", description="CSV separator")
@output_port("dataframe", PortType.DATAFRAME, description="Loaded DataFrame")
@output_port("row_count", PortType.NUMBER, description="Number of rows")
@output_port("column_count", PortType.NUMBER, description="Number of columns")
def simple_csv_reader(file_path: str, encoding: str = "utf-8", separator: str = ",") -> dict:
    """Simple CSV reader implementation."""
    df = pd.read_csv(file_path, encoding=encoding, sep=separator)
    
    return {
        "dataframe": df,
        "row_count": len(df),
        "column_count": len(df.columns)
    }


# Simple Math Node
@ramen_node(
    name="Simple Calculator", 
    category="Math",
    description="Basic mathematical operations",
    icon="🧮",
    color="#2196F3"
)
@input_port("a", PortType.NUMBER, description="First number")
@input_port("b", PortType.NUMBER, description="Second number") 
@input_port("operation", PortType.STRING, default="add", description="Operation (add, subtract, multiply, divide)")
@output_port("result", PortType.NUMBER, description="Calculation result")
def simple_calculator(a: float, b: float, operation: str = "add") -> dict:
    """Simple calculator implementation."""
    operations = {
        "add": lambda x, y: x + y,
        "subtract": lambda x, y: x - y,
        "multiply": lambda x, y: x * y,
        "divide": lambda x, y: x / y if y != 0 else float('inf')
    }
    
    if operation not in operations:
        raise ValueError(f"Unknown operation: {operation}")
    
    result = operations[operation](a, b)
    return {"result": result}


# Simple Array Processing Node
@ramen_node(
    name="Array Statistics",
    category="Data Processing", 
    description="Calculate basic statistics for arrays",
    icon="📊",
    color="#FF9800"
)
@input_port("array", PortType.ARRAY, description="Input array")
@output_port("mean", PortType.NUMBER, description="Mean value")
@output_port("std", PortType.NUMBER, description="Standard deviation")
@output_port("min", PortType.NUMBER, description="Minimum value")
@output_port("max", PortType.NUMBER, description="Maximum value")
def array_statistics(array) -> dict:
    """Calculate statistics for input array."""
    arr = np.array(array)
    
    return {
        "mean": float(np.mean(arr)),
        "std": float(np.std(arr)),
        "min": float(np.min(arr)),
        "max": float(np.max(arr))
    }


# This function would be automatically discovered by the loader
def get_topping():
    """This is optional - the loader will auto-discover decorated functions."""
    pass