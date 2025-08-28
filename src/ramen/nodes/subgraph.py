"""
子圖形節點
允許在圖形中引用和執行其他圖形
"""

from pathlib import Path
from typing import Any, Dict, Optional

from ..engine.context import NodeContext
from ..loader import GraphLoader
from ..engine import GraphExecutor, ExecutionContext


def subgraph_node(context: NodeContext) -> Any:
    """執行子圖形節點
    
    支援的引用方式：
    1. graph_ref: 從 dependencies.graphs 查找別名
    2. graph_path: 直接路徑引用
    3. import: 模組引用
    """
    # 獲取節點數據
    node_data = context.metadata.get("node_data", {})
    
    # 確定要載入的圖形
    graph_ref = None
    
    # 優先級 1: graph_ref (從 dependencies 查找)
    if "graph_ref" in node_data:
        graph_ref = _resolve_graph_ref(context, node_data["graph_ref"])
    
    # 優先級 2: graph_path (直接路徑)
    elif "graph_path" in node_data:
        graph_ref = node_data["graph_path"]
    
    # 優先級 3: import (模組引用)
    elif "import" in node_data:
        graph_ref = node_data["import"]
    
    # 從輸入獲取
    if not graph_ref:
        graph_ref = context.get_input("graph", None)
    
    if not graph_ref:
        raise ValueError("Subgraph node requires 'graph_ref', 'graph_path', or 'import'")
    
    # 載入圖形
    loader = GraphLoader()
    
    # 獲取當前圖形的路徑作為上下文
    current_context = context.metadata.get("graph_path")
    if current_context:
        current_context = Path(current_context)
    
    try:
        graph = loader.load_graph(graph_ref, context=current_context)
    except FileNotFoundError as e:
        raise RuntimeError(f"Failed to load subgraph '{graph_ref}': {e}")
    
    # 準備輸入
    # 方式 1: 映射所有輸入埠
    subgraph_inputs = {}
    for key in context.inputs:
        if key not in ["graph", "graph_ref", "graph_path", "import"]:
            subgraph_inputs[key] = context.get_input(key)
    
    # 方式 2: 使用 input_mapping 配置
    if "input_mapping" in node_data:
        mapped_inputs = {}
        for src, dst in node_data["input_mapping"].items():
            if src in context.inputs:
                mapped_inputs[dst] = context.get_input(src)
        subgraph_inputs = mapped_inputs
    
    # 執行子圖形
    try:
        # 建立執行器
        executor = _get_or_create_executor(context)
        
        # 建立執行上下文
        sub_context = ExecutionContext(graph_id=graph.id)
        
        # 執行
        result = executor.execute(graph, inputs=subgraph_inputs, context=sub_context)
        
        if not result.success:
            raise RuntimeError(f"Subgraph execution failed: {result.errors}")
        
        # 處理輸出
        outputs = result.outputs
        
        # 方式 1: 映射所有輸出
        if outputs:
            # 取最後一個節點的輸出作為子圖形輸出
            last_node_outputs = list(outputs.values())[-1] if outputs else {}
            
            # 方式 2: 使用 output_mapping 配置
            if "output_mapping" in node_data:
                for src, dst in node_data["output_mapping"].items():
                    # src 格式: node_id.port_id
                    if '.' in src:
                        node_id, port_id = src.split('.', 1)
                        if node_id in outputs and port_id in outputs[node_id]:
                            context.set_output(dst, outputs[node_id][port_id])
                    else:
                        # 直接從某個節點獲取所有輸出
                        if src in outputs:
                            for port_id, value in outputs[src].items():
                                context.set_output(f"{dst}_{port_id}", value)
            else:
                # 預設：輸出所有結果
                for port_id, value in last_node_outputs.items():
                    context.set_output(port_id, value)
        
        return outputs
        
    except Exception as e:
        raise RuntimeError(f"Failed to execute subgraph '{graph_ref}': {e}")


def _resolve_graph_ref(context: NodeContext, ref: str) -> str:
    """從執行上下文解析圖形引用
    
    如果 ref 是別名，從 dependencies.graphs 查找實際路徑
    """
    # 獲取執行上下文
    exec_context = context.metadata.get("exec_context")
    if not exec_context:
        return ref
    
    # 獲取當前圖形的依賴定義
    # 這需要從執行上下文傳遞
    graph_dependencies = context.metadata.get("graph_dependencies")
    if graph_dependencies and ref in graph_dependencies.get("graphs", {}):
        return graph_dependencies["graphs"][ref]
    
    return ref


def _get_or_create_executor(context: NodeContext) -> GraphExecutor:
    """獲取或建立執行器
    
    重用父圖形的執行器以共享節點註冊表
    """
    # 嘗試從上下文獲取執行器
    executor = context.metadata.get("executor")
    if executor:
        return executor
    
    # 建立新執行器
    from ..nodes import get_all_nodes
    executor = GraphExecutor(enable_async=False)
    
    # 註冊所有節點
    for node_type, node_func in get_all_nodes().items():
        executor.register_node(node_type, node_func)
    
    # 註冊子圖形節點本身
    executor.register_node("builtin.subgraph", subgraph_node)
    
    return executor


def register_subgraph_node():
    """註冊子圖形節點到全域註冊表"""
    from . import register_node
    register_node("builtin", "subgraph")(subgraph_node)