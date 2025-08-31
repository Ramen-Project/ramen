"""Type checking operations."""

from typing import Any
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="type",
    node_type="type_of",
    display_name="Type Of",
    category="Type/Checking",
    description="Get the type name of a value",
    icon="🏷️",
    color="#795548",
    inputs=[Port("value", PortType.ANY, required=True)],
    outputs=[Port("type", PortType.STRING)]
)
def type_of_node(context: NodeContext) -> Any:
    """Get the type name of a value."""
    value = context.get_input("value")
    
    if value is None:
        type_name = "null"
    elif isinstance(value, bool):
        type_name = "boolean"
    elif isinstance(value, int):
        type_name = "integer"
    elif isinstance(value, float):
        type_name = "number"
    elif isinstance(value, str):
        type_name = "string"
    elif isinstance(value, (list, tuple)):
        type_name = "array"
    elif isinstance(value, dict):
        type_name = "object"
    else:
        type_name = type(value).__name__
    
    context.set_output("type", type_name)
    return type_name


@node(
    namespace="type",
    node_type="is_string",
    display_name="Is String",
    category="Type/Checking",
    description="Check if value is a string",
    icon="🔤",
    color="#795548",
    inputs=[Port("value", PortType.ANY, required=True)],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def is_string_node(context: NodeContext) -> Any:
    """Check if value is a string."""
    value = context.get_input("value")
    result = isinstance(value, str)
    context.set_output("result", result)
    return result


@node(
    namespace="type",
    node_type="is_number",
    display_name="Is Number",
    category="Type/Checking",
    description="Check if value is a number",
    icon="🔢",
    color="#795548",
    inputs=[Port("value", PortType.ANY, required=True)],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def is_number_node(context: NodeContext) -> Any:
    """Check if value is a number."""
    value = context.get_input("value")
    result = isinstance(value, (int, float)) and not isinstance(value, bool)
    context.set_output("result", result)
    return result


@node(
    namespace="type",
    node_type="is_boolean",
    display_name="Is Boolean",
    category="Type/Checking",
    description="Check if value is a boolean",
    icon="✅",
    color="#795548",
    inputs=[Port("value", PortType.ANY, required=True)],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def is_boolean_node(context: NodeContext) -> Any:
    """Check if value is a boolean."""
    value = context.get_input("value")
    result = isinstance(value, bool)
    context.set_output("result", result)
    return result


@node(
    namespace="type",
    node_type="is_array",
    display_name="Is Array",
    category="Type/Checking",
    description="Check if value is an array",
    icon="📋",
    color="#795548",
    inputs=[Port("value", PortType.ANY, required=True)],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def is_array_node(context: NodeContext) -> Any:
    """Check if value is an array."""
    value = context.get_input("value")
    result = isinstance(value, (list, tuple))
    context.set_output("result", result)
    return result


@node(
    namespace="type",
    node_type="is_object",
    display_name="Is Object",
    category="Type/Checking",
    description="Check if value is an object",
    icon="📦",
    color="#795548",
    inputs=[Port("value", PortType.ANY, required=True)],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def is_object_node(context: NodeContext) -> Any:
    """Check if value is an object/dictionary."""
    value = context.get_input("value")
    result = isinstance(value, dict)
    context.set_output("result", result)
    return result


@node(
    namespace="type",
    node_type="is_null",
    display_name="Is Null",
    category="Type/Checking",
    description="Check if value is null/None",
    icon="🚫",
    color="#795548",
    inputs=[Port("value", PortType.ANY, required=True)],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def is_null_node(context: NodeContext) -> Any:
    """Check if value is null/None."""
    value = context.get_input("value")
    result = value is None
    context.set_output("result", result)
    return result


@node(
    namespace="type",
    node_type="is_defined",
    display_name="Is Defined",
    category="Type/Checking",
    description="Check if value is defined (not null/None)",
    icon="✔️",
    color="#795548",
    inputs=[Port("value", PortType.ANY, required=True)],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def is_defined_node(context: NodeContext) -> Any:
    """Check if value is defined (not null/None)."""
    value = context.get_input("value")
    result = value is not None
    context.set_output("result", result)
    return result