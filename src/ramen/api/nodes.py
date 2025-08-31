"""API endpoints for node management."""

import logging
from typing import List, Dict, Any
from fastapi import APIRouter

from ..topping import get_registry

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api", tags=["nodes"])


@router.get("/nodes")
async def get_available_nodes() -> Dict[str, Any]:
    """Get all available nodes from the registry.
    
    Returns:
        Dictionary containing available nodes grouped by category
    """
    try:
        # Ensure toppings are loaded
        from ..topping.loader import load_toppings
        loader = load_toppings()
        
        registry = get_registry()
        all_metadata = registry.get_all_metadata()
        
        logger.info(f"Loading nodes from registry. Total metadata entries: {len(all_metadata)}")
        
        # Convert to frontend-compatible format
        nodes_by_category = {}
        
        for node_type, metadata in all_metadata.items():
            category = metadata.category or "Uncategorized"
            
            if category not in nodes_by_category:
                nodes_by_category[category] = []
            
            # Convert port definitions to dict format
            inputs = []
            for port in metadata.inputs:
                inputs.append({
                    "name": port.name,
                    "type": port.port_type.value if hasattr(port.port_type, 'value') else str(port.port_type),
                    "required": port.required,
                    "default": port.default,
                    "description": port.description,
                    "multiple": getattr(port, 'multiple', False)
                })
            
            outputs = []
            for port in metadata.outputs:
                outputs.append({
                    "name": port.name,
                    "type": port.port_type.value if hasattr(port.port_type, 'value') else str(port.port_type),
                    "required": port.required,
                    "default": port.default,
                    "description": port.description,
                    "multiple": getattr(port, 'multiple', False)
                })
            
            node_info = {
                "type": node_type,
                "namespace": metadata.namespace,
                "nodeType": metadata.node_type,
                "displayName": metadata.display_name,
                "description": metadata.description,
                "icon": metadata.icon,
                "color": metadata.color,
                "inputs": inputs,
                "outputs": outputs,
                "properties": getattr(metadata, 'properties', {})
            }
            
            nodes_by_category[category].append(node_info)
            logger.debug(f"Added node {node_type} to category {category}")
        
        total_nodes = sum(len(nodes) for nodes in nodes_by_category.values())
        logger.info(f"Returning {total_nodes} nodes across {len(nodes_by_category)} categories")
        
        return {
            "success": True,
            "nodes": nodes_by_category,
            "total_count": total_nodes
        }
        
    except Exception as e:
        logger.error(f"Failed to get available nodes: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "nodes": {},
            "total_count": 0
        }
    
@router.get("/nodes/{node_type}")
async def get_node_metadata(node_type: str) -> Dict[str, Any]:
    """Get metadata for a specific node type.
    
    Args:
        node_type: Full node type identifier (e.g., "numpy.array")
        
    Returns:
        Node metadata
    """
    try:
        # Ensure toppings are loaded
        from ..topping.loader import load_toppings
        loader = load_toppings()
        
        registry = get_registry()
        metadata = registry.get_node_metadata(node_type)
        
        if not metadata:
            return {
                "success": False,
                "error": f"Node type {node_type} not found"
            }
        
        # Convert to dict format
        inputs = []
        for port in metadata.inputs:
            inputs.append({
                "name": port.name,
                "type": port.port_type.value if hasattr(port.port_type, 'value') else str(port.port_type),
                "required": port.required,
                "default": port.default,
                "description": port.description,
                "multiple": getattr(port, 'multiple', False)
            })
        
        outputs = []
        for port in metadata.outputs:
            outputs.append({
                "name": port.name,
                "type": port.port_type.value if hasattr(port.port_type, 'value') else str(port.port_type),
                "required": port.required,
                "default": port.default,
                "description": port.description,
                "multiple": getattr(port, 'multiple', False)
            })
        
        return {
            "success": True,
            "metadata": {
                "type": node_type,
                "namespace": metadata.namespace,
                "nodeType": metadata.node_type,
                "displayName": metadata.display_name,
                "category": metadata.category,
                "description": metadata.description,
                "icon": metadata.icon,
                "color": metadata.color,
                "inputs": inputs,
                "outputs": outputs,
                "properties": getattr(metadata, 'properties', {})
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get node metadata for {node_type}: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
    
@router.get("/toppings")
async def get_loaded_toppings() -> Dict[str, Any]:
    """Get information about loaded toppings.
    
    Returns:
        List of loaded toppings with their information
    """
    try:
        # Ensure toppings are loaded
        from ..topping.loader import load_toppings
        loader = load_toppings()
        
        registry = get_registry()
        toppings = registry.get_all_toppings()
        
        topping_info = []
        for name, topping in toppings.items():
            # Count nodes registered by this topping
            node_count = 0
            all_metadata = registry.get_all_metadata()
            for node_type, metadata in all_metadata.items():
                if registry._node_to_topping.get(node_type) == name:
                    node_count += 1
            
            info = {
                "name": topping.get_name(),
                "version": topping.get_version(),
                "description": topping.get_description(),
                "node_count": node_count
            }
            topping_info.append(info)
        
        logger.info(f"Returning {len(topping_info)} loaded toppings")
        
        return {
            "success": True,
            "toppings": topping_info,
            "total_count": len(topping_info)
        }
        
    except Exception as e:
        logger.error(f"Failed to get loaded toppings: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "toppings": [],
            "total_count": 0
        }