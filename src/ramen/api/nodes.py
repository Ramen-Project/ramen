"""API endpoints for node management."""

import logging
from typing import List, Dict, Any
from fastapi import APIRouter

from ..topping import get_registry

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api", tags=["nodes"])


@router.get("/nodes")
async def get_available_nodes() -> Dict[str, Any]:
    """Get all available nodes from the registry.
    
    Returns:
        Dictionary containing available nodes grouped by category
    """
    try:
        registry = get_registry()
        all_nodes = registry.get_all_nodes()
        all_metadata = registry.get_all_metadata()
        
        # Convert to frontend-compatible format
        nodes_by_category = {}
        
        for node_type, metadata in all_metadata.items():
            category = metadata.category
            
            if category not in nodes_by_category:
                nodes_by_category[category] = []
            
            # Convert port definitions to dict format
            inputs = []
            for port in metadata.inputs:
                inputs.append({
                    "name": port.name,
                    "type": port.port_type.value,
                    "required": port.required,
                    "default": port.default,
                    "description": port.description,
                    "multiple": port.multiple
                })
            
            outputs = []
            for port in metadata.outputs:
                outputs.append({
                    "name": port.name,
                    "type": port.port_type.value,
                    "required": port.required,
                    "default": port.default,
                    "description": port.description,
                    "multiple": port.multiple
                })
            
            node_info = {
                "type": node_type,
                "namespace": metadata.namespace,
                "nodeType": metadata.node_type,
                "displayName": metadata.display_name,
                "description": metadata.description,
                "icon": metadata.icon,
                "color": metadata.color,
                "inputs": inputs,
                "outputs": outputs,
                "properties": metadata.properties
            }
            
            nodes_by_category[category].append(node_info)
        
        # Also include built-in nodes that might not be in the registry yet
        builtin_nodes = _get_builtin_nodes()
        for category, nodes in builtin_nodes.items():
            if category not in nodes_by_category:
                nodes_by_category[category] = []
            nodes_by_category[category].extend(nodes)
        
        return {
            "success": True,
            "nodes": nodes_by_category,
            "total_count": sum(len(nodes) for nodes in nodes_by_category.values())
        }
        
    except Exception as e:
        logger.error(f"Failed to get available nodes: {e}")
        return {
            "success": False,
            "error": str(e),
            "nodes": {},
            "total_count": 0
        }
    
