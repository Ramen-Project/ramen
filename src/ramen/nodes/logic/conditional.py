"""Conditional operations."""

from typing import Any, Dict
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="logic",
    node_type="if_then_else",
    display_name="If Then Else",
    category="Logic/Conditional",
    description="Return one of two values based on condition",
    icon="?",
    color="#9C27B0",
    inputs=[
        Port("condition", PortType.BOOLEAN, required=True),
        Port("then_value", PortType.ANY, required=True),
        Port("else_value", PortType.ANY, required=True)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def if_then_else_node(context: NodeContext) -> Any:
    """Return then_value if condition is true, else return else_value."""
    condition = context.get_input("condition", False)
    then_value = context.get_input("then_value")
    else_value = context.get_input("else_value")
    
    result = then_value if condition else else_value
    context.set_output("result", result)
    return result


@node(
    namespace="logic",
    node_type="switch",
    display_name="Switch",
    category="Logic/Conditional",
    description="Select value based on key from cases",
    icon="🔀",
    color="#9C27B0",
    inputs=[
        Port("key", PortType.ANY, required=True),
        Port("cases", PortType.OBJECT, required=True),
        Port("default", PortType.ANY, required=False)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def switch_node(context: NodeContext) -> Any:
    """Select value from cases dict based on key."""
    key = context.get_input("key")
    cases = context.get_input("cases", {})
    default = context.get_input("default")
    
    if not isinstance(cases, dict):
        cases = {}
    
    result = cases.get(str(key), default)
    context.set_output("result", result)
    return result


@node(
    namespace="logic",
    node_type="when",
    display_name="When",
    category="Logic/Conditional",
    description="Pass through value only when condition is true",
    icon="⏸",
    color="#9C27B0",
    inputs=[
        Port("condition", PortType.BOOLEAN, required=True),
        Port("value", PortType.ANY, required=True),
        Port("fallback", PortType.ANY, required=False)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def when_node(context: NodeContext) -> Any:
    """Pass through value when condition is true, else return fallback."""
    condition = context.get_input("condition", False)
    value = context.get_input("value")
    fallback = context.get_input("fallback", None)
    
    result = value if condition else fallback
    context.set_output("result", result)
    return result


@node(
    namespace="logic",
    node_type="unless",
    display_name="Unless",
    category="Logic/Conditional", 
    description="Pass through value only when condition is false",
    icon="⏹",
    color="#9C27B0",
    inputs=[
        Port("condition", PortType.BOOLEAN, required=True),
        Port("value", PortType.ANY, required=True),
        Port("fallback", PortType.ANY, required=False)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def unless_node(context: NodeContext) -> Any:
    """Pass through value when condition is false, else return fallback."""
    condition = context.get_input("condition", False)
    value = context.get_input("value")
    fallback = context.get_input("fallback", None)
    
    result = fallback if condition else value
    context.set_output("result", result)
    return result