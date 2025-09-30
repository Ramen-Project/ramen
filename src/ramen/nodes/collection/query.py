"""
Query operations for collections.
"""

from typing import Any
from ramen.nodes.base import node, NodeContext, Port, PortType


@node(
    namespace="collection",
    node_type="find",
    display_name="Find",
    category="Collection/Query",
    description="Find first element matching condition",
    icon="🔎",
    color="#795548",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("predicate", PortType.FUNCTION, required=True, description="Search condition")
    ],
    outputs=[
        Port("result", PortType.ANY, description="First matching element or null"),
        Port("found", PortType.BOOLEAN, description="Whether element was found")
    ]
)
def find_node(context: NodeContext) -> Any:
    """Find first element matching condition."""
    array = context.get_input("array", [])
    predicate = context.get_input("predicate")
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    for i, item in enumerate(array):
        matches = False
        
        if callable(predicate):
            matches = predicate(item)
        elif isinstance(predicate, str):
            try:
                matches = context.execute_subgraph(predicate, {"item": item, "index": i})
            except NotImplementedError:
                matches = eval(predicate.replace("item", str(item)))
        
        if matches:
            context.set_output("result", item)
            context.set_output("found", True)
            return item
    
    context.set_output("result", None)
    context.set_output("found", False)
    return None


@node(
    namespace="collection",
    node_type="find_index",
    display_name="Find Index",
    category="Collection/Query",
    description="Find index of first matching element",
    icon="📍",
    color="#607D8B",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("predicate", PortType.FUNCTION, required=True, description="Search condition")
    ],
    outputs=[
        Port("index", PortType.NUMBER, description="Index of first match or -1"),
        Port("found", PortType.BOOLEAN, description="Whether element was found")
    ]
)
def find_index_node(context: NodeContext) -> Any:
    """Find index of first element matching condition."""
    array = context.get_input("array", [])
    predicate = context.get_input("predicate")
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    for i, item in enumerate(array):
        matches = False
        
        if callable(predicate):
            matches = predicate(item)
        elif isinstance(predicate, str):
            try:
                matches = context.execute_subgraph(predicate, {"item": item, "index": i})
            except NotImplementedError:
                matches = eval(predicate.replace("item", str(item)).replace("index", str(i)))
        
        if matches:
            context.set_output("index", i)
            context.set_output("found", True)
            return i
    
    context.set_output("index", -1)
    context.set_output("found", False)
    return -1


@node(
    namespace="collection",
    node_type="some",
    display_name="Some",
    category="Collection/Query",
    description="Test if any element matches condition",
    icon="❓",
    color="#FF5722",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("predicate", PortType.FUNCTION, required=True, description="Test condition")
    ],
    outputs=[
        Port("result", PortType.BOOLEAN, description="True if any element matches")
    ]
)
def some_node(context: NodeContext) -> Any:
    """Test if any element matches condition."""
    array = context.get_input("array", [])
    predicate = context.get_input("predicate")
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    for i, item in enumerate(array):
        matches = False
        
        if callable(predicate):
            matches = predicate(item)
        elif isinstance(predicate, str):
            try:
                matches = context.execute_subgraph(predicate, {"item": item, "index": i})
            except NotImplementedError:
                matches = eval(predicate.replace("item", str(item)))
        
        if matches:
            context.set_output("result", True)
            return True
    
    context.set_output("result", False)
    return False


@node(
    namespace="collection",
    node_type="every",
    display_name="Every",
    category="Collection/Query",
    description="Test if all elements match condition",
    icon="✅",
    color="#4CAF50",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("predicate", PortType.FUNCTION, required=True, description="Test condition")
    ],
    outputs=[
        Port("result", PortType.BOOLEAN, description="True if all elements match")
    ]
)
def every_node(context: NodeContext) -> Any:
    """Test if all elements match condition."""
    array = context.get_input("array", [])
    predicate = context.get_input("predicate")
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    for i, item in enumerate(array):
        matches = False
        
        if callable(predicate):
            matches = predicate(item)
        elif isinstance(predicate, str):
            try:
                matches = context.execute_subgraph(predicate, {"item": item, "index": i})
            except NotImplementedError:
                matches = eval(predicate.replace("item", str(item)))
        
        if not matches:
            context.set_output("result", False)
            return False
    
    context.set_output("result", True)
    return True


@node(
    namespace="collection",
    node_type="includes",
    display_name="Includes",
    category="Collection/Query",
    description="Check if array contains value",
    icon="📦",
    color="#9C27B0",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("value", PortType.ANY, required=True, description="Value to search for")
    ],
    outputs=[
        Port("result", PortType.BOOLEAN, description="True if array contains value"),
        Port("index", PortType.NUMBER, description="Index of first occurrence or -1")
    ]
)
def includes_node(context: NodeContext) -> Any:
    """Check if array contains value."""
    array = context.get_input("array", [])
    value = context.get_input("value")
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    try:
        index = array.index(value)
        context.set_output("result", True)
        context.set_output("index", index)
        return True
    except ValueError:
        context.set_output("result", False)
        context.set_output("index", -1)
        return False