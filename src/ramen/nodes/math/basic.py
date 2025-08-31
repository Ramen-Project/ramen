"""
Basic mathematical operations.
"""

from typing import Any
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="math",
    node_type="add",
    display_name="Add",
    category="Math/Basic",
    description="Add two numbers",
    icon="➕",
    color="#4CAF50",
    inputs=[
        Port("a", PortType.NUMBER, required=True, description="First number"),
        Port("b", PortType.NUMBER, required=True, description="Second number")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Sum of a and b")
    ]
)
def add_node(context: NodeContext) -> Any:
    """Add two numbers."""
    a = context.get_input("a", 0)
    b = context.get_input("b", 0)
    result = a + b
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="subtract",
    display_name="Subtract",
    category="Math/Basic",
    description="Subtract second number from first",
    icon="➖",
    color="#F44336",
    inputs=[
        Port("a", PortType.NUMBER, required=True, description="First number"),
        Port("b", PortType.NUMBER, required=True, description="Second number")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Difference (a - b)")
    ]
)
def subtract_node(context: NodeContext) -> Any:
    """Subtract second number from first."""
    a = context.get_input("a", 0)
    b = context.get_input("b", 0)
    result = a - b
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="multiply",
    display_name="Multiply",
    category="Math/Basic",
    description="Multiply two numbers",
    icon="✖️",
    color="#FF9800",
    inputs=[
        Port("a", PortType.NUMBER, required=True, description="First number"),
        Port("b", PortType.NUMBER, required=True, description="Second number")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Product of a and b")
    ]
)
def multiply_node(context: NodeContext) -> Any:
    """Multiply two numbers."""
    a = context.get_input("a", 1)
    b = context.get_input("b", 1)
    result = a * b
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="divide",
    display_name="Divide",
    category="Math/Basic",
    description="Divide first number by second",
    icon="➗",
    color="#9C27B0",
    inputs=[
        Port("a", PortType.NUMBER, required=True, description="Dividend"),
        Port("b", PortType.NUMBER, required=True, description="Divisor")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Quotient (a / b)")
    ]
)
def divide_node(context: NodeContext) -> Any:
    """Divide first number by second."""
    a = context.get_input("a", 1)
    b = context.get_input("b", 1)
    
    if b == 0:
        raise ValueError("Division by zero")
    
    result = a / b
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="modulo",
    display_name="Modulo",
    category="Math/Basic",
    description="Get remainder of division",
    icon="🔢",
    color="#3F51B5",
    inputs=[
        Port("a", PortType.NUMBER, required=True, description="Dividend"),
        Port("b", PortType.NUMBER, required=True, description="Divisor")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Remainder (a % b)")
    ]
)
def modulo_node(context: NodeContext) -> Any:
    """Get remainder of division."""
    a = context.get_input("a", 1)
    b = context.get_input("b", 1)
    
    if b == 0:
        raise ValueError("Modulo by zero")
    
    result = a % b
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="power",
    display_name="Power",
    category="Math/Basic",
    description="Raise number to power",
    icon="🔺",
    color="#E91E63",
    inputs=[
        Port("base", PortType.NUMBER, required=True, description="Base number"),
        Port("exponent", PortType.NUMBER, required=True, description="Exponent")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="base^exponent")
    ]
)
def power_node(context: NodeContext) -> Any:
    """Raise number to power."""
    base = context.get_input("base", 1)
    exponent = context.get_input("exponent", 2)
    
    result = base ** exponent
    context.set_output("result", result)
    return result