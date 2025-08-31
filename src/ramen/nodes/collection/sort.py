"""
Sorting and grouping operations for collections.
"""

from typing import Any, Dict, List
from collections import defaultdict
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="collection",
    node_type="sort",
    display_name="Sort",
    category="Collection/Sort",
    description="Sort array elements",
    icon="🔤",
    color="#3F51B5",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("reverse", PortType.BOOLEAN, required=False, default=False, description="Sort in reverse order")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Sorted array")
    ]
)
def sort_node(context: NodeContext) -> Any:
    """Sort array elements."""
    array = context.get_input("array", [])
    reverse = context.get_input("reverse", False)
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    try:
        result = sorted(array, reverse=reverse)
        context.set_output("result", result)
        return result
    except TypeError as e:
        raise ValueError(f"Cannot sort array with mixed types: {e}")


@node(
    namespace="collection",
    node_type="sort_by",
    display_name="Sort By",
    category="Collection/Sort",
    description="Sort array by key function",
    icon="🗂️",
    color="#9C27B0",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("key", PortType.FUNCTION, required=True, description="Key function or property name"),
        Port("reverse", PortType.BOOLEAN, required=False, default=False, description="Sort in reverse order")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Sorted array")
    ]
)
def sort_by_node(context: NodeContext) -> Any:
    """Sort array by key function."""
    array = context.get_input("array", [])
    key_func = context.get_input("key")
    reverse = context.get_input("reverse", False)
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    def get_sort_key(item):
        if callable(key_func):
            return key_func(item)
        elif isinstance(key_func, str):
            if isinstance(item, dict):
                return item.get(key_func)
            elif hasattr(item, key_func):
                return getattr(item, key_func)
            else:
                # Try to evaluate as expression
                try:
                    return eval(key_func.replace("item", str(item)))
                except:
                    return item
        return item
    
    try:
        result = sorted(array, key=get_sort_key, reverse=reverse)
        context.set_output("result", result)
        return result
    except Exception as e:
        raise ValueError(f"Cannot sort array: {e}")


@node(
    namespace="collection",
    node_type="reverse",
    display_name="Reverse",
    category="Collection/Sort",
    description="Reverse array order",
    icon="↩️",
    color="#FF5722",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Reversed array")
    ]
)
def reverse_node(context: NodeContext) -> Any:
    """Reverse array order."""
    array = context.get_input("array", [])
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    result = list(reversed(array))
    context.set_output("result", result)
    return result


@node(
    namespace="collection",
    node_type="group_by",
    display_name="Group By",
    category="Collection/Group",
    description="Group array elements by key",
    icon="📁",
    color="#795548",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("key", PortType.FUNCTION, required=True, description="Grouping key function or property name")
    ],
    outputs=[
        Port("result", PortType.OBJECT, description="Object with grouped arrays")
    ]
)
def group_by_node(context: NodeContext) -> Any:
    """Group array elements by key."""
    array = context.get_input("array", [])
    key_func = context.get_input("key")
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    groups = defaultdict(list)
    
    for item in array:
        group_key = None
        
        if callable(key_func):
            group_key = key_func(item)
        elif isinstance(key_func, str):
            if isinstance(item, dict):
                group_key = item.get(key_func, "undefined")
            elif hasattr(item, key_func):
                group_key = getattr(item, key_func)
            else:
                try:
                    group_key = eval(key_func.replace("item", str(item)))
                except:
                    group_key = str(item)
        else:
            group_key = str(item)
        
        # Convert key to string for JSON compatibility
        group_key = str(group_key)
        groups[group_key].append(item)
    
    result = dict(groups)
    context.set_output("result", result)
    return result


@node(
    namespace="collection",
    node_type="partition",
    display_name="Partition",
    category="Collection/Group",
    description="Split array into two groups based on predicate",
    icon="🔀",
    color="#607D8B",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("predicate", PortType.FUNCTION, required=True, description="Partition condition")
    ],
    outputs=[
        Port("truthy", PortType.ARRAY, description="Elements matching condition"),
        Port("falsy", PortType.ARRAY, description="Elements not matching condition")
    ]
)
def partition_node(context: NodeContext) -> Any:
    """Split array into two groups based on predicate."""
    array = context.get_input("array", [])
    predicate = context.get_input("predicate")
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    truthy = []
    falsy = []
    
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
            truthy.append(item)
        else:
            falsy.append(item)
    
    context.set_output("truthy", truthy)
    context.set_output("falsy", falsy)
    return {"truthy": truthy, "falsy": falsy}


