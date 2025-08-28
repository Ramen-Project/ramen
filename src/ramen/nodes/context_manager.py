"""
Context Manager 節點實作
提供 Python with statement 的視覺化節點
"""

from typing import Any, Dict, Optional, List
from contextlib import contextmanager
import time
import threading
from pathlib import Path

from ..engine.context import NodeContext


# ============================================================================
# Context Manager Enter/Exit 節點
# ============================================================================

def context_manager_enter(context: NodeContext) -> Any:
    """Context manager 進入節點 (__enter__)
    
    初始化資源並返回上下文變數
    """
    node_data = context.metadata.get("node_data", {})
    context_type = node_data.get("context_type", "custom")
    
    if context_type == "file":
        # 檔案 context manager
        file_path = context.get_input("file_path", "")
        mode = context.get_input("mode", "r")
        encoding = context.get_input("encoding", "utf-8")
        
        try:
            if mode.startswith("r"):
                file_obj = open(file_path, mode, encoding=encoding)
            else:
                file_obj = open(file_path, mode)
            
            # 儲存檔案物件到 context
            context.metadata["file_object"] = file_obj
            context.set_output("file", file_obj)
            context.set_output("success", True)
            return file_obj
            
        except Exception as e:
            context.set_output("file", None)
            context.set_output("success", False)
            context.set_output("error", str(e))
            raise RuntimeError(f"Failed to open file: {e}")
    
    elif context_type == "lock":
        # 執行緒鎖 context manager
        timeout = context.get_input("timeout", None)
        
        lock = threading.Lock()
        acquired = lock.acquire(timeout=timeout) if timeout else lock.acquire()
        
        if acquired:
            context.metadata["lock_object"] = lock
            context.set_output("lock", lock)
            context.set_output("acquired", True)
            return lock
        else:
            context.set_output("lock", None)
            context.set_output("acquired", False)
            raise RuntimeError("Failed to acquire lock")
    
    elif context_type == "timer":
        # 計時器 context manager
        label = context.get_input("label", "Timer")
        
        start_time = time.time()
        context.metadata["timer_start"] = start_time
        context.metadata["timer_label"] = label
        context.set_output("start_time", start_time)
        
        return start_time
    
    elif context_type == "transaction":
        # 資料庫交易 context manager (模擬)
        connection = context.get_input("connection", None)
        isolation_level = context.get_input("isolation_level", "READ_COMMITTED")
        
        # 模擬開始交易
        transaction = {
            "id": f"txn_{time.time()}",
            "connection": connection,
            "isolation_level": isolation_level,
            "started_at": time.time(),
            "operations": []
        }
        
        context.metadata["transaction"] = transaction
        context.set_output("transaction", transaction)
        context.set_output("started", True)
        
        return transaction
    
    elif context_type == "custom":
        # 自定義 context manager
        resource = context.get_input("resource", None)
        init_func = context.get_input("init_func", None)
        
        if init_func and callable(init_func):
            result = init_func(resource)
            context.metadata["custom_resource"] = result
            context.set_output("resource", result)
            return result
        else:
            context.set_output("resource", resource)
            return resource
    
    else:
        raise ValueError(f"Unknown context type: {context_type}")


