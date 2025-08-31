"""
Input/Output nodes for core operations.
"""

from typing import Any
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="core",
    node_type="input",
    display_name="Input",
    category="Core/IO",
    description="Graph input node",
    icon="📥",
    color="#4CAF50",
    inputs=[
        Port("default", PortType.ANY, required=False, description="Default value if not provided")
    ],
    outputs=[
        Port("value", PortType.ANY, description="Input value")
    ],
    properties={
        "input_name": "input",
        "input_type": "any"
    }
)
def input_node(context: NodeContext) -> Any:
    """Graph input node - receives external input."""
    input_name = context.get_property("input_name", "input")
    default_value = context.get_input("default")
    
    # Get value from graph inputs
    graph_inputs = context.get_metadata("graph_inputs", {})
    value = graph_inputs.get(input_name, default_value)
    
    context.set_output("value", value)
    return value


@node(
    namespace="core",
    node_type="output",
    display_name="Output",
    category="Core/IO",
    description="Graph output node",
    icon="📤",
    color="#2196F3",
    inputs=[
        Port("value", PortType.ANY, required=True, description="Value to output")
    ],
    outputs=[],
    properties={
        "output_name": "output"
    }
)
def output_node(context: NodeContext) -> Any:
    """Graph output node - sends value to graph output."""
    output_name = context.get_property("output_name", "output")
    value = context.get_input("value")
    
    # Set value to graph outputs
    graph_outputs = context.get_metadata("graph_outputs", {})
    graph_outputs[output_name] = value
    context.set_metadata("graph_outputs", graph_outputs)
    
    return value


@node(
    namespace="core",
    node_type="print",
    display_name="Print",
    category="Core/IO",
    description="Print value to console",
    icon="🖨️",
    color="#FF9800",
    inputs=[
        Port("value", PortType.ANY, required=True, description="Value to print"),
        Port("label", PortType.STRING, required=False, default="", description="Label for the output")
    ],
    outputs=[
        Port("value", PortType.ANY, description="Pass-through value")
    ]
)
def print_node(context: NodeContext) -> Any:
    """Print value to console."""
    value = context.get_input("value")
    label = context.get_input("label", "")
    
    if label:
        print(f"{label}: {value}")
    else:
        print(value)
    
    context.set_output("value", value)
    return value


@node(
    namespace="core",
    node_type="log",
    display_name="Log",
    category="Core/IO",
    description="Log value with level",
    icon="📝",
    color="#9C27B0",
    inputs=[
        Port("value", PortType.ANY, required=True, description="Value to log"),
        Port("level", PortType.STRING, required=False, default="info", description="Log level (debug/info/warning/error)"),
        Port("message", PortType.STRING, required=False, default="", description="Log message")
    ],
    outputs=[
        Port("value", PortType.ANY, description="Pass-through value")
    ]
)
def log_node(context: NodeContext) -> Any:
    """Log value with specified level."""
    import logging
    
    value = context.get_input("value")
    level = context.get_input("level", "info").lower()
    message = context.get_input("message", "")
    
    logger = logging.getLogger("ramen.nodes")
    
    log_message = f"{message}: {value}" if message else str(value)
    
    if level == "debug":
        logger.debug(log_message)
    elif level == "info":
        logger.info(log_message)
    elif level == "warning":
        logger.warning(log_message)
    elif level == "error":
        logger.error(log_message)
    else:
        logger.info(log_message)
    
    context.set_output("value", value)
    return value