@node(
    namespace="collection",
    node_type="unique",
    display_name="Unique",
    category="Collection/Group",
    description="Remove duplicate elements",
    icon="🔹",
    color="#00BCD4",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("key", PortType.FUNCTION, required=False, description="Key function for uniqueness comparison")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Array with unique elements")
    ]
)
def unique_node(context: NodeContext) -> Any:
    """Remove duplicate elements from array."""
    array = context.get_input("array", [])
    key_func = context.get_input("key")
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    if key_func is None:
        # Simple uniqueness
        seen = set()
        result = []
        for item in array:
            # Handle unhashable types
            try:
                if item not in seen:
                    seen.add(item)
                    result.append(item)
            except TypeError:
                # For unhashable types, use linear search
                if item not in result:
                    result.append(item)
    else:
        # Uniqueness by key
        seen_keys = set()
        result = []
        
        for item in array:
            if callable(key_func):
                item_key = key_func(item)
            elif isinstance(key_func, str):
                if isinstance(item, dict):
                    item_key = item.get(key_func)
                else:
                    item_key = str(item)
            else:
                item_key = item
            
            try:
                if item_key not in seen_keys:
                    seen_keys.add(item_key)
                    result.append(item)
            except TypeError:
                # For unhashable keys, convert to string
                str_key = str(item_key)
                if str_key not in seen_keys:
                    seen_keys.add(str_key)
                    result.append(item)
    
    context.set_output("result", result)
    return result


# Set operations
@node(
    namespace="collection",
    node_type="union",
    display_name="Union",
    category="Collection/Set",
    description="Union of two arrays (unique elements)",
    icon="∪",
    color="#4CAF50",
    inputs=[
        Port("array1", PortType.ARRAY, required=True, description="First array"),
        Port("array2", PortType.ARRAY, required=True, description="Second array")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Union of arrays")
    ]
)
def union_node(context: NodeContext) -> Any:
    """Union of two arrays."""
    array1 = context.get_input("array1", [])
    array2 = context.get_input("array2", [])
    
    if not isinstance(array1, list):
        raise ValueError("First input must be an array")
    if not isinstance(array2, list):
        raise ValueError("Second input must be an array")
    
    # Combine and remove duplicates
    combined = array1 + array2
    seen = set()
    result = []
    
    for item in combined:
        try:
            if item not in seen:
                seen.add(item)
                result.append(item)
        except TypeError:
            # For unhashable types
            if item not in result:
                result.append(item)
    
    context.set_output("result", result)
    return result


@node(
    namespace="collection",
    node_type="intersection",
    display_name="Intersection",
    category="Collection/Set",
    description="Intersection of two arrays",
    icon="∩",
    color="#FF9800",
    inputs=[
        Port("array1", PortType.ARRAY, required=True, description="First array"),
        Port("array2", PortType.ARRAY, required=True, description="Second array")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Intersection of arrays")
    ]
)
def intersection_node(context: NodeContext) -> Any:
    """Intersection of two arrays."""
    array1 = context.get_input("array1", [])
    array2 = context.get_input("array2", [])
    
    if not isinstance(array1, list):
        raise ValueError("First input must be an array")
    if not isinstance(array2, list):
        raise ValueError("Second input must be an array")
    
    result = []
    
    for item in array1:
        if item in array2 and item not in result:
            result.append(item)
    
    context.set_output("result", result)
    return result


@node(
    namespace="collection",
    node_type="difference",
    display_name="Difference",
    category="Collection/Set",
    description="Elements in first array but not in second",
    icon="−",
    color="#F44336",
    inputs=[
        Port("array1", PortType.ARRAY, required=True, description="First array"),
        Port("array2", PortType.ARRAY, required=True, description="Second array")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Difference of arrays")
    ]
)
def difference_node(context: NodeContext) -> Any:
    """Elements in first array but not in second."""
    array1 = context.get_input("array1", [])
    array2 = context.get_input("array2", [])
    
    if not isinstance(array1, list):
        raise ValueError("First input must be an array")
    if not isinstance(array2, list):
        raise ValueError("Second input must be an array")
    
    result = [item for item in array1 if item not in array2]
    
    context.set_output("result", result)
    return result