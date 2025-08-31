"""Comparison operations."""

from typing import Any
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="logic",
    node_type="equal",
    display_name="Equal", 
    category="Logic/Comparison",
    description="Check if two values are equal",
    icon="=",
    color="#9C27B0",
    inputs=[
        Port("a", PortType.ANY, required=True),
        Port("b", PortType.ANY, required=True)
    ],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def equal_node(context: NodeContext) -> Any:
    """Check if two values are equal."""
    a = context.get_input("a")
    b = context.get_input("b")
    result = a == b
    context.set_output("result", result)
    return result


@node(
    namespace="logic",
    node_type="not_equal",
    display_name="Not Equal",
    category="Logic/Comparison", 
    description="Check if two values are not equal",
    icon="≠",
    color="#9C27B0",
    inputs=[
        Port("a", PortType.ANY, required=True),
        Port("b", PortType.ANY, required=True)
    ],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def not_equal_node(context: NodeContext) -> Any:
    """Check if two values are not equal."""
    a = context.get_input("a")
    b = context.get_input("b")
    result = a != b
    context.set_output("result", result)
    return result


@node(
    namespace="logic",
    node_type="greater_than",
    display_name="Greater Than",
    category="Logic/Comparison",
    description="Check if first value is greater than second",
    icon=">",
    color="#9C27B0",
    inputs=[
        Port("a", PortType.NUMBER, required=True),
        Port("b", PortType.NUMBER, required=True)
    ],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def greater_than_node(context: NodeContext) -> Any:
    """Check if a > b."""
    a = context.get_input("a", 0)
    b = context.get_input("b", 0)
    result = a > b
    context.set_output("result", result)
    return result


@node(
    namespace="logic",
    node_type="less_than",
    display_name="Less Than",
    category="Logic/Comparison",
    description="Check if first value is less than second", 
    icon="<",
    color="#9C27B0",
    inputs=[
        Port("a", PortType.NUMBER, required=True),
        Port("b", PortType.NUMBER, required=True)
    ],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def less_than_node(context: NodeContext) -> Any:
    """Check if a < b."""
    a = context.get_input("a", 0)
    b = context.get_input("b", 0)
    result = a < b
    context.set_output("result", result)
    return result


@node(
    namespace="logic",
    node_type="greater_equal",
    display_name="Greater or Equal",
    category="Logic/Comparison",
    description="Check if first value is greater than or equal to second",
    icon="≥",
    color="#9C27B0",
    inputs=[
        Port("a", PortType.NUMBER, required=True),
        Port("b", PortType.NUMBER, required=True)
    ],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def greater_equal_node(context: NodeContext) -> Any:
    """Check if a >= b."""
    a = context.get_input("a", 0)
    b = context.get_input("b", 0)
    result = a >= b
    context.set_output("result", result)
    return result


@node(
    namespace="logic",
    node_type="less_equal",
    display_name="Less or Equal",
    category="Logic/Comparison",
    description="Check if first value is less than or equal to second",
    icon="≤",
    color="#9C27B0", 
    inputs=[
        Port("a", PortType.NUMBER, required=True),
        Port("b", PortType.NUMBER, required=True)
    ],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def less_equal_node(context: NodeContext) -> Any:
    """Check if a <= b."""
    a = context.get_input("a", 0)
    b = context.get_input("b", 0)
    result = a <= b
    context.set_output("result", result)
    return result


@node(
    namespace="logic",
    node_type="in",
    display_name="In",
    category="Logic/Comparison", 
    description="Check if value is in collection",
    icon="∈",
    color="#9C27B0",
    inputs=[
        Port("value", PortType.ANY, required=True),
        Port("collection", PortType.ARRAY, required=True)
    ],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def in_node(context: NodeContext) -> Any:
    """Check if value is in collection."""
    value = context.get_input("value")
    collection = context.get_input("collection", [])
    result = value in collection
    context.set_output("result", result)
    return result


@node(
    namespace="logic",
    node_type="not_in",
    display_name="Not In",
    category="Logic/Comparison",
    description="Check if value is not in collection",
    icon="∉",
    color="#9C27B0",
    inputs=[
        Port("value", PortType.ANY, required=True),
        Port("collection", PortType.ARRAY, required=True)
    ],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def not_in_node(context: NodeContext) -> Any:
    """Check if value is not in collection."""
    value = context.get_input("value")
    collection = context.get_input("collection", [])
    result = value not in collection
    context.set_output("result", result)
    return result