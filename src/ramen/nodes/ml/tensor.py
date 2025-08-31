"""PyTorch tensor operations."""

from typing import Any, List, Union
from ..base import node, NodeContext, Port, PortType

# Try to import PyTorch, handle gracefully if not available
try:
    import torch
    import numpy as np
    HAS_PYTORCH = True
except ImportError:
    HAS_PYTORCH = False


@node(
    namespace="ml",
    node_type="tensor_create",
    display_name="Create Tensor",
    category="ML/Tensor",
    description="Create PyTorch tensor from data",
    icon="📊",
    color="#ef4444",
    inputs=[
        Port("data", PortType.ANY, required=True),
        Port("dtype", PortType.STRING, required=False),
        Port("device", PortType.STRING, required=False),
        Port("requires_grad", PortType.BOOLEAN, required=False)
    ],
    outputs=[
        Port("tensor", PortType.ANY),
        Port("shape", PortType.ARRAY),
        Port("dtype", PortType.STRING)
    ]
)
def tensor_create_node(context: NodeContext) -> Any:
    """Create PyTorch tensor from data."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("tensor", result)
        context.set_output("shape", [])
        context.set_output("dtype", "error")
        return result
    
    data = context.get_input("data")
    dtype = context.get_input("dtype")
    device = context.get_input("device", "cpu") 
    requires_grad = context.get_input("requires_grad", False)
    
    try:
        # Convert dtype string to PyTorch dtype
        torch_dtype = None
        if dtype:
            dtype_map = {
                "float32": torch.float32,
                "float64": torch.float64,
                "int32": torch.int32,
                "int64": torch.int64,
                "bool": torch.bool
            }
            torch_dtype = dtype_map.get(dtype)
        
        # Create tensor
        if isinstance(data, torch.Tensor):
            tensor = data.to(device)
        elif isinstance(data, np.ndarray):
            tensor = torch.from_numpy(data).to(device)
        else:
            tensor = torch.tensor(data, dtype=torch_dtype, device=device)
        
        if requires_grad:
            tensor = tensor.requires_grad_(True)
        
        context.set_output("tensor", tensor)
        context.set_output("shape", list(tensor.shape))
        context.set_output("dtype", str(tensor.dtype))
        return tensor
        
    except Exception as e:
        result = f"Tensor creation error: {str(e)}"
        context.set_output("tensor", result)
        context.set_output("shape", [])
        context.set_output("dtype", "error")
        return result


@node(
    namespace="ml",
    node_type="tensor_reshape",
    display_name="Reshape Tensor",
    category="ML/Tensor",
    description="Reshape PyTorch tensor",
    icon="🔄",
    color="#ef4444",
    inputs=[
        Port("tensor", PortType.ANY, required=True),
        Port("shape", PortType.ARRAY, required=True)
    ],
    outputs=[
        Port("tensor", PortType.ANY),
        Port("shape", PortType.ARRAY)
    ]
)
def tensor_reshape_node(context: NodeContext) -> Any:
    """Reshape PyTorch tensor."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("tensor", result)
        context.set_output("shape", [])
        return result
    
    tensor = context.get_input("tensor")
    new_shape = context.get_input("shape", [])
    
    try:
        if not isinstance(tensor, torch.Tensor):
            raise ValueError("Input must be a PyTorch tensor")
        
        reshaped = tensor.reshape(*new_shape)
        
        context.set_output("tensor", reshaped)
        context.set_output("shape", list(reshaped.shape))
        return reshaped
        
    except Exception as e:
        result = f"Tensor reshape error: {str(e)}"
        context.set_output("tensor", result)
        context.set_output("shape", [])
        return result


