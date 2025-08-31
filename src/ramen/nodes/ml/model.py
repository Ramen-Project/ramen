"""PyTorch model operations."""

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
    node_type="model_save",
    display_name="Save Model",
    category="ML/Model",
    description="Save PyTorch model to file",
    icon="💾",
    color="#ef4444",
    inputs=[
        Port("model", PortType.ANY, required=True),
        Port("filepath", PortType.STRING, required=True),
        Port("save_state_dict_only", PortType.BOOLEAN, required=False)
    ],
    outputs=[
        Port("success", PortType.BOOLEAN),
        Port("message", PortType.STRING)
    ]
)
def model_save_node(context: NodeContext) -> Any:
    """Save PyTorch model to file."""
    if not HAS_PYTORCH:
        context.set_output("success", False)
        context.set_output("message", "PyTorch not available")
        return False
    
    model = context.get_input("model")
    filepath = context.get_input("filepath", "model.pt")
    save_state_dict_only = context.get_input("save_state_dict_only", True)
    
    try:
        if save_state_dict_only:
            torch.save(model.state_dict(), filepath)
            message = f"Model state dict saved to {filepath}"
        else:
            torch.save(model, filepath)
            message = f"Complete model saved to {filepath}"
        
        context.set_output("success", True)
        context.set_output("message", message)
        return True
        
    except Exception as e:
        message = f"Model save error: {str(e)}"
        context.set_output("success", False)
        context.set_output("message", message)
        return False


@node(
    namespace="ml",
    node_type="model_load",
    display_name="Load Model",
    category="ML/Model",
    description="Load PyTorch model from file",
    icon="📁",
    color="#ef4444",
    inputs=[
        Port("filepath", PortType.STRING, required=True),
        Port("model_class", PortType.ANY, required=False),
        Port("load_state_dict_only", PortType.BOOLEAN, required=False),
        Port("device", PortType.STRING, required=False)
    ],
    outputs=[
        Port("model", PortType.ANY),
        Port("success", PortType.BOOLEAN),
        Port("message", PortType.STRING)
    ]
)
def model_load_node(context: NodeContext) -> Any:
    """Load PyTorch model from file."""
    if not HAS_PYTORCH:
        context.set_output("model", "PyTorch not available")
        context.set_output("success", False)
        context.set_output("message", "PyTorch not available")
        return None
    
    filepath = context.get_input("filepath", "model.pt")
    model_class = context.get_input("model_class")
    load_state_dict_only = context.get_input("load_state_dict_only", True)
    device = context.get_input("device", "cpu")
    
    try:
        if load_state_dict_only:
            if model_class is None:
                raise ValueError("model_class is required when load_state_dict_only=True")
            
            model = model_class()
            state_dict = torch.load(filepath, map_location=device)
            model.load_state_dict(state_dict)
            message = f"Model state dict loaded from {filepath}"
        else:
            model = torch.load(filepath, map_location=device)
            message = f"Complete model loaded from {filepath}"
        
        model.to(device)
        
        context.set_output("model", model)
        context.set_output("success", True)
        context.set_output("message", message)
        return model
        
    except Exception as e:
        message = f"Model load error: {str(e)}"
        context.set_output("model", message)
        context.set_output("success", False)
        context.set_output("message", message)
        return None


@node(
    namespace="ml",
    node_type="model_predict",
    display_name="Model Predict",
    category="ML/Model",
    description="Make predictions with PyTorch model",
    icon="🔮",
    color="#ef4444",
    inputs=[
        Port("model", PortType.ANY, required=True),
        Port("input_data", PortType.ANY, required=True),
        Port("return_probabilities", PortType.BOOLEAN, required=False)
    ],
    outputs=[
        Port("predictions", PortType.ANY),
        Port("probabilities", PortType.ANY),
        Port("classes", PortType.ANY)
    ]
)
def model_predict_node(context: NodeContext) -> Any:
    """Make predictions with PyTorch model."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("predictions", result)
        context.set_output("probabilities", result)
        context.set_output("classes", result)
        return result
    
    model = context.get_input("model")
    input_data = context.get_input("input_data")
    return_probabilities = context.get_input("return_probabilities", False)
    
    try:
        # Ensure input is tensor
        if not isinstance(input_data, torch.Tensor):
            input_data = torch.tensor(input_data, dtype=torch.float32)
        
        # Set model to evaluation mode
        model.eval()
        
        with torch.no_grad():
            predictions = model(input_data)
            
            # Handle classification tasks
            probabilities = None
            classes = None
            
            if len(predictions.shape) > 1 and predictions.shape[-1] > 1:
                # Multi-class classification
                probabilities = torch.softmax(predictions, dim=-1)
                classes = torch.argmax(probabilities, dim=-1)
            elif len(predictions.shape) >= 1:
                # Binary classification
                if torch.all((predictions >= 0) & (predictions <= 1)):
                    probabilities = predictions
                    classes = (predictions > 0.5).long()
                elif return_probabilities:
                    # Apply sigmoid for binary classification
                    probabilities = torch.sigmoid(predictions)
                    classes = (probabilities > 0.5).long()
        
        context.set_output("predictions", predictions)
        context.set_output("probabilities", probabilities)
        context.set_output("classes", classes)
        return predictions
        
    except Exception as e:
        result = f"Model prediction error: {str(e)}"
        context.set_output("predictions", result)
        context.set_output("probabilities", result)
        context.set_output("classes", result)
        return result


@node(
    namespace="ml",
    node_type="model_summary",
    display_name="Model Summary",
    category="ML/Model",
    description="Get PyTorch model summary information",
    icon="📋",
    color="#ef4444",
    inputs=[
        Port("model", PortType.ANY, required=True),
        Port("input_size", PortType.ARRAY, required=False)
    ],
    outputs=[
        Port("summary", PortType.OBJECT),
        Port("total_params", PortType.NUMBER),
        Port("trainable_params", PortType.NUMBER)
    ]
)
def model_summary_node(context: NodeContext) -> Any:
    """Get PyTorch model summary information."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("summary", {"error": result})
        context.set_output("total_params", 0)
        context.set_output("trainable_params", 0)
        return result
    
    model = context.get_input("model")
    input_size = context.get_input("input_size")
    
    try:
        # Calculate parameter counts
        total_params = sum(p.numel() for p in model.parameters())
        trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
        
        # Get model structure
        model_str = str(model)
        
        # Try to get layer information
        layers = []
        for name, module in model.named_modules():
            if len(list(module.children())) == 0:  # Leaf modules only
                layer_params = sum(p.numel() for p in module.parameters())
                layers.append({
                    "name": name,
                    "type": type(module).__name__,
                    "parameters": layer_params
                })
        
        summary = {
            "model_structure": model_str,
            "layers": layers,
            "total_parameters": total_params,
            "trainable_parameters": trainable_params,
            "model_size_mb": total_params * 4 / (1024 * 1024)  # Assuming float32
        }
        
        # If input size provided, try to get output shapes
        if input_size:
            try:
                dummy_input = torch.randn(1, *input_size)
                model.eval()
                with torch.no_grad():
                    output = model(dummy_input)
                    summary["input_shape"] = list(dummy_input.shape)
                    summary["output_shape"] = list(output.shape)
            except Exception:
                pass  # Skip if forward pass fails
        
        context.set_output("summary", summary)
        context.set_output("total_params", total_params)
        context.set_output("trainable_params", trainable_params)
        return summary
        
    except Exception as e:
        result = f"Model summary error: {str(e)}"
        summary = {"error": result}
        context.set_output("summary", summary)
        context.set_output("total_params", 0)
        context.set_output("trainable_params", 0)
        return summary