@router.get("/nodes/{node_type}")
async def get_node_metadata(node_type: str) -> Dict[str, Any]:
    """Get metadata for a specific node type.
    
    Args:
        node_type: Full node type identifier (e.g., "numpy.array")
        
    Returns:
        Node metadata
    """
    try:
        registry = get_registry()
        metadata = registry.get_node_metadata(node_type)
        
        if not metadata:
            return {
                "success": False,
                "error": f"Node type {node_type} not found"
            }
        
        # Convert to dict format
        inputs = []
        for port in metadata.inputs:
            inputs.append({
                "name": port.name,
                "type": port.port_type.value,
                "required": port.required,
                "default": port.default,
                "description": port.description,
                "multiple": port.multiple
            })
        
        outputs = []
        for port in metadata.outputs:
            outputs.append({
                "name": port.name,
                "type": port.port_type.value,
                "required": port.required,
                "default": port.default,
                "description": port.description,
                "multiple": port.multiple
            })
        
        return {
            "success": True,
            "metadata": {
                "type": node_type,
                "namespace": metadata.namespace,
                "nodeType": metadata.node_type,
                "displayName": metadata.display_name,
                "category": metadata.category,
                "description": metadata.description,
                "icon": metadata.icon,
                "color": metadata.color,
                "inputs": inputs,
                "outputs": outputs,
                "properties": metadata.properties
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get node metadata for {node_type}: {e}")
        return {
            "success": False,
            "error": str(e)
        }
    
@router.get("/toppings")
async def get_loaded_toppings() -> Dict[str, Any]:
    """Get information about loaded toppings.
    
    Returns:
        List of loaded toppings with their information
    """
    try:
        registry = get_registry()
        toppings = registry.get_all_toppings()
        
        topping_info = []
        for name, topping in toppings.items():
            info = {
                "name": topping.get_name(),
                "version": topping.get_version(),
                "description": topping.get_description(),
                "node_count": len(topping.get_nodes())
            }
            topping_info.append(info)
        
        return {
            "success": True,
            "toppings": topping_info,
            "total_count": len(topping_info)
        }
        
    except Exception as e:
        logger.error(f"Failed to get loaded toppings: {e}")
        return {
            "success": False,
            "error": str(e),
            "toppings": [],
            "total_count": 0
        }


def _get_builtin_nodes() -> Dict[str, List[Dict[str, Any]]]:
    """Get built-in node definitions.
    
    These are nodes that are always available regardless of toppings.
    
    Returns:
        Dictionary of built-in nodes grouped by category
    """
    return {
        "Context Manager": [
            {
                "type": "context.file",
                "namespace": "context",
                "nodeType": "file",
                "displayName": "File Context",
                "description": "File operation with automatic close",
                "icon": "📁",
                "color": "#4CAF50",
                "inputs": [
                    {
                        "name": "file_path",
                        "type": "string",
                        "required": True,
                        "description": "Path to file"
                    },
                    {
                        "name": "mode",
                        "type": "string",
                        "required": False,
                        "default": "r",
                        "description": "File open mode"
                    },
                    {
                        "name": "encoding",
                        "type": "string",
                        "required": False,
                        "default": "utf-8",
                        "description": "File encoding"
                    }
                ],
                "outputs": [
                    {
                        "name": "content",
                        "type": "string",
                        "required": False,
                        "description": "File content (for read)"
                    },
                    {
                        "name": "success",
                        "type": "boolean",
                        "required": True,
                        "description": "Operation success"
                    }
                ],
                "properties": {
                    "contextType": "file"
                }
            },
            {
                "type": "context.lock",
                "namespace": "context",
                "nodeType": "lock",
                "displayName": "Thread Lock",
                "description": "Thread-safe critical section",
                "icon": "🔒",
                "color": "#FF9800",
                "inputs": [
                    {
                        "name": "lock_name",
                        "type": "string",
                        "required": False,
                        "default": "default",
                        "description": "Lock identifier"
                    },
                    {
                        "name": "timeout",
                        "type": "number",
                        "required": False,
                        "description": "Lock acquisition timeout"
                    }
                ],
                "outputs": [
                    {
                        "name": "lock_acquired",
                        "type": "boolean",
                        "required": True,
                        "description": "Lock acquired successfully"
                    },
                    {
                        "name": "result",
                        "type": "any",
                        "required": False,
                        "description": "Operation result"
                    }
                ],
                "properties": {
                    "contextType": "lock"
                }
            },
            {
                "type": "context.timer",
                "namespace": "context",
                "nodeType": "timer",
                "displayName": "Timer Context",
                "description": "Measure execution time",
                "icon": "⏱️",
                "color": "#2196F3",
                "inputs": [
                    {
                        "name": "label",
                        "type": "string",
                        "required": False,
                        "default": "Operation",
                        "description": "Timer label"
                    },
                    {
                        "name": "print_result",
                        "type": "boolean",
                        "required": False,
                        "default": True,
                        "description": "Print timing result"
                    }
                ],
                "outputs": [
                    {
                        "name": "elapsed_time",
                        "type": "number",
                        "required": True,
                        "description": "Elapsed time in seconds"
                    },
                    {
                        "name": "result",
                        "type": "any",
                        "required": False,
                        "description": "Operation result"
                    }
                ],
                "properties": {
                    "contextType": "timer"
                }
            },
            {
                "type": "context.transaction",
                "namespace": "context",
                "nodeType": "transaction",
                "displayName": "Transaction",
                "description": "Database transaction with rollback",
                "icon": "💳",
                "color": "#9C27B0",
                "inputs": [
                    {
                        "name": "connection",
                        "type": "any",
                        "required": False,
                        "description": "Database connection"
                    },
                    {
                        "name": "isolation_level",
                        "type": "string",
                        "required": False,
                        "default": "READ_COMMITTED",
                        "description": "Transaction isolation level"
                    }
                ],
                "outputs": [
                    {
                        "name": "transaction",
                        "type": "object",
                        "required": True,
                        "description": "Transaction object"
                    },
                    {
                        "name": "committed",
                        "type": "boolean",
                        "required": True,
                        "description": "Transaction committed"
                    }
                ],
                "properties": {
                    "contextType": "transaction"
                }
            },
            {
                "type": "context.with_statement",
                "namespace": "context",
                "nodeType": "with_statement",
                "displayName": "With Statement",
                "description": "Python with statement group",
                "icon": "⚙️",
                "color": "#607D8B",
                "inputs": [
                    {
                        "name": "resource",
                        "type": "any",
                        "required": False,
                        "description": "Resource to manage"
                    }
                ],
                "outputs": [
                    {
                        "name": "result",
                        "type": "any",
                        "required": False,
                        "description": "Block result"
                    },
                    {
                        "name": "success",
                        "type": "boolean",
                        "required": True,
                        "description": "Execution success"
                    }
                ],
                "properties": {
                    "contextType": "custom",
                    "isGroup": True
                }
            }
        ],
        "Basic": [
            {
                "type": "builtin.constant",
                "namespace": "builtin",
                "nodeType": "constant",
                "displayName": "Constant",
                "description": "Constant value",
                "icon": "🔢",
                "color": "#607D8B",
                "inputs": [],
                "outputs": [
                    {
                        "name": "value",
                        "type": "any",
                        "required": True,
                        "description": "Constant value"
                    }
                ],
                "properties": {
                    "value": None,
                    "type": "number"
                }
            },
            {
                "type": "builtin.print",
                "namespace": "builtin",
                "nodeType": "print",
                "displayName": "Print",
                "description": "Print value to console",
                "icon": "🖨️",
                "color": "#795548",
                "inputs": [
                    {
                        "name": "value",
                        "type": "any",
                        "required": True,
                        "description": "Value to print"
                    }
                ],
                "outputs": [
                    {
                        "name": "value",
                        "type": "any",
                        "required": True,
                        "description": "Pass-through value"
                    }
                ],
                "properties": {}
            }
        ],
        "Math": [
            {
                "type": "builtin.add",
                "namespace": "builtin",
                "nodeType": "add",
                "displayName": "Add",
                "description": "Add two numbers",
                "icon": "➕",
                "color": "#2196F3",
                "inputs": [
                    {
                        "name": "a",
                        "type": "number",
                        "required": True,
                        "description": "First number"
                    },
                    {
                        "name": "b",
                        "type": "number",
                        "required": True,
                        "description": "Second number"
                    }
                ],
                "outputs": [
                    {
                        "name": "result",
                        "type": "number",
                        "required": True,
                        "description": "Sum of a and b"
                    }
                ],
                "properties": {}
            },
            {
                "type": "builtin.multiply",
                "namespace": "builtin",
                "nodeType": "multiply",
                "displayName": "Multiply",
                "description": "Multiply two numbers",
                "icon": "✖️",
                "color": "#9C27B0",
                "inputs": [
                    {
                        "name": "a",
                        "type": "number",
                        "required": True,
                        "description": "First number"
                    },
                    {
                        "name": "b",
                        "type": "number",
                        "required": True,
                        "description": "Second number"
                    }
                ],
                "outputs": [
                    {
                        "name": "result",
                        "type": "number",
                        "required": True,
                        "description": "Product of a and b"
                    }
                ],
                "properties": {}
            }
        ],
        "Logic": [
            {
                "type": "builtin.if",
                "namespace": "builtin",
                "nodeType": "if",
                "displayName": "If/Else",
                "description": "Conditional branching",
                "icon": "🔀",
                "color": "#FFC107",
                "inputs": [
                    {
                        "name": "condition",
                        "type": "boolean",
                        "required": True,
                        "description": "Condition to evaluate"
                    },
                    {
                        "name": "true_value",
                        "type": "any",
                        "required": True,
                        "description": "Value if true"
                    },
                    {
                        "name": "false_value",
                        "type": "any",
                        "required": True,
                        "description": "Value if false"
                    }
                ],
                "outputs": [
                    {
                        "name": "result",
                        "type": "any",
                        "required": True,
                        "description": "Selected value"
                    }
                ],
                "properties": {}
            },
            {
                "type": "builtin.compare",
                "namespace": "builtin",
                "nodeType": "compare",
                "displayName": "Compare",
                "description": "Compare two values",
                "icon": "⚖️",
                "color": "#00BCD4",
                "inputs": [
                    {
                        "name": "a",
                        "type": "any",
                        "required": True,
                        "description": "First value"
                    },
                    {
                        "name": "b",
                        "type": "any",
                        "required": True,
                        "description": "Second value"
                    },
                    {
                        "name": "operator",
                        "type": "string",
                        "required": False,
                        "default": "==",
                        "description": "Comparison operator"
                    }
                ],
                "outputs": [
                    {
                        "name": "result",
                        "type": "boolean",
                        "required": True,
                        "description": "Comparison result"
                    }
                ],
                "properties": {
                    "operators": ["==", "!=", ">", "<", ">=", "<="]
                }
            }
        ]
    }