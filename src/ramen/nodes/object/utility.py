"""Object utility operations."""

import copy
from typing import Any
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="object",
    node_type="clone",
    display_name="Clone",
    category="Object/Utility",
    description="Create a deep copy of object",
    icon="👥",
    color="#FF9800",
    inputs=[
        Port("object", PortType.OBJECT, required=True),
        Port("deep", PortType.BOOLEAN, required=False)
    ],
    outputs=[Port("result", PortType.OBJECT)]
)
def clone_node(context: NodeContext) -> Any:
    """Create a copy of object."""
    obj = context.get_input("object", {})
    deep = context.get_input("deep", True)
    
    if not isinstance(obj, dict):
        obj = {}
    
    if deep:
        result = copy.deepcopy(obj)
    else:
        result = obj.copy()
    
    context.set_output("result", result)
    return result


@node(
    namespace="object",
    node_type="freeze",
    display_name="Freeze",
    category="Object/Utility",
    description="Create immutable view of object",
    icon="🧊",
    color="#FF9800",
    inputs=[Port("object", PortType.OBJECT, required=True)],
    outputs=[Port("result", PortType.OBJECT)]
)
def freeze_node(context: NodeContext) -> Any:
    """Create immutable view of object (returns copy)."""
    obj = context.get_input("object", {})
    
    if not isinstance(obj, dict):
        obj = {}
    
    # In Python, we can't truly freeze a dict, so return a copy
    result = copy.deepcopy(obj)
    context.set_output("result", result)
    return result


@node(
    namespace="object",
    node_type="size",
    display_name="Size",
    category="Object/Utility",
    description="Get number of properties in object",
    icon="#",
    color="#FF9800",
    inputs=[Port("object", PortType.OBJECT, required=True)],
    outputs=[Port("size", PortType.NUMBER)]
)
def size_node(context: NodeContext) -> Any:
    """Get number of properties in object."""
    obj = context.get_input("object", {})
    
    if not isinstance(obj, dict):
        obj = {}
    
    size = len(obj)
    context.set_output("size", size)
    return size


@node(
    namespace="object",
    node_type="empty",
    display_name="Is Empty",
    category="Object/Utility",
    description="Check if object is empty",
    icon="📭",
    color="#FF9800",
    inputs=[Port("object", PortType.OBJECT, required=True)],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def empty_node(context: NodeContext) -> Any:
    """Check if object is empty."""
    obj = context.get_input("object", {})
    
    if not isinstance(obj, dict):
        obj = {}
    
    result = len(obj) == 0
    context.set_output("result", result)
    return result


@node(
    namespace="object",
    node_type="assign",
    display_name="Assign",
    category="Object/Utility",
    description="Assign properties from source objects to target",
    icon="📥",
    color="#FF9800",
    inputs=[
        Port("target", PortType.OBJECT, required=True),
        Port("sources", PortType.ARRAY, required=True)
    ],
    outputs=[Port("result", PortType.OBJECT)]
)
def assign_node(context: NodeContext) -> Any:
    """Assign properties from source objects to target."""
    target = context.get_input("target", {})
    sources = context.get_input("sources", [])
    
    if not isinstance(target, dict):
        target = {}
    
    result = target.copy()
    
    for source in sources:
        if isinstance(source, dict):
            result.update(source)
    
    context.set_output("result", result)
    return result


@node(
    namespace="object",
    node_type="flatten_object",
    display_name="Flatten Object",
    category="Object/Utility",
    description="Flatten nested object to single level",
    icon="📏",
    color="#FF9800",
    inputs=[
        Port("object", PortType.OBJECT, required=True),
        Port("separator", PortType.STRING, required=False),
        Port("max_depth", PortType.NUMBER, required=False)
    ],
    outputs=[Port("result", PortType.OBJECT)]
)
def flatten_object_node(context: NodeContext) -> Any:
    """Flatten nested object to single level."""
    obj = context.get_input("object", {})
    separator = context.get_input("separator", ".")
    max_depth = context.get_input("max_depth")
    
    if not isinstance(obj, dict):
        obj = {}
    
    def flatten_recursive(obj, prefix="", depth=0):
        result = {}
        max_d = max_depth if max_depth is not None else float('inf')
        
        for key, value in obj.items():
            new_key = f"{prefix}{separator}{key}" if prefix else key
            
            if isinstance(value, dict) and depth < max_d:
                result.update(flatten_recursive(value, new_key, depth + 1))
            else:
                result[new_key] = value
        
        return result
    
    result = flatten_recursive(obj)
    context.set_output("result", result)
    return result