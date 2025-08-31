"""API endpoints for frontend component management."""

import logging
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from ..topping.component_loader import get_component_loader

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/components", tags=["components"])


@router.get("/manifest")
async def get_component_manifest() -> Dict[str, Any]:
    """Get manifest of all available components."""
    try:
        loader = get_component_loader()
        manifest = loader.generate_component_manifest()
        
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


@router.get("/info/{component_name}")
async def get_component_info(component_name: str) -> Dict[str, Any]:
    """Get detailed information about a specific component."""
    try:
        loader = get_component_loader()
        info = loader.get_component_info(component_name)
        
        if not info:
            raise HTTPException(status_code=404, detail=f"Component {component_name} not found")
        
        return {
            "success": True,
            "component": info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get component info for {component_name}: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/file/{component_name}")
async def get_component_file(component_name: str):
    """Serve component file content."""
    try:
        loader = get_component_loader()
        info = loader.get_component_info(component_name)
        
        if not info:
            raise HTTPException(status_code=404, detail=f"Component {component_name} not found")
        
        component_path = info["component_path"]
        
        # Serve the component file
        return FileResponse(
            component_path,
            media_type="application/javascript",
            filename=f"{component_name}.js"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to serve component file for {component_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hot-reload")
async def check_hot_reload() -> Dict[str, Any]:
    """Check for components that need hot reloading."""
    try:
        loader = get_component_loader()
        updated_components = loader.hot_reload_check()
        
        return {
            "success": True,
            "updated_components": updated_components,
            "count": len(updated_components)
        }
        
    except Exception as e:
        logger.error(f"Hot reload check failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "updated_components": []
        }


@router.post("/reload/{component_name}")
async def reload_component(component_name: str) -> Dict[str, Any]:
    """Trigger reload of a specific component."""
    try:
        loader = get_component_loader()
        
        # Update component if needed
        updated = loader.registry.update_component(component_name)
        
        if updated:
            # Get updated info
            info = loader.get_component_info(component_name)
            return {
                "success": True,
                "message": f"Component {component_name} reloaded",
                "component": info
            }
        else:
            return {
                "success": False,
                "message": f"Component {component_name} does not need update"
            }
            
    except Exception as e:
        logger.error(f"Failed to reload component {component_name}: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/list")
async def list_components() -> Dict[str, Any]:
    """List all registered components."""
    try:
        loader = get_component_loader()
        components = loader.registry.list_components()
        
        # Convert ComponentInfo objects to dicts
        component_list = []
        for name, info in components.items():
            component_list.append({
                "name": name,
                "component_name": info.component_name,
                "component_path": info.component_path,
                "dependencies": info.dependencies,
                "hash": info.hash,
                "last_modified": info.last_modified,
                "needs_update": loader.registry.is_component_updated(name)
            })
        
        return {
            "success": True,
            "components": component_list,
            "count": len(component_list)
        }
        
    except Exception as e:
        logger.error(f"Failed to list components: {e}")
        return {
            "success": False,
            "error": str(e),
            "components": []
        }