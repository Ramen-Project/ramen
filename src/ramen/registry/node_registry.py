"""Central Node Registry for Ramen.

This module provides a centralized registry for all nodes in the system,
including built-in nodes and nodes from external toppings.
"""

import logging
from typing import Dict, List, Optional, Any, Callable, Set
from dataclasses import dataclass, field, asdict
from threading import Lock
from collections import defaultdict

logger = logging.getLogger(__name__)


@dataclass
class PortDefinition:
    """Definition of a node port."""
    name: str
    type: str
    required: bool = True
    default: Any = None
    description: str = ""
    multiple: bool = False

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class NodeDefinition:
    """Complete definition of a node."""
    # Core identification
    node_id: str  # Full qualified name (e.g., "core.add", "math.multiply")
    namespace: str  # Namespace (e.g., "core", "math")
    node_type: str  # Node type within namespace (e.g., "add", "multiply")
    display_name: str  # Human-readable name

    # Metadata
    category: str  # Category for organization (e.g., "Math/Basic", "Core/IO")
    description: str = ""
    icon: str = "📦"
    color: str = "#666666"

    # Port definitions
    inputs: List[PortDefinition] = field(default_factory=list)
    outputs: List[PortDefinition] = field(default_factory=list)

    # Additional properties
    properties: Dict[str, Any] = field(default_factory=dict)
    tags: Set[str] = field(default_factory=set)

    # Source information
    source_topping: Optional[str] = None  # Which topping provides this node

    # Execution function
    executor: Optional[Callable] = None  # The actual function to execute

    def to_dict(self, include_executor: bool = False) -> Dict[str, Any]:
        """Convert to dictionary format for API responses.

        Args:
            include_executor: Whether to include the executor function (default: False)
        """
        data = {
            "type": self.node_id,
            "namespace": self.namespace,
            "nodeType": self.node_type,
            "displayName": self.display_name,
            "category": self.category,
            "description": self.description,
            "icon": self.icon,
            "color": self.color,
            "inputs": [port.to_dict() for port in self.inputs],
            "outputs": [port.to_dict() for port in self.outputs],
            "properties": self.properties,
            "tags": list(self.tags),
        }

        if self.source_topping:
            data["sourceTopping"] = self.source_topping

        if include_executor and self.executor:
            data["executor"] = self.executor

        return data