@node(
    namespace="ml",
    node_type="tensor_operation",
    display_name="Tensor Operation",
    category="ML/Tensor",
    description="Perform operations on PyTorch tensors",
    icon="⚡",
    color="#ef4444",
    inputs=[
        Port("x", PortType.ANY, required=True),
        Port("y", PortType.ANY, required=False),
        Port("operation", PortType.STRING, required=True),
        Port("dim", PortType.NUMBER, required=False)
    ],
    outputs=[
        Port("result", PortType.ANY),
        Port("shape", PortType.ARRAY)
    ]
)
def tensor_operation_node(context: NodeContext) -> Any:
    """Perform operations on PyTorch tensors."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("result", result)
        context.set_output("shape", [])
        return result
    
    x = context.get_input("x")
    y = context.get_input("y")
    operation = context.get_input("operation", "add")
    dim = context.get_input("dim")
    
    try:
        if not isinstance(x, torch.Tensor):
            x = torch.tensor(x)
        
        if y is not None and not isinstance(y, torch.Tensor):
            y = torch.tensor(y)
        
        # Perform operation
        if operation == "add":
            result = x + y if y is not None else x
        elif operation == "subtract":
            result = x - y if y is not None else -x
        elif operation == "multiply":
            result = x * y if y is not None else x
        elif operation == "divide":
            result = x / y if y is not None else x
        elif operation == "matmul":
            if y is None:
                raise ValueError("matmul requires both x and y tensors")
            result = torch.matmul(x, y)
        elif operation == "mean":
            if dim is not None:
                result = torch.mean(x, dim=int(dim))
            else:
                result = torch.mean(x)
        elif operation == "sum":
            if dim is not None:
                result = torch.sum(x, dim=int(dim))
            else:
                result = torch.sum(x)
        elif operation == "std":
            if dim is not None:
                result = torch.std(x, dim=int(dim))
            else:
                result = torch.std(x)
        elif operation == "transpose":
            result = x.T
        elif operation == "softmax":
            dim_val = int(dim) if dim is not None else -1
            result = torch.softmax(x, dim=dim_val)
        elif operation == "relu":
            result = torch.relu(x)
        elif operation == "sigmoid":
            result = torch.sigmoid(x)
        elif operation == "tanh":
            result = torch.tanh(x)
        else:
            raise ValueError(f"Unknown operation: {operation}")
        
        context.set_output("result", result)
        context.set_output("shape", list(result.shape))
        return result
        
    except Exception as e:
        result = f"Tensor operation error: {str(e)}"
        context.set_output("result", result)
        context.set_output("shape", [])
        return result


@node(
    namespace="ml",
    node_type="tensor_slice",
    display_name="Slice Tensor",
    category="ML/Tensor",
    description="Slice PyTorch tensor",
    icon="✂️",
    color="#ef4444",
    inputs=[
        Port("tensor", PortType.ANY, required=True),
        Port("start_indices", PortType.ARRAY, required=False),
        Port("end_indices", PortType.ARRAY, required=False),
        Port("step_sizes", PortType.ARRAY, required=False)
    ],
    outputs=[
        Port("result", PortType.ANY),
        Port("shape", PortType.ARRAY)
    ]
)
def tensor_slice_node(context: NodeContext) -> Any:
    """Slice PyTorch tensor."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("result", result)
        context.set_output("shape", [])
        return result
    
    tensor = context.get_input("tensor")
    start_indices = context.get_input("start_indices", [])
    end_indices = context.get_input("end_indices", [])
    step_sizes = context.get_input("step_sizes", [])
    
    try:
        if not isinstance(tensor, torch.Tensor):
            raise ValueError("Input must be a PyTorch tensor")
        
        # Build slice objects
        slices = []
        for i in range(len(tensor.shape)):
            start = start_indices[i] if i < len(start_indices) else None
            end = end_indices[i] if i < len(end_indices) else None
            step = step_sizes[i] if i < len(step_sizes) else None
            slices.append(slice(start, end, step))
        
        result = tensor[tuple(slices)]
        
        context.set_output("result", result)
        context.set_output("shape", list(result.shape))
        return result
        
    except Exception as e:
        result = f"Tensor slice error: {str(e)}"
        context.set_output("result", result)
        context.set_output("shape", [])
        return result


@node(
    namespace="ml",
    node_type="tensor_concat",
    display_name="Concatenate Tensors",
    category="ML/Tensor",
    description="Concatenate PyTorch tensors",
    icon="🔗",
    color="#ef4444",
    inputs=[
        Port("tensors", PortType.ARRAY, required=True),
        Port("dim", PortType.NUMBER, required=False)
    ],
    outputs=[
        Port("result", PortType.ANY),
        Port("shape", PortType.ARRAY)
    ]
)
def tensor_concat_node(context: NodeContext) -> Any:
    """Concatenate PyTorch tensors."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("result", result)
        context.set_output("shape", [])
        return result
    
    tensors = context.get_input("tensors", [])
    dim = context.get_input("dim", 0)
    
    try:
        if not tensors:
            raise ValueError("No tensors provided")
        
        # Convert all inputs to tensors if needed
        torch_tensors = []
        for tensor in tensors:
            if isinstance(tensor, torch.Tensor):
                torch_tensors.append(tensor)
            else:
                torch_tensors.append(torch.tensor(tensor))
        
        result = torch.cat(torch_tensors, dim=int(dim))
        
        context.set_output("result", result)
        context.set_output("shape", list(result.shape))
        return result
        
    except Exception as e:
        result = f"Tensor concatenation error: {str(e)}"
        context.set_output("result", result)
        context.set_output("shape", [])
        return result


@node(
    namespace="ml",
    node_type="tensor_transpose",
    display_name="Transpose Tensor",
    category="ML/Tensor",
    description="Transpose PyTorch tensor dimensions",
    icon="↔️",
    color="#ef4444",
    inputs=[
        Port("tensor", PortType.ANY, required=True),
        Port("dim0", PortType.NUMBER, required=False),
        Port("dim1", PortType.NUMBER, required=False)
    ],
    outputs=[
        Port("result", PortType.ANY),
        Port("shape", PortType.ARRAY)
    ]
)
def tensor_transpose_node(context: NodeContext) -> Any:
    """Transpose PyTorch tensor dimensions."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("result", result)
        context.set_output("shape", [])
        return result
    
    tensor = context.get_input("tensor")
    dim0 = context.get_input("dim0")
    dim1 = context.get_input("dim1")
    
    try:
        if not isinstance(tensor, torch.Tensor):
            raise ValueError("Input must be a PyTorch tensor")
        
        if dim0 is not None and dim1 is not None:
            result = tensor.transpose(int(dim0), int(dim1))
        else:
            # Default transpose (last two dimensions)
            result = tensor.T
        
        context.set_output("result", result)
        context.set_output("shape", list(result.shape))
        return result
        
    except Exception as e:
        result = f"Tensor transpose error: {str(e)}"
        context.set_output("result", result)
        context.set_output("shape", [])
        return result