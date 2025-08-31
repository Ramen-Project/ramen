"""
Node library for Ramen - Comprehensive node collection.
"""

from typing import Dict, Any, Callable, Optional
from .base import NODE_REGISTRY, NODE_METADATA, NodeContext, NodeMetadata

# Import all node modules to register them
from . import core
from . import math  
from . import collection
from . import logic
from . import string
from . import type
from . import flow
from . import object
from . import debug

# Legacy imports for backward compatibility
from ..engine.context import NodeContext as LegacyNodeContext


def register_node(namespace: str, node_type: str):
    """Legacy decorator for registering nodes (backward compatibility)."""
    def decorator(func: Callable):
        full_type = f"{namespace}.{node_type}"
        NODE_REGISTRY[full_type] = func
        return func
    return decorator


# Legacy builtin nodes for backward compatibility
@register_node("builtin", "add")
def add_node_legacy(context: LegacyNodeContext):
    """Legacy add node."""
    a = context.get_input("a", 0)
    b = context.get_input("b", 0)
    result = a + b
    context.set_output("result", result)
    return result


@register_node("builtin", "subtract")
def subtract_node_legacy(context: LegacyNodeContext):
    """Legacy subtract node."""
    a = context.get_input("a", 0)
    b = context.get_input("b", 0)
    result = a - b
    context.set_output("result", result)
    return result


@register_node("builtin", "multiply")
def multiply_node_legacy(context: LegacyNodeContext):
    """Legacy multiply node."""
    a = context.get_input("a", 1)
    # Check node_data for default values
    node_data = context.metadata.get("node_data", {})
    if "b" in node_data:
        b = node_data["b"]
    else:
        b = context.get_input("b", 1)
    result = a * b
    context.set_output("result", result)
    return result


@register_node("builtin", "divide")
def divide_node_legacy(context: LegacyNodeContext):
    """Legacy divide node."""
    a = context.get_input("a", 1)
    b = context.get_input("b", 1)
    if b == 0:
        raise ValueError("Division by zero")
    result = a / b
    context.set_output("result", result)
    return result


@register_node("builtin", "constant")
def constant_node_legacy(context: LegacyNodeContext):
    """Legacy constant node."""
    node_data = context.metadata.get("node_data", {})
    if node_data and "value" in node_data:
        value = node_data["value"]
    else:
        value = context.get_input("value", 0)
    context.set_output("output", value)
    return value


@register_node("builtin", "print")
def print_node_legacy(context: LegacyNodeContext):
    """Legacy print node."""
    value = context.get_input("value")
    node_data = context.metadata.get("node_data", {})
    if "label" in node_data:
        label = node_data["label"]
    else:
        label = context.get_input("label", "Output")
    print(f"{label}: {value}")
    context.set_output("output", value)
    return value


@register_node("builtin", "variable")
def variable_node_legacy(context: LegacyNodeContext):
    """Legacy variable node."""
    node_data = context.metadata.get("node_data", {})
    name = node_data.get("name", context.get_input("name", "var"))
    
    value = context.get_input("value", None)
    
    if value is None:
        exec_context = context.metadata.get("exec_context")
        if exec_context:
            value = exec_context.get_variable(name, None)
    
    context.set_output("output", value)
    return value


@register_node("builtin", "greater_than")
def greater_than_node_legacy(context: LegacyNodeContext):
    """Legacy greater than node."""
    a = context.get_input("a", 0)
    b = context.get_input("b", 0)
    result = a > b
    context.set_output("result", result)
    return result


@register_node("builtin", "less_than")
def less_than_node_legacy(context: LegacyNodeContext):
    """Legacy less than node."""
    a = context.get_input("a", 0)
    b = context.get_input("b", 0)
    result = a < b
    context.set_output("result", result)
    return result


@register_node("builtin", "equal")
def equal_node_legacy(context: LegacyNodeContext):
    """Legacy equal node."""
    a = context.get_input("a")
    b = context.get_input("b")
    result = a == b
    context.set_output("result", result)
    return result


@register_node("builtin", "and")
def and_node_legacy(context: LegacyNodeContext):
    """Legacy and node."""
    a = context.get_input("a", False)
    b = context.get_input("b", False)
    result = bool(a) and bool(b)
    context.set_output("result", result)
    return result


@register_node("builtin", "or")
def or_node_legacy(context: LegacyNodeContext):
    """Legacy or node."""
    a = context.get_input("a", False)
    b = context.get_input("b", False)
    result = bool(a) or bool(b)
    context.set_output("result", result)
    return result


@register_node("builtin", "not")
def not_node_legacy(context: LegacyNodeContext):
    """Legacy not node."""
    value = context.get_input("value", False)
    result = not bool(value)
    context.set_output("result", result)
    return result


@register_node("builtin", "concat")
def concat_node_legacy(context: LegacyNodeContext):
    """Legacy concat node."""
    a = context.get_input("a", "")
    b = context.get_input("b", "")
    result = str(a) + str(b)
    context.set_output("result", result)
    return result


@register_node("builtin", "format")
def format_node_legacy(context: LegacyNodeContext):
    """Legacy format node."""
    template = context.get_input("template", "{}")
    value = context.get_input("value", "")
    result = template.format(value)
    context.set_output("result", result)
    return result


@register_node("builtin", "subgraph")
def subgraph_node_legacy(context: LegacyNodeContext):
    """Legacy subgraph node."""
    from .subgraph import subgraph_node as _subgraph_node
    return _subgraph_node(context)


def get_all_nodes() -> Dict[str, Callable]:
    """Get all registered nodes (both new and legacy)."""
    # Ensure context manager nodes are registered
    try:
        from .context_manager import register_context_manager_nodes
        register_context_manager_nodes()
    except:
        pass
    
    return NODE_REGISTRY.copy()


def get_all_metadata() -> Dict[str, NodeMetadata]:
    """Get all node metadata."""
    return NODE_METADATA.copy()


def get_node(full_type: str) -> Optional[Callable]:
    """Get a node by its full type."""
    return NODE_REGISTRY.get(full_type)


def get_node_metadata(full_type: str) -> Optional[NodeMetadata]:
    """Get node metadata by its full type."""
    return NODE_METADATA.get(full_type)