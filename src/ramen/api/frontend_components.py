"""API endpoints for frontend component management."""

import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path

from ..topping.frontend_components import get_component_discovery

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/frontend", tags=["frontend_components"])


@router.get("/components/manifest")
async def get_component_manifest() -> Dict[str, Any]:
    """Get manifest of all available frontend components."""
    try:
        discovery = get_component_discovery()
        manifest = discovery.generate_component_manifest()
        
        return {
            "success": True,
            "manifest": manifest
        }
        
    except Exception as e:
        logger.error(f"Failed to generate component manifest: {e}")
        return {
            "success": False,
            "error": str(e),
            "manifest": {}
        }


@router.get("/components/discover")
async def discover_components() -> Dict[str, Any]:
    """Discover and refresh all available components."""
    try:
        discovery = get_component_discovery()
        components = discovery.discover_components_from_toppings()
        
        return {
            "success": True,
            "components": components,
            "total_packages": len(components),
            "total_components": sum(len(pkg_components) for pkg_components in components.values())
        }
        
    except Exception as e:
        logger.error(f"Failed to discover components: {e}")
        return {
            "success": False,
            "error": str(e),
            "components": {}
        }


@router.get("/components/{node_type}")
async def get_component_for_node(node_type: str) -> Dict[str, Any]:
    """Get frontend component for a specific node type."""
    try:
        discovery = get_component_discovery()
        component_info = discovery.get_component_for_node(node_type)
        
        if not component_info:
            return {
                "success": True,
                "component": None,
                "message": f"No frontend component found for node type: {node_type}"
            }
        
        return {
            "success": True,
            "component": component_info
        }
        
    except Exception as e:
        logger.error(f"Failed to get component for node {node_type}: {e}")
        return {
            "success": False,
            "error": str(e),
            "component": None
        }


@router.get("/components/file/{package_name:path}")
async def serve_component_file(package_name: str, file_path: str) -> FileResponse:
    """Serve a component file from a topping package."""
    try:
        discovery = get_component_discovery()
        
        # Get package components
        package_components = discovery.discovered_components.get(package_name)
        if not package_components:
            raise HTTPException(status_code=404, detail=f"Package {package_name} not found")
        
        # Find component with matching file path
        component_file = None
        for component_info in package_components.values():
            if file_path in component_info['component_path']:
                component_file = Path(component_info['component_path'])
                break
        
        if not component_file or not component_file.exists():
            raise HTTPException(status_code=404, detail=f"Component file {file_path} not found")
        
        return FileResponse(
            component_file,
            media_type="application/javascript",
            filename=component_file.name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to serve component file {package_name}/{file_path}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check for frontend components API."""
    try:
        discovery = get_component_discovery()
        
        # Quick check - try to discover without full scan
        total_packages = len(discovery.discovered_components)
        
        return {
            "success": True,
            "status": "healthy",
            "discovered_packages": total_packages
        }
        
    except Exception as e:
        logger.error(f"Frontend components health check failed: {e}")
        return {
            "success": False,
            "status": "unhealthy",
            "error": str(e)
        }