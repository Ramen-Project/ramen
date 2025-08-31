"""Tests for new topping API system."""

import unittest
from typing import Dict, Any
from pydantic import BaseModel

# Import from new implementation temporarily for testing
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from ramen.topping.topping_base_new import (
    Node, on, ToppingBase, NodeMetadata, PortDefinition, PortType
)
from ramen.topping.decorators import (
    ramen_node, input_port, output_port, get_simple_node_metadata
)


class TestSimpleAPI(unittest.TestCase):
    """Test simple decorator-based API."""
    
    def test_simple_node_decoration(self):
        """Test basic node decoration works."""
        
        @ramen_node(name="Test Node", category="Testing")
        @input_port("input1", PortType.NUMBER)
        @output_port("output1", PortType.NUMBER)
        def test_function(input1: float) -> dict:
            return {"output1": input1 * 2}
        
        # Check that metadata can be extracted
        metadata = get_simple_node_metadata(test_function)
        self.assertIsNotNone(metadata)
        self.assertEqual(metadata.display_name, "Test Node")
        self.assertEqual(metadata.category, "Testing")
        self.assertEqual(len(metadata.inputs), 1)
        self.assertEqual(len(metadata.outputs), 1)
        
        # Check input port
        input_port = metadata.inputs[0]
        self.assertEqual(input_port.name, "input1")
        self.assertEqual(input_port.port_type, PortType.NUMBER)
        
        # Check output port
        output_port = metadata.outputs[0]
        self.assertEqual(output_port.name, "output1")
        self.assertEqual(output_port.port_type, PortType.NUMBER)
    
    def test_simple_node_execution(self):
        """Test simple node can be executed."""
        
        @ramen_node(name="Calculator", category="Math")
        @input_port("a", PortType.NUMBER)
        @input_port("b", PortType.NUMBER)
        @output_port("result", PortType.NUMBER)
        def calculator(a: float, b: float) -> dict:
            return {"result": a + b}
        
        # Test execution
        result = calculator(5.0, 3.0)
        self.assertEqual(result["result"], 8.0)
    
    def test_multiple_decorators(self):
        """Test multiple input/output ports work correctly."""
        
        @ramen_node(name="Multi IO", category="Testing")
        @input_port("x", PortType.NUMBER, description="X coordinate")
        @input_port("y", PortType.NUMBER, description="Y coordinate")  
        @input_port("z", PortType.NUMBER, default=0.0, description="Z coordinate")
        @output_port("distance", PortType.NUMBER, description="Distance from origin")
        @output_port("coordinates", PortType.ARRAY, description="Coordinate array")
        def multi_io_node(x: float, y: float, z: float = 0.0) -> dict:
            distance = (x*x + y*y + z*z) ** 0.5  # Simple sqrt implementation
            return {
                "distance": distance,
                "coordinates": [x, y, z]
            }
        
        metadata = get_simple_node_metadata(multi_io_node)
        self.assertEqual(len(metadata.inputs), 3)
        self.assertEqual(len(metadata.outputs), 2)
        
        # Test execution
        result = multi_io_node(3.0, 4.0, 0.0)
        self.assertEqual(result["distance"], 5.0)
        self.assertEqual(result["coordinates"], [3.0, 4.0, 0.0])


