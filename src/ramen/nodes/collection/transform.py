"""
Functional transformation operations for collections.
"""

from typing import Any, Callable, List
from functools import reduce as func_reduce
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="collection",
    node_type="map",
    display_name="Map",
    category="Collection/Transform",
    description="Transform each element using a function",
    icon="🔄",
    color="#2196F3",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("mapper", PortType.FUNCTION, required=True, description="Transformation function or subgraph")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Transformed array")
    ]
)
def map_node(context: NodeContext) -> Any:
    """Transform each element in array using mapper function."""
    array = context.get_input("array", [])
    mapper = context.get_input("mapper")
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    result = []
    
    for i, item in enumerate(array):
        if callable(mapper):
            # Direct function
            transformed = mapper(item)
        elif isinstance(mapper, str):
            # Subgraph ID - execute subgraph for each item
            try:
                transformed = context.execute_subgraph(mapper, {"item": item, "index": i})
            except NotImplementedError:
                # Fallback: treat as simple expression
                # This is a simplified evaluation - in real implementation, 
                # you'd have proper expression evaluation
                transformed = eval(mapper.replace("item", str(item)))
        elif isinstance(mapper, dict) and "expression" in mapper:
            # Expression object
            expr = mapper["expression"]
            # Simple expression evaluation (placeholder)
            transformed = eval(expr.replace("item", str(item)).replace("index", str(i)))
        else:
            # Default: pass through
            transformed = item
        
        result.append(transformed)
    
    context.set_output("result", result)
    return result


@node(
    namespace="collection",
    node_type="filter",
    display_name="Filter",
    category="Collection/Transform",
    description="Filter elements that match condition",
    icon="🔍",
    color="#FF9800",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("predicate", PortType.FUNCTION, required=True, description="Filter condition function")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Filtered array")
    ]
)
def filter_node(context: NodeContext) -> Any:
    """Filter array elements using predicate function."""
    array = context.get_input("array", [])
    predicate = context.get_input("predicate")
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    result = []
    
    for i, item in enumerate(array):
        should_include = False
        
        if callable(predicate):
            should_include = predicate(item)
        elif isinstance(predicate, str):
            try:
                should_include = context.execute_subgraph(predicate, {"item": item, "index": i})
            except NotImplementedError:
                # Simple expression evaluation
                should_include = eval(predicate.replace("item", str(item)))
        elif isinstance(predicate, dict) and "expression" in predicate:
            expr = predicate["expression"]
            should_include = eval(expr.replace("item", str(item)).replace("index", str(i)))
        
        if should_include:
            result.append(item)
    
    context.set_output("result", result)
    return result


@node(
    namespace="collection",
    node_type="reduce",
    display_name="Reduce",
    category="Collection/Transform",
    description="Reduce array to single value using accumulator function",
    icon="📊",
    color="#9C27B0",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("reducer", PortType.FUNCTION, required=True, description="Reducer function (acc, item) => acc"),
        Port("initial", PortType.ANY, required=False, description="Initial accumulator value")
    ],
    outputs=[
        Port("result", PortType.ANY, description="Reduced value")
    ]
)
def reduce_node(context: NodeContext) -> Any:
    """Reduce array to single value."""
    array = context.get_input("array", [])
    reducer = context.get_input("reducer")
    initial = context.get_input("initial", None)
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    if len(array) == 0:
        return initial
    
    def apply_reducer(acc, item):
        if callable(reducer):
            return reducer(acc, item)
        elif isinstance(reducer, str):
            try:
                return context.execute_subgraph(reducer, {"acc": acc, "item": item})
            except NotImplementedError:
                # Simple expression - common patterns
                if reducer == "sum" or reducer == "acc + item":
                    return acc + item
                elif reducer == "multiply" or reducer == "acc * item":
                    return acc * item
                elif reducer == "concat":
                    return str(acc) + str(item)
                else:
                    return eval(reducer.replace("acc", str(acc)).replace("item", str(item)))
        return acc
    
    if initial is not None:
        result = func_reduce(apply_reducer, array, initial)
    else:
        result = func_reduce(apply_reducer, array)
    
    context.set_output("result", result)
    return result


@node(
    namespace="collection",
    node_type="flat_map",
    display_name="Flat Map",
    category="Collection/Transform",
    description="Map and flatten result arrays",
    icon="🔀",
    color="#00BCD4",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("mapper", PortType.FUNCTION, required=True, description="Mapper function that returns arrays")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Flattened mapped array")
    ]
)
def flat_map_node(context: NodeContext) -> Any:
    """Map and flatten the results."""
    array = context.get_input("array", [])
    mapper = context.get_input("mapper")
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    result = []
    
    for i, item in enumerate(array):
        mapped_value = None
        
        if callable(mapper):
            mapped_value = mapper(item)
        elif isinstance(mapper, str):
            try:
                mapped_value = context.execute_subgraph(mapper, {"item": item, "index": i})
            except NotImplementedError:
                mapped_value = eval(mapper.replace("item", str(item)))
        
        # Flatten if the result is an array
        if isinstance(mapped_value, list):
            result.extend(mapped_value)
        else:
            result.append(mapped_value)
    
    context.set_output("result", result)
    return result


@node(
    namespace="collection",
    node_type="scan",
    display_name="Scan",
    category="Collection/Transform",
    description="Like reduce but returns all intermediate values",
    icon="📈",
    color="#4CAF50",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Input array"),
        Port("reducer", PortType.FUNCTION, required=True, description="Reducer function"),
        Port("initial", PortType.ANY, required=False, description="Initial value")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Array of intermediate values")
    ]
)
def scan_node(context: NodeContext) -> Any:
    """Scan - like reduce but returns intermediate values."""
    array = context.get_input("array", [])
    reducer = context.get_input("reducer")
    initial = context.get_input("initial", None)
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    result = []
    
    if initial is not None:
        acc = initial
        result.append(acc)
    else:
        if len(array) == 0:
            context.set_output("result", [])
            return []
        acc = array[0]
        result.append(acc)
        array = array[1:]
    
    for item in array:
        if callable(reducer):
            acc = reducer(acc, item)
        elif isinstance(reducer, str):
            try:
                acc = context.execute_subgraph(reducer, {"acc": acc, "item": item})
            except NotImplementedError:
                if reducer == "sum":
                    acc = acc + item
                elif reducer == "multiply":
                    acc = acc * item
                else:
                    acc = eval(reducer.replace("acc", str(acc)).replace("item", str(item)))
        
        result.append(acc)
    
    context.set_output("result", result)
    return result