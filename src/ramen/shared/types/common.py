"""
Common type definitions
通用類型定義
"""

from typing import Any
from pydantic import BaseModel, Field


class Position(BaseModel):
    """位置座標"""
    x: float = Field(..., description="X 座標")
    y: float = Field(..., description="Y 座標")


class Size(BaseModel):
    """尺寸"""
    width: float = Field(..., description="寬度")
    height: float = Field(..., description="高度")
