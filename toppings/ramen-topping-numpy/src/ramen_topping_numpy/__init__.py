"""NumPy topping for Ramen - provides numerical computation nodes."""

from ramen.topping import (
    ToppingBase,
    NodeFunction,
    NodeMetadata,
    NodeContext,
    PortDefinition,
    PortType
)


class ArrayCreateNode(NodeFunction):
    """Create a NumPy array."""
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="numpy",
            node_type="array",
            display_name="Create Array",
            category="NumPy",
            description="Create a NumPy array from values",
            icon="🔢",
            color="#013243",
            inputs=[
                PortDefinition(
                    name="values",
                    port_type=PortType.ARRAY,
                    description="Input values for the array"
                ),
                PortDefinition(
                    name="dtype",
                    port_type=PortType.STRING,
                    required=False,
                    default="float64",
                    description="Data type of the array"
                )
            ],
            outputs=[
                PortDefinition(
                    name="array",
                    port_type=PortType.TENSOR,
                    description="NumPy array"
                )
            ]
        )
    
    def execute(self, context: NodeContext):
        import numpy as np
        
        values = context.get_input("values", [])
        dtype = context.get_input("dtype", "float64")
        
        array = np.array(values, dtype=dtype)
        context.set_output("array", array)
        
        return array


class ArrayReshapeNode(NodeFunction):
    """Reshape a NumPy array."""
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="numpy",
            node_type="reshape",
            display_name="Reshape Array",
            category="NumPy",
            description="Reshape a NumPy array",
            icon="🔄",
            color="#013243",
            inputs=[
                PortDefinition(
                    name="array",
                    port_type=PortType.TENSOR,
                    description="Input array"
                ),
                PortDefinition(
                    name="shape",
                    port_type=PortType.ARRAY,
                    description="New shape"
                )
            ],
            outputs=[
                PortDefinition(
                    name="array",
                    port_type=PortType.TENSOR,
                    description="Reshaped array"
                )
            ]
        )
    
    def execute(self, context: NodeContext):
        import numpy as np
        
        array = context.get_input("array")
        shape = context.get_input("shape")
        
        if array is None:
            raise ValueError("Input array is required")
        
        reshaped = np.reshape(array, shape)
        context.set_output("array", reshaped)
        
        return reshaped


class ArrayOperationNode(NodeFunction):
    """Perform operations on arrays."""
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="numpy",
            node_type="operation",
            display_name="Array Operation",
            category="NumPy",
            description="Perform mathematical operations on arrays",
            icon="➕",
            color="#013243",
            inputs=[
                PortDefinition(
                    name="a",
                    port_type=PortType.TENSOR,
                    description="First array"
                ),
                PortDefinition(
                    name="b",
                    port_type=PortType.TENSOR,
                    required=False,
                    description="Second array (optional)"
                ),
                PortDefinition(
                    name="operation",
                    port_type=PortType.STRING,
                    default="add",
                    description="Operation to perform (add, subtract, multiply, divide, power, etc.)"
                )
            ],
            outputs=[
                PortDefinition(
                    name="result",
                    port_type=PortType.TENSOR,
                    description="Result array"
                )
            ],
            properties={
                "operations": [
                    "add", "subtract", "multiply", "divide",
                    "power", "sqrt", "exp", "log",
                    "sin", "cos", "tan",
                    "mean", "sum", "std", "var",
                    "min", "max", "argmin", "argmax"
                ]
            }
        )
    
    def execute(self, context: NodeContext):
        import numpy as np
        
        a = context.get_input("a")
        b = context.get_input("b")
        operation = context.get_input("operation", "add")
        
        if a is None:
            raise ValueError("First array is required")
        
        # Binary operations
        if operation in ["add", "subtract", "multiply", "divide", "power"]:
            if b is None:
                raise ValueError(f"Operation {operation} requires two arrays")
            
            if operation == "add":
                result = np.add(a, b)
            elif operation == "subtract":
                result = np.subtract(a, b)
            elif operation == "multiply":
                result = np.multiply(a, b)
            elif operation == "divide":
                result = np.divide(a, b)
            elif operation == "power":
                result = np.power(a, b)
        
        # Unary operations
        else:
            if operation == "sqrt":
                result = np.sqrt(a)
            elif operation == "exp":
                result = np.exp(a)
            elif operation == "log":
                result = np.log(a)
            elif operation == "sin":
                result = np.sin(a)
            elif operation == "cos":
                result = np.cos(a)
            elif operation == "tan":
                result = np.tan(a)
            elif operation == "mean":
                result = np.mean(a)
            elif operation == "sum":
                result = np.sum(a)
            elif operation == "std":
                result = np.std(a)
            elif operation == "var":
                result = np.var(a)
            elif operation == "min":
                result = np.min(a)
            elif operation == "max":
                result = np.max(a)
            elif operation == "argmin":
                result = np.argmin(a)
            elif operation == "argmax":
                result = np.argmax(a)
            else:
                raise ValueError(f"Unknown operation: {operation}")
        
        context.set_output("result", result)
        return result


