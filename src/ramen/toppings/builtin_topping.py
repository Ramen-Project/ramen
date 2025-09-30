"""Built-in Nodes Topping - Contains all core functionality."""

from typing import Dict, Any, List, Callable
from ramen.topping.topping_base import ToppingBase, NodeFunction, NodeMetadata, NodeContext, PortDefinition, PortType
from ramen.nodes.base import NODE_REGISTRY, NODE_METADATA


class BuiltinTopping(ToppingBase):
    """Topping that provides all built-in nodes from our new node system."""
    
    def __init__(self):
        super().__init__()
        self._load_builtin_nodes()
    
    def get_name(self) -> str:
        return "Built-in Nodes"
    
    def get_version(self) -> str:
        return "2.0.0"
    
    def get_description(self) -> str:
        return "Core built-in nodes for Ramen visual programming"
    
    def _load_builtin_nodes(self):
        """Load all nodes from our new node system into the topping."""
        # Convert our new node system to topping API format
        for full_type, func in NODE_REGISTRY.items():
            if full_type in NODE_METADATA:
                metadata = NODE_METADATA[full_type]
                
                # Convert our NodeMetadata to topping NodeMetadata
                topping_metadata = self._convert_metadata(metadata)
                
                # Create a wrapper function that adapts our context to topping context
                wrapped_func = self._create_wrapper_function(func, metadata)
                
                # Register as simple node
                self.register_simple_node(wrapped_func, topping_metadata)
    
    def _convert_metadata(self, metadata) -> NodeMetadata:
        """Convert our NodeMetadata to topping NodeMetadata."""
        # Convert our Port objects to PortDefinition objects
        inputs = []
        outputs = []
        
        for port in metadata.inputs:
            port_type = self._convert_port_type(port.port_type)
            inputs.append(PortDefinition(
                name=port.name,
                port_type=port_type,
                required=port.required,
                default=port.default,
                description=port.description
            ))
        
        for port in metadata.outputs:
            port_type = self._convert_port_type(port.port_type)
            outputs.append(PortDefinition(
                name=port.name,
                port_type=port_type,
                required=port.required,
                default=port.default,
                description=port.description
            ))
        
        return NodeMetadata(
            namespace=metadata.namespace,
            node_type=metadata.node_type,
            display_name=metadata.display_name,
            category=metadata.category,
            description=metadata.description,
            icon=metadata.icon,
            color=metadata.color,
            inputs=inputs,
            outputs=outputs
        )
    
    def _convert_port_type(self, our_port_type) -> PortType:
        """Convert our PortType to topping PortType."""
        # Map our PortType enum values to topping PortType enum values
        type_mapping = {
            "ANY": PortType.ANY,
            "NUMBER": PortType.NUMBER,
            "STRING": PortType.STRING,
            "BOOLEAN": PortType.BOOLEAN,
            "ARRAY": PortType.ARRAY,
            "OBJECT": PortType.OBJECT,
            "FUNCTION": PortType.ANY,  # We don't have FUNCTION in topping API
        }
        
        port_type_str = str(our_port_type).split('.')[-1] if hasattr(our_port_type, 'name') else str(our_port_type).upper()
        return type_mapping.get(port_type_str, PortType.ANY)
    
    def _create_wrapper_function(self, original_func: Callable, metadata) -> Callable:
        """Create a wrapper function that adapts our context to topping context."""
        def wrapper(context: NodeContext) -> Any:
            # Convert topping NodeContext to our NodeContext format
            our_context = self._create_our_context(context)
            
            try:
                # Call the original function
                result = original_func(our_context)
                
                # Copy outputs back to topping context
                for name, value in our_context.outputs.items():
                    context.set_output(name, value)
                
                return result
            except Exception as e:
                # Handle errors gracefully
                error_msg = f"Node execution error: {str(e)}"
                # Set error outputs if any outputs are defined
                for output_port in metadata.outputs:
                    if output_port.port_type == "STRING":
                        context.set_output(output_port.name, error_msg)
                    elif output_port.port_type == "NUMBER":
                        context.set_output(output_port.name, 0)
                    elif output_port.port_type == "BOOLEAN":
                        context.set_output(output_port.name, False)
                    else:
                        context.set_output(output_port.name, None)
                raise e
        
        return wrapper
    
    def _create_our_context(self, topping_context: NodeContext):
        """Create our NodeContext from topping NodeContext."""
        # Import our NodeContext class
        from ..nodes.base import NodeContext as OurNodeContext
        
        # Create our context with the inputs from topping context
        our_context = OurNodeContext(topping_context.node_id)
        
        # Copy all inputs
        our_context._inputs = topping_context._inputs.copy()
        our_context._properties = topping_context._properties.copy()
        
        return our_context


def get_topping() -> ToppingBase:
    """Entry point for topping loader."""
    return BuiltinTopping()