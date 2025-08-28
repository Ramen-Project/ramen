"""
圖形載入器
支援多種載入方式和依賴解析
"""

import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Union, Any
import importlib.util
import json

from .core.models import RamenGraph, GraphDeserializer, GraphDependencies
from .engine import GraphExecutor, ExecutionContext


class GraphLoader:
    """圖形載入器，支援多種載入方式"""
    
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path.cwd()
        self.graph_cache: Dict[str, RamenGraph] = {}
        self.search_paths: List[Path] = [
            self.project_root,
            self.project_root / "src",
            self.project_root / "graphs"
        ]
    
    def add_search_path(self, path: Union[str, Path]):
        """添加圖形搜尋路徑"""
        path = Path(path)
        if path not in self.search_paths:
            self.search_paths.append(path)
    
    def resolve_path(self, ref: str, context: Optional[Path] = None) -> Optional[Path]:
        """解析圖形引用為實際路徑
        
        支援的引用格式：
        - ./relative/path.ramen - 相對路徑
        - module.path - 模組路徑（在搜尋路徑中查找）
        - /absolute/path.ramen - 絕對路徑
        """
        # 絕對路徑
        if ref.startswith('/'):
            path = Path(ref)
            if path.exists():
                return path
            return None
        
        # 相對路徑
        if ref.startswith('./') or ref.startswith('../'):
            if context:
                base = context.parent if context.is_file() else context
                path = (base / ref).resolve()
                if path.exists():
                    return path
            return None
        
        # 套件引用 (package:path)
        if ':' in ref:
            package, subpath = ref.split(':', 1)
            return self._resolve_package_graph(package, subpath)
        
        # 模組路徑
        return self._resolve_module_path(ref)
    
    def _resolve_module_path(self, module_path: str) -> Optional[Path]:
        """解析模組路徑為檔案路徑
        
        例如：
        - data.preprocessing -> 尋找 data/preprocessing.ramen
        - ml.training -> 尋找 ml/training.ramen
        """
        # 將點分隔路徑轉換為路徑
        path_parts = module_path.split('.')
        relative_path = Path(*path_parts).with_suffix('.ramen')
        
        # 在所有搜尋路徑中查找
        for search_path in self.search_paths:
            full_path = search_path / relative_path
            if full_path.exists():
                return full_path
            
            # 也嘗試不帶 .ramen 後綴的路徑
            full_path = search_path / module_path
            if full_path.exists() and full_path.suffix == '.ramen':
                return full_path
        
        return None
    
    def _resolve_package_graph(self, package: str, subpath: str) -> Optional[Path]:
        """從已安裝的 Python 套件中解析圖形
        
        例如：
        - ml-utils:graphs/preprocessing.ramen
        """
        try:
            # 嘗試導入套件
            spec = importlib.util.find_spec(package)
            if spec and spec.origin:
                package_dir = Path(spec.origin).parent
                graph_path = package_dir / subpath
                if graph_path.exists():
                    return graph_path
        except (ImportError, AttributeError):
            pass
        
        return None
    
    def load_graph(
        self, 
        ref: str, 
        context: Optional[Path] = None,
        override_dependencies: Optional[Dict[str, str]] = None
    ) -> RamenGraph:
        """載入圖形
        
        Args:
            ref: 圖形引用（路徑、模組名等）
            context: 當前上下文路徑（用於相對引用）
            override_dependencies: 覆蓋圖形依賴的映射
        
        Returns:
            RamenGraph: 載入的圖形
        
        Raises:
            FileNotFoundError: 找不到圖形檔案
            ValueError: 圖形格式錯誤
        """
        # 解析路徑
        path = self.resolve_path(ref, context)
        if not path:
            # 嘗試直接作為路徑
            path = Path(ref)
            if not path.exists():
                raise FileNotFoundError(f"Cannot find graph: {ref}")
        
        # 檢查快取
        cache_key = str(path.resolve())
        if cache_key in self.graph_cache:
            graph = self.graph_cache[cache_key]
        else:
            # 載入圖形
            graph = GraphDeserializer.load_graph(path)
            self.graph_cache[cache_key] = graph
        
        # 覆蓋依賴
        if override_dependencies and graph.dependencies:
            for alias, new_path in override_dependencies.items():
                if alias in graph.dependencies.graphs:
                    graph.dependencies.graphs[alias] = new_path
        
        return graph
    
    def check_dependencies(self, graph: RamenGraph) -> Dict[str, Any]:
        """檢查圖形的所有依賴
        
        Returns:
            Dict: 依賴檢查結果
        """
        result = {
            'missing_toppings': [],
            'missing_graphs': [],
            'missing_python': [],
            'available_toppings': [],
            'resolved_graphs': {}
        }
        
        if not graph.dependencies:
            return result
        
        # 檢查 topping 依賴
        for topping in graph.dependencies.toppings:
            topping_name = topping.split('>=')[0].strip()
            try:
                __import__(f"ramen_topping_{topping_name}")
                result['available_toppings'].append(topping)
            except ImportError:
                result['missing_toppings'].append(topping)
        
        # 檢查圖形依賴
        for alias, graph_ref in graph.dependencies.graphs.items():
            resolved_path = self.resolve_path(graph_ref)
            if resolved_path and resolved_path.exists():
                result['resolved_graphs'][alias] = str(resolved_path)
            else:
                result['missing_graphs'].append((alias, graph_ref))
        
        # 檢查 Python 依賴
        for package in graph.dependencies.python:
            package_name = package.split('>=')[0].strip()
            try:
                __import__(package_name)
            except ImportError:
                result['missing_python'].append(package)
        
        return result


class GraphModule:
    """包裝圖形為 Python 模組式物件"""
    
    def __init__(self, graph: RamenGraph, loader: Optional[GraphLoader] = None):
        self.graph = graph
        self.loader = loader or GraphLoader()
        self._executor = None
    
    @property
    def executor(self) -> GraphExecutor:
        """延遲初始化執行器"""
        if not self._executor:
            from .nodes import get_all_nodes
            self._executor = GraphExecutor(enable_async=False)
            for node_type, node_func in get_all_nodes().items():
                self._executor.register_node(node_type, node_func)
        return self._executor
    
    def execute(self, **inputs) -> Any:
        """執行圖形"""
        context = ExecutionContext(graph_id=self.graph.id)
        result = self.executor.execute(self.graph, inputs=inputs, context=context)
        if result.success:
            return result.outputs
        else:
            raise RuntimeError(f"Graph execution failed: {result.errors}")
    
    def __call__(self, **inputs) -> Any:
        """讓圖形可以像函數一樣呼叫"""
        return self.execute(**inputs)


def load(ref: str, **kwargs) -> GraphModule:
    """便捷函數：載入圖形為模組"""
    loader = GraphLoader()
    graph = loader.load_graph(ref, **kwargs)
    return GraphModule(graph, loader)


def run(ref: str, **inputs) -> Any:
    """便捷函數：直接執行圖形"""
    module = load(ref)
    return module.execute(**inputs)