"""
Random number generation nodes.
"""

import random
from typing import Any, List
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="math",
    node_type="random",
    display_name="Random Float",
    category="Math/Random",
    description="Generate random float between 0 and 1",
    icon="🎲",
    color="#E91E63",
    inputs=[],
    outputs=[
        Port("result", PortType.NUMBER, description="Random float [0, 1)")
    ]
)
def random_node(context: NodeContext) -> Any:
    """Generate random float between 0 and 1."""
    result = random.random()
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="randint",
    display_name="Random Integer",
    category="Math/Random",
    description="Generate random integer in range",
    icon="🎯",
    color="#9C27B0",
    inputs=[
        Port("min", PortType.NUMBER, required=True, description="Minimum value (inclusive)"),
        Port("max", PortType.NUMBER, required=True, description="Maximum value (inclusive)")
    ],
    outputs=[
        Port("result", PortType.NUMBER, description="Random integer in range")
    ]
)
def randint_node(context: NodeContext) -> Any:
    """Generate random integer in range."""
    min_val = int(context.get_input("min", 0))
    max_val = int(context.get_input("max", 10))
    
    if min_val > max_val:
        raise ValueError("Min value must be less than or equal to max value")
    
    result = random.randint(min_val, max_val)
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="choice",
    display_name="Random Choice",
    category="Math/Random",
    description="Choose random element from array",
    icon="🎪",
    color="#FF5722",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Array to choose from")
    ],
    outputs=[
        Port("result", PortType.ANY, description="Randomly chosen element")
    ]
)
def choice_node(context: NodeContext) -> Any:
    """Choose random element from array."""
    array = context.get_input("array", [])
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    if len(array) == 0:
        raise ValueError("Cannot choose from empty array")
    
    result = random.choice(array)
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="shuffle",
    display_name="Shuffle",
    category="Math/Random",
    description="Randomly shuffle array elements",
    icon="🔀",
    color="#607D8B",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Array to shuffle")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Shuffled array")
    ]
)
def shuffle_node(context: NodeContext) -> Any:
    """Randomly shuffle array elements."""
    array = context.get_input("array", [])
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    # Create a copy to avoid modifying the original
    result = array.copy()
    random.shuffle(result)
    
    context.set_output("result", result)
    return result


@node(
    namespace="math",
    node_type="sample",
    display_name="Random Sample",
    category="Math/Random",
    description="Get random sample of elements from array",
    icon="🧪",
    color="#795548",
    inputs=[
        Port("array", PortType.ARRAY, required=True, description="Array to sample from"),
        Port("count", PortType.NUMBER, required=True, description="Number of elements to sample")
    ],
    outputs=[
        Port("result", PortType.ARRAY, description="Random sample")
    ]
)
def sample_node(context: NodeContext) -> Any:
    """Get random sample of elements from array."""
    array = context.get_input("array", [])
    count = int(context.get_input("count", 1))
    
    if not isinstance(array, list):
        raise ValueError("Input must be an array")
    
    if count < 0:
        raise ValueError("Count must be non-negative")
    
    if count > len(array):
        raise ValueError("Cannot sample more elements than available")
    
    result = random.sample(array, count)
    context.set_output("result", result)
    return result