"""
Base classes and decorators for node definitions.
"""

from typing import Dict, Any, Callable, List, Optional, Union
from dataclasses import dataclass, field
from enum import Enum
from functools import wraps


class PortType(Enum):
    """Port data types."""
    ANY = "any"
    NUMBER = "number"
    STRING = "string"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"
    FUNCTION = "function"
    NULL = "null"
    UNDEFINED = "undefined"


@dataclass
class Port:
    """Port definition for node inputs/outputs."""
    name: str
    port_type: PortType = PortType.ANY
    required: bool = True
    default: Any = None
    description: str = ""
    multiple: bool = False  # Can accept multiple connections
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format."""
        return {
            "name": self.name,
            "type": self.port_type.value,
            "required": self.required,
            "default": self.default,
            "description": self.description,
            "multiple": self.multiple
        }


@dataclass
class NodeMetadata:
    """Metadata for a node."""
    namespace: str
    node_type: str
    display_name: str
    category: str = "General"
    description: str = ""
    icon: str = "📦"
    color: str = "#666666"
    inputs: List[Port] = field(default_factory=list)
    outputs: List[Port] = field(default_factory=list)
    properties: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def full_type(self) -> str:
        """Get the full node type identifier."""
        return f"{self.namespace}.{self.node_type}"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format."""
        return {
            "type": self.full_type,
            "namespace": self.namespace,
            "nodeType": self.node_type,
            "displayName": self.display_name,
            "category": self.category,
            "description": self.description,
            "icon": self.icon,
            "color": self.color,
            "inputs": [p.to_dict() for p in self.inputs],
            "outputs": [p.to_dict() for p in self.outputs],
            "properties": self.properties
        }


class NodeContext:
    """Execution context for a node."""
    
    def __init__(self, 
                 node_id: str = "", 
                 inputs: Optional[Dict[str, Any]] = None,
                 properties: Optional[Dict[str, Any]] = None,
                 metadata: Optional[Dict[str, Any]] = None):
        self.node_id = node_id
        self._inputs = inputs or {}
        self._outputs = {}
        self._properties = properties or {}
        self.metadata = metadata or {}
        
    def get_input(self, name: str, default: Any = None) -> Any:
        """Get an input value."""
        # Check node_data first (for UI-configured values)
        node_data = self.metadata.get("node_data", {})
        if name in node_data:
            return node_data[name]
        # Then check regular inputs
        return self._inputs.get(name, default)
    
    def set_output(self, name: str, value: Any) -> None:
        """Set an output value."""
        self._outputs[name] = value
        
    def get_property(self, name: str, default: Any = None) -> Any:
        """Get a property value."""
        return self._properties.get(name, default)
        
    def set_metadata(self, key: str, value: Any) -> None:
        """Set execution metadata."""
        self.metadata[key] = value
        
    def get_metadata(self, key: str, default: Any = None) -> Any:
        """Get execution metadata."""
        return self.metadata.get(key, default)
        
    def execute_subgraph(self, subgraph_id: str, inputs: Dict[str, Any]) -> Any:
        """Execute a subgraph (placeholder for actual implementation)."""
        # This would be implemented by the execution engine
        executor = self.metadata.get("executor")
        if executor:
            return executor.execute_subgraph(subgraph_id, inputs)
        raise NotImplementedError("Subgraph execution not available")
        
    @property
    def outputs(self) -> Dict[str, Any]:
        """Get all outputs."""
        return self._outputs.copy()


# Import new registry system
from ramen.registry.node_registry import (
    get_global_registry,
    NodeDefinition as NewNodeDefinition,
    PortDefinition as NewPortDefinition,
)

# Legacy compatibility - these will be deprecated
NODE_REGISTRY: Dict[str, Callable] = {}
NODE_METADATA: Dict[str, NodeMetadata] = {}


def node(
    namespace: str,
    node_type: str,
    display_name: str,
    category: str = "General",
    description: str = "",
    icon: str = "📦",
    color: str = "#666666",
    inputs: Optional[List[Port]] = None,
    outputs: Optional[List[Port]] = None,
    properties: Optional[Dict[str, Any]] = None
) -> Callable:
    """
    Decorator for registering a node.
    
    Usage:
        @node(
            namespace="math",
            node_type="add",
            display_name="Add",
            category="Math/Basic",
            description="Add two numbers",
            inputs=[Port("a", PortType.NUMBER), Port("b", PortType.NUMBER)],
            outputs=[Port("result", PortType.NUMBER)]
        )
        def add_node(context: NodeContext) -> Any:
            a = context.get_input("a", 0)
            b = context.get_input("b", 0)
            result = a + b
            context.set_output("result", result)
            return result
    """
    def decorator(func: Callable) -> Callable:
        # Create old metadata for compatibility
        metadata = NodeMetadata(
            namespace=namespace,
            node_type=node_type,
            display_name=display_name,
            category=category,
            description=description,
            icon=icon,
            color=color,
            inputs=inputs or [],
            outputs=outputs or [],
            properties=properties or {}
        )

        # Register in legacy system
        full_type = metadata.full_type
        NODE_REGISTRY[full_type] = func
        NODE_METADATA[full_type] = metadata

        # Register in new registry system
        registry = get_global_registry()
        new_inputs = [
            NewPortDefinition(
                name=p.name,
                type=p.port_type.value if hasattr(p.port_type, 'value') else str(p.port_type),
                required=p.required,
                default=p.default,
                description=p.description,
                multiple=p.multiple
            ) for p in (inputs or [])
        ]
        new_outputs = [
            NewPortDefinition(
                name=p.name,
                type=p.port_type.value if hasattr(p.port_type, 'value') else str(p.port_type),
                required=p.required,
                default=p.default,
                description=p.description,
                multiple=p.multiple
            ) for p in (outputs or [])
        ]

        new_node_def = NewNodeDefinition(
            node_id=full_type,
            namespace=namespace,
            node_type=node_type,
            display_name=display_name,
            category=category,
            description=description,
            icon=icon,
            color=color,
            inputs=new_inputs,
            outputs=new_outputs,
            properties=properties or {},
            executor=func,
            source_topping="built-in",
        )
        registry.register(new_node_def)

        # Add metadata to function
        func.node_metadata = metadata

        @wraps(func)
        def wrapper(context: NodeContext) -> Any:
            return func(context)

        return wrapper

    return decorator


def register_node(namespace: str, node_type: str) -> Callable:
    """
    Legacy decorator for registering nodes.
    For backward compatibility.
    """
    def decorator(func: Callable) -> Callable:
        full_type = f"{namespace}.{node_type}"
        NODE_REGISTRY[full_type] = func
        return func
    return decorator


def get_all_nodes() -> Dict[str, Callable]:
    """Get all registered nodes."""
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