"""Neural Network Builder Topping for Ramen - Visual PyTorch Module Construction."""

from typing import Dict, Type, Any, Optional, List, Tuple
from dataclasses import dataclass

# Import from main ramen package
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src'))

from ramen.topping.topping_base import (
    ToppingBase, NodeFunction, NodeMetadata, NodeContext,
    PortDefinition, PortType
)


class NeuralNetworkBuilderTopping(ToppingBase):
    """Topping providing neural network building blocks."""
    
    def get_name(self) -> str:
        return "Neural Network Builder"
    
    def get_version(self) -> str:
        return "0.1.0"
    
    def get_description(self) -> str:
        return "Visual building blocks for constructing PyTorch neural networks"
    
    def initialize(self) -> None:
        """Register all neural network layer nodes."""
        # Convolutional Layers
        self.register_node(Conv2dNode())
        self.register_node(Conv1dNode())
        self.register_node(Conv3dNode())
        self.register_node(ConvTranspose2dNode())
        
        # Linear Layers
        self.register_node(LinearNode())
        self.register_node(BilinearNode())
        
        # Pooling Layers
        self.register_node(MaxPool2dNode())
        self.register_node(AvgPool2dNode())
        self.register_node(AdaptiveAvgPool2dNode())
        self.register_node(AdaptiveMaxPool2dNode())
        
        # Normalization Layers
        self.register_node(BatchNorm1dNode())
        self.register_node(BatchNorm2dNode())
        self.register_node(LayerNormNode())
        self.register_node(GroupNormNode())
        
        # Activation Functions
        self.register_node(ReLUNode())
        self.register_node(LeakyReLUNode())
        self.register_node(SigmoidNode())
        self.register_node(TanhNode())
        self.register_node(SoftmaxNode())
        self.register_node(GELUNode())
        
        # Dropout Layers
        self.register_node(DropoutNode())
        self.register_node(Dropout2dNode())
        
        # Recurrent Layers
        self.register_node(LSTMNode())
        self.register_node(GRUNode())
        self.register_node(RNNNode())
        
        # Transformer Layers
        self.register_node(MultiheadAttentionNode())
        self.register_node(TransformerEncoderLayerNode())
        self.register_node(TransformerDecoderLayerNode())
        
        # Embedding Layers
        self.register_node(EmbeddingNode())
        
        # Container Layers
        self.register_node(SequentialNode())
        self.register_node(ModuleListNode())


# Base class for neural network layer nodes
class NNLayerNode(NodeFunction):
    """Base class for neural network layer nodes."""
    
    def __init__(self, layer_type: str, namespace: str = "nn"):
        self.layer_type = layer_type
        self.namespace = namespace
        self._layer_params = {}
    
    def execute(self, context: NodeContext) -> Any:
        """Create and return the layer configuration."""
        # Collect parameters from inputs
        params = {}
        for input_port in self.get_metadata().inputs:
            value = context.get_input(input_port.name, input_port.default)
            if value is not None:
                params[input_port.name] = value
        
        # Create layer configuration
        layer_config = {
            "type": self.layer_type,
            "params": params,
            "namespace": self.namespace
        }
        
        # Set output
        context.set_output("layer", layer_config)
        context.set_output("config", params)
        
        # If we have torch available, create actual layer
        try:
            import torch.nn as nn
            layer_class = getattr(nn, self.layer_type)
            layer_instance = layer_class(**params)
            context.set_output("instance", layer_instance)
        except:
            context.set_output("instance", None)
        
        return layer_config


