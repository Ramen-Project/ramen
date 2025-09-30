"""Object property access operations."""

from typing import Any
from ramen.nodes.base import node, NodeContext, Port, PortType


@node(
    namespace="object",
    node_type="get_property",
    display_name="Get Property",
    category="Object/Access",
    description="Get property value from object",
    icon="📥",
    color="#FF9800",
    inputs=[
        Port("object", PortType.OBJECT, required=True),
        Port("key", PortType.STRING, required=True),
        Port("default", PortType.ANY, required=False)
    ],
    outputs=[Port("value", PortType.ANY)]
)
def get_property_node(context: NodeContext) -> Any:
    """Get property value from object."""
    obj = context.get_input("object", {})
    key = context.get_input("key", "")
    default = context.get_input("default")
    
    if not isinstance(obj, dict):
        obj = {}
    
    # Support nested property access with dot notation
    if "." in key:
        keys = key.split(".")
        value = obj
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                value = default
                break
    else:
        value = obj.get(key, default)
    
    context.set_output("value", value)
    return value


@node(
    namespace="object",
    node_type="set_property",
    display_name="Set Property",
    category="Object/Access",
    description="Set property value in object",
    icon="📤",
    color="#FF9800",
    inputs=[
        Port("object", PortType.OBJECT, required=True),
        Port("key", PortType.STRING, required=True),
        Port("value", PortType.ANY, required=True)
    ],
    outputs=[Port("result", PortType.OBJECT)]
)
def set_property_node(context: NodeContext) -> Any:
    """Set property value in object."""
    obj = context.get_input("object", {})
    key = context.get_input("key", "")
    value = context.get_input("value")
    
    if not isinstance(obj, dict):
        obj = {}
    
    # Create a copy to avoid mutation
    result = obj.copy()
    
    # Support nested property setting with dot notation
    if "." in key:
        keys = key.split(".")
        current = result
        for k in keys[:-1]:
            if k not in current or not isinstance(current[k], dict):
                current[k] = {}
            current = current[k]
        current[keys[-1]] = value
    else:
        result[key] = value
    
    context.set_output("result", result)
    return result


@node(
    namespace="object",
    node_type="has_property",
    display_name="Has Property",
    category="Object/Access",
    description="Check if object has property",
    icon="❓",
    color="#FF9800",
    inputs=[
        Port("object", PortType.OBJECT, required=True),
        Port("key", PortType.STRING, required=True)
    ],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def has_property_node(context: NodeContext) -> Any:
    """Check if object has property."""
    obj = context.get_input("object", {})
    key = context.get_input("key", "")
    
    if not isinstance(obj, dict):
        obj = {}
    
    # Support nested property checking with dot notation
    if "." in key:
        keys = key.split(".")
        current = obj
        for k in keys:
            if isinstance(current, dict) and k in current:
                current = current[k]
            else:
                result = False
                break
        else:
            result = True
    else:
        result = key in obj
    
    context.set_output("result", result)
    return result


@node(
    namespace="object",
    node_type="delete_property",
    display_name="Delete Property",
    category="Object/Access",
    description="Delete property from object",
    icon="🗑️",
    color="#FF9800",
    inputs=[
        Port("object", PortType.OBJECT, required=True),
        Port("key", PortType.STRING, required=True)
    ],
    outputs=[Port("result", PortType.OBJECT)]
)
def delete_property_node(context: NodeContext) -> Any:
    """Delete property from object."""
    obj = context.get_input("object", {})
    key = context.get_input("key", "")
    
    if not isinstance(obj, dict):
        obj = {}
    
    # Create a copy to avoid mutation
    result = obj.copy()
    
    if key in result:
        del result[key]
    
    context.set_output("result", result)
    return result


@node(
    namespace="object",
    node_type="keys",
    display_name="Keys",
    category="Object/Access",
    description="Get all keys from object",
    icon="🔑",
    color="#FF9800",
    inputs=[Port("object", PortType.OBJECT, required=True)],
    outputs=[Port("keys", PortType.ARRAY)]
)
def keys_node(context: NodeContext) -> Any:
    """Get all keys from object."""
    obj = context.get_input("object", {})
    
    if not isinstance(obj, dict):
        obj = {}
    
    keys = list(obj.keys())
    context.set_output("keys", keys)
    return keys


@node(
    namespace="object",
    node_type="values",
    display_name="Values",
    category="Object/Access",
    description="Get all values from object",
    icon="💎",
    color="#FF9800",
    inputs=[Port("object", PortType.OBJECT, required=True)],
    outputs=[Port("values", PortType.ARRAY)]
)
def values_node(context: NodeContext) -> Any:
    """Get all values from object."""
    obj = context.get_input("object", {})
    
    if not isinstance(obj, dict):
        obj = {}
    
    values = list(obj.values())
    context.set_output("values", values)
    return values


@node(
    namespace="object",
    node_type="entries",
    display_name="Entries",
    category="Object/Access",
    description="Get all key-value pairs from object",
    icon="📋",
    color="#FF9800",
    inputs=[Port("object", PortType.OBJECT, required=True)],
    outputs=[Port("entries", PortType.ARRAY)]
)
def entries_node(context: NodeContext) -> Any:
    """Get all key-value pairs from object."""
    obj = context.get_input("object", {})
    
    if not isinstance(obj, dict):
        obj = {}
    
    entries = [[k, v] for k, v in obj.items()]
    context.set_output("entries", entries)
    return entries