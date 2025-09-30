"""Debug inspection tools."""

import json
import traceback
from typing import Any
from ramen.nodes.base import node, NodeContext, Port, PortType


@node(
    namespace="debug",
    node_type="inspect",
    display_name="Inspect",
    category="Debug/Inspect",
    description="Inspect value structure and metadata",
    icon="🔍",
    color="#F44336",
    inputs=[
        Port("value", PortType.ANY, required=True),
        Port("depth", PortType.NUMBER, required=False)
    ],
    outputs=[
        Port("value", PortType.ANY),
        Port("info", PortType.OBJECT)
    ]
)
def inspect_node(context: NodeContext) -> Any:
    """Inspect value structure and metadata."""
    value = context.get_input("value")
    depth = int(context.get_input("depth", 2))
    
    def inspect_recursive(obj, current_depth=0):
        if current_depth >= depth:
            return f"<{type(obj).__name__} (depth limit reached)>"
        
        if obj is None:
            return None
        elif isinstance(obj, (bool, int, float, str)):
            return obj
        elif isinstance(obj, (list, tuple)):
            return [inspect_recursive(item, current_depth + 1) for item in obj[:10]]  # Limit to first 10 items
        elif isinstance(obj, dict):
            return {k: inspect_recursive(v, current_depth + 1) for k, v in list(obj.items())[:10]}  # Limit to first 10 keys
        else:
            return f"<{type(obj).__name__}>"
    
    info = {
        "type": type(value).__name__,
        "value": inspect_recursive(value),
        "size": len(value) if hasattr(value, "__len__") else None,
        "is_callable": callable(value),
        "is_truthy": bool(value),
        "attributes": [attr for attr in dir(value) if not attr.startswith("_")][:10] if hasattr(value, "__dict__") else []
    }
    
    context.set_output("value", value)
    context.set_output("info", info)
    return value


@node(
    namespace="debug",
    node_type="trace",
    display_name="Trace",
    category="Debug/Inspect",
    description="Trace execution with custom message",
    icon="📝",
    color="#F44336",
    inputs=[
        Port("value", PortType.ANY, required=True),
        Port("message", PortType.STRING, required=False),
        Port("enabled", PortType.BOOLEAN, required=False)
    ],
    outputs=[Port("value", PortType.ANY)]
)
def trace_node(context: NodeContext) -> Any:
    """Trace execution with custom message."""
    value = context.get_input("value")
    message = context.get_input("message", "Trace")
    enabled = context.get_input("enabled", True)
    
    if enabled:
        value_str = json.dumps(value, default=str, indent=2) if value is not None else "None"
        print(f"[TRACE] {message}: {value_str}")
    
    context.set_output("value", value)
    return value


@node(
    namespace="debug",
    node_type="dump",
    display_name="Dump",
    category="Debug/Inspect",
    description="Dump value to JSON string for inspection",
    icon="💾",
    color="#F44336",
    inputs=[
        Port("value", PortType.ANY, required=True),
        Port("pretty", PortType.BOOLEAN, required=False)
    ],
    outputs=[
        Port("value", PortType.ANY),
        Port("dump", PortType.STRING)
    ]
)
def dump_node(context: NodeContext) -> Any:
    """Dump value to JSON string for inspection."""
    value = context.get_input("value")
    pretty = context.get_input("pretty", True)
    
    try:
        if pretty:
            dump = json.dumps(value, default=str, indent=2, ensure_ascii=False)
        else:
            dump = json.dumps(value, default=str, ensure_ascii=False)
    except Exception as e:
        dump = f"Dump error: {str(e)} - Raw: {repr(value)}"
    
    context.set_output("value", value)
    context.set_output("dump", dump)
    return value


@node(
    namespace="debug",
    node_type="assert",
    display_name="Assert",
    category="Debug/Inspect",
    description="Assert condition is true, pass through value",
    icon="✅",
    color="#F44336",
    inputs=[
        Port("value", PortType.ANY, required=True),
        Port("condition", PortType.BOOLEAN, required=True),
        Port("message", PortType.STRING, required=False)
    ],
    outputs=[Port("value", PortType.ANY)]
)
def assert_node(context: NodeContext) -> Any:
    """Assert condition is true, pass through value."""
    value = context.get_input("value")
    condition = context.get_input("condition", True)
    message = context.get_input("message", "Assertion failed")
    
    if not condition:
        error_msg = f"Assertion failed: {message}"
        print(f"[DEBUG] {error_msg}")
        # In a real implementation, this might raise an exception or set an error state
    
    context.set_output("value", value)
    return value


@node(
    namespace="debug",
    node_type="breakpoint",
    display_name="Breakpoint",
    category="Debug/Inspect",
    description="Create a debugging breakpoint (logs value)",
    icon="⏸️",
    color="#F44336",
    inputs=[
        Port("value", PortType.ANY, required=True),
        Port("label", PortType.STRING, required=False),
        Port("enabled", PortType.BOOLEAN, required=False)
    ],
    outputs=[Port("value", PortType.ANY)]
)
def breakpoint_node(context: NodeContext) -> Any:
    """Create a debugging breakpoint (logs value)."""
    value = context.get_input("value")
    label = context.get_input("label", "Breakpoint")
    enabled = context.get_input("enabled", True)
    
    if enabled:
        print(f"[BREAKPOINT] {label}")
        print(f"  Type: {type(value).__name__}")
        print(f"  Value: {repr(value)}")
        print(f"  Stack: {traceback.format_stack()[-2].strip()}")
    
    context.set_output("value", value)
    return value


@node(
    namespace="debug",
    node_type="log",
    display_name="Debug Log",
    category="Debug/Inspect",
    description="Log value with level and pass through",
    icon="📋",
    color="#F44336",
    inputs=[
        Port("value", PortType.ANY, required=True),
        Port("level", PortType.STRING, required=False),
        Port("message", PortType.STRING, required=False)
    ],
    outputs=[Port("value", PortType.ANY)]
)
def log_node(context: NodeContext) -> Any:
    """Log value with level and pass through."""
    value = context.get_input("value")
    level = context.get_input("level", "INFO").upper()
    message = context.get_input("message", "Debug log")
    
    print(f"[{level}] {message}: {repr(value)}")
    
    context.set_output("value", value)
    return value