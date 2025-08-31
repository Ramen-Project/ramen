"""Type conversion operations."""

import json
from typing import Any
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="type",
    node_type="to_string",
    display_name="To String",
    category="Type/Conversion",
    description="Convert value to string",
    icon="🔤",
    color="#795548",
    inputs=[Port("value", PortType.ANY, required=True)],
    outputs=[Port("result", PortType.STRING)]
)
def to_string_node(context: NodeContext) -> Any:
    """Convert value to string."""
    value = context.get_input("value")
    result = str(value)
    context.set_output("result", result)
    return result


@node(
    namespace="type",
    node_type="to_number",
    display_name="To Number",
    category="Type/Conversion",
    description="Convert value to number",
    icon="🔢",
    color="#795548",
    inputs=[
        Port("value", PortType.ANY, required=True),
        Port("default", PortType.NUMBER, required=False)
    ],
    outputs=[Port("result", PortType.NUMBER)]
)
def to_number_node(context: NodeContext) -> Any:
    """Convert value to number."""
    value = context.get_input("value")
    default = context.get_input("default", 0)
    
    try:
        if isinstance(value, bool):
            result = float(int(value))
        elif isinstance(value, str):
            # Try int first, then float
            try:
                result = float(int(value))
            except ValueError:
                result = float(value)
        else:
            result = float(value)
    except (ValueError, TypeError):
        result = default
    
    context.set_output("result", result)
    return result


@node(
    namespace="type",
    node_type="to_boolean",
    display_name="To Boolean",
    category="Type/Conversion",
    description="Convert value to boolean",
    icon="✅",
    color="#795548",
    inputs=[Port("value", PortType.ANY, required=True)],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def to_boolean_node(context: NodeContext) -> Any:
    """Convert value to boolean."""
    value = context.get_input("value")
    
    if isinstance(value, str):
        # Handle common string representations
        lower_value = value.lower().strip()
        if lower_value in ('true', '1', 'yes', 'on'):
            result = True
        elif lower_value in ('false', '0', 'no', 'off', ''):
            result = False
        else:
            result = True  # Non-empty string is truthy
    else:
        result = bool(value)
    
    context.set_output("result", result)
    return result


@node(
    namespace="type",
    node_type="to_array",
    display_name="To Array",
    category="Type/Conversion",
    description="Convert value to array",
    icon="📋",
    color="#795548",
    inputs=[Port("value", PortType.ANY, required=True)],
    outputs=[Port("result", PortType.ARRAY)]
)
def to_array_node(context: NodeContext) -> Any:
    """Convert value to array."""
    value = context.get_input("value")
    
    if isinstance(value, (list, tuple)):
        result = list(value)
    elif isinstance(value, str):
        result = list(value)  # String to character array
    elif isinstance(value, dict):
        result = list(value.values())
    elif value is None:
        result = []
    else:
        result = [value]  # Wrap single value in array
    
    context.set_output("result", result)
    return result


@node(
    namespace="type",
    node_type="to_object",
    display_name="To Object",
    category="Type/Conversion",
    description="Convert value to object/dictionary",
    icon="📦",
    color="#795548",
    inputs=[Port("value", PortType.ANY, required=True)],
    outputs=[Port("result", PortType.OBJECT)]
)
def to_object_node(context: NodeContext) -> Any:
    """Convert value to object/dictionary."""
    value = context.get_input("value")
    
    if isinstance(value, dict):
        result = value
    elif isinstance(value, (list, tuple)):
        # Convert array to indexed object
        result = {str(i): v for i, v in enumerate(value)}
    elif value is None:
        result = {}
    else:
        result = {"value": value}
    
    context.set_output("result", result)
    return result


@node(
    namespace="type",
    node_type="parse_json",
    display_name="Parse JSON",
    category="Type/Conversion",
    description="Parse JSON string to object",
    icon="📄",
    color="#795548",
    inputs=[
        Port("json_string", PortType.STRING, required=True),
        Port("default", PortType.ANY, required=False)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def parse_json_node(context: NodeContext) -> Any:
    """Parse JSON string to object."""
    json_string = str(context.get_input("json_string", ""))
    default = context.get_input("default", None)
    
    try:
        result = json.loads(json_string)
    except (json.JSONDecodeError, ValueError):
        result = default
    
    context.set_output("result", result)
    return result


@node(
    namespace="type",
    node_type="stringify_json",
    display_name="Stringify JSON",
    category="Type/Conversion",
    description="Convert object to JSON string",
    icon="📝",
    color="#795548",
    inputs=[
        Port("value", PortType.ANY, required=True),
        Port("indent", PortType.NUMBER, required=False)
    ],
    outputs=[Port("result", PortType.STRING)]
)
def stringify_json_node(context: NodeContext) -> Any:
    """Convert object to JSON string."""
    value = context.get_input("value")
    indent = context.get_input("indent")
    
    try:
        if indent is not None:
            indent = int(indent)
            result = json.dumps(value, indent=indent)
        else:
            result = json.dumps(value)
    except (TypeError, ValueError) as e:
        result = f"JSON error: {str(e)}"
    
    context.set_output("result", result)
    return result