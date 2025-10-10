"""
Type converter registry for automatic type conversion between nodes.

This module provides a global registry for type converters that allows:
1. Dynamic registration of type conversion functions
2. Query available converters for any source/target type pair
3. Plugin-extensible type conversion system
"""

from typing import Dict, Optional, Tuple


class TypeConverterRegistry:
    """Global type converter registry supporting dynamic registration from plugins."""

    def __init__(self):
        # Maps (source_type, target_type) -> converter_node_full_type
        self._converters: Dict[Tuple[str, str], str] = {}

    def register(self, source_type: str, target_type: str, converter_node_type: str) -> None:
        """
        Register a type converter.

        Args:
            source_type: Source port type (e.g., "any", "string", "number")
            target_type: Target port type (e.g., "string", "number", "boolean")
            converter_node_type: Full node type of converter (e.g., "type.to_string")

        Example:
            registry.register("any", "string", "type.to_string")
        """
        key = (source_type, target_type)
        if key in self._converters:
            # Log warning but allow override (last registration wins)
            print(f"Warning: Overriding existing converter {source_type} -> {target_type}")

        self._converters[key] = converter_node_type
        print(f"Registered type converter: {source_type} -> {target_type} via {converter_node_type}")

    def find_converter(self, source_type: str, target_type: str) -> Optional[str]:
        """
        Find a type converter for the given source and target types.

        Args:
            source_type: Source port type
            target_type: Target port type

        Returns:
            Full node type of converter, or None if no converter exists

        Example:
            converter = registry.find_converter("any", "string")
            # Returns "type.to_string"
        """
        # Same type - no conversion needed
        if source_type == target_type:
            return None

        # Exact match
        if (source_type, target_type) in self._converters:
            return self._converters[(source_type, target_type)]

        # ANY can convert to specific types
        if source_type == "any" and ("any", target_type) in self._converters:
            return self._converters[("any", target_type)]

        # Specific type can convert to ANY (rarely needed but supported)
        if target_type == "any" and (source_type, "any") in self._converters:
            return self._converters[(source_type, "any")]

        return None

    def get_all_converters(self) -> Dict[str, Dict[str, str]]:
        """
        Get all registered converters in a nested dictionary format.

        Returns:
            Dictionary mapping source_type -> target_type -> converter_node_type

        Example:
            {
                "any": {
                    "string": "type.to_string",
                    "number": "type.to_number"
                },
                "string": {
                    "number": "type.to_number"
                }
            }
        """
        result: Dict[str, Dict[str, str]] = {}

        for (src, tgt), converter in self._converters.items():
            if src not in result:
                result[src] = {}
            result[src][tgt] = converter

        return result

    def clear(self) -> None:
        """Clear all registered converters. Mainly for testing."""
        self._converters.clear()

    def count(self) -> int:
        """Return the number of registered converters."""
        return len(self._converters)


# Global singleton instance
_type_converter_registry = TypeConverterRegistry()


def get_type_converter_registry() -> TypeConverterRegistry:
    """
    Get the global type converter registry instance.

    Returns:
        The global TypeConverterRegistry singleton
    """
    return _type_converter_registry
