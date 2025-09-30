"""Frontend component management for toppings."""

import importlib
import importlib.util
from pathlib import Path
from typing import Dict, List, Optional, Any
import json
import logging

from ramen.topping.topping_base import FrontendComponent

logger = logging.getLogger(__name__)


class ComponentDiscovery:
    """Discovers and loads frontend components from installed toppings."""
    
    def __init__(self):
        self.discovered_components: Dict[str, Dict[str, Any]] = {}
        
    def discover_components_from_toppings(self) -> Dict[str, Dict[str, Any]]:
        """Discover all frontend components from installed topping packages."""
        components = {}
        
        # Get all installed ramen-topping-* packages
        topping_packages = self._get_installed_toppings()
        
        for package_name in topping_packages:
            try:
                package_components = self._discover_package_components(package_name)
                if package_components:
                    components[package_name] = package_components
                    logger.info(f"Discovered {len(package_components)} components in {package_name}")
            except Exception as e:
                logger.warning(f"Failed to discover components in {package_name}: {e}")
                
        self.discovered_components = components
        return components
    
    def _get_installed_toppings(self) -> List[str]:
        """Get list of installed ramen-topping-* packages."""
        try:
            import pkg_resources
            installed_packages = [d.project_name for d in pkg_resources.working_set]
            return [pkg for pkg in installed_packages if pkg.startswith('ramen-topping-')]
        except ImportError:
            # Fallback to importlib.metadata for Python 3.8+
            try:
                import importlib.metadata
                installed_packages = [dist.metadata['name'] for dist in importlib.metadata.distributions()]
                return [pkg for pkg in installed_packages if pkg.startswith('ramen-topping-')]
            except ImportError:
                logger.warning("Cannot discover installed packages - pkg_resources and importlib.metadata not available")
                return []
    
    def _discover_package_components(self, package_name: str) -> Optional[Dict[str, Any]]:
        """Discover frontend components in a specific topping package."""
        try:
            # Convert package name to module name (ramen-topping-numpy -> ramen_topping_numpy)
            module_name = package_name.replace('-', '_')
            
            # Try to import the package
            spec = importlib.util.find_spec(module_name)
            if not spec or not spec.origin:
                return None
            
            # Get package directory
            package_path = Path(spec.origin).parent
            
            # Look for components directory
            components_dir = package_path / "components"
            if not components_dir.exists():
                return None
            
            # Look for component manifest
            manifest_file = components_dir / "manifest.json"
            if manifest_file.exists():
                return self._load_component_manifest(manifest_file, components_dir)
            else:
                # Auto-discover components
                return self._auto_discover_components(components_dir)
                
        except Exception as e:
            logger.error(f"Error discovering components in {package_name}: {e}")
            return None
    
    def _load_component_manifest(self, manifest_file: Path, components_dir: Path) -> Dict[str, Any]:
        """Load components from a manifest file."""
        try:
            with open(manifest_file, 'r') as f:
                manifest = json.load(f)
            
            components = {}
            for component_name, component_config in manifest.get('components', {}).items():
                component_path = components_dir / component_config['path']
                if component_path.exists():
                    components[component_name] = {
                        'component_path': str(component_path),
                        'dependencies': component_config.get('dependencies', []),
                        'props_schema': component_config.get('props_schema'),
                        'description': component_config.get('description', '')
                    }
            
            return components
            
        except Exception as e:
            logger.error(f"Failed to load component manifest from {manifest_file}: {e}")
            return {}
    
    def _auto_discover_components(self, components_dir: Path) -> Dict[str, Any]:
        """Auto-discover React components in the components directory."""
        components = {}
        
        # Look for .tsx, .jsx, .js files
        for ext in ['*.tsx', '*.jsx', '*.js']:
            for component_file in components_dir.rglob(ext):
                if component_file.name.startswith('index.'):
                    # Use parent directory name for index files
                    component_name = component_file.parent.name
                else:
                    # Use file name without extension
                    component_name = component_file.stem
                
                # Skip if already found
                if component_name in components:
                    continue
                
                # Basic component info
                components[component_name] = {
                    'component_path': str(component_file),
                    'dependencies': ['react'],  # Assume React dependency
                    'description': f'Auto-discovered component: {component_name}'
                }
        
        return components
    
    def get_component_for_node(self, node_type: str) -> Optional[Dict[str, Any]]:
        """Get frontend component configuration for a specific node type."""
        # Search through all discovered components
        for package_name, package_components in self.discovered_components.items():
            for component_name, component_info in package_components.items():
                # Check if component is associated with this node type
                if self._is_component_for_node(component_name, node_type):
                    return {
                        'package': package_name,
                        'component_name': component_name,
                        **component_info
                    }
        return None
    
    def _is_component_for_node(self, component_name: str, node_type: str) -> bool:
        """Check if a component is associated with a node type."""
        node_name = node_type.split('.')[-1].lower()
        component_name_lower = component_name.lower()
        
        # Normalize names by removing underscores and common suffixes
        node_normalized = node_name.replace('_', '')
        component_normalized = component_name_lower.replace('_', '').replace('node', '').replace('component', '')
        
        return (
            node_normalized in component_normalized or
            component_normalized in node_normalized or
            node_normalized == component_normalized or
            # Check word-by-word matching
            self._words_match(node_name, component_name_lower)
        )
    
    def _words_match(self, node_name: str, component_name: str) -> bool:
        """Check if words in node_name match words in component_name."""
        import re
        
        # Split node_name by underscore and component_name by camelCase
        node_words = node_name.replace('_', ' ').split()
        component_words = re.findall(r'[a-z]+', component_name.lower())
        
        # Check if all node words are found in component words
        for node_word in node_words:
            if node_word not in component_words:
                return False
        return len(node_words) > 0
    
    def generate_component_manifest(self) -> Dict[str, Any]:
        """Generate a complete manifest of all available components."""
        if not self.discovered_components:
            self.discover_components_from_toppings()
        
        manifest = {
            'components': {},
            'dependencies': set(),
            'packages': list(self.discovered_components.keys())
        }
        
        for package_name, package_components in self.discovered_components.items():
            for component_name, component_info in package_components.items():
                full_name = f"{package_name}.{component_name}"
                manifest['components'][full_name] = component_info
                manifest['dependencies'].update(component_info.get('dependencies', []))
        
        # Convert set to list for JSON serialization
        manifest['dependencies'] = list(manifest['dependencies'])
        
        return manifest


# Global component discovery instance
_component_discovery = ComponentDiscovery()


def get_component_discovery() -> ComponentDiscovery:
    """Get the global component discovery instance."""
    # Automatically discover components if not already done
    if not _component_discovery.discovered_components:
        _component_discovery.discover_components_from_toppings()
    return _component_discovery


def discover_all_components() -> Dict[str, Dict[str, Any]]:
    """Convenience function to discover all components."""
    return _component_discovery.discover_components_from_toppings()


def get_component_manifest() -> Dict[str, Any]:
    """Convenience function to get component manifest."""
    return _component_discovery.generate_component_manifest()