"""Tests for the topping system."""

import pytest
from typing import Any, Dict

from ramen.topping import (
    ToppingBase,
    NodeFunction,
    NodeMetadata,
    NodeContext,
    PortDefinition,
    PortType,
    ToppingLoader,
    ToppingRegistry,
    get_registry
)


class TestNodeFunction(NodeFunction):
    """Test node implementation."""
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="test",
            node_type="add",
            display_name="Test Add",
            category="Test",
            description="Test addition node",
            icon="➕",
            color="#666666",
            inputs=[
                PortDefinition(name="a", port_type=PortType.NUMBER),
                PortDefinition(name="b", port_type=PortType.NUMBER)
            ],
            outputs=[
                PortDefinition(name="result", port_type=PortType.NUMBER)
            ]
        )
    
    def execute(self, context: NodeContext) -> Any:
        a = context.get_input("a", 0)
        b = context.get_input("b", 0)
        result = a + b
        context.set_output("result", result)
        return result


class TestTopping(ToppingBase):
    """Test topping implementation."""
    
    def get_name(self) -> str:
        return "test"
    
    def get_version(self) -> str:
        return "1.0.0"
    
    def get_description(self) -> str:
        return "Test topping"
    
    def initialize(self):
        self.register_node(TestNodeFunction)


def test_node_metadata():
    """Test node metadata creation."""
    metadata = NodeMetadata(
        namespace="test",
        node_type="example",
        display_name="Example Node",
        category="Test"
    )
    
    assert metadata.full_type == "test.example"
    assert metadata.display_name == "Example Node"
    assert metadata.category == "Test"
    assert metadata.color == "#666666"  # Default color


def test_node_context():
    """Test node execution context."""
    context = NodeContext(
        node_id="node_1",
        inputs={"a": 5, "b": 3},
        properties={"operation": "add"}
    )
    
    assert context.get_input("a") == 5
    assert context.get_input("b") == 3
    assert context.get_input("c", 10) == 10  # Default value
    assert context.get_property("operation") == "add"
    
    context.set_output("result", 8)
    assert context.outputs == {"result": 8}


def test_node_execution():
    """Test node execution."""
    node = TestNodeFunction()
    context = NodeContext(
        node_id="node_1",
        inputs={"a": 5, "b": 3},
        properties={}
    )
    
    result = node.execute(context)
    assert result == 8
    assert context.outputs == {"result": 8}


def test_topping_registration():
    """Test topping registration."""
    topping = TestTopping()
    topping.initialize()
    
    nodes = topping.get_nodes()
    assert "test.add" in nodes
    assert nodes["test.add"] == TestNodeFunction
    
    metadata = topping.get_node_metadata()
    assert "test.add" in metadata
    assert metadata["test.add"].display_name == "Test Add"


def test_topping_registry():
    """Test the global topping registry."""
    registry = ToppingRegistry()
    topping = TestTopping()
    topping.initialize()
    
    # Register topping
    registry.register_topping(topping)
    
    # Check topping is registered
    assert registry.get_topping("test") == topping
    assert "test" in registry.get_all_toppings()
    
    # Check nodes are registered
    assert registry.get_node("test.add") == TestNodeFunction
    assert "test.add" in registry.get_all_nodes()
    
    # Check metadata
    metadata = registry.get_node_metadata("test.add")
    assert metadata is not None
    assert metadata.display_name == "Test Add"
    
    # Execute node through registry
    context = NodeContext(
        node_id="node_1",
        inputs={"a": 10, "b": 20},
        properties={}
    )
    result = registry.execute_node("test.add", context)
    assert result == 30
    assert context.outputs == {"result": 30}
    
    # Unregister topping
    registry.unregister_topping("test")
    assert registry.get_topping("test") is None
    assert registry.get_node("test.add") is None


def test_topping_loader():
    """Test topping loader."""
    registry = ToppingRegistry()
    loader = ToppingLoader(registry)
    
    # Test module loading (requires the test topping to be importable)
    # This would normally load from an actual module
    # For now, we'll manually add a topping
    topping = TestTopping()
    topping.initialize()
    registry.register_topping(topping)
    
    assert "test" in registry.get_all_toppings()
    assert "test.add" in registry.get_all_nodes()
    
    # Test unloading
    loader.unload_all()
    assert len(registry.get_all_toppings()) == 0
    assert len(registry.get_all_nodes()) == 0


def test_port_definition():
    """Test port definition."""
    port = PortDefinition(
        name="input",
        port_type=PortType.NUMBER,
        required=True,
        default=0,
        description="Test input"
    )
    
    assert port.name == "input"
    assert port.port_type == PortType.NUMBER
    assert port.required is True
    assert port.default == 0
    assert port.multiple is False


def test_port_types():
    """Test port type enum."""
    assert PortType.ANY.value == "any"
    assert PortType.NUMBER.value == "number"
    assert PortType.STRING.value == "string"
    assert PortType.TENSOR.value == "tensor"
    assert PortType.DATAFRAME.value == "dataframe"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])