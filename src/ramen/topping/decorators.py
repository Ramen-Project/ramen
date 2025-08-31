"""Improved decorators for simplified topping API."""

from typing import Any, Dict, List, Optional, Callable, Union
from functools import wraps
from .topping_base import PortDefinition, PortType, NodeMetadata


def ramen_node(
    name: str = None,
    category: str = "General", 
    namespace: str = "simple",
    description: str = "",
    icon: str = "📦",
    color: str = "#666666"
):
    """Decorator to create a simple node with metadata."""
    def decorator(func: Callable) -> Callable:
        # Store metadata on the function
        func._ramen_metadata = {
            'name': name or func.__name__,
            'category': category,
            'namespace': namespace,
            'description': description,
            'icon': icon,
            'color': color,
            'inputs': getattr(func, '_ramen_metadata', {}).get('inputs', []),
            'outputs': getattr(func, '_ramen_metadata', {}).get('outputs', [])
        }
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
    """Decorator to add an input port."""
    def decorator(func: Callable) -> Callable:
        # Ensure metadata exists
        if not hasattr(func, '_ramen_metadata'):
            func._ramen_metadata = {
                'name': func.__name__,
                'category': "General",
                'namespace': "simple",
                'description': "",
                'icon': "📦",
                'color': "#666666",
                'inputs': [],
                'outputs': []
            }
        
        # Add input port
        func._ramen_metadata['inputs'].append({
            'name': name,
            'port_type': port_type,
            'required': required,
            'default': default,
            'description': description,
            'multiple': multiple
        })
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
    """Decorator to add an output port."""
    def decorator(func: Callable) -> Callable:
        # Ensure metadata exists
        if not hasattr(func, '_ramen_metadata'):
            func._ramen_metadata = {
                'name': func.__name__,
                'category': "General",
                'namespace': "simple",
                'description': "",
                'icon': "📦",
                'color': "#666666",
                'inputs': [],
                'outputs': []
            }
        
        # Add output port
        func._ramen_metadata['outputs'].append({
            'name': name,
            'port_type': port_type,
            'required': required,
            'default': default,
            'description': description,
            'multiple': multiple
        })
        return func
    
    return decorator


def get_simple_node_metadata(func: Callable) -> Optional[NodeMetadata]:
    """Extract metadata from a decorated function."""
    if not hasattr(func, '_ramen_metadata'):
        return None
    
    meta = func._ramen_metadata
    
    # Convert port dictionaries to PortDefinition objects
    inputs = [
        PortDefinition(
            name=p['name'],
            port_type=p['port_type'],
            required=p['required'],
            default=p['default'],
            description=p['description'],
            multiple=p['multiple']
        )
        for p in meta['inputs']
    ]
    
    outputs = [
        PortDefinition(
            name=p['name'],
            port_type=p['port_type'],
            required=p['required'],
            default=p['default'],
            description=p['description'],
            multiple=p['multiple']
        )
        for p in meta['outputs']
    ]
    
    return NodeMetadata(
        namespace=meta['namespace'],
        node_type=func.__name__,
        display_name=meta['name'],
        category=meta['category'],
        description=meta['description'],
        icon=meta['icon'],
        color=meta['color'],
        inputs=inputs,
        outputs=outputs
    )


def is_ramen_node(func: Callable) -> bool:
    """Check if a function is decorated as a ramen node."""
    return hasattr(func, '_ramen_metadata')