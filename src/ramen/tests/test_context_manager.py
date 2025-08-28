"""
Tests for context manager nodes
"""

import pytest
import tempfile
import os
import time
from pathlib import Path

from ramen.engine.context import NodeContext
from ramen.nodes.context_manager import (
    context_manager_enter,
    context_manager_exit,
    file_context_node,
    timer_context_node,
    lock_context_node,
    transaction_context_node,
    with_statement_node,
    register_context_manager_nodes
)


def test_file_context_read():
    """Test file context manager for reading"""
    # Create a temporary file
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
        f.write("Hello, World!")
        temp_path = f.name
    
    try:
        # Test file context node
        context = NodeContext(
            node_id="test_file",
            node_type="context.file",
            inputs={
                "file_path": temp_path,
                "mode": "r",
                "operation": "read"
            },
            metadata={}
        )
        
        result = file_context_node(context)
        
        assert result == "Hello, World!"
        assert context.outputs["content"] == "Hello, World!"
        assert context.outputs["success"] is True
        
    finally:
        # Clean up
        os.unlink(temp_path)


def test_file_context_write():
    """Test file context manager for writing"""
    with tempfile.TemporaryDirectory() as tmpdir:
        file_path = Path(tmpdir) / "test.txt"
        
        # Test write operation
        context = NodeContext(
            node_id="test_write",
            node_type="context.file",
            inputs={
                "file_path": str(file_path),
                "mode": "w",
                "operation": "write",
                "data": "Test content"
            },
            metadata={}
        )
        
        result = file_context_node(context)
        
        assert result is True
        assert context.outputs["success"] is True
        assert file_path.exists()
        assert file_path.read_text() == "Test content"


def test_context_manager_enter_exit():
    """Test separate enter and exit nodes"""
    # Test file enter
    with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
        f.write("Test data")
        temp_path = f.name
    
    try:
        # Enter context
        enter_context = NodeContext(
            node_id="enter",
            node_type="context.enter",
            inputs={
                "file_path": temp_path,
                "mode": "r"
            },
            metadata={
                "node_data": {"context_type": "file"}
            }
        )
        
        file_obj = context_manager_enter(enter_context)
        assert file_obj is not None
        assert enter_context.outputs["success"] is True
        
        # Read from file
        content = file_obj.read()
        assert content == "Test data"
        
        # Exit context
        exit_context = NodeContext(
            node_id="exit",
            node_type="context.exit",
            inputs={},
            metadata={
                "node_data": {"context_type": "file"},
                "file_object": file_obj
            }
        )
        
        context_manager_exit(exit_context)
        assert exit_context.outputs["closed"] is True
        assert exit_context.outputs["success"] is True
        
        # File should be closed now
        with pytest.raises(ValueError):
            file_obj.read()
            
    finally:
        os.unlink(temp_path)


def test_timer_context():
    """Test timer context manager"""
    context = NodeContext(
        node_id="timer",
        node_type="context.timer",
        inputs={
            "label": "Test Operation",
            "print_result": False,
            "operation": lambda: time.sleep(0.1)
        },
        metadata={}
    )
    
    result = timer_context_node(context)
    
    assert context.outputs["success"] is True
    assert "elapsed_time" in context.outputs
    assert context.outputs["elapsed_time"] >= 0.1
    assert context.outputs["elapsed_time"] < 0.2  # Should not take much longer


def test_lock_context():
    """Test lock context manager"""
    import threading
    
    # Shared resource
    shared_list = []
    
    def critical_operation():
        shared_list.append("item")
        return len(shared_list)
    
    context = NodeContext(
        node_id="lock",
        node_type="context.lock",
        inputs={
            "lock_name": "test_lock",
            "operation": critical_operation
        },
        metadata={}
    )
    
    result = lock_context_node(context)
    
    assert context.outputs["success"] is True
    assert context.outputs["lock_acquired"] is True
    assert result == 1
    assert len(shared_list) == 1


def test_transaction_context():
    """Test transaction context manager"""
    operations = [
        lambda txn: {"action": "insert", "data": "row1"},
        lambda txn: {"action": "update", "data": "row2"},
        lambda txn: {"action": "delete", "data": "row3"}
    ]
    
    context = NodeContext(
        node_id="transaction",
        node_type="context.transaction",
        inputs={
            "operations": operations,
            "isolation_level": "SERIALIZABLE"
        },
        metadata={}
    )
    
    results = transaction_context_node(context)
    
    assert context.outputs["success"] is True
    assert context.outputs["committed"] is True
    assert len(results) == 3
    assert context.outputs["transaction"]["committed"] is True


def test_transaction_rollback():
    """Test transaction rollback on error"""
    def failing_operation(txn):
        raise ValueError("Operation failed")
    
    operations = [
        lambda txn: {"action": "insert", "data": "row1"},
        failing_operation
    ]
    
    context = NodeContext(
        node_id="transaction",
        node_type="context.transaction",
        inputs={
            "operations": operations
        },
        metadata={}
    )
    
    with pytest.raises(RuntimeError) as exc_info:
        transaction_context_node(context)
    
    assert "rolled back" in str(exc_info.value)
    assert context.outputs["success"] is False
    assert context.outputs["rollback"] is True
    assert context.outputs["committed"] is False


def test_with_statement_node():
    """Test with statement group node"""
    # Mock body nodes
    body_results = []
    
    def body_node(sub_context):
        body_results.append("executed")
        return "result"
    
    context = NodeContext(
        node_id="with",
        node_type="context.with_statement",
        inputs={
            "label": "Test Timer"
        },
        metadata={
            "node_data": {
                "context_type": "timer",
                "body_nodes": [body_node]
            }
        }
    )
    
    result = with_statement_node(context)
    
    assert context.outputs["success"] is True
    assert len(body_results) == 1
    assert "elapsed_time" in context.outputs  # Timer context should set this


def test_with_statement_exception_handling():
    """Test with statement exception handling"""
    def failing_body_node(sub_context):
        raise ValueError("Body failed")
    
    # Test without suppression
    context = NodeContext(
        node_id="with",
        node_type="context.with_statement",
        inputs={},
        metadata={
            "node_data": {
                "context_type": "timer",
                "body_nodes": [failing_body_node],
                "suppress_exception": False
            }
        }
    )
    
    with pytest.raises(ValueError):
        with_statement_node(context)
    
    # Test with suppression
    context = NodeContext(
        node_id="with",
        node_type="context.with_statement",
        inputs={},
        metadata={
            "node_data": {
                "context_type": "timer",
                "body_nodes": [failing_body_node],
                "suppress_exception": True
            }
        }
    )
    
    result = with_statement_node(context)
    
    assert result is None
    assert context.outputs["success"] is False
    assert context.outputs["suppressed"] is True
    assert "error" in context.outputs


def test_register_nodes():
    """Test node registration"""
    from ramen.nodes import NODE_REGISTRY
    
    # Clear registry
    NODE_REGISTRY.clear()
    
    # Register nodes
    register_context_manager_nodes()
    
    # Check nodes are registered
    assert "context.enter" in NODE_REGISTRY
    assert "context.exit" in NODE_REGISTRY
    assert "context.with_statement" in NODE_REGISTRY
    assert "context.file" in NODE_REGISTRY
    assert "context.lock" in NODE_REGISTRY
    assert "context.timer" in NODE_REGISTRY
    assert "context.transaction" in NODE_REGISTRY


if __name__ == "__main__":
    pytest.main([__file__, "-v"])