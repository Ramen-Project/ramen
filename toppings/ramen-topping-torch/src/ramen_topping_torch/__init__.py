"""
PyTorch Topping - 深度學習與張量操作節點
"""

from typing import Any, Dict, List, Optional, Union
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np

from ramen.topping import (
    ToppingBase,
    NodeFunction,
    NodeMetadata,
    NodeContext,
    PortDefinition,
    PortType
)


class TensorCreateNode(NodeFunction):
    """建立張量節點"""
    
    def execute(self, context: NodeContext) -> Any:
        data = context.get_input("data")
        dtype = context.get_input("dtype", None)
        device = context.get_input("device", "cpu")
        requires_grad = context.get_input("requires_grad", False)
        
        # 建立張量
        if isinstance(data, torch.Tensor):
            tensor = data.to(device)
        elif isinstance(data, np.ndarray):
            tensor = torch.from_numpy(data).to(device)
        else:
            tensor = torch.tensor(data, dtype=dtype, device=device)
        
        if requires_grad:
            tensor = tensor.requires_grad_(True)
        
        context.set_output("tensor", tensor)
        context.set_output("shape", list(tensor.shape))
        context.set_output("dtype", str(tensor.dtype))
        return tensor
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="Tensor Create",
            description="建立 PyTorch 張量",
            inputs=[
                PortDefinition(name="data", port_type=PortType.GENERIC, description="資料"),
                PortDefinition(name="dtype", port_type=PortType.GENERIC, description="資料型別"),
                PortDefinition(name="device", port_type=PortType.STRING, description="裝置 (cpu/cuda)"),
                PortDefinition(name="requires_grad", port_type=PortType.BOOLEAN, description="需要梯度")
            ],
            outputs=[
                PortDefinition(name="tensor", port_type=PortType.GENERIC, description="張量"),
                PortDefinition(name="shape", port_type=PortType.GENERIC, description="形狀"),
                PortDefinition(name="dtype", port_type=PortType.STRING, description="資料型別")
            ]
        )


class TensorReshapeNode(NodeFunction):
    """重塑張量節點"""
    
    def execute(self, context: NodeContext) -> Any:
        tensor = context.get_input("tensor")
        shape = context.get_input("shape")
        
        if not isinstance(tensor, torch.Tensor):
            raise ValueError("Input must be a PyTorch tensor")
        
        # 重塑張量
        reshaped = tensor.reshape(*shape)
        
        context.set_output("tensor", reshaped)
        context.set_output("shape", list(reshaped.shape))
        return reshaped
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="Tensor Reshape",
            description="重塑張量維度",
            inputs=[
                PortDefinition(name="tensor", port_type=PortType.GENERIC, description="輸入張量"),
                PortDefinition(name="shape", port_type=PortType.GENERIC, description="新形狀")
            ],
            outputs=[
                PortDefinition(name="tensor", port_type=PortType.GENERIC, description="重塑後的張量"),
                PortDefinition(name="shape", port_type=PortType.GENERIC, description="形狀")
            ]
        )


class TensorOperationNode(NodeFunction):
    """張量運算節點"""
    
    def execute(self, context: NodeContext) -> Any:
        x = context.get_input("x")
        y = context.get_input("y", None)
        operation = context.get_input("operation", "add")
        
        if not isinstance(x, torch.Tensor):
            x = torch.tensor(x)
        
        if y is not None and not isinstance(y, torch.Tensor):
            y = torch.tensor(y)
        
        # 執行運算
        if operation == "add":
            result = x + y if y is not None else x
        elif operation == "subtract":
            result = x - y if y is not None else -x
        elif operation == "multiply":
            result = x * y if y is not None else x
        elif operation == "divide":
            result = x / y if y is not None else x
        elif operation == "matmul":
            result = torch.matmul(x, y)
        elif operation == "mean":
            result = torch.mean(x)
        elif operation == "sum":
            result = torch.sum(x)
        elif operation == "std":
            result = torch.std(x)
        elif operation == "transpose":
            result = x.T
        elif operation == "softmax":
            dim = context.get_input("dim", -1)
            result = torch.softmax(x, dim=dim)
        elif operation == "relu":
            result = torch.relu(x)
        elif operation == "sigmoid":
            result = torch.sigmoid(x)
        elif operation == "tanh":
            result = torch.tanh(x)
        else:
            raise ValueError(f"Unknown operation: {operation}")
        
        context.set_output("result", result)
        context.set_output("shape", list(result.shape))
        return result
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="Tensor Operation",
            description="張量運算",
            inputs=[
                PortDefinition(name="x", port_type=PortType.GENERIC, description="輸入張量 X"),
                PortDefinition(name="y", port_type=PortType.GENERIC, description="輸入張量 Y"),
                PortDefinition(name="operation", port_type=PortType.STRING, description="運算類型"),
                PortDefinition(name="dim", port_type=PortType.NUMBER, description="維度 (softmax用)")
            ],
            outputs=[
                PortDefinition(name="result", port_type=PortType.GENERIC, description="運算結果"),
                PortDefinition(name="shape", port_type=PortType.GENERIC, description="結果形狀")
            ]
        )


