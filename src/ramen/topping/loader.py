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
        
        # Register all nodes from the topping (both advanced and simple)
        nodes = topping.get_nodes()
        metadata = topping.get_node_metadata()
        
        for full_type, node_class in nodes.items():
            self._nodes[full_type] = node_class
            self._metadata[full_type] = metadata[full_type]
            self._node_to_topping[full_type] = name
            logger.debug(f"Registered node {full_type} from topping {name}")
            
        # Also register simple nodes if available
        if hasattr(topping, '_simple_nodes'):
            for full_type, func in topping._simple_nodes.items():
                # Create a wrapper NodeFunction for simple functions
                class SimpleNodeWrapper(NodeFunction):
                    def __init__(self, func, metadata):
                        self.func = func
                        self.metadata_obj = metadata
                        
                    def execute(self, context: NodeContext) -> Any:
                        return self.func(context)
                        
                    def get_metadata(self) -> NodeMetadata:
                        return self.metadata_obj
                
                if full_type in metadata:
                    self._nodes[full_type] = SimpleNodeWrapper(func, metadata[full_type])
                    self._metadata[full_type] = metadata[full_type]
                    self._node_to_topping[full_type] = name
                    logger.debug(f"Registered simple node {full_type} from topping {name}")
            
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
        
        # Look for simple decorator-based nodes
        simple_topping = self._find_simple_nodes_in_module(module)
        if simple_topping:
            return simple_topping
                    
        return None
    
    def _find_simple_nodes_in_module(self, module) -> Optional[ToppingBase]:
        """Find simple decorator-based nodes in a module and create a topping."""
        from .decorators import get_simple_node_metadata
        
        simple_functions = []
        for name in dir(module):
            obj = getattr(module, name)
            if callable(obj) and hasattr(obj, '_ramen_node_builder'):
                simple_functions.append(obj)
        
        if not simple_functions:
            return None
        
        # Create a dynamic topping for simple functions
        class SimpleFunctionTopping(ToppingBase):
            def __init__(self, functions):
                super().__init__()
                self.functions = functions
                
            def get_name(self) -> str:
                return getattr(module, '__name__', 'simple_functions')
            
            def get_version(self) -> str:
                return "1.0.0"
            
            def get_description(self) -> str:
                return f"Simple decorator-based nodes from {module.__name__}"
            
            def initialize(self):
                """Register all simple functions as nodes."""
                for func in self.functions:
                    metadata = get_simple_node_metadata(func)
                    if metadata:
                        self.register_simple_node(func, metadata)
        
        return SimpleFunctionTopping(simple_functions)
        
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


# Global loader instance
_global_loader = None

# Convenience functions
def load_toppings() -> ToppingLoader:
    """Load all available toppings. Uses singleton pattern to avoid duplicate loading."""
    global _global_loader
    
    if _global_loader is not None:
        return _global_loader
        
    logger.info("Initializing topping loader...")
    _global_loader = ToppingLoader()
    
    # Load built-in nodes topping first
    try:
        from ..toppings.builtin_topping import get_topping as get_builtin_topping
        builtin_topping = get_builtin_topping()
        builtin_topping.initialize()
        _global_loader.registry.register_topping(builtin_topping)
        logger.info("Loaded built-in nodes topping")
    except Exception as e:
        logger.error(f"Failed to load built-in nodes topping: {e}")
    
    # Load from entry points
    _global_loader.load_from_entry_points()
    
    # External toppings are disabled to keep core system lightweight
    # Users can manually install and load external toppings if needed
    # via pip/uv install ramen-topping-* and manual loading
    
    # Skip loading external standard toppings by default
    # This reduces startup time and eliminates error messages
    logger.info("External toppings disabled - using built-in nodes only")
            
    return _global_loader


def get_registry() -> ToppingRegistry:
    """Get the global registry."""
    return REGISTRY