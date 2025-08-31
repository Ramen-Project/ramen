"""PyTorch neural network layers."""

from typing import Any
from ..base import node, NodeContext, Port, PortType

# Try to import PyTorch, handle gracefully if not available
try:
    import torch
    import torch.nn as nn
    HAS_PYTORCH = True
except ImportError:
    HAS_PYTORCH = False


@node(
    namespace="ml",
    node_type="linear_layer",
    display_name="Linear Layer",
    category="ML/Layer",
    description="Create PyTorch linear (fully connected) layer",
    icon="📏",
    color="#ef4444",
    inputs=[
        Port("input_size", PortType.NUMBER, required=True),
        Port("output_size", PortType.NUMBER, required=True),
        Port("bias", PortType.BOOLEAN, required=False),
        Port("input_data", PortType.ANY, required=False)
    ],
    outputs=[
        Port("layer", PortType.ANY),
        Port("output", PortType.ANY),
        Port("parameters", PortType.NUMBER)
    ]
)
def linear_layer_node(context: NodeContext) -> Any:
    """Create PyTorch linear layer."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("layer", result)
        context.set_output("output", result)
        context.set_output("parameters", 0)
        return result
    
    input_size = int(context.get_input("input_size", 1))
    output_size = int(context.get_input("output_size", 1))
    bias = context.get_input("bias", True)
    input_data = context.get_input("input_data")
    
    try:
        layer = nn.Linear(input_size, output_size, bias=bias)
        
        # If input data provided, do forward pass
        output = None
        if input_data is not None:
            if not isinstance(input_data, torch.Tensor):
                input_data = torch.tensor(input_data, dtype=torch.float32)
            output = layer(input_data)
            context.set_output("output", output)
        
        param_count = sum(p.numel() for p in layer.parameters())
        
        context.set_output("layer", layer)
        context.set_output("parameters", param_count)
        return layer
        
    except Exception as e:
        result = f"Linear layer error: {str(e)}"
        context.set_output("layer", result)
        context.set_output("output", result)
        context.set_output("parameters", 0)
        return result


@node(
    namespace="ml",
    node_type="conv2d_layer",
    display_name="Conv2D Layer",
    category="ML/Layer",
    description="Create PyTorch 2D convolution layer",
    icon="🔲",
    color="#ef4444",
    inputs=[
        Port("in_channels", PortType.NUMBER, required=True),
        Port("out_channels", PortType.NUMBER, required=True),
        Port("kernel_size", PortType.NUMBER, required=False),
        Port("stride", PortType.NUMBER, required=False),
        Port("padding", PortType.NUMBER, required=False),
        Port("input_data", PortType.ANY, required=False)
    ],
    outputs=[
        Port("layer", PortType.ANY),
        Port("output", PortType.ANY),
        Port("parameters", PortType.NUMBER)
    ]
)
def conv2d_layer_node(context: NodeContext) -> Any:
    """Create PyTorch Conv2D layer."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("layer", result)
        context.set_output("output", result)
        context.set_output("parameters", 0)
        return result
    
    in_channels = int(context.get_input("in_channels", 1))
    out_channels = int(context.get_input("out_channels", 1))
    kernel_size = int(context.get_input("kernel_size", 3))
    stride = int(context.get_input("stride", 1))
    padding = int(context.get_input("padding", 0))
    input_data = context.get_input("input_data")
    
    try:
        layer = nn.Conv2d(in_channels, out_channels, kernel_size, stride, padding)
        
        # If input data provided, do forward pass
        output = None
        if input_data is not None:
            if not isinstance(input_data, torch.Tensor):
                input_data = torch.tensor(input_data, dtype=torch.float32)
            output = layer(input_data)
            context.set_output("output", output)
        
        param_count = sum(p.numel() for p in layer.parameters())
        
        context.set_output("layer", layer)
        context.set_output("parameters", param_count)
        return layer
        
    except Exception as e:
        result = f"Conv2D layer error: {str(e)}"
        context.set_output("layer", result)
        context.set_output("output", result)
        context.set_output("parameters", 0)
        return result


