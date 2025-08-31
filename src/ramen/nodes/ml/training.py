"""PyTorch training and optimization operations."""

from typing import Any
from ..base import node, NodeContext, Port, PortType

# Try to import PyTorch, handle gracefully if not available
try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader, TensorDataset
    HAS_PYTORCH = True
except ImportError:
    HAS_PYTORCH = False


@node(
    namespace="ml",
    node_type="loss_function",
    display_name="Loss Function",
    category="ML/Training",
    description="Create PyTorch loss function",
    icon="📉",
    color="#ef4444",
    inputs=[
        Port("loss_type", PortType.STRING, required=True),
        Port("predictions", PortType.ANY, required=False),
        Port("targets", PortType.ANY, required=False),
        Port("reduction", PortType.STRING, required=False)
    ],
    outputs=[
        Port("loss_fn", PortType.ANY),
        Port("loss_value", PortType.NUMBER)
    ]
)
def loss_function_node(context: NodeContext) -> Any:
    """Create PyTorch loss function."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("loss_fn", result)
        context.set_output("loss_value", 0)
        return result
    
    loss_type = context.get_input("loss_type", "mse").lower()
    predictions = context.get_input("predictions")
    targets = context.get_input("targets")
    reduction = context.get_input("reduction", "mean")
    
    try:
        loss_map = {
            "mse": nn.MSELoss(reduction=reduction),
            "mae": nn.L1Loss(reduction=reduction),
            "cross_entropy": nn.CrossEntropyLoss(reduction=reduction),
            "bce": nn.BCELoss(reduction=reduction),
            "bce_logits": nn.BCEWithLogitsLoss(reduction=reduction),
            "nll": nn.NLLLoss(reduction=reduction),
            "kl_div": nn.KLDivLoss(reduction=reduction),
            "smooth_l1": nn.SmoothL1Loss(reduction=reduction),
            "huber": nn.HuberLoss(reduction=reduction)
        }
        
        if loss_type not in loss_map:
            raise ValueError(f"Unknown loss type: {loss_type}")
        
        loss_fn = loss_map[loss_type]
        
        # If predictions and targets provided, calculate loss
        loss_value = None
        if predictions is not None and targets is not None:
            if not isinstance(predictions, torch.Tensor):
                predictions = torch.tensor(predictions, dtype=torch.float32)
            if not isinstance(targets, torch.Tensor):
                targets = torch.tensor(targets, dtype=torch.float32)
            
            loss_value = loss_fn(predictions, targets).item()
            context.set_output("loss_value", loss_value)
        
        context.set_output("loss_fn", loss_fn)
        return loss_fn
        
    except Exception as e:
        result = f"Loss function error: {str(e)}"
        context.set_output("loss_fn", result)
        context.set_output("loss_value", 0)
        return result


@node(
    namespace="ml",
    node_type="optimizer",
    display_name="Optimizer",
    category="ML/Training",
    description="Create PyTorch optimizer",
    icon="🚀",
    color="#ef4444",
    inputs=[
        Port("model_parameters", PortType.ANY, required=True),
        Port("optimizer_type", PortType.STRING, required=False),
        Port("learning_rate", PortType.NUMBER, required=False),
        Port("weight_decay", PortType.NUMBER, required=False),
        Port("momentum", PortType.NUMBER, required=False)
    ],
    outputs=[
        Port("optimizer", PortType.ANY)
    ]
)
def optimizer_node(context: NodeContext) -> Any:
    """Create PyTorch optimizer."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("optimizer", result)
        return result
    
    model_parameters = context.get_input("model_parameters")
    optimizer_type = context.get_input("optimizer_type", "adam").lower()
    learning_rate = float(context.get_input("learning_rate", 0.001))
    weight_decay = float(context.get_input("weight_decay", 0))
    momentum = float(context.get_input("momentum", 0.9))
    
    try:
        if optimizer_type == "adam":
            optimizer = optim.Adam(model_parameters, lr=learning_rate, weight_decay=weight_decay)
        elif optimizer_type == "sgd":
            optimizer = optim.SGD(model_parameters, lr=learning_rate, momentum=momentum, weight_decay=weight_decay)
        elif optimizer_type == "adamw":
            optimizer = optim.AdamW(model_parameters, lr=learning_rate, weight_decay=weight_decay)
        elif optimizer_type == "rmsprop":
            optimizer = optim.RMSprop(model_parameters, lr=learning_rate, momentum=momentum, weight_decay=weight_decay)
        elif optimizer_type == "adagrad":
            optimizer = optim.Adagrad(model_parameters, lr=learning_rate, weight_decay=weight_decay)
        else:
            raise ValueError(f"Unknown optimizer type: {optimizer_type}")
        
        context.set_output("optimizer", optimizer)
        return optimizer
        
    except Exception as e:
        result = f"Optimizer error: {str(e)}"
        context.set_output("optimizer", result)
        return result


