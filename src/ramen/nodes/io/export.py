"""Export node - Mark a value as exportable from the graph.

This node allows a graph to define its output interface. When a graph contains
Export nodes, it can be automatically used as a subgraph/function in other graphs.
"""

from typing import Any
from ramen.nodes.base import node, NodeContext, Port, PortType


@node(
    namespace="graph",
    node_type="export",
    display_name="Export",
    category="Graph",
    description="Export a value from the graph, making it available to parent graphs",
    icon="📤",
    color="#4CAF50",
    inputs=[
        Port("value", PortType.ANY, required=True, description="Value to export")
    ],
    outputs=[],  # No output ports - this is a terminal node
    properties={
        "export_name": {
            "type": "string",
            "default": "output",
            "description": "Name of the export (used by parent graphs)"
        },
        "description": {
            "type": "string",
            "default": "",
            "description": "Description of this export"
        }
    }
)
def export_node(context: NodeContext) -> Any:
    """
    Export a value from the graph.

    The exported value will be stored in the execution context's exports
    dictionary, where it can be accessed by parent graphs.

    Args:
        context: Node execution context containing:
            - value: The value to export
            - export_name (property): Name of the export

    Returns:
        The exported value
    """
    value = context.get_input("value")
    export_name = context.get_property("export_name", "output")

    # Store export in execution context
    exec_context = context.metadata.get("exec_context")
    if exec_context:
        # Initialize exports dict if it doesn't exist
        if not hasattr(exec_context, "exports"):
            exec_context.exports = {}

        # Store the export
        exec_context.exports[export_name] = value
        print(f"📤 Exported '{export_name}': {type(value).__name__}")
    else:
        print(f"⚠️  Warning: No execution context found for export '{export_name}'")

    return value