@node(
    namespace="ml",
    node_type="conv1d_layer",
    display_name="Conv1D Layer",
    category="ML/Layer",
    description="Create PyTorch 1D convolution layer",
    icon="📊",
    color="#ef4444",
    inputs=[
        Port("in_channels", PortType.NUMBER, required=True),
        Port("out_channels", PortType.NUMBER, required=True),
        Port("kernel_size", PortType.NUMBER, required=False),
        Port("stride", PortType.NUMBER, required=False),
        Port("padding", PortType.NUMBER, required=False),
        Port("input_data", PortType.ANY, required=False)
    ],
    outputs=[
        Port("layer", PortType.ANY),
        Port("output", PortType.ANY),
        Port("parameters", PortType.NUMBER)
    ]
)
def conv1d_layer_node(context: NodeContext) -> Any:
    """Create PyTorch Conv1D layer."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("layer", result)
        context.set_output("output", result)
        context.set_output("parameters", 0)
        return result
    
    in_channels = int(context.get_input("in_channels", 1))
    out_channels = int(context.get_input("out_channels", 1))
    kernel_size = int(context.get_input("kernel_size", 3))
    stride = int(context.get_input("stride", 1))
    padding = int(context.get_input("padding", 0))
    input_data = context.get_input("input_data")
    
    try:
        layer = nn.Conv1d(in_channels, out_channels, kernel_size, stride, padding)
        
        # If input data provided, do forward pass
        output = None
        if input_data is not None:
            if not isinstance(input_data, torch.Tensor):
                input_data = torch.tensor(input_data, dtype=torch.float32)
            output = layer(input_data)
            context.set_output("output", output)
        
        param_count = sum(p.numel() for p in layer.parameters())
        
        context.set_output("layer", layer)
        context.set_output("parameters", param_count)
        return layer
        
    except Exception as e:
        result = f"Conv1D layer error: {str(e)}"
        context.set_output("layer", result)
        context.set_output("output", result)
        context.set_output("parameters", 0)
        return result


@node(
    namespace="ml",
    node_type="maxpool2d_layer",
    display_name="MaxPool2D Layer",
    category="ML/Layer",
    description="Create PyTorch 2D max pooling layer",
    icon="⬇️",
    color="#ef4444",
    inputs=[
        Port("kernel_size", PortType.NUMBER, required=False),
        Port("stride", PortType.NUMBER, required=False),
        Port("padding", PortType.NUMBER, required=False),
        Port("input_data", PortType.ANY, required=False)
    ],
    outputs=[
        Port("layer", PortType.ANY),
        Port("output", PortType.ANY)
    ]
)
def maxpool2d_layer_node(context: NodeContext) -> Any:
    """Create PyTorch MaxPool2D layer."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("layer", result)
        context.set_output("output", result)
        return result
    
    kernel_size = int(context.get_input("kernel_size", 2))
    stride = context.get_input("stride")
    padding = int(context.get_input("padding", 0))
    input_data = context.get_input("input_data")
    
    try:
        if stride is not None:
            stride = int(stride)
        layer = nn.MaxPool2d(kernel_size, stride, padding)
        
        # If input data provided, do forward pass
        output = None
        if input_data is not None:
            if not isinstance(input_data, torch.Tensor):
                input_data = torch.tensor(input_data, dtype=torch.float32)
            output = layer(input_data)
            context.set_output("output", output)
        
        context.set_output("layer", layer)
        return layer
        
    except Exception as e:
        result = f"MaxPool2D layer error: {str(e)}"
        context.set_output("layer", result)
        context.set_output("output", result)
        return result


@node(
    namespace="ml",
    node_type="avgpool2d_layer",
    display_name="AvgPool2D Layer",
    category="ML/Layer",
    description="Create PyTorch 2D average pooling layer",
    icon="📊",
    color="#ef4444",
    inputs=[
        Port("kernel_size", PortType.NUMBER, required=False),
        Port("stride", PortType.NUMBER, required=False),
        Port("padding", PortType.NUMBER, required=False),
        Port("input_data", PortType.ANY, required=False)
    ],
    outputs=[
        Port("layer", PortType.ANY),
        Port("output", PortType.ANY)
    ]
)
def avgpool2d_layer_node(context: NodeContext) -> Any:
    """Create PyTorch AvgPool2D layer."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("layer", result)
        context.set_output("output", result)
        return result
    
    kernel_size = int(context.get_input("kernel_size", 2))
    stride = context.get_input("stride")
    padding = int(context.get_input("padding", 0))
    input_data = context.get_input("input_data")
    
    try:
        if stride is not None:
            stride = int(stride)
        layer = nn.AvgPool2d(kernel_size, stride, padding)
        
        # If input data provided, do forward pass
        output = None
        if input_data is not None:
            if not isinstance(input_data, torch.Tensor):
                input_data = torch.tensor(input_data, dtype=torch.float32)
            output = layer(input_data)
            context.set_output("output", output)
        
        context.set_output("layer", layer)
        return layer
        
    except Exception as e:
        result = f"AvgPool2D layer error: {str(e)}"
        context.set_output("layer", result)
        context.set_output("output", result)
        return result


@node(
    namespace="ml",
    node_type="dropout_layer",
    display_name="Dropout Layer",
    category="ML/Layer",
    description="Create PyTorch dropout layer",
    icon="🎲",
    color="#ef4444",
    inputs=[
        Port("p", PortType.NUMBER, required=False),
        Port("training", PortType.BOOLEAN, required=False),
        Port("input_data", PortType.ANY, required=False)
    ],
    outputs=[
        Port("layer", PortType.ANY),
        Port("output", PortType.ANY)
    ]
)
def dropout_layer_node(context: NodeContext) -> Any:
    """Create PyTorch Dropout layer."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("layer", result)
        context.set_output("output", result)
        return result
    
    p = float(context.get_input("p", 0.5))
    training = context.get_input("training", True)
    input_data = context.get_input("input_data")
    
    try:
        layer = nn.Dropout(p)
        if training:
            layer.train()
        else:
            layer.eval()
        
        # If input data provided, do forward pass
        output = None
        if input_data is not None:
            if not isinstance(input_data, torch.Tensor):
                input_data = torch.tensor(input_data, dtype=torch.float32)
            output = layer(input_data)
            context.set_output("output", output)
        
        context.set_output("layer", layer)
        return layer
        
    except Exception as e:
        result = f"Dropout layer error: {str(e)}"
        context.set_output("layer", result)
        context.set_output("output", result)
        return result


