"""
Ramen API 模組
提供 REST API 服務
"""

from .project import router as project_router

__all__ = ['project_router']