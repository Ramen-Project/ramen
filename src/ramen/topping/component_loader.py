"""Frontend component loading mechanism for advanced toppings."""

import os
import json
import hashlib
from pathlib import Path
from typing import Dict, Optional, Set, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class ComponentInfo:
    """Information about a frontend component."""
    component_name: str
    component_path: str
    dependencies: list[str]
    hash: str
    last_modified: float


class ComponentRegistry:
    """Registry for frontend components."""
    
    def __init__(self, components_dir: Path = None):
        self.components_dir = components_dir or Path.cwd() / "frontend_components"
        self.components_dir.mkdir(exist_ok=True)
        self.registry: Dict[str, ComponentInfo] = {}
        self._load_registry()
    
    def _load_registry(self):
        """Load component registry from disk."""
        registry_file = self.components_dir / "registry.json"
        if registry_file.exists():
            try:
                with open(registry_file, 'r') as f:
                    data = json.load(f)
                    for name, info in data.items():
                        self.registry[name] = ComponentInfo(**info)
            except Exception as e:
                logger.error(f"Failed to load component registry: {e}")
    
    def _save_registry(self):
        """Save component registry to disk."""
        registry_file = self.components_dir / "registry.json"
        try:
            data = {
                name: {
                    "component_name": info.component_name,
                    "component_path": info.component_path,
                    "dependencies": info.dependencies,
                    "hash": info.hash,
                    "last_modified": info.last_modified
                }
                for name, info in self.registry.items()
            }
            with open(registry_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save component registry: {e}")
    
    def register_component(
        self,
        component_name: str,
        component_path: str,
        dependencies: list[str] = None
    ) -> bool:
        """Register a new component."""
        dependencies = dependencies or []
        
        # Check if component file exists
        if not Path(component_path).exists():
            logger.error(f"Component file not found: {component_path}")
            return False
        
        # Calculate file hash
        file_hash = self._calculate_file_hash(component_path)
        last_modified = Path(component_path).stat().st_mtime
        
        # Create component info
        info = ComponentInfo(
            component_name=component_name,
            component_path=component_path,
            dependencies=dependencies,
            hash=file_hash,
            last_modified=last_modified
        )
        
        self.registry[component_name] = info
        self._save_registry()
        
        logger.info(f"Registered component: {component_name}")
        return True
    
    def get_component(self, component_name: str) -> Optional[ComponentInfo]:
        """Get component information."""
        return self.registry.get(component_name)
    
    def is_component_updated(self, component_name: str) -> bool:
        """Check if component file has been updated since last registration."""
        if component_name not in self.registry:
            return False
        
        info = self.registry[component_name]
        path = Path(info.component_path)
        
        if not path.exists():
            return False
        
        current_hash = self._calculate_file_hash(info.component_path)
        return current_hash != info.hash
    
    def update_component(self, component_name: str) -> bool:
        """Update component if file has changed."""
        if not self.is_component_updated(component_name):
            return False
        
        info = self.registry[component_name]
        new_hash = self._calculate_file_hash(info.component_path)
        new_modified = Path(info.component_path).stat().st_mtime
        
        info.hash = new_hash
        info.last_modified = new_modified
        
        self._save_registry()
        logger.info(f"Updated component: {component_name}")
        return True
    
    def list_components(self) -> Dict[str, ComponentInfo]:
        """List all registered components."""
        return self.registry.copy()
    
    def remove_component(self, component_name: str) -> bool:
        """Remove a component from registry."""
        if component_name in self.registry:
            del self.registry[component_name]
            self._save_registry()
            logger.info(f"Removed component: {component_name}")
            return True
        return False
    
    def _calculate_file_hash(self, file_path: str) -> str:
        """Calculate MD5 hash of a file."""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()


class ComponentLoader:
    """Loads and manages frontend components for nodes."""
    
    def __init__(self):
        self.registry = ComponentRegistry()
        self.loaded_components: Set[str] = set()
    
    def register_node_component(
        self,
        node_class_name: str,
        component_config: Dict[str, Any]
    ) -> bool:
        """Register a component for a node class."""
        try:
            component_path = component_config.get("component_path")
            component_name = component_config.get("component_name")
            dependencies = component_config.get("dependencies", [])
            
            if not component_path or not component_name:
                logger.error(f"Invalid component config for {node_class_name}")
                return False
            
            # Use node class name as component key
            success = self.registry.register_component(
                component_name=node_class_name,
                component_path=component_path,
                dependencies=dependencies
            )
            
            if success:
                logger.info(f"Registered component for node: {node_class_name}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to register component for {node_class_name}: {e}")
            return False
    
    def get_component_info(self, node_class_name: str) -> Optional[Dict[str, Any]]:
        """Get component information for a node."""
        info = self.registry.get_component(node_class_name)
        if not info:
            return None
        
        return {
            "component_name": info.component_name,
            "component_path": info.component_path,
            "dependencies": info.dependencies,
            "hash": info.hash,
            "last_modified": info.last_modified,
            "needs_update": self.registry.is_component_updated(node_class_name)
        }
    
    def load_component_for_node(self, node_instance) -> Optional[Dict[str, Any]]:
        """Load component for a node instance."""
        node_class_name = node_instance.__class__.__name__
        
        # Check if node has component configuration
        if hasattr(node_instance, 'get_frontend_component'):
            component_config = node_instance.get_frontend_component()
            if component_config:
                # Auto-register if not already registered
                if node_class_name not in self.registry.registry:
                    self.register_node_component(node_class_name, component_config)
                
                # Return component info
                return self.get_component_info(node_class_name)
        
        return None
    
    def generate_component_manifest(self) -> Dict[str, Any]:
        """Generate manifest of all components for frontend."""
        manifest = {
            "components": {},
            "dependencies": set(),
            "timestamp": Path().stat().st_mtime if Path().exists() else 0
        }
        
        for name, info in self.registry.list_components().items():
            manifest["components"][name] = {
                "component_name": info.component_name,
                "component_path": info.component_path,
                "hash": info.hash,
                "last_modified": info.last_modified
            }
            manifest["dependencies"].update(info.dependencies)
        
        # Convert set to list for JSON serialization
        manifest["dependencies"] = list(manifest["dependencies"])
        
        return manifest
    
    def hot_reload_check(self) -> list[str]:
        """Check for components that need hot reloading."""
        updated_components = []
        
        for component_name in self.registry.registry.keys():
            if self.registry.is_component_updated(component_name):
                updated_components.append(component_name)
        
        return updated_components


# Global component loader instance
component_loader = ComponentLoader()


def get_component_loader() -> ComponentLoader:
    """Get the global component loader instance."""
    return component_loader


def register_component_for_node(node_instance) -> bool:
    """Convenience function to register component for a node."""
    loader = get_component_loader()
    info = loader.load_component_for_node(node_instance)
    return info is not None