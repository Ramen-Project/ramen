"""Topping system for Ramen."""

from .topping_base import (
    ToppingBase,
    NodeFunction,
    NodeMetadata,
    NodeContext,
    PortDefinition,
    PortType
)
from .loader import (
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
    # Loader and registry
    'ToppingLoader',
    'ToppingRegistry',
    'REGISTRY',
    'load_toppings',
    'get_registry',
]