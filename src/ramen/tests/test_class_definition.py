"""Test the class definition system."""

import unittest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from topping.class_definition import (
    ClassDefinitionNode, ClassMetadata, ClassType,
    PropertyDefinition, MethodDefinition, NodeContext,
    class_registry
)
from topping.pytorch_module_definition import (
    PyTorchModuleDefinition, LayerDefinition, ConnectionDefinition
)
from topping.pydantic_model_definition import (
    PydanticModelDefinition, FieldDefinition, FieldType, ValidatorDefinition
)


class TestClassDefinition(unittest.TestCase):
    """Test the base class definition system."""
    
    def test_simple_class_definition(self):
        """Test creating a simple class definition."""
        
        class SimpleClassDef(ClassDefinitionNode):
            def build_class_metadata(self) -> ClassMetadata:
                return ClassMetadata(
                    class_name="SimpleClass",
                    class_type=ClassType.GENERIC,
                    namespace="test",
                    properties=[
                        PropertyDefinition("name", "str", "unnamed", False),
                        PropertyDefinition("value", "int", 0, False)
                    ],
                    methods=[
                        MethodDefinition(
                            name="get_info",
                            return_type="str",
                            body='return f"{self.name}: {self.value}"'
                        )
                    ]
                )
        
        # Create definition
        definition = SimpleClassDef()
        metadata = definition.get_metadata()
        
        # Check metadata
        self.assertEqual(metadata.node_type, "SimpleClass_Definition")
        self.assertEqual(metadata.namespace, "test")
        self.assertEqual(len(metadata.inputs), 2)
        
        # Execute to create instance
        context = NodeContext("test_node", {"name": "test", "value": 42}, {})
        instance = definition.execute(context)
        
        # Check instance
        self.assertIsNotNone(instance)
        self.assertEqual(instance.name, "test")
        self.assertEqual(instance.value, 42)
        self.assertEqual(instance.get_info(), "test: 42")
    
    def test_pytorch_module_definition(self):
        """Test PyTorch module definition."""
        
        # Create a simple CNN module
        module_def = PyTorchModuleDefinition("SimpleCNN", "models")
        
        # Add layers
        module_def.add_layer(LayerDefinition(
            layer_type="Conv2d",
            name="conv1",
            parameters={"in_channels": 3, "out_channels": 64, "kernel_size": 3}
        ))
        module_def.add_layer(LayerDefinition(
            layer_type="ReLU",
            name="relu1",
            parameters={"inplace": True}
        ))
        module_def.add_layer(LayerDefinition(
            layer_type="MaxPool2d",
            name="pool1",
            parameters={"kernel_size": 2}
        ))
        
        # Add connections
        module_def.add_connection(ConnectionDefinition("conv1", "relu1"))
        module_def.add_connection(ConnectionDefinition("relu1", "pool1"))
        
        # Build metadata
        metadata = module_def.build_class_metadata()
        
        # Check metadata
        self.assertEqual(metadata.class_name, "SimpleCNN")
        self.assertEqual(metadata.class_type, ClassType.PYTORCH_MODULE)
        self.assertEqual(len(metadata.base_classes), 1)
        self.assertEqual(metadata.base_classes[0], "nn.Module")
        
        # Check generated code
        code = module_def.generate_class_code()
        self.assertIn("class SimpleCNN(nn.Module):", code)
        self.assertIn("self.conv1 = nn.Conv2d", code)
        self.assertIn("def forward(self, x)", code)  # Check without return type
    
    def test_pydantic_model_definition(self):
        """Test Pydantic model definition."""
        
        # Create a user model
        model_def = PydanticModelDefinition("User", "models")
        
        # Add fields
        model_def.add_field(FieldDefinition(
            name="id",
            field_type=FieldType.INTEGER,
            required=True,
            description="User ID"
        ))
        model_def.add_field(FieldDefinition(
            name="email",
            field_type=FieldType.EMAIL,
            required=True,
            description="Email address"
        ))
        model_def.add_field(FieldDefinition(
            name="age",
            field_type=FieldType.INTEGER,
            required=False,
            gt=0,
            le=120,
            description="User age"
        ))
        
        # Add validator
        model_def.add_validator(ValidatorDefinition(
            name="age_check",
            fields=["age"],
            body="if v and v < 18:\n    raise ValueError('Must be 18 or older')\nreturn v"
        ))
        
        # Build metadata
        metadata = model_def.build_class_metadata()
        
        # Check metadata
        self.assertEqual(metadata.class_name, "User")
        self.assertEqual(metadata.class_type, ClassType.PYDANTIC_MODEL)
        self.assertEqual(len(metadata.properties), 3)
        self.assertEqual(len(metadata.methods), 4)  # validator + 3 utility methods
        
        # Check generated code
        code = model_def.generate_class_code()
        self.assertIn("class User(BaseModel):", code)
        self.assertIn("email: EmailStr", code)
        self.assertIn("@validator", code)
        self.assertIn("def validate_age_check", code)
    
    def test_class_registry(self):
        """Test the class registry system."""
        
        class TestClassDef(ClassDefinitionNode):
            def build_class_metadata(self) -> ClassMetadata:
                return ClassMetadata(
                    class_name="TestClass",
                    class_type=ClassType.GENERIC,
                    namespace="test"
                )
        
        # Register definition
        definition = TestClassDef()
        class_registry.register_definition(definition)
        
        # Check registration
        self.assertIn("test.TestClass", class_registry.list_definitions())
        
        # Get definition back
        retrieved_def = class_registry.get_definition("test.TestClass")
        self.assertIsNotNone(retrieved_def)
        self.assertIsInstance(retrieved_def, TestClassDef)
        
        # Check instance node type
        instance_type = class_registry.get_instance_node_type("test.TestClass")
        self.assertIsNotNone(instance_type)


class TestNeuralNetworkBuilder(unittest.TestCase):
    """Test the neural network builder topping."""
    
    def test_nn_builder_topping(self):
        """Test loading the neural network builder topping."""
        try:
            from ramen_topping_nn_builder import get_topping, Conv2dNode
            
            # Get topping
            topping = get_topping()
            self.assertEqual(topping.get_name(), "Neural Network Builder")
            
            # Check registered nodes
            nodes = topping.get_nodes()
            self.assertIn("nn.layers.Conv2d", nodes)
            self.assertIn("nn.layers.Linear", nodes)
            self.assertIn("nn.layers.LSTM", nodes)
            
            # Test Conv2d node
            conv_node = Conv2dNode()
            metadata = conv_node.get_metadata()
            self.assertEqual(metadata.node_type, "Conv2d")
            self.assertEqual(metadata.category, "Convolutional")
            
            # Execute Conv2d node
            context = NodeContext(
                "conv_test",
                {"in_channels": 3, "out_channels": 64, "kernel_size": 3},
                {}
            )
            result = conv_node.execute(context)
            
            self.assertEqual(result["type"], "Conv2d")
            self.assertEqual(result["params"]["in_channels"], 3)
            self.assertEqual(result["params"]["out_channels"], 64)
            
        except ImportError as e:
            self.skipTest(f"Neural network builder topping not available: {e}")


if __name__ == "__main__":
    unittest.main()