class LinearLayerNode(NodeFunction):
    """線性層節點"""
    
    def execute(self, context: NodeContext) -> Any:
        input_size = context.get_input("input_size")
        output_size = context.get_input("output_size")
        bias = context.get_input("bias", True)
        
        # 建立線性層
        layer = nn.Linear(input_size, output_size, bias=bias)
        
        # 如果有輸入資料，執行前向傳播
        input_data = context.get_input("input", None)
        if input_data is not None:
            if not isinstance(input_data, torch.Tensor):
                input_data = torch.tensor(input_data, dtype=torch.float32)
            output = layer(input_data)
            context.set_output("output", output)
            context.set_output("output_shape", list(output.shape))
        
        context.set_output("layer", layer)
        context.set_output("parameters", sum(p.numel() for p in layer.parameters()))
        return layer
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="Linear Layer",
            description="建立線性層",
            inputs=[
                PortDefinition(name="input_size", port_type=PortType.NUMBER, description="輸入大小"),
                PortDefinition(name="output_size", port_type=PortType.NUMBER, description="輸出大小"),
                PortDefinition(name="bias", port_type=PortType.BOOLEAN, description="使用偏置"),
                PortDefinition(name="input", port_type=PortType.GENERIC, description="輸入資料")
            ],
            outputs=[
                PortDefinition(name="layer", port_type=PortType.GENERIC, description="線性層"),
                PortDefinition(name="output", port_type=PortType.GENERIC, description="輸出"),
                PortDefinition(name="output_shape", port_type=PortType.GENERIC, description="輸出形狀"),
                PortDefinition(name="parameters", port_type=PortType.NUMBER, description="參數數量")
            ]
        )


class Conv2DNode(NodeFunction):
    """2D 卷積層節點"""
    
    def execute(self, context: NodeContext) -> Any:
        in_channels = context.get_input("in_channels")
        out_channels = context.get_input("out_channels")
        kernel_size = context.get_input("kernel_size", 3)
        stride = context.get_input("stride", 1)
        padding = context.get_input("padding", 0)
        
        # 建立卷積層
        layer = nn.Conv2d(in_channels, out_channels, kernel_size, stride, padding)
        
        # 如果有輸入資料，執行前向傳播
        input_data = context.get_input("input", None)
        if input_data is not None:
            if not isinstance(input_data, torch.Tensor):
                input_data = torch.tensor(input_data, dtype=torch.float32)
            output = layer(input_data)
            context.set_output("output", output)
            context.set_output("output_shape", list(output.shape))
        
        context.set_output("layer", layer)
        context.set_output("parameters", sum(p.numel() for p in layer.parameters()))
        return layer
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="Conv2D Layer",
            description="建立 2D 卷積層",
            inputs=[
                PortDefinition(name="in_channels", port_type=PortType.NUMBER, description="輸入通道數"),
                PortDefinition(name="out_channels", port_type=PortType.NUMBER, description="輸出通道數"),
                PortDefinition(name="kernel_size", port_type=PortType.GENERIC, description="核大小"),
                PortDefinition(name="stride", port_type=PortType.GENERIC, description="步幅"),
                PortDefinition(name="padding", port_type=PortType.GENERIC, description="填充"),
                PortDefinition(name="input", port_type=PortType.GENERIC, description="輸入資料")
            ],
            outputs=[
                PortDefinition(name="layer", port_type=PortType.GENERIC, description="卷積層"),
                PortDefinition(name="output", port_type=PortType.GENERIC, description="輸出"),
                PortDefinition(name="output_shape", port_type=PortType.GENERIC, description="輸出形狀"),
                PortDefinition(name="parameters", port_type=PortType.NUMBER, description="參數數量")
            ]
        )


class ModelTrainNode(NodeFunction):
    """模型訓練節點"""
    
    def execute(self, context: NodeContext) -> Any:
        model = context.get_input("model")
        train_data = context.get_input("train_data")
        train_labels = context.get_input("train_labels")
        epochs = context.get_input("epochs", 10)
        batch_size = context.get_input("batch_size", 32)
        learning_rate = context.get_input("learning_rate", 0.001)
        loss_function = context.get_input("loss_function", "mse")
        
        if not isinstance(train_data, torch.Tensor):
            train_data = torch.tensor(train_data, dtype=torch.float32)
        if not isinstance(train_labels, torch.Tensor):
            train_labels = torch.tensor(train_labels, dtype=torch.float32)
        
        # 建立資料載入器
        dataset = TensorDataset(train_data, train_labels)
        dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
        
        # 設定損失函數
        if loss_function == "mse":
            criterion = nn.MSELoss()
        elif loss_function == "cross_entropy":
            criterion = nn.CrossEntropyLoss()
        elif loss_function == "bce":
            criterion = nn.BCELoss()
        else:
            criterion = nn.MSELoss()
        
        # 設定優化器
        optimizer = optim.Adam(model.parameters(), lr=learning_rate)
        
        # 訓練模型
        model.train()
        loss_history = []
        
        for epoch in range(epochs):
            epoch_loss = 0
            for batch_data, batch_labels in dataloader:
                optimizer.zero_grad()
                outputs = model(batch_data)
                loss = criterion(outputs, batch_labels)
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()
            
            avg_loss = epoch_loss / len(dataloader)
            loss_history.append(avg_loss)
        
        context.set_output("model", model)
        context.set_output("loss_history", loss_history)
        context.set_output("final_loss", loss_history[-1] if loss_history else 0)
        return model
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="Model Train",
            description="訓練模型",
            inputs=[
                PortDefinition(name="model", port_type=PortType.GENERIC, description="模型"),
                PortDefinition(name="train_data", port_type=PortType.GENERIC, description="訓練資料"),
                PortDefinition(name="train_labels", port_type=PortType.GENERIC, description="訓練標籤"),
                PortDefinition(name="epochs", port_type=PortType.NUMBER, description="訓練週期"),
                PortDefinition(name="batch_size", port_type=PortType.NUMBER, description="批次大小"),
                PortDefinition(name="learning_rate", port_type=PortType.NUMBER, description="學習率"),
                PortDefinition(name="loss_function", port_type=PortType.STRING, description="損失函數")
            ],
            outputs=[
                PortDefinition(name="model", port_type=PortType.GENERIC, description="訓練後的模型"),
                PortDefinition(name="loss_history", port_type=PortType.GENERIC, description="損失歷史"),
                PortDefinition(name="final_loss", port_type=PortType.NUMBER, description="最終損失")
            ]
        )


