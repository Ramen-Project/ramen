"""
Advanced mathematical operations.
"""

import math
from typing import Any, List, Union
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="math",
    node_type="sqrt",
    display_name="Square Root",
    category="Math/Advanced",
    description="Calculate square root",
    icon="√",
    color="#00BCD4",
    inputs=[
        Port("value", PortType.NUMBER, required=True, description="Number to get square root of")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Square root of value")
    ]
)
def sqrt_node(context: NodeContext) -> Any:
    """Calculate square root."""
    value = context.get_input("value", 0)
    
    if value < 0:
        raise ValueError("Cannot calculate square root of negative number")
    
    result = math.sqrt(value)
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="abs",
    display_name="Absolute",
    category="Math/Advanced",
    description="Get absolute value",
    icon="📏",
    color="#795548",
    inputs=[
        Port("value", PortType.NUMBER, required=True, description="Number to get absolute value of")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Absolute value")
    ]
)
def abs_node(context: NodeContext) -> Any:
    """Get absolute value."""
    value = context.get_input("value", 0)
    result = abs(value)
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="min",
    display_name="Minimum",
    category="Math/Advanced",
    description="Get minimum of two numbers",
    icon="⬇️",
    color="#607D8B",
    inputs=[
        Port("a", PortType.NUMBER, required=True, description="First number"),
        Port("b", PortType.NUMBER, required=True, description="Second number")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Minimum value")
    ]
)
def min_node(context: NodeContext) -> Any:
    """Get minimum of two numbers."""
    a = context.get_input("a", 0)
    b = context.get_input("b", 0)
    result = min(a, b)
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="max",
    display_name="Maximum",
    category="Math/Advanced",
    description="Get maximum of two numbers",
    icon="⬆️",
    color="#8BC34A",
    inputs=[
        Port("a", PortType.NUMBER, required=True, description="First number"),
        Port("b", PortType.NUMBER, required=True, description="Second number")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Maximum value")
    ]
)
def max_node(context: NodeContext) -> Any:
    """Get maximum of two numbers."""
    a = context.get_input("a", 0)
    b = context.get_input("b", 0)
    result = max(a, b)
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="round",
    display_name="Round",
    category="Math/Advanced",
    description="Round number to specified decimal places",
    icon="🔄",
    color="#CDDC39",
    inputs=[
        Port("value", PortType.NUMBER, required=True, description="Number to round"),
        Port("decimals", PortType.NUMBER, required=False, default=0, description="Number of decimal places")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Rounded value")
    ]
)
def round_node(context: NodeContext) -> Any:
    """Round number to specified decimal places."""
    value = context.get_input("value", 0)
    decimals = context.get_input("decimals", 0)
    result = round(value, int(decimals))
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="floor",
    display_name="Floor",
    category="Math/Advanced",
    description="Round down to nearest integer",
    icon="⬇️",
    color="#FFC107",
    inputs=[
        Port("value", PortType.NUMBER, required=True, description="Number to floor")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Floor value")
    ]
)
def floor_node(context: NodeContext) -> Any:
    """Round down to nearest integer."""
    value = context.get_input("value", 0)
    result = math.floor(value)
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="ceil",
    display_name="Ceiling",
    category="Math/Advanced",
    description="Round up to nearest integer",
    icon="⬆️",
    color="#FF5722",
    inputs=[
        Port("value", PortType.NUMBER, required=True, description="Number to ceiling")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Ceiling value")
    ]
)
def ceil_node(context: NodeContext) -> Any:
    """Round up to nearest integer."""
    value = context.get_input("value", 0)
    result = math.ceil(value)
    context.set_output("result", result)
    return result


# Trigonometric functions
@node(
    namespace="math",
    node_type="sin",
    display_name="Sine",
    category="Math/Trigonometry",
    description="Calculate sine of angle in radians",
    icon="📐",
    color="#E91E63",
    inputs=[
        Port("angle", PortType.NUMBER, required=True, description="Angle in radians")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Sine of angle")
    ]
)
def sin_node(context: NodeContext) -> Any:
    """Calculate sine of angle in radians."""
    angle = context.get_input("angle", 0)
    result = math.sin(angle)
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="cos",
    display_name="Cosine",
    category="Math/Trigonometry",
    description="Calculate cosine of angle in radians",
    icon="📐",
    color="#9C27B0",
    inputs=[
        Port("angle", PortType.NUMBER, required=True, description="Angle in radians")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Cosine of angle")
    ]
)
def cos_node(context: NodeContext) -> Any:
    """Calculate cosine of angle in radians."""
    angle = context.get_input("angle", 0)
    result = math.cos(angle)
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="tan",
    display_name="Tangent",
    category="Math/Trigonometry",
    description="Calculate tangent of angle in radians",
    icon="📐",
    color="#673AB7",
    inputs=[
        Port("angle", PortType.NUMBER, required=True, description="Angle in radians")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Tangent of angle")
    ]
)
def tan_node(context: NodeContext) -> Any:
    """Calculate tangent of angle in radians."""
    angle = context.get_input("angle", 0)
    result = math.tan(angle)
    context.set_output("result", result)
    return result


# Aggregate functions
@node(
    namespace="math",
    node_type="sum",
    display_name="Sum",
    category="Math/Aggregate",
    description="Sum all numbers in array",
    icon="➕",
    color="#4CAF50",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Array of numbers to sum")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Sum of all numbers")
    ]
)
def sum_node(context: NodeContext) -> Any:
    """Sum all numbers in array."""
    array = context.get_input("array", [])
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    result = sum(array)
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="average",
    display_name="Average",
    category="Math/Aggregate",
    description="Calculate average of numbers in array",
    icon="📊",
    color="#2196F3",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Array of numbers")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Average of numbers")
    ]
)
def average_node(context: NodeContext) -> Any:
    """Calculate average of numbers in array."""
    array = context.get_input("array", [])
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    if len(array) == 0:
        raise ValueError("Cannot calculate average of empty array")
    
    result = sum(array) / len(array)
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="median",
    display_name="Median",
    category="Math/Aggregate",
    description="Calculate median of numbers in array",
    icon="📈",
    color="#FF9800",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Array of numbers")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Median of numbers")
    ]
)
def median_node(context: NodeContext) -> Any:
    """Calculate median of numbers in array."""
    array = context.get_input("array", [])
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    if len(array) == 0:
        raise ValueError("Cannot calculate median of empty array")
    
    sorted_array = sorted(array)
    n = len(sorted_array)
    
    if n % 2 == 0:
        # Even number of elements
        result = (sorted_array[n//2 - 1] + sorted_array[n//2]) / 2
    else:
        # Odd number of elements
        result = sorted_array[n//2]
    
    context.set_output("result", result)
    return result