# Neural Network Builder Topping

Visual building blocks for constructing PyTorch neural networks in Ramen.

## Features

This topping provides a comprehensive library of neural network layers that can be visually composed to create PyTorch modules:

### Layer Categories

- **Convolutional**: Conv1d, Conv2d, Conv3d, ConvTranspose2d
- **Linear**: Linear, Bilinear
- **Pooling**: MaxPool2d, AvgPool2d, AdaptiveAvgPool2d, AdaptiveMaxPool2d
- **Normalization**: BatchNorm1d, BatchNorm2d, LayerNorm, GroupNorm
- **Activation**: ReLU, LeakyReLU, Sigmoid, Tanh, Softmax, GELU
- **Regularization**: Dropout, Dropout2d
- **Recurrent**: LSTM, GRU, RNN
- **Transformer**: MultiheadAttention, TransformerEncoderLayer, TransformerDecoderLayer
- **Embedding**: Embedding
- **Container**: Sequential, ModuleList

## Usage

Each layer node can be dragged into a ClassDefinitionEditor to visually construct neural network architectures. The nodes provide:

- Configuration parameters as input ports
- Layer configuration and PyTorch instance as outputs
- Visual feedback for layer types and categories
- Automatic code generation for the complete module

## Installation

This topping is automatically installed as part of the Ramen workspace.