def context_manager_exit(context: NodeContext) -> Any:
    """Context manager 退出節點 (__exit__)
    
    清理資源並處理異常
    """
    node_data = context.metadata.get("node_data", {})
    context_type = node_data.get("context_type", "custom")
    
    # 獲取異常資訊（如果有）
    exc_type = context.get_input("exc_type", None)
    exc_value = context.get_input("exc_value", None)
    exc_tb = context.get_input("exc_tb", None)
    
    success = exc_type is None
    
    if context_type == "file":
        # 關閉檔案
        file_obj = context.metadata.get("file_object")
        if file_obj:
            try:
                file_obj.close()
                context.set_output("closed", True)
            except Exception as e:
                context.set_output("closed", False)
                context.set_output("error", str(e))
                success = False
    
    elif context_type == "lock":
        # 釋放鎖
        lock_obj = context.metadata.get("lock_object")
        if lock_obj:
            try:
                lock_obj.release()
                context.set_output("released", True)
            except Exception as e:
                context.set_output("released", False)
                context.set_output("error", str(e))
                success = False
    
    elif context_type == "timer":
        # 結束計時
        start_time = context.metadata.get("timer_start", time.time())
        label = context.metadata.get("timer_label", "Timer")
        
        end_time = time.time()
        elapsed = end_time - start_time
        
        context.set_output("elapsed_time", elapsed)
        context.set_output("message", f"{label}: {elapsed:.4f} seconds")
        
        # 可選：列印計時結果
        if node_data.get("print_result", True):
            print(f"{label}: {elapsed:.4f} seconds")
    
    elif context_type == "transaction":
        # 提交或回滾交易
        transaction = context.metadata.get("transaction")
        if transaction:
            if success:
                # 提交交易
                transaction["committed"] = True
                transaction["committed_at"] = time.time()
                context.set_output("committed", True)
                context.set_output("rollback", False)
            else:
                # 回滾交易
                transaction["rollback"] = True
                transaction["rollback_at"] = time.time()
                context.set_output("committed", False)
                context.set_output("rollback", True)
            
            context.set_output("transaction", transaction)
    
    elif context_type == "custom":
        # 自定義清理
        cleanup_func = context.get_input("cleanup_func", None)
        resource = context.metadata.get("custom_resource")
        
        if cleanup_func and callable(cleanup_func):
            try:
                cleanup_func(resource)
                context.set_output("cleaned", True)
            except Exception as e:
                context.set_output("cleaned", False)
                context.set_output("error", str(e))
                success = False
    
    context.set_output("success", success)
    
    # 返回是否抑制異常（False = 不抑制，讓異常繼續傳播）
    suppress_exception = node_data.get("suppress_exception", False)
    return suppress_exception


# ============================================================================
# 特定的 Context Manager 節點
# ============================================================================

def file_context_node(context: NodeContext) -> Any:
    """檔案操作 context manager
    
    自動處理檔案的開啟和關閉
    """
    file_path = context.get_input("file_path", "")
    mode = context.get_input("mode", "r")
    encoding = context.get_input("encoding", "utf-8")
    operation = context.get_input("operation", "read")  # read, write, append
    data = context.get_input("data", None)
    
    try:
        if mode.startswith("r"):
            with open(file_path, mode, encoding=encoding) as f:
                if operation == "read":
                    content = f.read()
                    context.set_output("content", content)
                    context.set_output("success", True)
                    return content
                elif operation == "readlines":
                    lines = f.readlines()
                    context.set_output("lines", lines)
                    context.set_output("success", True)
                    return lines
        else:
            with open(file_path, mode) as f:
                if operation == "write" and data is not None:
                    f.write(str(data))
                    context.set_output("written", True)
                    context.set_output("success", True)
                    return True
                elif operation == "append" and data is not None:
                    f.write(str(data))
                    context.set_output("appended", True)
                    context.set_output("success", True)
                    return True
                    
    except Exception as e:
        context.set_output("success", False)
        context.set_output("error", str(e))
        raise RuntimeError(f"File operation failed: {e}")


def lock_context_node(context: NodeContext) -> Any:
    """執行緒鎖 context manager
    
    確保臨界區的執行緒安全
    """
    # 獲取或建立鎖
    lock_name = context.get_input("lock_name", "default")
    timeout = context.get_input("timeout", None)
    
    # 從共享狀態獲取鎖（這裡簡化處理）
    locks = context.metadata.get("locks", {})
    if lock_name not in locks:
        locks[lock_name] = threading.Lock()
        context.metadata["locks"] = locks
    
    lock = locks[lock_name]
    
    # 執行臨界區操作
    critical_operation = context.get_input("operation", None)
    
    try:
        with lock:
            context.set_output("lock_acquired", True)
            
            if critical_operation and callable(critical_operation):
                result = critical_operation()
                context.set_output("result", result)
                context.set_output("success", True)
                return result
            else:
                # 如果沒有操作，只是獲取和釋放鎖
                context.set_output("success", True)
                return True
                
    except Exception as e:
        context.set_output("success", False)
        context.set_output("error", str(e))
        raise RuntimeError(f"Lock operation failed: {e}")