# Convolutional Layers
class Conv2dNode(NNLayerNode):
    """2D Convolutional layer node."""
    
    def __init__(self):
        super().__init__("Conv2d")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="Conv2d",
            display_name="Conv2D",
            category="Convolutional",
            description="2D convolutional layer",
            icon="🔲",
            color="#FF6B6B",
            inputs=[
                PortDefinition("in_channels", PortType.NUMBER, True, None, "Number of input channels"),
                PortDefinition("out_channels", PortType.NUMBER, True, None, "Number of output channels"),
                PortDefinition("kernel_size", PortType.NUMBER, True, 3, "Size of the convolving kernel"),
                PortDefinition("stride", PortType.NUMBER, False, 1, "Stride of the convolution"),
                PortDefinition("padding", PortType.NUMBER, False, 0, "Padding added to both sides"),
                PortDefinition("dilation", PortType.NUMBER, False, 1, "Spacing between kernel elements"),
                PortDefinition("groups", PortType.NUMBER, False, 1, "Number of blocked connections"),
                PortDefinition("bias", PortType.BOOLEAN, False, True, "Add learnable bias"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class Conv1dNode(NNLayerNode):
    """1D Convolutional layer node."""
    
    def __init__(self):
        super().__init__("Conv1d")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="Conv1d",
            display_name="Conv1D",
            category="Convolutional",
            description="1D convolutional layer",
            icon="➖",
            color="#FF6B6B",
            inputs=[
                PortDefinition("in_channels", PortType.NUMBER, True, None, "Number of input channels"),
                PortDefinition("out_channels", PortType.NUMBER, True, None, "Number of output channels"),
                PortDefinition("kernel_size", PortType.NUMBER, True, 3, "Size of the convolving kernel"),
                PortDefinition("stride", PortType.NUMBER, False, 1, "Stride of the convolution"),
                PortDefinition("padding", PortType.NUMBER, False, 0, "Padding added to both sides"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class Conv3dNode(NNLayerNode):
    """3D Convolutional layer node."""
    
    def __init__(self):
        super().__init__("Conv3d")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="Conv3d",
            display_name="Conv3D",
            category="Convolutional",
            description="3D convolutional layer",
            icon="📦",
            color="#FF6B6B",
            inputs=[
                PortDefinition("in_channels", PortType.NUMBER, True, None, "Number of input channels"),
                PortDefinition("out_channels", PortType.NUMBER, True, None, "Number of output channels"),
                PortDefinition("kernel_size", PortType.NUMBER, True, 3, "Size of the convolving kernel"),
                PortDefinition("stride", PortType.NUMBER, False, 1, "Stride of the convolution"),
                PortDefinition("padding", PortType.NUMBER, False, 0, "Padding added to all sides"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class ConvTranspose2dNode(NNLayerNode):
    """2D Transposed Convolutional layer node."""
    
    def __init__(self):
        super().__init__("ConvTranspose2d")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="ConvTranspose2d",
            display_name="ConvTranspose2D",
            category="Convolutional",
            description="2D transposed convolutional layer (deconvolution)",
            icon="⬆️",
            color="#FF6B6B",
            inputs=[
                PortDefinition("in_channels", PortType.NUMBER, True, None, "Number of input channels"),
                PortDefinition("out_channels", PortType.NUMBER, True, None, "Number of output channels"),
                PortDefinition("kernel_size", PortType.NUMBER, True, 3, "Size of the convolving kernel"),
                PortDefinition("stride", PortType.NUMBER, False, 1, "Stride of the convolution"),
                PortDefinition("padding", PortType.NUMBER, False, 0, "Padding added to both sides"),
                PortDefinition("output_padding", PortType.NUMBER, False, 0, "Additional output shape"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


# Linear Layers
class LinearNode(NNLayerNode):
    """Fully connected linear layer node."""
    
    def __init__(self):
        super().__init__("Linear")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="Linear",
            display_name="Linear",
            category="Linear",
            description="Fully connected layer",
            icon="🔗",
            color="#4ECDC4",
            inputs=[
                PortDefinition("in_features", PortType.NUMBER, True, None, "Size of input features"),
                PortDefinition("out_features", PortType.NUMBER, True, None, "Size of output features"),
                PortDefinition("bias", PortType.BOOLEAN, False, True, "Add learnable bias"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class BilinearNode(NNLayerNode):
    """Bilinear layer node."""
    
    def __init__(self):
        super().__init__("Bilinear")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="Bilinear",
            display_name="Bilinear",
            category="Linear",
            description="Bilinear layer",
            icon="🔀",
            color="#4ECDC4",
            inputs=[
                PortDefinition("in1_features", PortType.NUMBER, True, None, "Size of first input"),
                PortDefinition("in2_features", PortType.NUMBER, True, None, "Size of second input"),
                PortDefinition("out_features", PortType.NUMBER, True, None, "Size of output"),
                PortDefinition("bias", PortType.BOOLEAN, False, True, "Add learnable bias"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


# Pooling Layers
class MaxPool2dNode(NNLayerNode):
    """2D Max Pooling layer node."""
    
    def __init__(self):
        super().__init__("MaxPool2d")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="MaxPool2d",
            display_name="MaxPool2D",
            category="Pooling",
            description="2D max pooling layer",
            icon="⬇️",
            color="#96CEB4",
            inputs=[
                PortDefinition("kernel_size", PortType.NUMBER, True, 2, "Size of the pooling window"),
                PortDefinition("stride", PortType.NUMBER, False, None, "Stride of the pooling"),
                PortDefinition("padding", PortType.NUMBER, False, 0, "Padding added to both sides"),
                PortDefinition("dilation", PortType.NUMBER, False, 1, "Spacing between kernel elements"),
                PortDefinition("return_indices", PortType.BOOLEAN, False, False, "Return max indices"),
                PortDefinition("ceil_mode", PortType.BOOLEAN, False, False, "Use ceil instead of floor"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class AvgPool2dNode(NNLayerNode):
    """2D Average Pooling layer node."""
    
    def __init__(self):
        super().__init__("AvgPool2d")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="AvgPool2d",
            display_name="AvgPool2D",
            category="Pooling",
            description="2D average pooling layer",
            icon="➗",
            color="#96CEB4",
            inputs=[
                PortDefinition("kernel_size", PortType.NUMBER, True, 2, "Size of the pooling window"),
                PortDefinition("stride", PortType.NUMBER, False, None, "Stride of the pooling"),
                PortDefinition("padding", PortType.NUMBER, False, 0, "Padding added to both sides"),
                PortDefinition("ceil_mode", PortType.BOOLEAN, False, False, "Use ceil instead of floor"),
                PortDefinition("count_include_pad", PortType.BOOLEAN, False, True, "Include padding in avg"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class AdaptiveAvgPool2dNode(NNLayerNode):
    """2D Adaptive Average Pooling layer node."""
    
    def __init__(self):
        super().__init__("AdaptiveAvgPool2d")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="AdaptiveAvgPool2d",
            display_name="AdaptiveAvgPool2D",
            category="Pooling",
            description="2D adaptive average pooling layer",
            icon="🎯",
            color="#96CEB4",
            inputs=[
                PortDefinition("output_size", PortType.OBJECT, True, None, "Target output size"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class AdaptiveMaxPool2dNode(NNLayerNode):
    """2D Adaptive Max Pooling layer node."""
    
    def __init__(self):
        super().__init__("AdaptiveMaxPool2d")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="AdaptiveMaxPool2d",
            display_name="AdaptiveMaxPool2D",
            category="Pooling",
            description="2D adaptive max pooling layer",
            icon="🎯",
            color="#96CEB4",
            inputs=[
                PortDefinition("output_size", PortType.OBJECT, True, None, "Target output size"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


# Normalization Layers
class BatchNorm1dNode(NNLayerNode):
    """1D Batch Normalization layer node."""
    
    def __init__(self):
        super().__init__("BatchNorm1d")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="BatchNorm1d",
            display_name="BatchNorm1D",
            category="Normalization",
            description="1D batch normalization",
            icon="📊",
            color="#F39C12",
            inputs=[
                PortDefinition("num_features", PortType.NUMBER, True, None, "Number of features"),
                PortDefinition("eps", PortType.NUMBER, False, 1e-5, "Epsilon for stability"),
                PortDefinition("momentum", PortType.NUMBER, False, 0.1, "Momentum for running stats"),
                PortDefinition("affine", PortType.BOOLEAN, False, True, "Learn affine parameters"),
                PortDefinition("track_running_stats", PortType.BOOLEAN, False, True, "Track running stats"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class BatchNorm2dNode(NNLayerNode):
    """2D Batch Normalization layer node."""
    
    def __init__(self):
        super().__init__("BatchNorm2d")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="BatchNorm2d",
            display_name="BatchNorm2D",
            category="Normalization",
            description="2D batch normalization",
            icon="📊",
            color="#F39C12",
            inputs=[
                PortDefinition("num_features", PortType.NUMBER, True, None, "Number of features"),
                PortDefinition("eps", PortType.NUMBER, False, 1e-5, "Epsilon for stability"),
                PortDefinition("momentum", PortType.NUMBER, False, 0.1, "Momentum for running stats"),
                PortDefinition("affine", PortType.BOOLEAN, False, True, "Learn affine parameters"),
                PortDefinition("track_running_stats", PortType.BOOLEAN, False, True, "Track running stats"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class LayerNormNode(NNLayerNode):
    """Layer Normalization node."""
    
    def __init__(self):
        super().__init__("LayerNorm")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="LayerNorm",
            display_name="LayerNorm",
            category="Normalization",
            description="Layer normalization",
            icon="📏",
            color="#F39C12",
            inputs=[
                PortDefinition("normalized_shape", PortType.OBJECT, True, None, "Shape to normalize"),
                PortDefinition("eps", PortType.NUMBER, False, 1e-5, "Epsilon for stability"),
                PortDefinition("elementwise_affine", PortType.BOOLEAN, False, True, "Learn affine params"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class GroupNormNode(NNLayerNode):
    """Group Normalization node."""
    
    def __init__(self):
        super().__init__("GroupNorm")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="GroupNorm",
            display_name="GroupNorm",
            category="Normalization",
            description="Group normalization",
            icon="👥",
            color="#F39C12",
            inputs=[
                PortDefinition("num_groups", PortType.NUMBER, True, None, "Number of groups"),
                PortDefinition("num_channels", PortType.NUMBER, True, None, "Number of channels"),
                PortDefinition("eps", PortType.NUMBER, False, 1e-5, "Epsilon for stability"),
                PortDefinition("affine", PortType.BOOLEAN, False, True, "Learn affine parameters"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


# Activation Functions
class ReLUNode(NNLayerNode):
    """ReLU activation function node."""
    
    def __init__(self):
        super().__init__("ReLU")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="ReLU",
            display_name="ReLU",
            category="Activation",
            description="Rectified Linear Unit activation",
            icon="⚡",
            color="#E74C3C",
            inputs=[
                PortDefinition("inplace", PortType.BOOLEAN, False, False, "In-place operation"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class LeakyReLUNode(NNLayerNode):
    """Leaky ReLU activation function node."""
    
    def __init__(self):
        super().__init__("LeakyReLU")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="LeakyReLU",
            display_name="LeakyReLU",
            category="Activation",
            description="Leaky Rectified Linear Unit activation",
            icon="⚡",
            color="#E74C3C",
            inputs=[
                PortDefinition("negative_slope", PortType.NUMBER, False, 0.01, "Negative slope"),
                PortDefinition("inplace", PortType.BOOLEAN, False, False, "In-place operation"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class SigmoidNode(NNLayerNode):
    """Sigmoid activation function node."""
    
    def __init__(self):
        super().__init__("Sigmoid")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="Sigmoid",
            display_name="Sigmoid",
            category="Activation",
            description="Sigmoid activation function",
            icon="〽️",
            color="#E74C3C",
            inputs=[],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class TanhNode(NNLayerNode):
    """Tanh activation function node."""
    
    def __init__(self):
        super().__init__("Tanh")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="Tanh",
            display_name="Tanh",
            category="Activation",
            description="Hyperbolic tangent activation",
            icon="〰️",
            color="#E74C3C",
            inputs=[],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class SoftmaxNode(NNLayerNode):
    """Softmax activation function node."""
    
    def __init__(self):
        super().__init__("Softmax")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="Softmax",
            display_name="Softmax",
            category="Activation",
            description="Softmax activation function",
            icon="📈",
            color="#E74C3C",
            inputs=[
                PortDefinition("dim", PortType.NUMBER, False, -1, "Dimension along which to apply"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class GELUNode(NNLayerNode):
    """GELU activation function node."""
    
    def __init__(self):
        super().__init__("GELU")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="GELU",
            display_name="GELU",
            category="Activation",
            description="Gaussian Error Linear Units activation",
            icon="🌊",
            color="#E74C3C",
            inputs=[
                PortDefinition("approximate", PortType.STRING, False, "none", "Approximation method"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


# Dropout Layers
class DropoutNode(NNLayerNode):
    """Dropout layer node."""
    
    def __init__(self):
        super().__init__("Dropout")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="Dropout",
            display_name="Dropout",
            category="Regularization",
            description="Dropout for regularization",
            icon="💧",
            color="#9B59B6",
            inputs=[
                PortDefinition("p", PortType.NUMBER, False, 0.5, "Dropout probability"),
                PortDefinition("inplace", PortType.BOOLEAN, False, False, "In-place operation"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class Dropout2dNode(NNLayerNode):
    """2D Dropout layer node."""
    
    def __init__(self):
        super().__init__("Dropout2d")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="Dropout2d",
            display_name="Dropout2D",
            category="Regularization",
            description="2D dropout for regularization",
            icon="💧",
            color="#9B59B6",
            inputs=[
                PortDefinition("p", PortType.NUMBER, False, 0.5, "Dropout probability"),
                PortDefinition("inplace", PortType.BOOLEAN, False, False, "In-place operation"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


# Recurrent Layers
class LSTMNode(NNLayerNode):
    """LSTM layer node."""
    
    def __init__(self):
        super().__init__("LSTM")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="LSTM",
            display_name="LSTM",
            category="Recurrent",
            description="Long Short-Term Memory layer",
            icon="🔄",
            color="#3498DB",
            inputs=[
                PortDefinition("input_size", PortType.NUMBER, True, None, "Input feature size"),
                PortDefinition("hidden_size", PortType.NUMBER, True, None, "Hidden state size"),
                PortDefinition("num_layers", PortType.NUMBER, False, 1, "Number of recurrent layers"),
                PortDefinition("bias", PortType.BOOLEAN, False, True, "Use bias"),
                PortDefinition("batch_first", PortType.BOOLEAN, False, False, "Batch dimension first"),
                PortDefinition("dropout", PortType.NUMBER, False, 0, "Dropout between layers"),
                PortDefinition("bidirectional", PortType.BOOLEAN, False, False, "Bidirectional LSTM"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class GRUNode(NNLayerNode):
    """GRU layer node."""
    
    def __init__(self):
        super().__init__("GRU")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="GRU",
            display_name="GRU",
            category="Recurrent",
            description="Gated Recurrent Unit layer",
            icon="🔄",
            color="#3498DB",
            inputs=[
                PortDefinition("input_size", PortType.NUMBER, True, None, "Input feature size"),
                PortDefinition("hidden_size", PortType.NUMBER, True, None, "Hidden state size"),
                PortDefinition("num_layers", PortType.NUMBER, False, 1, "Number of recurrent layers"),
                PortDefinition("bias", PortType.BOOLEAN, False, True, "Use bias"),
                PortDefinition("batch_first", PortType.BOOLEAN, False, False, "Batch dimension first"),
                PortDefinition("dropout", PortType.NUMBER, False, 0, "Dropout between layers"),
                PortDefinition("bidirectional", PortType.BOOLEAN, False, False, "Bidirectional GRU"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class RNNNode(NNLayerNode):
    """RNN layer node."""
    
    def __init__(self):
        super().__init__("RNN")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="RNN",
            display_name="RNN",
            category="Recurrent",
            description="Vanilla RNN layer",
            icon="🔄",
            color="#3498DB",
            inputs=[
                PortDefinition("input_size", PortType.NUMBER, True, None, "Input feature size"),
                PortDefinition("hidden_size", PortType.NUMBER, True, None, "Hidden state size"),
                PortDefinition("num_layers", PortType.NUMBER, False, 1, "Number of recurrent layers"),
                PortDefinition("nonlinearity", PortType.STRING, False, "tanh", "Nonlinearity function"),
                PortDefinition("bias", PortType.BOOLEAN, False, True, "Use bias"),
                PortDefinition("batch_first", PortType.BOOLEAN, False, False, "Batch dimension first"),
                PortDefinition("dropout", PortType.NUMBER, False, 0, "Dropout between layers"),
                PortDefinition("bidirectional", PortType.BOOLEAN, False, False, "Bidirectional RNN"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


# Transformer Layers
class MultiheadAttentionNode(NNLayerNode):
    """Multi-head Attention layer node."""
    
    def __init__(self):
        super().__init__("MultiheadAttention")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="MultiheadAttention",
            display_name="Multi-Head Attention",
            category="Transformer",
            description="Multi-head attention mechanism",
            icon="👁️",
            color="#FF6B6B",
            inputs=[
                PortDefinition("embed_dim", PortType.NUMBER, True, None, "Embedding dimension"),
                PortDefinition("num_heads", PortType.NUMBER, True, None, "Number of attention heads"),
                PortDefinition("dropout", PortType.NUMBER, False, 0.0, "Dropout probability"),
                PortDefinition("bias", PortType.BOOLEAN, False, True, "Add bias"),
                PortDefinition("batch_first", PortType.BOOLEAN, False, False, "Batch dimension first"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class TransformerEncoderLayerNode(NNLayerNode):
    """Transformer Encoder layer node."""
    
    def __init__(self):
        super().__init__("TransformerEncoderLayer")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="TransformerEncoderLayer",
            display_name="Transformer Encoder",
            category="Transformer",
            description="Transformer encoder layer",
            icon="🔧",
            color="#FF6B6B",
            inputs=[
                PortDefinition("d_model", PortType.NUMBER, True, None, "Model dimension"),
                PortDefinition("nhead", PortType.NUMBER, True, None, "Number of attention heads"),
                PortDefinition("dim_feedforward", PortType.NUMBER, False, 2048, "Feedforward dimension"),
                PortDefinition("dropout", PortType.NUMBER, False, 0.1, "Dropout probability"),
                PortDefinition("activation", PortType.STRING, False, "relu", "Activation function"),
                PortDefinition("batch_first", PortType.BOOLEAN, False, False, "Batch dimension first"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class TransformerDecoderLayerNode(NNLayerNode):
    """Transformer Decoder layer node."""
    
    def __init__(self):
        super().__init__("TransformerDecoderLayer")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="TransformerDecoderLayer",
            display_name="Transformer Decoder",
            category="Transformer",
            description="Transformer decoder layer",
            icon="🔨",
            color="#FF6B6B",
            inputs=[
                PortDefinition("d_model", PortType.NUMBER, True, None, "Model dimension"),
                PortDefinition("nhead", PortType.NUMBER, True, None, "Number of attention heads"),
                PortDefinition("dim_feedforward", PortType.NUMBER, False, 2048, "Feedforward dimension"),
                PortDefinition("dropout", PortType.NUMBER, False, 0.1, "Dropout probability"),
                PortDefinition("activation", PortType.STRING, False, "relu", "Activation function"),
                PortDefinition("batch_first", PortType.BOOLEAN, False, False, "Batch dimension first"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


# Embedding Layers
class EmbeddingNode(NNLayerNode):
    """Embedding layer node."""
    
    def __init__(self):
        super().__init__("Embedding")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="Embedding",
            display_name="Embedding",
            category="Embedding",
            description="Embedding layer for discrete tokens",
            icon="📚",
            color="#16A085",
            inputs=[
                PortDefinition("num_embeddings", PortType.NUMBER, True, None, "Size of vocabulary"),
                PortDefinition("embedding_dim", PortType.NUMBER, True, None, "Embedding dimension"),
                PortDefinition("padding_idx", PortType.NUMBER, False, None, "Padding token index"),
                PortDefinition("max_norm", PortType.NUMBER, False, None, "Max norm for embeddings"),
                PortDefinition("norm_type", PortType.NUMBER, False, 2.0, "Norm type"),
                PortDefinition("scale_grad_by_freq", PortType.BOOLEAN, False, False, "Scale gradients by frequency"),
                PortDefinition("sparse", PortType.BOOLEAN, False, False, "Use sparse gradients"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


# Container Layers
class SequentialNode(NNLayerNode):
    """Sequential container node."""
    
    def __init__(self):
        super().__init__("Sequential")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="Sequential",
            display_name="Sequential",
            category="Container",
            description="Sequential container for layers",
            icon="📦",
            color="#7F8C8D",
            inputs=[
                PortDefinition("layers", PortType.ARRAY, False, [], "List of layers"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


class ModuleListNode(NNLayerNode):
    """ModuleList container node."""
    
    def __init__(self):
        super().__init__("ModuleList")
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="nn.layers",
            node_type="ModuleList",
            display_name="ModuleList",
            category="Container",
            description="List container for modules",
            icon="📚",
            color="#7F8C8D",
            inputs=[
                PortDefinition("modules", PortType.ARRAY, False, [], "List of modules"),
            ],
            outputs=[
                PortDefinition("layer", PortType.OBJECT, description="Layer configuration"),
                PortDefinition("config", PortType.OBJECT, description="Layer parameters"),
                PortDefinition("instance", PortType.OBJECT, description="PyTorch layer instance"),
            ]
        )


def get_topping() -> ToppingBase:
    """Entry point for the topping."""
    topping = NeuralNetworkBuilderTopping()
    topping.initialize()
    return topping