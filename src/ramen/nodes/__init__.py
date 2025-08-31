"""
基本節點庫
提供核心運算節點
"""

from typing import Dict, Any, Callable
from ..engine.context import NodeContext


# 節點註冊表
NODE_REGISTRY: Dict[str, Callable] = {}


def register_node(namespace: str, node_type: str):
    """註冊節點裝飾器"""
    def decorator(func: Callable):
        full_type = f"{namespace}.{node_type}"
        NODE_REGISTRY[full_type] = func
        return func
    return decorator


# 基本算術節點
@register_node("builtin", "add")
def add_node(context: NodeContext):
    """加法節點"""
    a = context.get_input("a", 0)
    b = context.get_input("b", 0)
    result = a + b
    context.set_output("result", result)
    return result


@register_node("builtin", "subtract")
def subtract_node(context: NodeContext):
    """減法節點"""
    a = context.get_input("a", 0)
    b = context.get_input("b", 0)
    result = a - b
    context.set_output("result", result)
    return result


@register_node("builtin", "multiply")
def multiply_node(context: NodeContext):
    """乘法節點"""
    a = context.get_input("a", 1)
    # 檢查 node_data 中的默認值
    node_data = context.metadata.get("node_data", {})
    if "b" in node_data:
        b = node_data["b"]
    else:
        b = context.get_input("b", 1)
    result = a * b
    context.set_output("result", result)
    return result


@register_node("builtin", "divide")
def divide_node(context: NodeContext):
    """除法節點"""
    a = context.get_input("a", 1)
    b = context.get_input("b", 1)
    if b == 0:
        raise ValueError("Division by zero")
    result = a / b
    context.set_output("result", result)
    return result


# 常數和變數節點
@register_node("builtin", "constant")
def constant_node(context: NodeContext):
    """常數節點"""
    # 優先從 metadata 的 node_data 獲取值
    node_data = context.metadata.get("node_data", {})
    if node_data and "value" in node_data:
        value = node_data["value"]
    else:
        value = context.get_input("value", 0)
    context.set_output("output", value)
    return value


@register_node("builtin", "variable")
def variable_node(context: NodeContext):
    """變數節點"""
    # 從 node_data 獲取變數名稱
    node_data = context.metadata.get("node_data", {})
    name = node_data.get("name", context.get_input("name", "var"))
    
    # 嘗試從輸入獲取值
    value = context.get_input("value", None)
    
    # 如果沒有直接輸入值，從執行上下文的變數中獲取
    if value is None:
        # 需要從執行上下文獲取變數
        exec_context = context.metadata.get("exec_context")
        if exec_context:
            value = exec_context.get_variable(name, None)
    
    context.set_output("output", value)
    return value


# 比較節點
@register_node("builtin", "greater_than")
def greater_than_node(context: NodeContext):
    """大於比較"""
    a = context.get_input("a", 0)
    b = context.get_input("b", 0)
    result = a > b
    context.set_output("result", result)
    return result


@register_node("builtin", "less_than")
def less_than_node(context: NodeContext):
    """小於比較"""
    a = context.get_input("a", 0)
    b = context.get_input("b", 0)
    result = a < b
    context.set_output("result", result)
    return result


@register_node("builtin", "equal")
def equal_node(context: NodeContext):
    """等於比較"""
    a = context.get_input("a")
    b = context.get_input("b")
    result = a == b
    context.set_output("result", result)
    return result


# 邏輯節點
@register_node("builtin", "and")
def and_node(context: NodeContext):
    """邏輯 AND"""
    a = context.get_input("a", False)
    b = context.get_input("b", False)
    result = bool(a) and bool(b)
    context.set_output("result", result)
    return result


@register_node("builtin", "or")
def or_node(context: NodeContext):
    """邏輯 OR"""
    a = context.get_input("a", False)
    b = context.get_input("b", False)
    result = bool(a) or bool(b)
    context.set_output("result", result)
    return result


@register_node("builtin", "not")
def not_node(context: NodeContext):
    """邏輯 NOT"""
    value = context.get_input("value", False)
    result = not bool(value)
    context.set_output("result", result)
    return result


# 字串節點
@register_node("builtin", "concat")
def concat_node(context: NodeContext):
    """字串連接"""
    a = context.get_input("a", "")
    b = context.get_input("b", "")
    result = str(a) + str(b)
    context.set_output("result", result)
    return result


@register_node("builtin", "format")
def format_node(context: NodeContext):
    """字串格式化"""
    template = context.get_input("template", "{}")
    value = context.get_input("value", "")
    result = template.format(value)
    context.set_output("result", result)
    return result


# 輸入輸出節點
@register_node("builtin", "print")
def print_node(context: NodeContext):
    """列印節點"""
    value = context.get_input("value")
    # 檢查 node_data 中的 label
    node_data = context.metadata.get("node_data", {})
    if "label" in node_data:
        label = node_data["label"]
    else:
        label = context.get_input("label", "Output")
    print(f"{label}: {value}")
    context.set_output("output", value)
    return value



# 子圖形節點
@register_node("builtin", "subgraph")
def subgraph_node(context: NodeContext):
    """執行子圖形節點 - 委派給 subgraph 模組"""
    from .subgraph import subgraph_node as _subgraph_node
    return _subgraph_node(context)


def get_all_nodes() -> Dict[str, Callable]:
    """獲取所有註冊的節點"""
    # 確保 context manager 節點已註冊
    from .context_manager import register_context_manager_nodes
    try:
        register_context_manager_nodes()
    except:
        pass  # 可能已經註冊過了
    
    return NODE_REGISTRY.copy()