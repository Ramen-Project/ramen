"""System monitoring and management API endpoints.

⚠️  DEPRECATED: HTTP endpoints in this module are deprecated.
All functionality has been migrated to WebSocket API.
See: src/ramen/api/websocket_handler.py
"""

import logging
from typing import Dict, Any
from fastapi import APIRouter

from ..topping.performance import get_system_stats, cleanup_memory

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/stats")
async def get_system_statistics() -> Dict[str, Any]:
    """Get comprehensive system statistics."""
    try:
        stats = get_system_stats()
        
        return {
            "success": True,
            "stats": stats
        }
        
    except Exception as e:
        logger.error(f"Failed to get system stats: {e}")
        return {
            "success": False,
            "error": str(e),
            "stats": {}
        }


@router.post("/cleanup")
async def perform_system_cleanup() -> Dict[str, Any]:
    """Perform system memory cleanup."""
    try:
        cleanup_stats = cleanup_memory()
        
        return {
            "success": True,
            "message": "System cleanup completed",
            "cleanup_stats": cleanup_stats
        }
        
    except Exception as e:
        logger.error(f"System cleanup failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/health")
async def system_health_check() -> Dict[str, Any]:
    """Comprehensive system health check."""
    try:
        stats = get_system_stats()
        
        # Analyze health metrics
        health_status = "healthy"
        issues = []
        
        # Check for performance issues
        perf_stats = stats.get("performance", {})
        for metric, data in perf_stats.items():
            if data.get("average", 0) > 1.0:  # Slow operations
                issues.append(f"Slow {metric}: {data['average']:.3f}s avg")
                health_status = "warning"
        
        # Check memory usage
        memory_stats = stats.get("memory", {})
        gc_objects = memory_stats.get("gc_objects", 0)
        if gc_objects > 10000:  # High object count
            issues.append(f"High memory usage: {gc_objects} objects")
            health_status = "warning"
        
        return {
            "success": True,
            "health_status": health_status,
            "issues": issues,
            "stats": stats
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "success": False,
            "health_status": "error",
            "error": str(e)
        }