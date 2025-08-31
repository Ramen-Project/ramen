"""Decorators for simplified topping API."""

from typing import Any, Dict, List, Optional, Callable, Union
from functools import wraps
from .topping_base import PortDefinition, PortType, NodeMetadata


class SimpleNodeBuilder:
    """Builder for decorator-based nodes."""
    
    def __init__(self, name: str, category: str = "General", **kwargs):
        self.name = name
        self.category = category
        self.namespace = kwargs.get("namespace", "simple")
        self.description = kwargs.get("description", "")
        self.icon = kwargs.get("icon", "📦")
        self.color = kwargs.get("color", "#666666")
        
        self.inputs: List[PortDefinition] = []
        self.outputs: List[PortDefinition] = []
        self.func: Optional[Callable] = None
    
    def add_input_port(self, name: str, port_type: PortType, **kwargs) -> 'SimpleNodeBuilder':
        """Add an input port definition."""
        port = PortDefinition(
            name=name,
            port_type=port_type,
            required=kwargs.get("required", True),
            default=kwargs.get("default", None),
            description=kwargs.get("description", ""),
            multiple=kwargs.get("multiple", False)
        )
        self.inputs.append(port)
        return self
    
    def add_output_port(self, name: str, port_type: PortType, **kwargs) -> 'SimpleNodeBuilder':
        """Add an output port definition."""
        port = PortDefinition(
            name=name,
            port_type=port_type,
            required=kwargs.get("required", True),
            default=kwargs.get("default", None),
            description=kwargs.get("description", ""),
            multiple=kwargs.get("multiple", False)
        )
        self.outputs.append(port)
        return self
    
    def set_function(self, func: Callable) -> None:
        """Set the execution function."""
        self.func = func
    
    def build_metadata(self) -> NodeMetadata:
        """Build NodeMetadata from collected information."""
        node_type = self.func.__name__ if self.func else "unknown"
        return NodeMetadata(
            namespace=self.namespace,
            node_type=node_type,
            display_name=self.name,
            category=self.category,
            description=self.description,
            icon=self.icon,
            color=self.color,
            inputs=self.inputs,
            outputs=self.outputs
        )


# Global registry for simple nodes being built
_building_nodes: Dict[str, SimpleNodeBuilder] = {}


def ramen_node(
    name: str, 
    category: str = "General", 
    namespace: str = "simple",
    description: str = "",
    icon: str = "📦",
    color: str = "#666666"
):
    """Decorator to create a simple node."""
    def decorator(func: Callable) -> Callable:
        # Create builder for this node
        builder = SimpleNodeBuilder(
            name=name,
            category=category,
            namespace=namespace,
            description=description,
            icon=icon,
            color=color
        )
        builder.set_function(func)
        
        # Store in global registry with function name as key
        _building_nodes[func.__name__] = builder
        
        # Mark the function as a ramen node
        func._ramen_node_builder = builder
        return func
    
    return decorator


def input_port(
    name: str, 
    port_type: PortType,
    required: bool = True,
    default: Any = None,
    description: str = "",
    multiple: bool = False
):
    """Decorator to add an input port to the currently building node."""
    def decorator(func: Callable) -> Callable:
        if func.__name__ in _building_nodes:
            builder = _building_nodes[func.__name__]
            builder.add_input_port(
                name=name,
                port_type=port_type,
                required=required,
                default=default,
                description=description,
                multiple=multiple
            )
        return func
    
    return decorator


def output_port(
    name: str,
    port_type: PortType,
    required: bool = True, 
    default: Any = None,
    description: str = "",
    multiple: bool = False
):
    """Decorator to add an output port to the currently building node."""
    def decorator(func: Callable) -> Callable:
        if func.__name__ in _building_nodes:
            builder = _building_nodes[func.__name__]
            builder.add_output_port(
                name=name,
                port_type=port_type,
                required=required,
                default=default,
                description=description,
                multiple=multiple
            )
        return func
    
    return decorator


def get_simple_node_metadata(func: Callable) -> Optional[NodeMetadata]:
    """Get metadata for a decorator-based simple node."""
    if hasattr(func, "_ramen_node_builder"):
        return func._ramen_node_builder.build_metadata()
    return None


def clear_building_nodes():
    """Clear the building nodes registry (for testing)."""
    global _building_nodes
    _building_nodes.clear()