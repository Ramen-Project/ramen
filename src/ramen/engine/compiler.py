"""
圖形編譯器
將圖形編譯為可執行的 Python 代碼
支援 JIT (Just-In-Time) 和 AOT (Ahead-Of-Time) 編譯
"""

from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
import hashlib
import json
import pickle
import ast
import types
from pathlib import Path
from datetime import datetime

from ramen.core.models import RamenGraph, RamenNode, RamenEdge
from ramen.engine.errors import CompilationError


@dataclass
class CompiledGraph:
    """編譯後的圖形"""
    graph_id: str
    graph_hash: str
    compiled_at: datetime
    bytecode: Optional[types.CodeType] = None
    source_code: Optional[str] = None
    execution_order: List[str] = field(default_factory=list)
    node_functions: Dict[str, Callable] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def execute(self, context: Dict[str, Any]) -> Any:
        """執行編譯後的代碼"""
        if self.bytecode:
            # 執行 bytecode
            namespace = {"context": context}
            exec(self.bytecode, namespace)
            return namespace.get("result")
        elif self.source_code:
            # 執行源代碼
            namespace = {"context": context}
            exec(self.source_code, namespace)
            return namespace.get("result")
        else:
            raise CompilationError("No compiled code available")
    
    def save(self, path: Path):
        """保存編譯結果到檔案"""
        data = {
            "graph_id": self.graph_id,
            "graph_hash": self.graph_hash,
            "compiled_at": self.compiled_at.isoformat(),
            "source_code": self.source_code,
            "execution_order": self.execution_order,
            "metadata": self.metadata
        }
        
        # Bytecode 需要特別處理
        if self.bytecode:
            data["bytecode"] = pickle.dumps(self.bytecode).hex()
        
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
    
    @classmethod
    def load(cls, path: Path) -> "CompiledGraph":
        """從檔案載入編譯結果"""
        with open(path, "r") as f:
            data = json.load(f)
        
        compiled_graph = cls(
            graph_id=data["graph_id"],
            graph_hash=data["graph_hash"],
            compiled_at=datetime.fromisoformat(data["compiled_at"]),
            source_code=data.get("source_code"),
            execution_order=data.get("execution_order", []),
            metadata=data.get("metadata", {})
        )
        
        # 載入 bytecode
        if "bytecode" in data:
            compiled_graph.bytecode = pickle.loads(bytes.fromhex(data["bytecode"]))
        
        return compiled_graph


