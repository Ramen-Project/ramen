"""End-to-end tests for new topping system."""

import unittest
import asyncio
import json
import tempfile
import os
from pathlib import Path
from typing import Dict, Any
from pydantic import BaseModel

from ramen.topping import (
    Node, on, ToppingBase, NodeMetadata, PortDefinition, PortType,
    ramen_node, input_port, output_port, get_simple_node_metadata
)
from ramen.topping.websocket_sync import WebSocketStateManager, get_state_manager
# Component loader removed


class TestEndToEndSimpleAPI(unittest.TestCase):
    """Test complete simple API workflow."""
    
    def test_simple_node_creation_and_execution(self):
        """Test creating and executing a simple node."""
        
        @ramen_node(name="Math Calculator", category="Math", description="Simple math")
        @input_port("a", PortType.NUMBER, description="First number")
        @input_port("b", PortType.NUMBER, description="Second number")
        @input_port("operation", PortType.STRING, default="add", description="Operation")
        @output_port("result", PortType.NUMBER, description="Result")
        def math_calculator(a: float, b: float, operation: str = "add") -> dict:
            operations = {
                "add": lambda x, y: x + y,
                "subtract": lambda x, y: x - y,
                "multiply": lambda x, y: x * y,
                "divide": lambda x, y: x / y if y != 0 else 0
            }
            result = operations.get(operation, operations["add"])(a, b)
            return {"result": result}
        
        # Test metadata extraction
        metadata = get_simple_node_metadata(math_calculator)
        self.assertIsNotNone(metadata)
        self.assertEqual(metadata.display_name, "Math Calculator")
        self.assertEqual(metadata.category, "Math")
        self.assertEqual(len(metadata.inputs), 3)
        self.assertEqual(len(metadata.outputs), 1)
        
        # Validate input ports
        input_names = [p.name for p in metadata.inputs]
        self.assertIn("a", input_names)
        self.assertIn("b", input_names)
        self.assertIn("operation", input_names)
        
        # Validate output ports  
        output_names = [p.name for p in metadata.outputs]
        self.assertIn("result", output_names)
        
        # Test function execution
        result = math_calculator(10, 5, "multiply")
        self.assertEqual(result["result"], 50)
        
        result = math_calculator(10, 3, "divide")
        self.assertAlmostEqual(result["result"], 3.333333333333333)
    
    def test_simple_topping_registration(self):
        """Test registration of simple nodes in a topping."""
        
        @ramen_node(name="String Processor", category="Text")
        @input_port("text", PortType.STRING)
        @output_port("processed", PortType.STRING)
        def string_processor(text: str) -> dict:
            return {"processed": text.upper().strip()}
        
        # Create a mock topping that uses simple nodes
        class SimpleTestTopping(ToppingBase):
            def __init__(self):
                super().__init__()
                
            def get_name(self) -> str:
                return "simple_test"
            
            def get_version(self) -> str:
                return "1.0.0"
            
            def get_description(self) -> str:
                return "Test topping with simple nodes"
            
            def initialize(self):
                # Register the simple node
                metadata = get_simple_node_metadata(string_processor)
                if metadata:
                    self.register_simple_node(string_processor, metadata)
        
        # Test topping initialization
        topping = SimpleTestTopping()
        topping.initialize()
        
        # Verify registration
        metadata_dict = topping.get_node_metadata()
        self.assertEqual(len(metadata_dict), 1)
        
        node_type = "simple.string_processor"
        self.assertIn(node_type, metadata_dict)
        
        registered_metadata = metadata_dict[node_type]
        self.assertEqual(registered_metadata.display_name, "String Processor")