class RandomArrayNode(NodeFunction):
    """Generate random arrays."""
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="numpy",
            node_type="random",
            display_name="Random Array",
            category="NumPy",
            description="Generate random arrays",
            icon="🎲",
            color="#013243",
            inputs=[
                PortDefinition(
                    name="shape",
                    port_type=PortType.ARRAY,
                    description="Shape of the array"
                ),
                PortDefinition(
                    name="distribution",
                    port_type=PortType.STRING,
                    default="uniform",
                    description="Distribution type (uniform, normal, randint)"
                ),
                PortDefinition(
                    name="low",
                    port_type=PortType.NUMBER,
                    required=False,
                    default=0,
                    description="Lower bound (for uniform/randint)"
                ),
                PortDefinition(
                    name="high",
                    port_type=PortType.NUMBER,
                    required=False,
                    default=1,
                    description="Upper bound (for uniform/randint)"
                ),
                PortDefinition(
                    name="mean",
                    port_type=PortType.NUMBER,
                    required=False,
                    default=0,
                    description="Mean (for normal)"
                ),
                PortDefinition(
                    name="std",
                    port_type=PortType.NUMBER,
                    required=False,
                    default=1,
                    description="Standard deviation (for normal)"
                ),
                PortDefinition(
                    name="seed",
                    port_type=PortType.NUMBER,
                    required=False,
                    description="Random seed"
                )
            ],
            outputs=[
                PortDefinition(
                    name="array",
                    port_type=PortType.TENSOR,
                    description="Random array"
                )
            ]
        )
    
    def execute(self, context: NodeContext):
        import numpy as np
        
        shape = context.get_input("shape", [10])
        distribution = context.get_input("distribution", "uniform")
        seed = context.get_input("seed")
        
        if seed is not None:
            np.random.seed(int(seed))
        
        if distribution == "uniform":
            low = context.get_input("low", 0)
            high = context.get_input("high", 1)
            array = np.random.uniform(low, high, shape)
        elif distribution == "normal":
            mean = context.get_input("mean", 0)
            std = context.get_input("std", 1)
            array = np.random.normal(mean, std, shape)
        elif distribution == "randint":
            low = int(context.get_input("low", 0))
            high = int(context.get_input("high", 10))
            array = np.random.randint(low, high, shape)
        else:
            raise ValueError(f"Unknown distribution: {distribution}")
        
        context.set_output("array", array)
        return array


class LinspaceNode(NodeFunction):
    """Create evenly spaced values."""
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="numpy",
            node_type="linspace",
            display_name="Linspace",
            category="NumPy",
            description="Create evenly spaced values",
            icon="📏",
            color="#013243",
            inputs=[
                PortDefinition(
                    name="start",
                    port_type=PortType.NUMBER,
                    default=0,
                    description="Start value"
                ),
                PortDefinition(
                    name="stop",
                    port_type=PortType.NUMBER,
                    default=1,
                    description="Stop value"
                ),
                PortDefinition(
                    name="num",
                    port_type=PortType.NUMBER,
                    default=50,
                    description="Number of samples"
                ),
                PortDefinition(
                    name="endpoint",
                    port_type=PortType.BOOLEAN,
                    default=True,
                    required=False,
                    description="Include endpoint"
                )
            ],
            outputs=[
                PortDefinition(
                    name="array",
                    port_type=PortType.TENSOR,
                    description="Evenly spaced array"
                )
            ]
        )
    
    def execute(self, context: NodeContext):
        import numpy as np
        
        start = context.get_input("start", 0)
        stop = context.get_input("stop", 1)
        num = int(context.get_input("num", 50))
        endpoint = context.get_input("endpoint", True)
        
        array = np.linspace(start, stop, num, endpoint=endpoint)
        context.set_output("array", array)
        
        return array


class NumpyTopping(ToppingBase):
    """NumPy topping providing numerical computation nodes."""
    
    def get_name(self) -> str:
        return "numpy"
    
    def get_version(self) -> str:
        return "1.0.0"
    
    def get_description(self) -> str:
        return "NumPy nodes for numerical computations"
    
    def initialize(self):
        """Register all NumPy nodes."""
        self.register_node(ArrayCreateNode)
        self.register_node(ArrayReshapeNode)
        self.register_node(ArrayOperationNode)
        self.register_node(RandomArrayNode)
        self.register_node(LinspaceNode)


# Export the topping instance
def get_topping() -> ToppingBase:
    """Get the NumPy topping instance."""
    return NumpyTopping()