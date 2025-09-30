"""Type validation operations."""

from typing import Any
from ramen.nodes.base import node, NodeContext, Port, PortType


@node(
    namespace="type",
    node_type="assert_type",
    display_name="Assert Type",
    category="Type/Validation",
    description="Assert that value is of expected type",
    icon="🛡️",
    color="#795548",
    inputs=[
        Port("value", PortType.ANY, required=True),
        Port("expected_type", PortType.STRING, required=True),
        Port("error_message", PortType.STRING, required=False)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def assert_type_node(context: NodeContext) -> Any:
    """Assert that value is of expected type."""
    value = context.get_input("value")
    expected_type = context.get_input("expected_type", "")
    error_message = context.get_input("error_message", f"Expected type {expected_type}")
    
    # Type checking map
    type_checks = {
        "string": lambda v: isinstance(v, str),
        "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
        "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
        "float": lambda v: isinstance(v, float),
        "boolean": lambda v: isinstance(v, bool),
        "array": lambda v: isinstance(v, (list, tuple)),
        "list": lambda v: isinstance(v, list),
        "tuple": lambda v: isinstance(v, tuple),
        "object": lambda v: isinstance(v, dict),
        "dict": lambda v: isinstance(v, dict),
        "null": lambda v: v is None,
        "any": lambda v: True
    }
    
    check_func = type_checks.get(expected_type.lower())
    if check_func is None or not check_func(value):
        # In a real implementation, this would raise an error or set an error state
        # For now, we'll return an error message
        result = f"Type assertion failed: {error_message}"
    else:
        result = value
    
    context.set_output("result", result)
    return result


@node(
    namespace="type",
    node_type="coerce",
    display_name="Coerce Type",
    category="Type/Validation",
    description="Coerce value to target type with fallback",
    icon="🔧",
    color="#795548",
    inputs=[
        Port("value", PortType.ANY, required=True),
        Port("target_type", PortType.STRING, required=True),
        Port("default", PortType.ANY, required=False)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def coerce_node(context: NodeContext) -> Any:
    """Coerce value to target type with fallback."""
    value = context.get_input("value")
    target_type = context.get_input("target_type", "").lower()
    default = context.get_input("default")
    
    try:
        if target_type == "string":
            result = str(value)
        elif target_type in ("number", "float"):
            result = float(value)
        elif target_type == "integer":
            result = int(float(value))
        elif target_type == "boolean":
            if isinstance(value, str):
                lower_value = value.lower().strip()
                result = lower_value in ('true', '1', 'yes', 'on') if lower_value else False
            else:
                result = bool(value)
        elif target_type == "array":
            if isinstance(value, (list, tuple)):
                result = list(value)
            elif isinstance(value, str):
                result = list(value)
            else:
                result = [value]
        elif target_type == "object":
            if isinstance(value, dict):
                result = value
            elif isinstance(value, (list, tuple)):
                result = {str(i): v for i, v in enumerate(value)}
            else:
                result = {"value": value}
        else:
            result = value  # No coercion for unknown types
    except (ValueError, TypeError):
        result = default if default is not None else value
    
    context.set_output("result", result)
    return result


@node(
    namespace="type",
    node_type="default",
    display_name="Default",
    category="Type/Validation",
    description="Return default value if input is null/undefined",
    icon="🎯",
    color="#795548",
    inputs=[
        Port("value", PortType.ANY, required=True),
        Port("default", PortType.ANY, required=True)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def default_node(context: NodeContext) -> Any:
    """Return default value if input is null/undefined."""
    value = context.get_input("value")
    default = context.get_input("default")
    
    result = default if value is None else value
    context.set_output("result", result)
    return result


@node(
    namespace="type",
    node_type="nullable",
    display_name="Nullable",
    category="Type/Validation",
    description="Allow null values to pass through, transform non-null values",
    icon="❓",
    color="#795548",
    inputs=[
        Port("value", PortType.ANY, required=True),
        Port("transform", PortType.FUNCTION, required=False)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def nullable_node(context: NodeContext) -> Any:
    """Allow null values to pass through, transform non-null values."""
    value = context.get_input("value")
    transform = context.get_input("transform")
    
    if value is None:
        result = None
    elif transform and callable(transform):
        try:
            result = transform(value)
        except Exception:
            result = value
    else:
        result = value
    
    context.set_output("result", result)
    return result