class GraphCompiler:
    """圖形編譯器"""
    
    def __init__(
        self,
        cache_dir: Optional[Path] = None,
        enable_optimization: bool = True,
        enable_cache: bool = True
    ):
        self.cache_dir = cache_dir or Path.home() / ".ramen" / "cache"
        self.enable_optimization = enable_optimization
        self.enable_cache = enable_cache
        
        if self.enable_cache:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # 編譯快取
        self._cache: Dict[str, CompiledGraph] = {}
    
    def _compute_graph_hash(self, graph: RamenGraph) -> str:
        """計算圖形的哈希值，用於快取"""
        # 序列化圖形為 JSON 並計算哈希
        from ..core.models import GraphSerializer
        graph_json = GraphSerializer.to_json(graph)
        return hashlib.sha256(graph_json.encode()).hexdigest()
    
    def _get_cached_compilation(self, graph: RamenGraph) -> Optional[CompiledGraph]:
        """獲取快取的編譯結果"""
        if not self.enable_cache:
            return None
        
        graph_hash = self._compute_graph_hash(graph)
        
        # 檢查記憶體快取
        if graph_hash in self._cache:
            return self._cache[graph_hash]
        
        # 檢查檔案快取
        cache_file = self.cache_dir / f"{graph_hash}.compiled"
        if cache_file.exists():
            try:
                compiled_graph = CompiledGraph.load(cache_file)
                self._cache[graph_hash] = compiled_graph
                return compiled_graph
            except Exception:
                # 快取損壞，刪除並重新編譯
                cache_file.unlink()
        
        return None
    
    def _save_to_cache(self, graph: RamenGraph, compiled_graph: CompiledGraph):
        """保存編譯結果到快取"""
        if not self.enable_cache:
            return
        
        graph_hash = self._compute_graph_hash(graph)
        
        # 保存到記憶體快取
        self._cache[graph_hash] = compiled_graph
        
        # 保存到檔案快取
        cache_file = self.cache_dir / f"{graph_hash}.compiled"
        try:
            compiled_graph.save(cache_file)
        except Exception as e:
            # 快取保存失敗不應影響執行
            print(f"Failed to save compilation cache: {e}")
    
    def _topological_sort(self, graph: RamenGraph) -> List[str]:
        """拓撲排序獲取執行順序"""
        from collections import deque
        
        # 計算入度
        in_degree = {node.id: 0 for node in graph.nodes}
        adj_list = {node.id: [] for node in graph.nodes}
        
        for edge in graph.edges:
            adj_list[edge.source_node_id].append(edge.target_node_id)
            in_degree[edge.target_node_id] += 1
        
        # 找出所有入度為 0 的節點
        queue = deque([node_id for node_id, degree in in_degree.items() if degree == 0])
        result = []
        
        while queue:
            node_id = queue.popleft()
            result.append(node_id)
            
            # 減少相鄰節點的入度
            for neighbor in adj_list[node_id]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        if len(result) != len(graph.nodes):
            raise CompilationError(
                "Graph contains cycles or disconnected nodes",
                graph_id=graph.id
            )
        
        return result
    
    def _generate_node_function(self, node: RamenNode) -> str:
        """生成節點執行函數"""
        node_id = node.id.replace("-", "_")
        
        # 基本節點函數模板
        code = f"""
def execute_{node_id}(context, inputs):
    '''Execute node {node.id}'''
    # Node type: {node.metadata.type}
    # Namespace: {node.metadata.namespace}
    
    # Get node executor from registry
    node_type = '{node.metadata.namespace}.{node.metadata.type}'
    executor = context.get('node_registry', {{}}).get(node_type)
    
    if not executor:
        raise RuntimeError(f'No executor found for node type: {{node_type}}')
    
    # Create node context
    node_context = type('NodeContext', (), {{
        'node_id': '{node.id}',
        'node_type': '{node.metadata.type}',
        'inputs': inputs,
        'outputs': {{}},
        'get_input': lambda self, key, default=None: self.inputs.get(key, default),
        'set_output': lambda self, key, value: self.outputs.__setitem__(key, value),
        'get_output': lambda self, key, default=None: self.outputs.get(key, default)
    }})()
    
    # Execute node
    result = executor(node_context)
    
    return node_context.outputs
"""
        return code
    
    def _generate_edge_transfer(self, edge: RamenEdge) -> str:
        """生成邊數據傳遞代碼"""
        source_id = edge.source_node_id.replace("-", "_")
        target_id = edge.target_node_id.replace("-", "_")
        
        code = f"""
    # Transfer data from {edge.source_node_id} to {edge.target_node_id}
    if '{edge.source_port_id}' in outputs_{source_id}:
        inputs_{target_id}['{edge.target_port_id}'] = outputs_{source_id}['{edge.source_port_id}']
"""
        return code
    
    def _generate_graph_function(
        self,
        graph: RamenGraph,
        execution_order: List[str]
    ) -> str:
        """生成整個圖形的執行函數"""
        node_map = {node.id: node for node in graph.nodes}
        
        # 生成函數頭
        code = f"""
def execute_graph(context):
    '''Execute compiled graph {graph.id}'''
    
    # Initialize outputs dictionary
    all_outputs = {{}}
    
    # Get input variables
    variables = context.get('variables', {{}})
    
"""
        
        # 生成節點執行代碼
        for node_id in execution_order:
            node = node_map[node_id]
            node_var = node_id.replace("-", "_")
            
            # 初始化節點輸入
            code += f"    # Execute node {node_id}\n"
            code += f"    inputs_{node_var} = {{}}\n"
            
            # 添加邊數據傳遞
            for edge in graph.edges:
                if edge.target_node_id == node_id:
                    code += self._generate_edge_transfer(edge)
            
            # 添加變數輸入（如果是輸入節點）
            if node.metadata.type == "variable":
                code += f"""
    # Input from variables
    if '{node_id}' in variables:
        inputs_{node_var}['value'] = variables['{node_id}']
"""
            
            # 執行節點
            code += f"""
    # Call node executor
    outputs_{node_var} = execute_{node_var}(context, inputs_{node_var})
    all_outputs['{node_id}'] = outputs_{node_var}
    
"""
        
        # 返回結果
        code += """
    # Return all outputs
    return all_outputs
"""
        
        # 添加所有節點函數
        full_code = ""
        for node in graph.nodes:
            full_code += self._generate_node_function(node) + "\n"
        
        full_code += code + "\n"
        full_code += """
# Set result for execution
result = execute_graph(context)
"""
        
        return full_code
    
    def _optimize_code(self, source_code: str) -> str:
        """優化生成的代碼"""
        if not self.enable_optimization:
            return source_code
        
        try:
            # 解析 AST
            tree = ast.parse(source_code)
            
            # 應用優化
            # 1. 常量折疊
            tree = ast.fix_missing_locations(tree)
            
            # 2. 死代碼消除（簡單版本）
            # TODO: 實作更複雜的優化
            
            # 重新生成代碼
            import astor
            optimized_code = astor.to_source(tree)
            
            return optimized_code
        except:
            # 優化失敗，返回原始代碼
            return source_code
    
    def compile_jit(self, graph: RamenGraph) -> CompiledGraph:
        """JIT 編譯（Just-In-Time）"""
        # 檢查快取
        cached = self._get_cached_compilation(graph)
        if cached:
            return cached
        
        try:
            # 獲取執行順序
            execution_order = self._topological_sort(graph)
            
            # 生成源代碼
            source_code = self._generate_graph_function(graph, execution_order)
            
            # 優化代碼
            if self.enable_optimization:
                source_code = self._optimize_code(source_code)
            
            # 編譯為 bytecode
            bytecode = compile(source_code, f"<graph_{graph.id}>", "exec")
            
            # 建立編譯結果
            compiled_graph = CompiledGraph(
                graph_id=graph.id,
                graph_hash=self._compute_graph_hash(graph),
                compiled_at=datetime.now(),
                bytecode=bytecode,
                source_code=source_code,
                execution_order=execution_order,
                metadata={
                    "node_count": len(graph.nodes),
                    "edge_count": len(graph.edges),
                    "compilation_mode": "JIT"
                }
            )
            
            # 保存到快取
            self._save_to_cache(graph, compiled_graph)
            
            return compiled_graph
            
        except Exception as e:
            raise CompilationError(
                f"Failed to compile graph: {str(e)}",
                graph_id=graph.id,
                cause=e
            )
    
    def compile_aot(
        self,
        graph: RamenGraph,
        output_path: Optional[Path] = None
    ) -> CompiledGraph:
        """AOT 編譯（Ahead-Of-Time）"""
        # 使用 JIT 編譯的相同邏輯
        compiled_graph = self.compile_jit(graph)
        
        # 更新元數據
        compiled_graph.metadata["compilation_mode"] = "AOT"
        
        # 如果指定了輸出路徑，保存編譯結果
        if output_path:
            compiled_graph.save(output_path)
        
        return compiled_graph
    
    def compile(
        self,
        graph: RamenGraph,
        mode: str = "JIT",
        output_path: Optional[Path] = None
    ) -> CompiledGraph:
        """編譯圖形"""
        if mode == "AOT":
            return self.compile_aot(graph, output_path)
        else:
            return self.compile_jit(graph)
    
    def export_to_python(
        self,
        graph: RamenGraph,
        output_path: Path,
        include_imports: bool = True,
        include_main: bool = True
    ) -> str:
        """
        將圖形匯出為獨立的 Python 腳本

        Args:
            graph: 要匯出的圖形
            output_path: 輸出檔案路徑
            include_imports: 是否包含 import 語句
            include_main: 是否包含 if __name__ == "__main__" 區塊

        Returns:
            生成的 Python 程式碼
        """
        # 編譯圖形以獲取執行順序和程式碼
        compiled = self.compile_jit(graph)

        # 建立完整的 Python 腳本
        script_parts = []

        # 檔案頭註解
        script_parts.append(f"""#!/usr/bin/env python3
\"\"\"
Generated from: {graph.id}.ramen
Generated at: {datetime.now().isoformat()}
Graph name: {graph.metadata.name}
Graph description: {graph.metadata.description or 'No description'}

This file was automatically generated by Ramen Graph Compiler.
DO NOT edit this file manually - changes will be lost on next export.
\"\"\"
""")

        # Import 語句
        if include_imports:
            script_parts.append("""
import sys
from pathlib import Path
from typing import Dict, Any, Optional

# Add ramen to path if needed
try:
    import ramen
except ImportError:
    # Try to import from relative path
    sys.path.insert(0, str(Path(__file__).parent.parent))
    import ramen

from ramen.registry.node_registry import NodeRegistry
from ramen.core.models import RamenGraph
""")

        # 圖形資料（序列化）
        script_parts.append(f"""

# ============= Graph Data =============

GRAPH_ID = "{graph.id}"
GRAPH_NAME = "{graph.metadata.name}"
GRAPH_DESCRIPTION = \"\"\"{graph.metadata.description or ''}\"\"\"

# Graph execution order (topological sort)
EXECUTION_ORDER = {compiled.execution_order}
""")

        # 生成的執行函數
        if compiled.source_code:
            script_parts.append("""

# ============= Generated Execution Code =============
""")
            script_parts.append(compiled.source_code)

        # Helper 函數
        script_parts.append("""

# ============= Helper Functions =============

def setup_context() -> Dict[str, Any]:
    \"\"\"設置執行環境\"\"\"
    # 初始化節點註冊表
    registry = NodeRegistry()

    # 載入所有 toppings
    from ramen.topping.discovery import discover_and_load_toppings
    discover_and_load_toppings(registry)

    context = {
        'node_registry': registry._nodes,  # 節點執行器映射
        'graph_id': GRAPH_ID,
        'graph_name': GRAPH_NAME,
    }

    return context

def run_graph(inputs: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    \"\"\"
    執行圖形

    Args:
        inputs: 輸入參數字典

    Returns:
        執行結果字典
    \"\"\"
    context = setup_context()

    # 添加輸入參數
    if inputs:
        context['inputs'] = inputs

    # 執行圖形
    try:
        result = execute_graph(context)
        return {
            'success': True,
            'result': result,
            'graph_id': GRAPH_ID
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__,
            'graph_id': GRAPH_ID
        }
""")

        # Main 區塊
        if include_main:
            script_parts.append("""

# ============= Main Entry Point =============

if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(
        description=f"Execute {GRAPH_NAME} graph"
    )
    parser.add_argument(
        '--inputs',
        type=str,
        help='Input parameters as JSON string',
        default='{}'
    )
    parser.add_argument(
        '--output',
        type=str,
        help='Output file path for results (optional)'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose output'
    )

    args = parser.parse_args()

    # Parse inputs
    try:
        inputs = json.loads(args.inputs)
    except json.JSONDecodeError as e:
        print(f"Error parsing inputs JSON: {e}", file=sys.stderr)
        sys.exit(1)

    # Run graph
    if args.verbose:
        print(f"Running graph: {GRAPH_NAME}")
        print(f"Graph ID: {GRAPH_ID}")
        print(f"Inputs: {inputs}")
        print()

    result = run_graph(inputs)

    # Output results
    if result['success']:
        if args.verbose:
            print("Execution successful!")
            print(f"Result: {result['result']}")

        # Save to file if specified
        if args.output:
            output_path = Path(args.output)
            with open(output_path, 'w') as f:
                json.dump(result, f, indent=2, default=str)
            if args.verbose:
                print(f"Results saved to: {output_path}")
        else:
            # Print result as JSON to stdout
            print(json.dumps(result, indent=2, default=str))

        sys.exit(0)
    else:
        print(f"Execution failed: {result['error']}", file=sys.stderr)
        print(f"Error type: {result['error_type']}", file=sys.stderr)
        sys.exit(1)
""")

        # 組合完整腳本
        full_script = "\n".join(script_parts)

        # 寫入檔案
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(full_script)

        # 設置執行權限 (Unix/Linux/Mac)
        try:
            import stat
            output_path.chmod(output_path.stat().st_mode | stat.S_IEXEC)
        except Exception:
            pass  # Windows 不支援

        return full_script

    def clear_cache(self):
        """清除編譯快取"""
        self._cache.clear()

        if self.cache_dir.exists():
            for cache_file in self.cache_dir.glob("*.compiled"):
                cache_file.unlink()