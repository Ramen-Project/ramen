"""API endpoints for the node registry.

⚠️  DEPRECATED: HTTP endpoints in this module are deprecated.
All functionality has been migrated to WebSocket API.
See: src/ramen/api/websocket_handler.py
"""

import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Query, HTTPException

from ..registry import get_global_registry

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/registry", tags=["registry"])


@router.get("/nodes")
async def get_all_nodes_from_registry(
    category: Optional[str] = Query(None, description="Filter by category"),
    namespace: Optional[str] = Query(None, description="Filter by namespace"),
    search: Optional[str] = Query(None, description="Search query")
) -> Dict[str, Any]:
    """Get all nodes from the registry.

    Query parameters:
    - category: Filter nodes by category
    - namespace: Filter nodes by namespace
    - search: Search in node names and descriptions

    Returns:
        Dictionary containing nodes grouped by category
    """
    try:
        registry = get_global_registry()

        # Get nodes based on filters
        if search:
            nodes = registry.search(query=search, category=category, namespace=namespace)
        elif category:
            nodes = registry.get_by_category(category)
        elif namespace:
            nodes = registry.get_by_namespace(namespace)
        else:
            nodes = list(registry.get_all().values())

        # Group by category for frontend
        nodes_by_category: Dict[str, List[Dict[str, Any]]] = {}

        for node in nodes:
            cat = node.category
            if cat not in nodes_by_category:
                nodes_by_category[cat] = []

            nodes_by_category[cat].append(node.to_dict(include_executor=False))

        logger.info(f"Returning {len(nodes)} nodes across {len(nodes_by_category)} categories")

        return {
            "success": True,
            "nodes": nodes_by_category,
            "total_count": len(nodes),
            "filters": {
                "category": category,
                "namespace": namespace,
                "search": search,
            }
        }

    except Exception as e:
        logger.error(f"Failed to get nodes from registry: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "nodes": {},
            "total_count": 0,
        }


@router.get("/nodes/{node_id:path}")
async def get_node_from_registry(node_id: str) -> Dict[str, Any]:
    """Get a specific node by ID.

    Args:
        node_id: Full node identifier (e.g., "core.add", "math.multiply")

    Returns:
        Node definition
    """
    try:
        registry = get_global_registry()
        node = registry.get(node_id)

        if not node:
            raise HTTPException(status_code=404, detail=f"Node {node_id} not found")

        return {
            "success": True,
            "node": node.to_dict(include_executor=False)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get node {node_id}: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/categories")
async def list_all_categories() -> Dict[str, Any]:
    """Get list of all available categories.

    Returns:
        List of category names with node counts
    """
    try:
        registry = get_global_registry()
        categories = registry.list_categories()

        # Get node count per category
        category_info = []
        for cat in categories:
            nodes = registry.get_by_category(cat)
            category_info.append({
                "name": cat,
                "node_count": len(nodes),
            })

        return {
            "success": True,
            "categories": category_info,
            "total_categories": len(categories),
        }

    except Exception as e:
        logger.error(f"Failed to list categories: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "categories": [],
        }


@router.get("/namespaces")
async def list_all_namespaces() -> Dict[str, Any]:
    """Get list of all available namespaces.

    Returns:
        List of namespace names with node counts
    """
    try:
        registry = get_global_registry()
        namespaces = registry.list_namespaces()

        # Get node count per namespace
        namespace_info = []
        for ns in namespaces:
            nodes = registry.get_by_namespace(ns)
            namespace_info.append({
                "name": ns,
                "node_count": len(nodes),
            })

        return {
            "success": True,
            "namespaces": namespace_info,
            "total_namespaces": len(namespaces),
        }

    except Exception as e:
        logger.error(f"Failed to list namespaces: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "namespaces": [],
        }


@router.get("/stats")
async def get_registry_stats() -> Dict[str, Any]:
    """Get statistics about the registry.

    Returns:
        Registry statistics including counts and distributions
    """
    try:
        registry = get_global_registry()
        stats = registry.stats()

        return {
            "success": True,
            "stats": stats,
        }

    except Exception as e:
        logger.error(f"Failed to get registry stats: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
        }


@router.post("/reload")
async def reload_nodes() -> Dict[str, Any]:
    """Reload nodes from all sources.

    Returns:
        Reload result with count of nodes
    """
    try:
        registry = get_global_registry()

        # Simply return current count since nodes auto-register via decorator
        return {
            "success": True,
            "total_nodes": registry.count(),
            "message": "Nodes are automatically registered on import"
        }

    except Exception as e:
        logger.error(f"Failed to reload nodes: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
        }