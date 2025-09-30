"""Tests for the node registry system."""

import pytest
from ramen.registry.node_registry import (
    NodeRegistry,
    NodeDefinition,
    PortDefinition,
    get_global_registry,
    register_node,
    get_node,
)


@pytest.fixture
def registry():
    """Create a fresh registry for each test."""
    reg = NodeRegistry()
    return reg


@pytest.fixture
def sample_node():
    """Create a sample node definition."""
    return NodeDefinition(
        node_id="math.add",
        namespace="math",
        node_type="add",
        display_name="Add",
        category="Math/Basic",
        description="Add two numbers",
        icon="➕",
        color="#4CAF50",
        inputs=[
            PortDefinition(name="a", type="number", required=True),
            PortDefinition(name="b", type="number", required=True),
        ],
        outputs=[
            PortDefinition(name="result", type="number"),
        ],
    )


def test_registry_initialization(registry):
    """Test that registry initializes correctly."""
    assert registry.count() == 0
    assert registry.list_categories() == []
    assert registry.list_namespaces() == []


def test_register_node(registry, sample_node):
    """Test registering a node."""
    registry.register(sample_node)

    assert registry.count() == 1
    assert "math.add" in registry.get_all()
    assert "Math/Basic" in registry.list_categories()
    assert "math" in registry.list_namespaces()


def test_get_node(registry, sample_node):
    """Test getting a node by ID."""
    registry.register(sample_node)

    node = registry.get("math.add")
    assert node is not None
    assert node.display_name == "Add"
    assert node.color == "#4CAF50"


def test_get_nonexistent_node(registry):
    """Test getting a node that doesn't exist."""
    node = registry.get("nonexistent.node")
    assert node is None


def test_unregister_node(registry, sample_node):
    """Test unregistering a node."""
    registry.register(sample_node)
    assert registry.count() == 1

    success = registry.unregister("math.add")
    assert success is True
    assert registry.count() == 0


def test_get_by_category(registry):
    """Test getting nodes by category."""
    node1 = NodeDefinition(
        node_id="math.add",
        namespace="math",
        node_type="add",
        display_name="Add",
        category="Math",
        color="#4CAF50",
    )
    node2 = NodeDefinition(
        node_id="math.subtract",
        namespace="math",
        node_type="subtract",
        display_name="Subtract",
        category="Math",
        color="#F44336",
    )
    node3 = NodeDefinition(
        node_id="string.concat",
        namespace="string",
        node_type="concat",
        display_name="Concatenate",
        category="String",
        color="#FF5722",
    )

    registry.register(node1)
    registry.register(node2)
    registry.register(node3)

    math_nodes = registry.get_by_category("Math")
    assert len(math_nodes) == 2
    assert all(n.category == "Math" for n in math_nodes)


def test_get_by_namespace(registry):
    """Test getting nodes by namespace."""
    node1 = NodeDefinition(
        node_id="math.add",
        namespace="math",
        node_type="add",
        display_name="Add",
        category="Math",
        color="#4CAF50",
    )
    node2 = NodeDefinition(
        node_id="math.subtract",
        namespace="math",
        node_type="subtract",
        display_name="Subtract",
        category="Math",
        color="#F44336",
    )

    registry.register(node1)
    registry.register(node2)

    math_nodes = registry.get_by_namespace("math")
    assert len(math_nodes) == 2
    assert all(n.namespace == "math" for n in math_nodes)


def test_search_by_name(registry):
    """Test searching nodes by name."""
    node1 = NodeDefinition(
        node_id="math.add",
        namespace="math",
        node_type="add",
        display_name="Add Numbers",
        category="Math",
        description="Add two numbers together",
        color="#4CAF50",
    )
    node2 = NodeDefinition(
        node_id="string.concat",
        namespace="string",
        node_type="concat",
        display_name="Concatenate",
        category="String",
        description="Concatenate strings",
        color="#FF5722",
    )

    registry.register(node1)
    registry.register(node2)

    # Search by name
    results = registry.search(query="add")
    assert len(results) == 1
    assert results[0].node_id == "math.add"

    # Search by description
    results = registry.search(query="concatenate")
    assert len(results) == 1
    assert results[0].node_id == "string.concat"


def test_get_grouped_by_category(registry):
    """Test getting nodes grouped by category."""
    node1 = NodeDefinition(
        node_id="math.add",
        namespace="math",
        node_type="add",
        display_name="Add",
        category="Math",
        color="#4CAF50",
    )
    node2 = NodeDefinition(
        node_id="string.concat",
        namespace="string",
        node_type="concat",
        display_name="Concatenate",
        category="String",
        color="#FF5722",
    )

    registry.register(node1)
    registry.register(node2)

    grouped = registry.get_grouped_by_category()
    assert "Math" in grouped
    assert "String" in grouped
    assert len(grouped["Math"]) == 1
    assert len(grouped["String"]) == 1


def test_registry_stats(registry, sample_node):
    """Test getting registry statistics."""
    registry.register(sample_node)

    stats = registry.stats()
    assert stats["total_nodes"] == 1
    assert stats["categories"] == 1
    assert stats["namespaces"] == 1


def test_node_to_dict(sample_node):
    """Test converting node to dictionary."""
    node_dict = sample_node.to_dict()

    assert node_dict["type"] == "math.add"
    assert node_dict["displayName"] == "Add"
    assert node_dict["color"] == "#4CAF50"
    assert len(node_dict["inputs"]) == 2
    assert len(node_dict["outputs"]) == 1


def test_global_registry():
    """Test the global registry singleton."""
    reg1 = get_global_registry()
    reg2 = get_global_registry()

    # Should be the same instance
    assert reg1 is reg2


def test_convenience_functions(sample_node):
    """Test convenience functions."""
    # Clear first to avoid conflicts
    registry = get_global_registry()
    registry.clear()

    # Test register_node
    register_node(sample_node)

    # Test get_node
    node = get_node("math.add")
    assert node is not None
    assert node.display_name == "Add"


def test_clear_registry(registry, sample_node):
    """Test clearing the registry."""
    registry.register(sample_node)
    assert registry.count() == 1

    registry.clear()
    assert registry.count() == 0
    assert registry.list_categories() == []


def test_replace_existing_node(registry):
    """Test replacing an existing node."""
    node1 = NodeDefinition(
        node_id="math.add",
        namespace="math",
        node_type="add",
        display_name="Add v1",
        category="Math",
        color="#4CAF50",
    )
    node2 = NodeDefinition(
        node_id="math.add",
        namespace="math",
        node_type="add",
        display_name="Add v2",
        category="Math",
        color="#FF0000",
    )

    registry.register(node1)
    registry.register(node2)

    # Should only have one node
    assert registry.count() == 1

    # Should be the updated version
    node = registry.get("math.add")
    assert node.display_name == "Add v2"
    assert node.color == "#FF0000"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])