@node(
    namespace="ml",
    node_type="train_step",
    display_name="Training Step",
    category="ML/Training",
    description="Perform single training step",
    icon="👟",
    color="#ef4444",
    inputs=[
        Port("model", PortType.ANY, required=True),
        Port("optimizer", PortType.ANY, required=True),
        Port("loss_fn", PortType.ANY, required=True),
        Port("inputs", PortType.ANY, required=True),
        Port("targets", PortType.ANY, required=True)
    ],
    outputs=[
        Port("loss", PortType.NUMBER),
        Port("predictions", PortType.ANY)
    ]
)
def train_step_node(context: NodeContext) -> Any:
    """Perform single training step."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("loss", 0)
        context.set_output("predictions", result)
        return result
    
    model = context.get_input("model")
    optimizer = context.get_input("optimizer")
    loss_fn = context.get_input("loss_fn")
    inputs = context.get_input("inputs")
    targets = context.get_input("targets")
    
    try:
        # Ensure inputs are tensors
        if not isinstance(inputs, torch.Tensor):
            inputs = torch.tensor(inputs, dtype=torch.float32)
        if not isinstance(targets, torch.Tensor):
            targets = torch.tensor(targets, dtype=torch.float32)
        
        # Set model to training mode
        model.train()
        
        # Zero gradients
        optimizer.zero_grad()
        
        # Forward pass
        predictions = model(inputs)
        
        # Calculate loss
        loss = loss_fn(predictions, targets)
        
        # Backward pass
        loss.backward()
        
        # Update parameters
        optimizer.step()
        
        context.set_output("loss", loss.item())
        context.set_output("predictions", predictions)
        return loss.item()
        
    except Exception as e:
        result = f"Training step error: {str(e)}"
        context.set_output("loss", 0)
        context.set_output("predictions", result)
        return result


@node(
    namespace="ml",
    node_type="evaluate",
    display_name="Evaluate Model",
    category="ML/Training",
    description="Evaluate model performance",
    icon="📊",
    color="#ef4444",
    inputs=[
        Port("model", PortType.ANY, required=True),
        Port("loss_fn", PortType.ANY, required=True),
        Port("inputs", PortType.ANY, required=True),
        Port("targets", PortType.ANY, required=True)
    ],
    outputs=[
        Port("loss", PortType.NUMBER),
        Port("predictions", PortType.ANY),
        Port("accuracy", PortType.NUMBER)
    ]
)
def evaluate_node(context: NodeContext) -> Any:
    """Evaluate model performance."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("loss", 0)
        context.set_output("predictions", result)
        context.set_output("accuracy", 0)
        return result
    
    model = context.get_input("model")
    loss_fn = context.get_input("loss_fn")
    inputs = context.get_input("inputs")
    targets = context.get_input("targets")
    
    try:
        # Ensure inputs are tensors
        if not isinstance(inputs, torch.Tensor):
            inputs = torch.tensor(inputs, dtype=torch.float32)
        if not isinstance(targets, torch.Tensor):
            targets = torch.tensor(targets, dtype=torch.float32)
        
        # Set model to evaluation mode
        model.eval()
        
        with torch.no_grad():
            predictions = model(inputs)
            loss = loss_fn(predictions, targets)
            
            # Calculate accuracy for classification tasks
            accuracy = 0.0
            if len(predictions.shape) > 1 and predictions.shape[-1] > 1:
                # Multi-class classification
                predicted_classes = torch.argmax(predictions, dim=-1)
                target_classes = targets
                if len(targets.shape) > 1:
                    target_classes = torch.argmax(targets, dim=-1)
                correct = (predicted_classes == target_classes).float()
                accuracy = correct.mean().item()
            else:
                # Binary classification or regression
                if torch.all((predictions >= 0) & (predictions <= 1)) and torch.all((targets >= 0) & (targets <= 1)):
                    # Binary classification
                    predicted_binary = (predictions > 0.5).float()
                    accuracy = (predicted_binary == targets).float().mean().item()
        
        context.set_output("loss", loss.item())
        context.set_output("predictions", predictions)
        context.set_output("accuracy", accuracy)
        return loss.item()
        
    except Exception as e:
        result = f"Evaluation error: {str(e)}"
        context.set_output("loss", 0)
        context.set_output("predictions", result)
        context.set_output("accuracy", 0)
        return result


@node(
    namespace="ml",
    node_type="dataloader",
    display_name="Data Loader",
    category="ML/Training",
    description="Create PyTorch data loader",
    icon="📦",
    color="#ef4444",
    inputs=[
        Port("data", PortType.ANY, required=True),
        Port("targets", PortType.ANY, required=False),
        Port("batch_size", PortType.NUMBER, required=False),
        Port("shuffle", PortType.BOOLEAN, required=False),
        Port("drop_last", PortType.BOOLEAN, required=False)
    ],
    outputs=[
        Port("dataloader", PortType.ANY),
        Port("num_batches", PortType.NUMBER),
        Port("dataset_size", PortType.NUMBER)
    ]
)
def dataloader_node(context: NodeContext) -> Any:
    """Create PyTorch data loader."""
    if not HAS_PYTORCH:
        result = "PyTorch not available"
        context.set_output("dataloader", result)
        context.set_output("num_batches", 0)
        context.set_output("dataset_size", 0)
        return result
    
    data = context.get_input("data")
    targets = context.get_input("targets")
    batch_size = int(context.get_input("batch_size", 32))
    shuffle = context.get_input("shuffle", True)
    drop_last = context.get_input("drop_last", False)
    
    try:
        # Convert to tensors
        if not isinstance(data, torch.Tensor):
            data = torch.tensor(data, dtype=torch.float32)
        
        if targets is not None:
            if not isinstance(targets, torch.Tensor):
                targets = torch.tensor(targets, dtype=torch.float32)
            dataset = TensorDataset(data, targets)
        else:
            dataset = TensorDataset(data)
        
        dataloader = DataLoader(
            dataset, 
            batch_size=batch_size, 
            shuffle=shuffle,
            drop_last=drop_last
        )
        
        num_batches = len(dataloader)
        dataset_size = len(dataset)
        
        context.set_output("dataloader", dataloader)
        context.set_output("num_batches", num_batches)
        context.set_output("dataset_size", dataset_size)
        return dataloader
        
    except Exception as e:
        result = f"DataLoader error: {str(e)}"
        context.set_output("dataloader", result)
        context.set_output("num_batches", 0)
        context.set_output("dataset_size", 0)
        return result