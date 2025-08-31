"""Base classes and interfaces for Ramen toppings - New Version."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Callable, Type, TypeVar
from enum import Enum
import inspect
from pydantic import BaseModel


class PortType(Enum):
    """Port data types."""
    ANY = "any"
    NUMBER = "number"
    STRING = "string"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"
    TENSOR = "tensor"
    DATAFRAME = "dataframe"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"


@dataclass
class PortDefinition:
    """Definition of a node port."""
    name: str
    port_type: PortType = PortType.ANY
    required: bool = True
    default: Any = None
    description: str = ""
    multiple: bool = False  # Can accept multiple connections


@dataclass
class NodeMetadata:
    """Metadata for a node type."""
    namespace: str
    node_type: str
    display_name: str
    category: str = "General"
    description: str = ""
    icon: str = "📦"
    color: str = "#666666"
    inputs: List[PortDefinition] = field(default_factory=list)
    outputs: List[PortDefinition] = field(default_factory=list)
    properties: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def full_type(self) -> str:
        """Get the full node type identifier."""
        return f"{self.namespace}.{self.node_type}"


class NodeContext:
    """Execution context for a node."""
    
    def __init__(self, node_id: str, inputs: Dict[str, Any], properties: Dict[str, Any]):
        self.node_id = node_id
        self._inputs = inputs
        self._outputs = {}
        self._properties = properties
        self._metadata = {}
        
    def get_input(self, name: str, default: Any = None) -> Any:
        """Get an input value."""
        return self._inputs.get(name, default)
    
    def set_output(self, name: str, value: Any) -> None:
        """Set an output value."""
        self._outputs[name] = value
        
    def get_property(self, name: str, default: Any = None) -> Any:
        """Get a property value."""
        return self._properties.get(name, default)
        
    def set_metadata(self, key: str, value: Any) -> None:
        """Set execution metadata."""
        self._metadata[key] = value
        
    @property
    def outputs(self) -> Dict[str, Any]:
        """Get all outputs."""
        return self._outputs.copy()


class NodeFunction(ABC):
    """Base class for node execution functions."""
    
    @abstractmethod
    def execute(self, context: NodeContext) -> Any:
        """Execute the node logic."""
        pass
    
    @abstractmethod
    def get_metadata(self) -> NodeMetadata:
        """Get node metadata."""
        pass


# Event decorator for advanced nodes
def on(event_name: str):
    """Decorator to mark methods as event handlers."""
    def decorator(func):
        func._event_name = event_name
        return func
    return decorator


def Node(state_class: Type[BaseModel]):
    """Factory function to create Node with StateClass."""
    if not issubclass(state_class, BaseModel):
        raise TypeError("State class must inherit from Pydantic BaseModel")
    
    class DynamicNode:
        StateClass = state_class
        
        def __init__(self):
            # Create state instance with proper typing
            self.state = state_class()
            self._event_handlers = {}
            self._setup_state_sync()
            self._discover_event_handlers()
        
        def _setup_state_sync(self):
            """Setup automatic state synchronization."""
            # Store original __setattr__ to chain calls
            original_setattr = self.state.__setattr__
            
            def synced_setattr(name, value):
                # Call original setter
                result = original_setattr(name, value)
                # Trigger sync to frontend (will be implemented later)
                self._sync_state_to_frontend()
                return result
            
            self.state.__setattr__ = synced_setattr
        
        def _discover_event_handlers(self):
            """Discover methods decorated with @on decorator."""
            for name, method in inspect.getmembers(self, predicate=inspect.ismethod):
                if hasattr(method, '_event_name'):
                    self._event_handlers[method._event_name] = method
        
        def _sync_state_to_frontend(self):
            """Sync state changes to frontend via WebSocket (placeholder)."""
            # TODO: Implement WebSocket state synchronization
            pass
        
        def handle_event(self, event_name: str, event_data: dict):
            """Handle incoming events from frontend."""
            if event_name in self._event_handlers:
                return self._event_handlers[event_name](event_data)
            else:
                print(f"Warning: No handler for event '{event_name}'")
        
        def get_metadata(self) -> NodeMetadata:
            """Get node metadata (must be implemented by subclasses)."""
            raise NotImplementedError("Subclasses must implement get_metadata")
        
        def get_frontend_component(self) -> Optional[Dict[str, Any]]:
            """Get frontend component configuration (optional)."""
            return None
    
    return DynamicNode


# Type variable for state classes
StateT = TypeVar('StateT', bound=BaseModel)


class ToppingBase(ABC):
    """Base class for all toppings."""
    
    def __init__(self):
        self._nodes: Dict[str, Type[NodeFunction]] = {}
        self._metadata: Dict[str, NodeMetadata] = {}
        self._simple_nodes: Dict[str, Callable] = {}  # For decorator-based nodes
        
    @abstractmethod
    def get_name(self) -> str:
        """Get the topping name."""
        pass
    
    @abstractmethod
    def get_version(self) -> str:
        """Get the topping version."""
        pass
        
    @abstractmethod
    def get_description(self) -> str:
        """Get the topping description."""
        pass
    
    def register_node(self, node_class: Type[NodeFunction]) -> None:
        """Register a node type (advanced API)."""
        instance = node_class()
        metadata = instance.get_metadata()
        full_type = metadata.full_type
        self._nodes[full_type] = node_class
        self._metadata[full_type] = metadata
    
    def register_simple_node(self, func: Callable, metadata: NodeMetadata) -> None:
        """Register a simple decorator-based node."""
        full_type = metadata.full_type
        self._simple_nodes[full_type] = func
        self._metadata[full_type] = metadata
        
    def get_nodes(self) -> Dict[str, Type[NodeFunction]]:
        """Get all registered nodes."""
        return self._nodes.copy()
        
    def get_node_metadata(self) -> Dict[str, NodeMetadata]:
        """Get metadata for all nodes."""
        return self._metadata.copy()
        
    def initialize(self) -> None:
        """Initialize the topping (called after loading)."""
        pass
        
    def cleanup(self) -> None:
        """Clean up resources."""
        pass