"""
Array operations for collections.
"""

from typing import Any, List
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="collection",
    node_type="take",
    display_name="Take",
    category="Collection/Operations",
    description="Take first n elements",
    icon="⬇️",
    color="#2196F3",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("count", PortType.NUMBER, required=True, description="Number of elements to take")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="First n elements")
    ]
)
def take_node(context: NodeContext) -> Any:
    """Take first n elements from array."""
    array = context.get_input("array", [])
    count = int(context.get_input("count", 1))
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    result = array[:count]
    context.set_output("result", result)
    return result


@node(
    namespace="collection",
    node_type="skip",
    display_name="Skip",
    category="Collection/Operations",
    description="Skip first n elements",
    icon="⏭️",
    color="#FF9800",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("count", PortType.NUMBER, required=True, description="Number of elements to skip")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Array without first n elements")
    ]
)
def skip_node(context: NodeContext) -> Any:
    """Skip first n elements from array."""
    array = context.get_input("array", [])
    count = int(context.get_input("count", 1))
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    result = array[count:]
    context.set_output("result", result)
    return result


@node(
    namespace="collection",
    node_type="slice",
    display_name="Slice",
    category="Collection/Operations",
    description="Extract slice of array",
    icon="✂️",
    color="#9C27B0",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("start", PortType.NUMBER, required=True, description="Start index"),
        Port("end", PortType.NUMBER, required=False, description="End index (optional)")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Sliced array")
    ]
)
def slice_node(context: NodeContext) -> Any:
    """Extract slice of array."""
    array = context.get_input("array", [])
    start = int(context.get_input("start", 0))
    end = context.get_input("end")
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    if end is not None:
        end = int(end)
        result = array[start:end]
    else:
        result = array[start:]
    
    context.set_output("result", result)
    return result


@node(
    namespace="collection",
    node_type="concat",
    display_name="Concat",
    category="Collection/Operations",
    description="Concatenate arrays",
    icon="🔗",
    color="#4CAF50",
    inputs=[
        Port("array1", PortType.ARRAY, required=True, description="First array"),
        Port("array2", PortType.ARRAY, required=True, description="Second array")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Concatenated array")
    ]
)
def concat_node(context: NodeContext) -> Any:
    """Concatenate two arrays."""
    array1 = context.get_input("array1", [])
    array2 = context.get_input("array2", [])
    
    if not isinstance(array1, list):
        raise ValueError("First input must be an array")
    if not isinstance(array2, list):
        raise ValueError("Second input must be an array")
    
    result = array1 + array2
    context.set_output("result", result)
    return result


@node(
    namespace="collection",
    node_type="zip",
    display_name="Zip",
    category="Collection/Operations",
    description="Combine elements from multiple arrays",
    icon="🤐",
    color="#795548",
    inputs=[
        Port("array1", PortType.ARRAY, required=True, description="First array"),
        Port("array2", PortType.ARRAY, required=True, description="Second array")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Array of paired elements")
    ]
)
def zip_node(context: NodeContext) -> Any:
    """Zip two arrays together."""
    array1 = context.get_input("array1", [])
    array2 = context.get_input("array2", [])
    
    if not isinstance(array1, list):
        raise ValueError("First input must be an array")
    if not isinstance(array2, list):
        raise ValueError("Second input must be an array")
    
    result = list(zip(array1, array2))
    # Convert tuples to arrays for JSON compatibility
    result = [[a, b] for a, b in result]
    
    context.set_output("result", result)
    return result


@node(
    namespace="collection",
    node_type="flatten",
    display_name="Flatten",
    category="Collection/Operations", 
    description="Flatten nested arrays",
    icon="📏",
    color="#607D8B",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Nested array"),
        Port("depth", PortType.NUMBER, required=False, default=1, description="Flatten depth (1 = one level)")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Flattened array")
    ]
)
def flatten_node(context: NodeContext) -> Any:
    """Flatten nested arrays."""
    array = context.get_input("array", [])
    depth = int(context.get_input("depth", 1))
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    def flatten_recursive(arr, d):
        if d <= 0:
            return arr
        
        result = []
        for item in arr:
            if isinstance(item, list):
                result.extend(flatten_recursive(item, d - 1))
            else:
                result.append(item)
        return result
    
    result = flatten_recursive(array, depth)
    context.set_output("result", result)
    return result


@node(
    namespace="collection",
    node_type="chunk",
    display_name="Chunk",
    category="Collection/Operations",
    description="Split array into chunks of specified size",
    icon="📦",
    color="#00BCD4",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("size", PortType.NUMBER, required=True, description="Chunk size")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Array of chunks")
    ]
)
def chunk_node(context: NodeContext) -> Any:
    """Split array into chunks."""
    array = context.get_input("array", [])
    size = int(context.get_input("size", 2))
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    if size <= 0:
        raise ValueError("Chunk size must be positive")
    
    result = [array[i:i + size] for i in range(0, len(array), size)]
    context.set_output("result", result)
    return result


# Basic array access operations
@node(
    namespace="collection",
    node_type="length",
    display_name="Length",
    category="Collection/Basic",
    description="Get array length",
    icon="📊",
    color="#E91E63",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Array length")
    ]
)
def length_node(context: NodeContext) -> Any:
    """Get array length."""
    array = context.get_input("array", [])
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    result = len(array)
    context.set_output("result", result)
    return result


@node(
    namespace="collection",
    node_type="get",
    display_name="Get Element",
    category="Collection/Basic",
    description="Get element at index",
    icon="🎯",
    color="#3F51B5",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("index", PortType.NUMBER, required=True, description="Index to get")
    ],
    outputs=[
        Port("result", PortType.ANY, description="Element at index"),
        Port("exists", PortType.BOOLEAN, description="Whether index exists")
    ]
)
def get_node(context: NodeContext) -> Any:
    """Get element at index."""
    array = context.get_input("array", [])
    index = int(context.get_input("index", 0))
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    if 0 <= index < len(array):
        result = array[index]
        context.set_output("result", result)
        context.set_output("exists", True)
        return result
    else:
        context.set_output("result", None)
        context.set_output("exists", False)
        return None


@node(
    namespace="collection",
    node_type="append",
    display_name="Append",
    category="Collection/Basic",
    description="Add element to end of array",
    icon="➕",
    color="#4CAF50",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("element", PortType.ANY, required=True, description="Element to append")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Array with element appended")
    ]
)
def append_node(context: NodeContext) -> Any:
    """Add element to end of array."""
    array = context.get_input("array", [])
    element = context.get_input("element")
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    result = array + [element]
    context.set_output("result", result)
    return result


@node(
    namespace="collection",
    node_type="prepend",
    display_name="Prepend",
    category="Collection/Basic",
    description="Add element to start of array",
    icon="⬅️",
    color="#FF9800",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("element", PortType.ANY, required=True, description="Element to prepend")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Array with element prepended")
    ]
)
def prepend_node(context: NodeContext) -> Any:
    """Add element to start of array."""
    array = context.get_input("array", [])
    element = context.get_input("element")
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    result = [element] + array
    context.set_output("result", result)
    return result