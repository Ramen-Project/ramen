"""PyTorch Module definition support for Ramen visual programming."""

from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field
import json

from ramen.topping.class_definition import (
    ClassDefinitionNode, ClassMetadata, ClassType,
    PropertyDefinition, MethodDefinition, PortDefinition, PortType,
    NodeContext, NodeMetadata
)


@dataclass
class LayerDefinition:
    """Definition of a neural network layer."""
    layer_type: str  # Conv2d, Linear, BatchNorm2d, etc.
    name: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    input_shape: Optional[Tuple[int, ...]] = None
    output_shape: Optional[Tuple[int, ...]] = None
    position: Tuple[float, float] = (0, 0)  # Visual position in the graph


@dataclass
class ConnectionDefinition:
    """Definition of a connection between layers."""
    source_layer: str
    target_layer: str
    source_port: str = "output"
    target_port: str = "input"


class PyTorchModuleDefinition(ClassDefinitionNode):
    """Visual definition node for PyTorch nn.Module classes."""
    
    def __init__(self, module_name: str = "CustomModule", namespace: str = "pytorch"):
        super().__init__()
        self.module_name = module_name
        self.namespace = namespace
        self.layers: List[LayerDefinition] = []
        self.connections: List[ConnectionDefinition] = []
        self.module_properties: Dict[str, PropertyDefinition] = {}
        self.training_config: Dict[str, Any] = {
            "optimizer": "Adam",
            "learning_rate": 0.001,
            "loss_function": "CrossEntropyLoss"
        }
        
    def add_layer(self, layer: LayerDefinition) -> None:
        """Add a layer to the module."""
        self.layers.append(layer)
        
    def add_connection(self, connection: ConnectionDefinition) -> None:
        """Add a connection between layers."""
        self.connections.append(connection)
        
    def add_property(self, prop: PropertyDefinition) -> None:
        """Add a property to the module."""
        self.module_properties[prop.name] = prop
        
    def build_class_metadata(self) -> ClassMetadata:
        """Build metadata for the PyTorch module class."""
        properties = list(self.module_properties.values())
        
        # Add default properties for PyTorch modules
        if "in_channels" not in self.module_properties:
            properties.append(PropertyDefinition(
                name="in_channels",
                property_type="int",
                default_value=3,
                description="Number of input channels"
            ))
        if "out_channels" not in self.module_properties:
            properties.append(PropertyDefinition(
                name="out_channels",
                property_type="int",
                default_value=10,
                description="Number of output channels"
            ))
        
        # Create forward method
        forward_method = self._generate_forward_method()
        
        # Create init method
        init_method = self._generate_init_method()
        
        return ClassMetadata(
            class_name=self.module_name,
            class_type=ClassType.PYTORCH_MODULE,
            namespace=self.namespace,
            base_classes=["nn.Module"],
            properties=properties,
            methods=[init_method, forward_method],
            docstring=f"PyTorch module {self.module_name} defined visually in Ramen",
            metadata={
                "layers": [self._layer_to_dict(layer) for layer in self.layers],
                "connections": [self._connection_to_dict(conn) for conn in self.connections],
                "training_config": self.training_config
            }
        )
    
    def _generate_init_method(self) -> MethodDefinition:
        """Generate the __init__ method for the module."""
        body_lines = ["super().__init__()"]
        
        # Initialize layers
        for layer in self.layers:
            layer_init = self._generate_layer_init_code(layer)
            body_lines.append(f"self.{layer.name} = {layer_init}")
        
        return MethodDefinition(
            name="__init__",
            parameters=[
                PortDefinition(name=prop.name, port_type=PortType.NUMBER)
                for prop in self.module_properties.values()
            ],
            body="\n".join(body_lines),
            description="Initialize the PyTorch module"
        )
    
    def _generate_forward_method(self) -> MethodDefinition:
        """Generate the forward method for the module."""
        body_lines = []
        
        # Build execution order based on connections
        execution_order = self._build_execution_order()
        
        # Generate forward pass code
        for layer_name in execution_order:
            layer = next((l for l in self.layers if l.name == layer_name), None)
            if layer:
                # Find input for this layer
                input_var = self._find_layer_input(layer_name)
                body_lines.append(f"{layer.name}_out = self.{layer.name}({input_var})")
        
        # Return the final output
        if execution_order:
            body_lines.append(f"return {execution_order[-1]}_out")
        else:
            body_lines.append("return x")
        
        return MethodDefinition(
            name="forward",
            parameters=[PortDefinition(name="x", port_type=PortType.TENSOR)],
            return_type="torch.Tensor",
            body="\n".join(body_lines),
            description="Forward pass of the module"
        )
    
    def _generate_layer_init_code(self, layer: LayerDefinition) -> str:
        """Generate initialization code for a layer."""
        params = layer.parameters.copy()
        
        # Map common layer types to nn.Module classes
        layer_map = {
            "Conv2d": "nn.Conv2d",
            "Linear": "nn.Linear",
            "BatchNorm2d": "nn.BatchNorm2d",
            "ReLU": "nn.ReLU",
            "MaxPool2d": "nn.MaxPool2d",
            "Dropout": "nn.Dropout",
            "LSTM": "nn.LSTM",
            "GRU": "nn.GRU",
            "Embedding": "nn.Embedding",
            "MultiheadAttention": "nn.MultiheadAttention"
        }
        
        layer_class = layer_map.get(layer.layer_type, f"nn.{layer.layer_type}")
        
        # Format parameters
        param_str = ", ".join([f"{k}={v}" for k, v in params.items()])
        
        return f"{layer_class}({param_str})"
    
    def _build_execution_order(self) -> List[str]:
        """Build the execution order of layers based on connections."""
        # Simple topological sort
        order = []
        visited = set()
        
        def visit(layer_name: str):
            if layer_name in visited:
                return
            visited.add(layer_name)
            
            # Find dependencies
            for conn in self.connections:
                if conn.target_layer == layer_name:
                    visit(conn.source_layer)
            
            order.append(layer_name)
        
        # Visit all layers
        for layer in self.layers:
            visit(layer.name)
        
        return order
    
    def _find_layer_input(self, layer_name: str) -> str:
        """Find the input variable for a layer."""
        for conn in self.connections:
            if conn.target_layer == layer_name:
                return f"{conn.source_layer}_out"
        return "x"  # Default to input x
    
    def _layer_to_dict(self, layer: LayerDefinition) -> Dict[str, Any]:
        """Convert layer definition to dictionary."""
        return {
            "type": layer.layer_type,
            "name": layer.name,
            "parameters": layer.parameters,
            "input_shape": layer.input_shape,
            "output_shape": layer.output_shape,
            "position": layer.position
        }
    
    def _connection_to_dict(self, conn: ConnectionDefinition) -> Dict[str, Any]:
        """Convert connection definition to dictionary."""
        return {
            "source": conn.source_layer,
            "target": conn.target_layer,
            "source_port": conn.source_port,
            "target_port": conn.target_port
        }
    
    def get_metadata(self) -> NodeMetadata:
        """Get metadata for the module definition node."""
        metadata = super().get_metadata()
        metadata.icon = "🧠"
        metadata.color = "#FF6B6B"
        metadata.category = "Neural Network Definitions"
        
        # Add configuration inputs
        metadata.inputs.extend([
            PortDefinition(
                name="training_config",
                port_type=PortType.OBJECT,
                required=False,
                description="Training configuration"
            )
        ])
        
        # Add module-specific outputs
        metadata.outputs = [
            PortDefinition(
                name="module",
                port_type=PortType.OBJECT,
                description="PyTorch module instance"
            ),
            PortDefinition(
                name="parameters",
                port_type=PortType.OBJECT,
                description="Module parameters"
            )
        ]
        
        return metadata
    
    def execute(self, context: NodeContext) -> Any:
        """Execute the module definition node."""
        # Get training config if provided
        training_config = context.get_input("training_config")
        if training_config:
            self.training_config.update(training_config)
        
        # Generate and instantiate the module
        module_instance = super().execute(context)
        
        # Set additional outputs
        context.set_output("module", module_instance)
        
        # Get module parameters if the instance has them
        if hasattr(module_instance, "parameters"):
            context.set_output("parameters", list(module_instance.parameters()))
        
        return module_instance