class NodeRegistry:
    """Central registry for all nodes in the system.

    This registry maintains a complete index of all available nodes,
    including their metadata, categorization, and execution functions.

    Thread-safe for concurrent access.
    """

    def __init__(self):
        """Initialize the registry."""
        self._nodes: Dict[str, NodeDefinition] = {}
        self._by_category: Dict[str, List[str]] = defaultdict(list)
        self._by_namespace: Dict[str, List[str]] = defaultdict(list)
        self._by_topping: Dict[str, List[str]] = defaultdict(list)
        self._lock = Lock()

        logger.info("Initialized NodeRegistry")

    def register(self, node_def: NodeDefinition) -> None:
        """Register a node in the registry.

        Args:
            node_def: The node definition to register

        Raises:
            ValueError: If node_id is invalid or already registered
        """
        if not node_def.node_id:
            raise ValueError("Node definition must have a node_id")

        with self._lock:
            if node_def.node_id in self._nodes:
                logger.warning(f"Node {node_def.node_id} already registered, replacing")

            # Store the node
            self._nodes[node_def.node_id] = node_def

            # Update indices
            self._by_category[node_def.category].append(node_def.node_id)
            self._by_namespace[node_def.namespace].append(node_def.node_id)

            if node_def.source_topping:
                self._by_topping[node_def.source_topping].append(node_def.node_id)

            logger.debug(f"Registered node: {node_def.node_id} (category: {node_def.category})")

    def unregister(self, node_id: str) -> bool:
        """Unregister a node from the registry.

        Args:
            node_id: The full node ID to unregister

        Returns:
            True if node was unregistered, False if not found
        """
        with self._lock:
            if node_id not in self._nodes:
                return False

            node_def = self._nodes[node_id]

            # Remove from indices
            if node_def.category in self._by_category:
                self._by_category[node_def.category].remove(node_id)
                if not self._by_category[node_def.category]:
                    del self._by_category[node_def.category]

            if node_def.namespace in self._by_namespace:
                self._by_namespace[node_def.namespace].remove(node_id)
                if not self._by_namespace[node_def.namespace]:
                    del self._by_namespace[node_def.namespace]

            if node_def.source_topping and node_def.source_topping in self._by_topping:
                self._by_topping[node_def.source_topping].remove(node_id)
                if not self._by_topping[node_def.source_topping]:
                    del self._by_topping[node_def.source_topping]

            # Remove the node
            del self._nodes[node_id]

            logger.info(f"Unregistered node: {node_id}")
            return True

    def get(self, node_id: str) -> Optional[NodeDefinition]:
        """Get a node definition by ID.

        Args:
            node_id: The full node ID

        Returns:
            NodeDefinition if found, None otherwise
        """
        return self._nodes.get(node_id)

    def get_all(self) -> Dict[str, NodeDefinition]:
        """Get all registered nodes.

        Returns:
            Dictionary mapping node IDs to their definitions
        """
        with self._lock:
            return self._nodes.copy()

    def get_by_category(self, category: str) -> List[NodeDefinition]:
        """Get all nodes in a specific category.

        Args:
            category: The category name

        Returns:
            List of node definitions in that category
        """
        node_ids = self._by_category.get(category, [])
        return [self._nodes[node_id] for node_id in node_ids if node_id in self._nodes]

    def get_by_namespace(self, namespace: str) -> List[NodeDefinition]:
        """Get all nodes in a specific namespace.

        Args:
            namespace: The namespace name

        Returns:
            List of node definitions in that namespace
        """
        node_ids = self._by_namespace.get(namespace, [])
        return [self._nodes[node_id] for node_id in node_ids if node_id in self._nodes]

    def get_by_topping(self, topping: str) -> List[NodeDefinition]:
        """Get all nodes from a specific topping.

        Args:
            topping: The topping name

        Returns:
            List of node definitions from that topping
        """
        node_ids = self._by_topping.get(topping, [])
        return [self._nodes[node_id] for node_id in node_ids if node_id in self._nodes]

    def list_categories(self) -> List[str]:
        """Get all available categories.

        Returns:
            Sorted list of category names
        """
        return sorted(self._by_category.keys())

    def list_namespaces(self) -> List[str]:
        """Get all available namespaces.

        Returns:
            Sorted list of namespace names
        """
        return sorted(self._by_namespace.keys())

    def list_toppings(self) -> List[str]:
        """Get all toppings that have registered nodes.

        Returns:
            Sorted list of topping names
        """
        return sorted(self._by_topping.keys())

    def search(self,
               query: str = "",
               category: Optional[str] = None,
               namespace: Optional[str] = None,
               tags: Optional[Set[str]] = None) -> List[NodeDefinition]:
        """Search for nodes matching criteria.

        Args:
            query: Search query for name/description (case-insensitive)
            category: Filter by category
            namespace: Filter by namespace
            tags: Filter by tags (node must have all specified tags)

        Returns:
            List of matching node definitions
        """
        results = []
        query_lower = str(query).lower() if query else ""

        with self._lock:
            for node_def in self._nodes.values():
                # Filter by category
                if category and node_def.category != category:
                    continue

                # Filter by namespace
                if namespace and node_def.namespace != namespace:
                    continue

                # Filter by tags
                if tags and not tags.issubset(node_def.tags):
                    continue

                # Filter by query
                if query:
                    searchable = f"{node_def.display_name} {node_def.description} {node_def.node_id}".lower()
                    if query_lower not in searchable:
                        continue

                results.append(node_def)

        return results

    def get_grouped_by_category(self) -> Dict[str, List[NodeDefinition]]:
        """Get all nodes grouped by category.

        Returns:
            Dictionary mapping categories to lists of node definitions
        """
        grouped = {}
        for category in self.list_categories():
            grouped[category] = self.get_by_category(category)
        return grouped

    def clear(self) -> None:
        """Clear all nodes from the registry."""
        with self._lock:
            self._nodes.clear()
            self._by_category.clear()
            self._by_namespace.clear()
            self._by_topping.clear()
            logger.info("Cleared all nodes from registry")

    def count(self) -> int:
        """Get the total number of registered nodes.

        Returns:
            Number of nodes in registry
        """
        return len(self._nodes)

    def stats(self) -> Dict[str, Any]:
        """Get statistics about the registry.

        Returns:
            Dictionary with registry statistics
        """
        return {
            "total_nodes": self.count(),
            "categories": len(self._by_category),
            "namespaces": len(self._by_namespace),
            "toppings": len(self._by_topping),
            "nodes_per_category": {cat: len(nodes) for cat, nodes in self._by_category.items()},
            "nodes_per_namespace": {ns: len(nodes) for ns, nodes in self._by_namespace.items()},
        }


# Global registry instance
_global_registry: Optional[NodeRegistry] = None
_registry_lock = Lock()


def get_global_registry() -> NodeRegistry:
    """Get the global node registry instance (singleton).

    Returns:
        The global NodeRegistry instance
    """
    global _global_registry

    if _global_registry is None:
        with _registry_lock:
            if _global_registry is None:
                _global_registry = NodeRegistry()

    return _global_registry


# Convenience functions for working with the global registry

def register_node(node_def: NodeDefinition) -> None:
    """Register a node in the global registry.

    Args:
        node_def: The node definition to register
    """
    get_global_registry().register(node_def)


def get_node(node_id: str) -> Optional[NodeDefinition]:
    """Get a node from the global registry.

    Args:
        node_id: The full node ID

    Returns:
        NodeDefinition if found, None otherwise
    """
    return get_global_registry().get(node_id)


def get_all_nodes() -> Dict[str, NodeDefinition]:
    """Get all nodes from the global registry.

    Returns:
        Dictionary mapping node IDs to their definitions
    """
    return get_global_registry().get_all()


def list_categories() -> List[str]:
    """Get all categories from the global registry.

    Returns:
        Sorted list of category names
    """
    return get_global_registry().list_categories()