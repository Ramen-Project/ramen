"""
Variable and constant nodes for core operations.
"""

from typing import Any
from ramen.nodes.base import node, NodeContext, Port, PortType


@node(
    namespace="core",
    node_type="constant",
    display_name="Constant",
    category="Core/Values",
    description="Constant value node",
    icon="🔢",
    color="#00BCD4",
    inputs=[],
    outputs=[
        Port("value", PortType.ANY, description="Constant value")
    ],
    properties={
        "value": None,
        "type": "any"
    }
)
def constant_node(context: NodeContext) -> Any:
    """Constant value node."""
    # Get value from node_data (UI configuration) or properties
    node_data = context.get_metadata("node_data", {})
    if "value" in node_data:
        value = node_data["value"]
    else:
        value = context.get_property("value", 0)
    
    context.set_output("value", value)
    return value


@node(
    namespace="core",
    node_type="variable_get",
    display_name="Get Variable",
    category="Core/Variables",
    description="Get variable value",
    icon="📊",
    color="#3F51B5",
    inputs=[],
    outputs=[
        Port("value", PortType.ANY, description="Variable value")
    ],
    properties={
        "variable_name": "var"
    }
)
def variable_get_node(context: NodeContext) -> Any:
    """Get variable value from context."""
    node_data = context.get_metadata("node_data", {})
    var_name = node_data.get("variable_name", context.get_property("variable_name", "var"))
    
    # Get from execution context variables
    exec_context = context.get_metadata("exec_context")
    if exec_context and hasattr(exec_context, "get_variable"):
        value = exec_context.get_variable(var_name, None)
    else:
        # Fallback to metadata variables
        variables = context.get_metadata("variables", {})
        value = variables.get(var_name)
    
    context.set_output("value", value)
    return value


@node(
    namespace="core",
    node_type="variable_set",
    display_name="Set Variable",
    category="Core/Variables",
    description="Set variable value",
    icon="💾",
    color="#673AB7",
    inputs=[
        Port("value", PortType.ANY, required=True, description="Value to set")
    ],
    outputs=[
        Port("value", PortType.ANY, description="Pass-through value")
    ],
    properties={
        "variable_name": "var"
    }
)
def variable_set_node(context: NodeContext) -> Any:
    """Set variable value in context."""
    value = context.get_input("value")
    node_data = context.get_metadata("node_data", {})
    var_name = node_data.get("variable_name", context.get_property("variable_name", "var"))
    
    # Set in execution context variables
    exec_context = context.get_metadata("exec_context")
    if exec_context and hasattr(exec_context, "set_variable"):
        exec_context.set_variable(var_name, value)
    else:
        # Fallback to metadata variables
        variables = context.get_metadata("variables", {})
        variables[var_name] = value
        context.set_metadata("variables", variables)
    
    context.set_output("value", value)
    return value


@node(
    namespace="core",
    node_type="comment",
    display_name="Comment",
    category="Core/Annotation",
    description="Comment node for documentation",
    icon="💬",
    color="#607D8B",
    inputs=[],
    outputs=[],
    properties={
        "text": "Enter your comment here",
        "color": "#FFFDE7",
        "width": 200,
        "height": 100
    }
)
def comment_node(context: NodeContext) -> Any:
    """Comment node - does nothing, just for documentation."""
    # This node doesn't process any data
    # It's purely for visual documentation in the graph
    return None