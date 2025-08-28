"""Topping loader and registry."""

import importlib
import importlib.metadata
import logging
from typing import Dict, List, Optional, Type, Any
from pathlib import Path

from .topping_base import ToppingBase, NodeFunction, NodeMetadata, NodeContext


logger = logging.getLogger(__name__)


class ToppingRegistry:
    """Global topping and node registry."""
    
    def __init__(self):
        self._toppings: Dict[str, ToppingBase] = {}
        self._nodes: Dict[str, Type[NodeFunction]] = {}
        self._metadata: Dict[str, NodeMetadata] = {}
        self._node_to_topping: Dict[str, str] = {}
        
    def register_topping(self, topping: ToppingBase) -> None:
        """Register a topping."""
        name = topping.get_name()
        if name in self._toppings:
            logger.warning(f"Topping {name} is already registered, replacing")
            
        self._toppings[name] = topping
        
        # Register all nodes from the topping
        for full_type, node_class in topping.get_nodes().items():
            self._nodes[full_type] = node_class
            self._metadata[full_type] = topping.get_node_metadata()[full_type]
            self._node_to_topping[full_type] = name
            logger.debug(f"Registered node {full_type} from topping {name}")
            
    def unregister_topping(self, name: str) -> None:
        """Unregister a topping and its nodes."""
        if name not in self._toppings:
            return
            
        # Clean up the topping
        topping = self._toppings[name]
        topping.cleanup()
        
        # Remove all nodes from this topping
        nodes_to_remove = [node for node, t in self._node_to_topping.items() if t == name]
        for node in nodes_to_remove:
            del self._nodes[node]
            del self._metadata[node]
            del self._node_to_topping[node]
            
        del self._toppings[name]
        logger.info(f"Unregistered topping {name}")
        
    def get_topping(self, name: str) -> Optional[ToppingBase]:
        """Get a registered topping."""
        return self._toppings.get(name)
        
    def get_all_toppings(self) -> Dict[str, ToppingBase]:
        """Get all registered toppings."""
        return self._toppings.copy()
        
    def get_node(self, full_type: str) -> Optional[Type[NodeFunction]]:
        """Get a node class by its full type."""
        return self._nodes.get(full_type)
        
    def get_node_metadata(self, full_type: str) -> Optional[NodeMetadata]:
        """Get node metadata."""
        return self._metadata.get(full_type)
        
    def get_all_nodes(self) -> Dict[str, Type[NodeFunction]]:
        """Get all registered nodes."""
        return self._nodes.copy()
        
    def get_all_metadata(self) -> Dict[str, NodeMetadata]:
        """Get all node metadata."""
        return self._metadata.copy()
        
    def execute_node(self, full_type: str, context: NodeContext) -> Any:
        """Execute a node."""
        node_class = self.get_node(full_type)
        if not node_class:
            raise ValueError(f"Node type {full_type} not found")
            
        node = node_class()
        return node.execute(context)


# Global registry instance
REGISTRY = ToppingRegistry()


