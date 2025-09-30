"""
API endpoints for node management.

⚠️  DEPRECATED: HTTP endpoints in this module are deprecated.
All functionality has been migrated to WebSocket API.
See: src/ramen/api/websocket_handler.py
"""

import logging
from typing import List, Dict, Any
from fastapi import APIRouter

from ..registry import get_global_registry

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
        registry = get_global_registry()
        all_nodes = registry.get_all()

        logger.info(f"Loading nodes from registry. Total nodes: {len(all_nodes)}")

        # Convert to frontend-compatible format
        nodes_by_category = {}

        for node_id, node_def in all_nodes.items():
            category = node_def.category or "Uncategorized"

            if category not in nodes_by_category:
                nodes_by_category[category] = []

            # Use the built-in to_dict method
            node_info = node_def.to_dict(include_executor=False)

            nodes_by_category[category].append(node_info)
            logger.debug(f"Added node {node_id} to category {category}")

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
    
@router.get("/nodes/{node_type:path}")
async def get_node_metadata(node_type: str) -> Dict[str, Any]:
    """Get metadata for a specific node type.

    Args:
        node_type: Full node type identifier (e.g., "math.add")

    Returns:
        Node metadata
    """
    try:
        registry = get_global_registry()
        node_def = registry.get(node_type)

        if not node_def:
            return {
                "success": False,
                "error": f"Node type {node_type} not found"
            }

        return {
            "success": True,
            "metadata": node_def.to_dict(include_executor=False)
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
        registry = get_global_registry()
        toppings = registry.list_toppings()

        topping_info = []
        for topping_name in toppings:
            nodes = registry.get_by_topping(topping_name)
            info = {
                "name": topping_name,
                "node_count": len(nodes)
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