class ModelPredictNode(NodeFunction):
    """模型預測節點"""
    
    def execute(self, context: NodeContext) -> Any:
        model = context.get_input("model")
        input_data = context.get_input("input")
        
        if not isinstance(input_data, torch.Tensor):
            input_data = torch.tensor(input_data, dtype=torch.float32)
        
        # 進行預測
        model.eval()
        with torch.no_grad():
            predictions = model(input_data)
        
        context.set_output("predictions", predictions)
        context.set_output("shape", list(predictions.shape))
        
        # 如果是分類任務，輸出類別
        if len(predictions.shape) > 1 and predictions.shape[-1] > 1:
            classes = torch.argmax(predictions, dim=-1)
            context.set_output("classes", classes)
        
        return predictions
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="Model Predict",
            description="模型預測",
            inputs=[
                PortDefinition(name="model", port_type=PortType.GENERIC, description="模型"),
                PortDefinition(name="input", port_type=PortType.GENERIC, description="輸入資料")
            ],
            outputs=[
                PortDefinition(name="predictions", port_type=PortType.GENERIC, description="預測結果"),
                PortDefinition(name="shape", port_type=PortType.GENERIC, description="輸出形狀"),
                PortDefinition(name="classes", port_type=PortType.GENERIC, description="預測類別")
            ]
        )


class DataLoaderNode(NodeFunction):
    """資料載入器節點"""
    
    def execute(self, context: NodeContext) -> Any:
        data = context.get_input("data")
        labels = context.get_input("labels", None)
        batch_size = context.get_input("batch_size", 32)
        shuffle = context.get_input("shuffle", True)
        
        if not isinstance(data, torch.Tensor):
            data = torch.tensor(data, dtype=torch.float32)
        
        if labels is not None:
            if not isinstance(labels, torch.Tensor):
                labels = torch.tensor(labels, dtype=torch.float32)
            dataset = TensorDataset(data, labels)
        else:
            dataset = TensorDataset(data)
        
        dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=shuffle)
        
        context.set_output("dataloader", dataloader)
        context.set_output("num_batches", len(dataloader))
        context.set_output("dataset_size", len(dataset))
        return dataloader
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="DataLoader",
            description="建立資料載入器",
            inputs=[
                PortDefinition(name="data", port_type=PortType.GENERIC, description="資料"),
                PortDefinition(name="labels", port_type=PortType.GENERIC, description="標籤"),
                PortDefinition(name="batch_size", port_type=PortType.NUMBER, description="批次大小"),
                PortDefinition(name="shuffle", port_type=PortType.BOOLEAN, description="隨機打亂")
            ],
            outputs=[
                PortDefinition(name="dataloader", port_type=PortType.GENERIC, description="資料載入器"),
                PortDefinition(name="num_batches", port_type=PortType.NUMBER, description="批次數量"),
                PortDefinition(name="dataset_size", port_type=PortType.NUMBER, description="資料集大小")
            ]
        )


class TorchTopping(ToppingBase):
    """PyTorch 深度學習節點集合"""
    
    def get_nodes(self) -> List[NodeFunction]:
        return [
            TensorCreateNode(),
            TensorReshapeNode(),
            TensorOperationNode(),
            LinearLayerNode(),
            Conv2DNode(),
            ModelTrainNode(),
            ModelPredictNode(),
            DataLoaderNode()
        ]
    
    def get_namespace(self) -> str:
        return "torch"
    
    def get_description(self) -> str:
        return "PyTorch 深度學習與張量操作節點"
    
    def get_dependencies(self) -> List[str]:
        return ["torch", "numpy"]


# Entry point for topping loader
def get_topping() -> ToppingBase:
    """取得 PyTorch topping 實例"""
    return TorchTopping()