class TestAdvancedAPI(unittest.TestCase):
    """Test advanced Node(StateClass) API."""
    
    def test_state_class_syntax(self):
        """Test Node(StateClass) syntax works."""
        
        class TestState(BaseModel):
            counter: int = 0
            message: str = "Hello"
            active: bool = True
        
        class TestNode(Node(TestState)):
            def get_metadata(self) -> NodeMetadata:
                return NodeMetadata(
                    namespace="test",
                    node_type="test_node",
                    display_name="Test Node"
                )
        
        # Test instantiation
        node = TestNode()
        self.assertIsInstance(node.state, TestState)
        self.assertEqual(node.state.counter, 0)
        self.assertEqual(node.state.message, "Hello")
        self.assertTrue(node.state.active)
    
    def test_state_modification(self):
        """Test state can be modified with type safety."""
        
        class CounterState(BaseModel):
            count: int = 0
            name: str = "counter"
        
        class CounterNode(Node(CounterState)):
            def get_metadata(self) -> NodeMetadata:
                return NodeMetadata(
                    namespace="test",
                    node_type="counter",
                    display_name="Counter"
                )
            
            def increment(self):
                self.state.count += 1
            
            def set_name(self, name: str):
                self.state.name = name
        
        node = CounterNode()
        
        # Test state modification
        node.increment()
        self.assertEqual(node.state.count, 1)
        
        node.set_name("my_counter")
        self.assertEqual(node.state.name, "my_counter")
    
    def test_event_handlers(self):
        """Test event handler decoration and discovery."""
        
        class EventState(BaseModel):
            last_event: str = ""
            event_count: int = 0
        
        class EventNode(Node(EventState)):
            def get_metadata(self) -> NodeMetadata:
                return NodeMetadata(
                    namespace="test",
                    node_type="event_node",
                    display_name="Event Node"
                )
            
            @on("test_event")
            def handle_test_event(self, event_data: dict):
                self.state.last_event = event_data.get("message", "")
                self.state.event_count += 1
                return "handled"
            
            @on("another_event")
            def handle_another_event(self, event_data: dict):
                return "another handled"
        
        node = EventNode()
        
        # Check that event handlers were discovered
        self.assertIn("test_event", node._event_handlers)
        self.assertIn("another_event", node._event_handlers)
        
        # Test event handling
        result = node.handle_event("test_event", {"message": "hello"})
        self.assertEqual(result, "handled")
        self.assertEqual(node.state.last_event, "hello")
        self.assertEqual(node.state.event_count, 1)
        
        # Test unknown event
        node.handle_event("unknown_event", {})  # Should not crash
    
    def test_pydantic_validation(self):
        """Test Pydantic validation works on state."""
        
        class ValidatedState(BaseModel):
            count: int  # Required
            name: str = "default"
            ratio: float = 1.0
        
        class ValidatedNode(Node(ValidatedState)):
            def get_metadata(self) -> NodeMetadata:
                return NodeMetadata(
                    namespace="test",
                    node_type="validated",
                    display_name="Validated Node"
                )
        
        # Test that required fields must be provided
        with self.assertRaises(TypeError):
            # Should fail because 'count' is required but not provided
            ValidatedState()
        
        # Test valid instantiation
        state = ValidatedState(count=5)
        self.assertEqual(state.count, 5)
        self.assertEqual(state.name, "default")
        
        # Test type validation
        with self.assertRaises(ValueError):
            ValidatedState(count="not_a_number")


class TestBackwardCompatibility(unittest.TestCase):
    """Test backward compatibility with existing system."""
    
    def test_existing_topping_still_works(self):
        """Test that existing ToppingBase subclasses still work."""
        
        from ramen.topping import NodeFunction, NodeContext
        
        class OldStyleNode(NodeFunction):
            def get_metadata(self) -> NodeMetadata:
                return NodeMetadata(
                    namespace="old",
                    node_type="old_node", 
                    display_name="Old Style Node",
                    inputs=[PortDefinition("input", PortType.STRING)],
                    outputs=[PortDefinition("output", PortType.STRING)]
                )
            
            def execute(self, context: NodeContext):
                input_val = context.get_input("input", "")
                context.set_output("output", f"processed: {input_val}")
                return f"processed: {input_val}"
        
        class OldStyleTopping(ToppingBase):
            def get_name(self) -> str:
                return "old_style"
            
            def get_version(self) -> str:
                return "1.0.0"
            
            def get_description(self) -> str:
                return "Old style topping"
            
            def initialize(self):
                self.register_node(OldStyleNode)
        
        # Test that old style still instantiates
        topping = OldStyleTopping()
        topping.initialize()
        
        # Test node can be created
        node = OldStyleNode()
        metadata = node.get_metadata()
        self.assertEqual(metadata.display_name, "Old Style Node")


class TestToppingLoader(unittest.TestCase):
    """Test topping loader with new system."""
    
    def test_loader_discovers_simple_nodes(self):
        """Test that loader can discover simple decorator nodes."""
        from ramen.topping.loader import ToppingLoader
        
        # Create a mock module with decorated functions
        class MockModule:
            __name__ = "test_module"
        
        # Add decorated function to module
        @ramen_node(name="Mock Node", category="Testing")
        @input_port("x", PortType.NUMBER)
        @output_port("y", PortType.NUMBER)
        def mock_function(x: float) -> dict:
            return {"y": x * 2}
        
        # Add to mock module
        MockModule.mock_function = mock_function
        
        loader = ToppingLoader()
        topping = loader._find_simple_nodes_in_module(MockModule)
        
        self.assertIsNotNone(topping)
        self.assertEqual(topping.get_name(), "test_module")


if __name__ == "__main__":
    unittest.main()