@node(
    namespace="ml",
    node_type="batchnorm_layer",
    display_name="BatchNorm Layer",
    category="ML/Layer",
    description="Create PyTorch batch normalization layer",
    icon="📊",
    color="#ef4444",
    inputs=[
        Port("num_features", PortType.NUMBER, required=True),
        Port("eps", PortType.NUMBER, required=False),
        Port("momentum", PortType.NUMBER, required=False),
        Port("input_data", PortType.ANY, required=False)
    ],
    outputs=[
        Port("layer", PortType.ANY),
        Port("output", PortType.ANY),
        Port("parameters", PortType.NUMBER)
    ]
)
def batchnorm_layer_node(context: NodeContext) -> Any:
    """Create PyTorch BatchNorm layer."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("layer", result)
        context.set_output("output", result)
        context.set_output("parameters", 0)
        return result
    
    num_features = int(context.get_input("num_features", 1))
    eps = float(context.get_input("eps", 1e-5))
    momentum = float(context.get_input("momentum", 0.1))
    input_data = context.get_input("input_data")
    
    try:
        layer = nn.BatchNorm1d(num_features, eps, momentum)
        
        # If input data provided, do forward pass
        output = None
        if input_data is not None:
            if not isinstance(input_data, torch.Tensor):
                input_data = torch.tensor(input_data, dtype=torch.float32)
            output = layer(input_data)
            context.set_output("output", output)
        
        param_count = sum(p.numel() for p in layer.parameters())
        
        context.set_output("layer", layer)
        context.set_output("parameters", param_count)
        return layer
        
    except Exception as e:
        result = f"BatchNorm layer error: {str(e)}"
        context.set_output("layer", result)
        context.set_output("output", result)
        context.set_output("parameters", 0)
        return result


@node(
    namespace="ml",
    node_type="activation_layer",
    display_name="Activation Layer",
    category="ML/Layer",
    description="Create PyTorch activation layer",
    icon="⚡",
    color="#ef4444",
    inputs=[
        Port("activation", PortType.STRING, required=True),
        Port("input_data", PortType.ANY, required=False)
    ],
    outputs=[
        Port("layer", PortType.ANY),
        Port("output", PortType.ANY)
    ]
)
def activation_layer_node(context: NodeContext) -> Any:
    """Create PyTorch activation layer."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("layer", result)
        context.set_output("output", result)
        return result
    
    activation = context.get_input("activation", "relu").lower()
    input_data = context.get_input("input_data")
    
    try:
        activation_map = {
            "relu": nn.ReLU(),
            "sigmoid": nn.Sigmoid(),
            "tanh": nn.Tanh(),
            "leaky_relu": nn.LeakyReLU(),
            "elu": nn.ELU(),
            "selu": nn.SELU(),
            "gelu": nn.GELU(),
            "swish": nn.SiLU(),  # SiLU is Swish
            "softmax": nn.Softmax(dim=-1),
            "log_softmax": nn.LogSoftmax(dim=-1)
        }
        
        if activation not in activation_map:
            raise ValueError(f"Unknown activation: {activation}")
        
        layer = activation_map[activation]
        
        # If input data provided, do forward pass
        output = None
        if input_data is not None:
            if not isinstance(input_data, torch.Tensor):
                input_data = torch.tensor(input_data, dtype=torch.float32)
            output = layer(input_data)
            context.set_output("output", output)
        
        context.set_output("layer", layer)
        return layer
        
    except Exception as e:
        result = f"Activation layer error: {str(e)}"
        context.set_output("layer", result)
        context.set_output("output", result)
        return result