class ToppingLoader:
    """Loads and manages toppings."""
    
    def __init__(self, registry: Optional[ToppingRegistry] = None):
        self.registry = registry or REGISTRY
        self._loaded_modules: Dict[str, Any] = {}
        
    def load_from_entry_points(self, group: str = "ramen.toppings") -> List[str]:
        """Load toppings from Python entry points."""
        loaded = []
        
        try:
            # Get all entry points in the group
            if hasattr(importlib.metadata, 'entry_points'):
                eps = importlib.metadata.entry_points()
                if hasattr(eps, 'select'):
                    # Python 3.10+
                    group_eps = eps.select(group=group)
                else:
                    # Python 3.8-3.9
                    group_eps = eps.get(group, [])
            else:
                # Fallback for older Python
                group_eps = []
                
            for ep in group_eps:
                try:
                    self.load_from_entry_point(ep)
                    loaded.append(ep.name)
                    logger.info(f"Loaded topping {ep.name} from entry point")
                except Exception as e:
                    logger.error(f"Failed to load topping {ep.name}: {e}")
                    
        except Exception as e:
            logger.error(f"Failed to load entry points: {e}")
            
        return loaded
        
    def load_from_entry_point(self, entry_point) -> None:
        """Load a single topping from an entry point."""
        # Load the module
        module = entry_point.load()
        
        # Find and instantiate the topping class
        topping = self._find_topping_in_module(module)
        if topping:
            topping.initialize()
            self.registry.register_topping(topping)
            self._loaded_modules[entry_point.name] = module
            
    def load_from_module(self, module_name: str) -> None:
        """Load a topping from a module name."""
        try:
            module = importlib.import_module(module_name)
            topping = self._find_topping_in_module(module)
            if topping:
                topping.initialize()
                self.registry.register_topping(topping)
                self._loaded_modules[module_name] = module
                logger.info(f"Loaded topping from module {module_name}")
            else:
                logger.warning(f"No topping found in module {module_name}")
        except ImportError as e:
            logger.error(f"Failed to import module {module_name}: {e}")
            raise
            
    def load_from_path(self, path: Path) -> None:
        """Load a topping from a file path."""
        import sys
        import importlib.util
        
        path = Path(path)
        if path.is_dir():
            # Look for __init__.py
            init_path = path / "__init__.py"
            if not init_path.exists():
                raise FileNotFoundError(f"No __init__.py found in {path}")
            path = init_path
            
        # Load the module from file
        spec = importlib.util.spec_from_file_location("custom_topping", path)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            sys.modules[spec.name] = module
            spec.loader.exec_module(module)
            
            topping = self._find_topping_in_module(module)
            if topping:
                topping.initialize()
                self.registry.register_topping(topping)
                self._loaded_modules[str(path)] = module
                logger.info(f"Loaded topping from path {path}")
            else:
                logger.warning(f"No topping found in {path}")
                
    def _find_topping_in_module(self, module) -> Optional[ToppingBase]:
        """Find a ToppingBase subclass in a module."""
        # Look for a get_topping() function first
        if hasattr(module, 'get_topping'):
            topping = module.get_topping()
            if isinstance(topping, ToppingBase):
                return topping
                
        # Look for ToppingBase subclasses
        for name in dir(module):
            obj = getattr(module, name)
            if (
                isinstance(obj, type) and
                issubclass(obj, ToppingBase) and
                obj is not ToppingBase
            ):
                try:
                    return obj()
                except Exception as e:
                    logger.error(f"Failed to instantiate topping {name}: {e}")
                    
        return None
        
    def discover_toppings(self, search_paths: Optional[List[Path]] = None) -> List[str]:
        """Discover available toppings in search paths."""
        discovered = []
        
        # Default search paths
        if not search_paths:
            search_paths = [
                Path.cwd() / "toppings",
                Path.home() / ".ramen" / "toppings"
            ]
            
        for search_path in search_paths:
            if not search_path.exists():
                continue
                
            # Look for topping directories
            for item in search_path.iterdir():
                if item.is_dir() and item.name.startswith("ramen-topping-"):
                    discovered.append(str(item))
                    
        return discovered
        
    def unload_all(self) -> None:
        """Unload all toppings."""
        for name in list(self.registry.get_all_toppings().keys()):
            self.registry.unregister_topping(name)
        self._loaded_modules.clear()


# Convenience functions
def load_toppings() -> ToppingLoader:
    """Load all available toppings."""
    loader = ToppingLoader()
    
    # Load from entry points
    loader.load_from_entry_points()
    
    # Try to load standard toppings
    standard_toppings = [
        "ramen_topping_numpy",
        "ramen_topping_pandas",
        "ramen_topping_torch",
        "ramen_topping_plots"
    ]
    
    for topping in standard_toppings:
        try:
            loader.load_from_module(topping)
        except Exception:
            pass  # Topping not available
            
    return loader


def get_registry() -> ToppingRegistry:
    """Get the global registry."""
    return REGISTRY