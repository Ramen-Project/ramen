"""Topping system for Ramen."""

from ramen.topping.topping_base import (
    ToppingBase,
    NodeFunction,
    NodeMetadata,
    NodeContext,
    PortDefinition,
    PortType,
    FrontendComponent,
    Node,
    on
)
from ramen.topping.decorators import (
    ramen_node,
    input_port,
    output_port,
    get_simple_node_metadata
)
from ramen.topping.loader import (
    ToppingLoader,
    ToppingRegistry,
    REGISTRY,
    load_toppings,
    get_registry
)

__all__ = [
    # Base classes
    'ToppingBase',
    'NodeFunction',
    'NodeMetadata',
    'NodeContext',
    'PortDefinition',
    'PortType',
    'FrontendComponent',
    # Advanced API
    'Node',
    'on',
    # Simple API (decorators)
    'ramen_node',
    'input_port', 
    'output_port',
    'get_simple_node_metadata',
    # Loader and registry
    'ToppingLoader',
    'ToppingRegistry',
    'REGISTRY',
    'load_toppings',
    'get_registry',
]