class NeuralNetworkLayer(ClassDefinitionNode):
    """Base class for neural network layer definitions."""
    
    def __init__(self, layer_type: str, **default_params):
        super().__init__()
        self.layer_type = layer_type
        self.default_params = default_params
        
    def build_class_metadata(self) -> ClassMetadata:
        """Build metadata for a neural network layer."""
        return ClassMetadata(
            class_name=self.layer_type,
            class_type=ClassType.PYTORCH_MODULE,
            namespace="torch.nn",
            base_classes=[f"nn.{self.layer_type}"],
            properties=[
                PropertyDefinition(name=k, property_type="Any", default_value=v)
                for k, v in self.default_params.items()
            ],
            docstring=f"PyTorch {self.layer_type} layer"
        )


# Pre-defined common layers
class Conv2dLayer(NeuralNetworkLayer):
    """Conv2d layer definition."""
    def __init__(self):
        super().__init__(
            "Conv2d",
            in_channels=3,
            out_channels=64,
            kernel_size=3,
            stride=1,
            padding=1
        )


class LinearLayer(NeuralNetworkLayer):
    """Linear (fully connected) layer definition."""
    def __init__(self):
        super().__init__(
            "Linear",
            in_features=128,
            out_features=10
        )


class BatchNorm2dLayer(NeuralNetworkLayer):
    """BatchNorm2d layer definition."""
    def __init__(self):
        super().__init__(
            "BatchNorm2d",
            num_features=64
        )


class ReLULayer(NeuralNetworkLayer):
    """ReLU activation layer definition."""
    def __init__(self):
        super().__init__(
            "ReLU",
            inplace=True
        )


class MaxPool2dLayer(NeuralNetworkLayer):
    """MaxPool2d layer definition."""
    def __init__(self):
        super().__init__(
            "MaxPool2d",
            kernel_size=2,
            stride=2
        )


class DropoutLayer(NeuralNetworkLayer):
    """Dropout layer definition."""
    def __init__(self):
        super().__init__(
            "Dropout",
            p=0.5
        )


class LSTMLayer(NeuralNetworkLayer):
    """LSTM layer definition."""
    def __init__(self):
        super().__init__(
            "LSTM",
            input_size=128,
            hidden_size=256,
            num_layers=2,
            batch_first=True
        )


class AttentionLayer(NeuralNetworkLayer):
    """Multi-head attention layer definition."""
    def __init__(self):
        super().__init__(
            "MultiheadAttention",
            embed_dim=512,
            num_heads=8
        )