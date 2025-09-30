"""Object transformation operations."""

from typing import Any
from ramen.nodes.base import node, NodeContext, Port, PortType


@node(
    namespace="object",
    node_type="merge_objects",
    display_name="Merge Objects",
    category="Object/Transform",
    description="Merge multiple objects into one",
    icon="🔄",
    color="#FF9800",
    inputs=[
        Port("objects", PortType.ARRAY, required=True),
        Port("deep", PortType.BOOLEAN, required=False)
    ],
    outputs=[Port("result", PortType.OBJECT)]
)
def merge_objects_node(context: NodeContext) -> Any:
    """Merge multiple objects into one."""
    objects = context.get_input("objects", [])
    deep = context.get_input("deep", False)
    
    result = {}
    
    for obj in objects:
        if isinstance(obj, dict):
            if deep:
                # Deep merge (simplified)
                for key, value in obj.items():
                    if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                        result[key] = {**result[key], **value}
                    else:
                        result[key] = value
            else:
                result.update(obj)
    
    context.set_output("result", result)
    return result


@node(
    namespace="object",
    node_type="pick",
    display_name="Pick",
    category="Object/Transform",
    description="Pick specified properties from object",
    icon="🎯",
    color="#FF9800",
    inputs=[
        Port("object", PortType.OBJECT, required=True),
        Port("keys", PortType.ARRAY, required=True)
    ],
    outputs=[Port("result", PortType.OBJECT)]
)
def pick_node(context: NodeContext) -> Any:
    """Pick specified properties from object."""
    obj = context.get_input("object", {})
    keys = context.get_input("keys", [])
    
    if not isinstance(obj, dict):
        obj = {}
    
    result = {}
    for key in keys:
        if isinstance(key, str) and key in obj:
            result[key] = obj[key]
    
    context.set_output("result", result)
    return result


@node(
    namespace="object",
    node_type="omit",
    display_name="Omit",
    category="Object/Transform",
    description="Omit specified properties from object",
    icon="🚫",
    color="#FF9800",
    inputs=[
        Port("object", PortType.OBJECT, required=True),
        Port("keys", PortType.ARRAY, required=True)
    ],
    outputs=[Port("result", PortType.OBJECT)]
)
def omit_node(context: NodeContext) -> Any:
    """Omit specified properties from object."""
    obj = context.get_input("object", {})
    keys = context.get_input("keys", [])
    
    if not isinstance(obj, dict):
        obj = {}
    
    keys_to_omit = set(str(key) for key in keys)
    result = {k: v for k, v in obj.items() if k not in keys_to_omit}
    
    context.set_output("result", result)
    return result


@node(
    namespace="object",
    node_type="map_object",
    display_name="Map Object",
    category="Object/Transform",
    description="Transform object values using a function",
    icon="🗺️",
    color="#FF9800",
    inputs=[
        Port("object", PortType.OBJECT, required=True),
        Port("mapper", PortType.FUNCTION, required=True)
    ],
    outputs=[Port("result", PortType.OBJECT)]
)
def map_object_node(context: NodeContext) -> Any:
    """Transform object values using a function."""
    obj = context.get_input("object", {})
    mapper = context.get_input("mapper")
    
    if not isinstance(obj, dict):
        obj = {}
    
    result = {}
    for key, value in obj.items():
        try:
            if callable(mapper):
                transformed = mapper(value, key)
            elif isinstance(mapper, str):
                try:
                    transformed = context.execute_subgraph(mapper, {"value": value, "key": key})
                except NotImplementedError:
                    transformed = eval(mapper.replace("value", str(value)).replace("key", f"'{key}'"))
            else:
                transformed = value
            result[key] = transformed
        except Exception:
            result[key] = value
    
    context.set_output("result", result)
    return result


@node(
    namespace="object",
    node_type="filter_object",
    display_name="Filter Object",
    category="Object/Transform",
    description="Filter object properties using a predicate",
    icon="🔍",
    color="#FF9800",
    inputs=[
        Port("object", PortType.OBJECT, required=True),
        Port("predicate", PortType.FUNCTION, required=True)
    ],
    outputs=[Port("result", PortType.OBJECT)]
)
def filter_object_node(context: NodeContext) -> Any:
    """Filter object properties using a predicate."""
    obj = context.get_input("object", {})
    predicate = context.get_input("predicate")
    
    if not isinstance(obj, dict):
        obj = {}
    
    result = {}
    for key, value in obj.items():
        try:
            if callable(predicate):
                keep = predicate(value, key)
            elif isinstance(predicate, str):
                try:
                    keep = context.execute_subgraph(predicate, {"value": value, "key": key})
                except NotImplementedError:
                    keep = eval(predicate.replace("value", str(value)).replace("key", f"'{key}'"))
            else:
                keep = True
            
            if keep:
                result[key] = value
        except Exception:
            # Keep on error
            result[key] = value
    
    context.set_output("result", result)
    return result


@node(
    namespace="object",
    node_type="transform_object",
    display_name="Transform Object",
    category="Object/Transform",
    description="Transform both keys and values of object",
    icon="🔄",
    color="#FF9800",
    inputs=[
        Port("object", PortType.OBJECT, required=True),
        Port("key_transformer", PortType.FUNCTION, required=False),
        Port("value_transformer", PortType.FUNCTION, required=False)
    ],
    outputs=[Port("result", PortType.OBJECT)]
)
def transform_object_node(context: NodeContext) -> Any:
    """Transform both keys and values of object."""
    obj = context.get_input("object", {})
    key_transformer = context.get_input("key_transformer")
    value_transformer = context.get_input("value_transformer")
    
    if not isinstance(obj, dict):
        obj = {}
    
    result = {}
    for key, value in obj.items():
        # Transform key
        if key_transformer:
            try:
                if callable(key_transformer):
                    new_key = key_transformer(key)
                elif isinstance(key_transformer, str):
                    try:
                        new_key = context.execute_subgraph(key_transformer, {"key": key})
                    except NotImplementedError:
                        new_key = eval(key_transformer.replace("key", f"'{key}'"))
                else:
                    new_key = key
            except Exception:
                new_key = key
        else:
            new_key = key
        
        # Transform value
        if value_transformer:
            try:
                if callable(value_transformer):
                    new_value = value_transformer(value)
                elif isinstance(value_transformer, str):
                    try:
                        new_value = context.execute_subgraph(value_transformer, {"value": value})
                    except NotImplementedError:
                        new_value = eval(value_transformer.replace("value", str(value)))
                else:
                    new_value = value
            except Exception:
                new_value = value
        else:
            new_value = value
        
        result[str(new_key)] = new_value
    
    context.set_output("result", result)
    return result