def timer_context_node(context: NodeContext) -> Any:
    """計時器 context manager
    
    測量程式碼區塊的執行時間
    """
    label = context.get_input("label", "Operation")
    print_result = context.get_input("print_result", True)
    
    # 要計時的操作
    operation = context.get_input("operation", None)
    
    start_time = time.time()
    
    try:
        if operation and callable(operation):
            result = operation()
        else:
            # 模擬一些操作
            time.sleep(0.1)
            result = None
            
        end_time = time.time()
        elapsed = end_time - start_time
        
        if print_result:
            print(f"{label}: {elapsed:.4f} seconds")
            
        context.set_output("elapsed_time", elapsed)
        context.set_output("result", result)
        context.set_output("success", True)
        
        return elapsed
        
    except Exception as e:
        end_time = time.time()
        elapsed = end_time - start_time
        
        if print_result:
            print(f"{label} (failed): {elapsed:.4f} seconds")
            
        context.set_output("elapsed_time", elapsed)
        context.set_output("success", False)
        context.set_output("error", str(e))
        raise


def transaction_context_node(context: NodeContext) -> Any:
    """資料庫交易 context manager
    
    確保交易的原子性
    """
    connection = context.get_input("connection", None)
    operations = context.get_input("operations", [])
    isolation_level = context.get_input("isolation_level", "READ_COMMITTED")
    
    # 開始交易
    transaction = {
        "id": f"txn_{time.time()}",
        "connection": connection,
        "isolation_level": isolation_level,
        "started_at": time.time(),
        "operations": []
    }
    
    try:
        # 執行所有操作
        results = []
        for op in operations:
            if callable(op):
                result = op(transaction)
                results.append(result)
                transaction["operations"].append({
                    "type": "operation",
                    "result": str(result),
                    "timestamp": time.time()
                })
        
        # 提交交易
        transaction["committed"] = True
        transaction["committed_at"] = time.time()
        
        context.set_output("transaction", transaction)
        context.set_output("results", results)
        context.set_output("committed", True)
        context.set_output("success", True)
        
        return results
        
    except Exception as e:
        # 回滾交易
        transaction["rollback"] = True
        transaction["rollback_at"] = time.time()
        transaction["error"] = str(e)
        
        context.set_output("transaction", transaction)
        context.set_output("committed", False)
        context.set_output("rollback", True)
        context.set_output("success", False)
        context.set_output("error", str(e))
        
        raise RuntimeError(f"Transaction failed and rolled back: {e}")


# ============================================================================
# With Statement 群組節點
# ============================================================================

def with_statement_node(context: NodeContext) -> Any:
    """With statement 群組節點
    
    執行整個 context manager 區塊
    """
    node_data = context.metadata.get("node_data", {})
    context_type = node_data.get("context_type", "custom")
    
    # 獲取群組內的節點
    body_nodes = node_data.get("body_nodes", [])
    
    # 建立子執行上下文
    sub_context = {
        "parent": context,
        "context_type": context_type,
        "resources": {}
    }
    
    try:
        # 執行 __enter__
        enter_result = context_manager_enter(context)
        sub_context["enter_result"] = enter_result
        
        # 執行群組內的節點
        body_results = []
        for node in body_nodes:
            if callable(node):
                result = node(sub_context)
                body_results.append(result)
        
        # 正常退出，執行 __exit__
        context.set_input("exc_type", None)
        context.set_input("exc_value", None)
        context.set_input("exc_tb", None)
        exit_result = context_manager_exit(context)
        
        context.set_output("enter_result", enter_result)
        context.set_output("body_results", body_results)
        context.set_output("exit_result", exit_result)
        context.set_output("success", True)
        
        return body_results
        
    except Exception as e:
        # 異常退出，執行 __exit__ 並傳遞異常資訊
        import sys
        exc_info = sys.exc_info()
        context.set_input("exc_type", exc_info[0])
        context.set_input("exc_value", exc_info[1])
        context.set_input("exc_tb", exc_info[2])
        
        suppress = context_manager_exit(context)
        
        if not suppress:
            # 重新拋出異常
            raise
        else:
            # 抑制異常
            context.set_output("success", False)
            context.set_output("error", str(e))
            context.set_output("suppressed", True)
            return None


# ============================================================================
# 註冊節點
# ============================================================================

def register_context_manager_nodes():
    """註冊所有 context manager 節點"""
    from . import register_node
    
    # 基本 context manager 節點
    register_node("context", "enter")(context_manager_enter)
    register_node("context", "exit")(context_manager_exit)
    register_node("context", "with_statement")(with_statement_node)
    
    # 特定 context manager 節點
    register_node("context", "file")(file_context_node)
    register_node("context", "lock")(lock_context_node)
    register_node("context", "timer")(timer_context_node)
    register_node("context", "transaction")(transaction_context_node)