class TestEndToEndAdvancedAPI(unittest.TestCase):
    """Test complete advanced API workflow."""
    
    def test_advanced_node_with_state_and_events(self):
        """Test advanced node with state management and events."""
        
        class CounterState(BaseModel):
            count: int = 0
            last_operation: str = ""
            history: list[int] = []
        
        class AdvancedCounterNode(Node(CounterState)):
            def get_metadata(self) -> NodeMetadata:
                return NodeMetadata(
                    namespace="advanced",
                    node_type="counter",
                    display_name="Advanced Counter",
                    category="Math",
                    description="Counter with history",
                    inputs=[
                        PortDefinition("increment", PortType.NUMBER, default=1),
                    ],
                    outputs=[
                        PortDefinition("current_count", PortType.NUMBER),
                        PortDefinition("history", PortType.ARRAY),
                    ]
                )
            
            @on("increment")
            def handle_increment(self, event_data: dict):
                increment_value = event_data.get("value", 1)
                self.state.count += increment_value
                self.state.last_operation = f"increment by {increment_value}"
                self.state.history.append(self.state.count)
                return {"success": True, "new_count": self.state.count}
            
            @on("reset")
            def handle_reset(self, event_data: dict):
                self.state.count = 0
                self.state.last_operation = "reset"
                self.state.history.clear()
                return {"success": True, "new_count": 0}
            
            @on("execute")
            def handle_execute(self, inputs: dict):
                increment = inputs.get("increment", 1)
                self.handle_increment({"value": increment})
                
                return {
                    "current_count": self.state.count,
                    "history": self.state.history.copy()
                }
        
        # Test node instantiation
        node = AdvancedCounterNode()
        self.assertEqual(node.state.count, 0)
        self.assertEqual(node.state.last_operation, "")
        self.assertEqual(len(node.state.history), 0)
        
        # Test event handling
        result = node.handle_event("increment", {"value": 5})
        self.assertTrue(result["success"])
        self.assertEqual(result["new_count"], 5)
        self.assertEqual(node.state.count, 5)
        self.assertEqual(node.state.last_operation, "increment by 5")
        
        # Test multiple increments
        node.handle_event("increment", {"value": 3})
        node.handle_event("increment", {"value": 2})
        self.assertEqual(node.state.count, 10)
        self.assertEqual(len(node.state.history), 3)
        self.assertEqual(node.state.history, [5, 8, 10])
        
        # Test reset
        reset_result = node.handle_event("reset", {})
        self.assertTrue(reset_result["success"])
        self.assertEqual(node.state.count, 0)
        self.assertEqual(len(node.state.history), 0)
        
        # Test execution
        exec_result = node.handle_event("execute", {"increment": 7})
        self.assertEqual(exec_result["current_count"], 7)
        self.assertEqual(exec_result["history"], [7])
    
    def test_advanced_topping_registration(self):
        """Test registration of advanced nodes in a topping."""
        
        class SimpleState(BaseModel):
            value: str = "default"
        
        class SimpleAdvancedNode(Node(SimpleState)):
            def get_metadata(self) -> NodeMetadata:
                return NodeMetadata(
                    namespace="test",
                    node_type="simple_advanced",
                    display_name="Simple Advanced Node"
                )
            
            @on("test_event")
            def handle_test(self, event_data: dict):
                self.state.value = event_data.get("value", "default")
        
        class AdvancedTestTopping(ToppingBase):
            def get_name(self) -> str:
                return "advanced_test"
            
            def get_version(self) -> str:
                return "1.0.0"
            
            def get_description(self) -> str:
                return "Test topping with advanced nodes"
            
            def initialize(self):
                self.register_node(SimpleAdvancedNode)
        
        # Test topping
        topping = AdvancedTestTopping()
        topping.initialize()
        
        # Verify registration
        nodes = topping.get_nodes()
        metadata_dict = topping.get_node_metadata()
        
        self.assertEqual(len(nodes), 1)
        self.assertEqual(len(metadata_dict), 1)
        
        node_type = "test.simple_advanced"
        self.assertIn(node_type, nodes)
        self.assertIn(node_type, metadata_dict)


class TestWebSocketStateSync(unittest.TestCase):
    """Test WebSocket state synchronization."""
    
    def test_state_manager_registration(self):
        """Test node registration with state manager."""
        
        class TestState(BaseModel):
            counter: int = 0
            message: str = "hello"
        
        class TestNode(Node(TestState)):
            def get_metadata(self) -> NodeMetadata:
                return NodeMetadata(
                    namespace="test",
                    node_type="websocket_test",
                    display_name="WebSocket Test Node"
                )
            
            @on("update")
            def handle_update(self, event_data: dict):
                self.state.counter += 1
                self.state.message = event_data.get("message", "no message")
        
        # Create state manager and register node
        state_manager = WebSocketStateManager()
        node = TestNode()
        node_id = "test_node_123"
        
        state_manager.register_node(node_id, node)
        
        # Verify registration
        self.assertIn(node_id, state_manager.node_managers)
        
        manager = state_manager.node_managers[node_id]
        self.assertIsNotNone(manager.node_instance)
        self.assertEqual(manager.node_id, node_id)


# Component loader tests removed


if __name__ == "__main__":
    # Run tests
    unittest.main()