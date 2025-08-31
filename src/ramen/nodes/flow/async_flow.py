"""Async flow operations (simplified implementations)."""

from typing import Any
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="flow",
    node_type="promise",
    display_name="Promise",
    category="Flow/Async",
    description="Create a promise-like deferred operation",
    icon="🤝",
    color="#00BCD4",
    inputs=[
        Port("operation", PortType.FUNCTION, required=True),
        Port("input", PortType.ANY, required=True)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def promise_node(context: NodeContext) -> Any:
    """Create a promise-like deferred operation."""
    operation = context.get_input("operation")
    input_value = context.get_input("input")
    
    # In a real implementation, this would return a promise/future
    # For now, we execute immediately
    try:
        if callable(operation):
            result = operation(input_value)
        elif isinstance(operation, str):
            try:
                result = context.execute_subgraph(operation, {"input": input_value})
            except NotImplementedError:
                result = eval(operation.replace("input", str(input_value)))
        else:
            result = input_value
    except Exception as e:
        result = f"Promise error: {str(e)}"
    
    context.set_output("result", result)
    return result


@node(
    namespace="flow",
    node_type="await",
    display_name="Await",
    category="Flow/Async",
    description="Wait for async operation to complete",
    icon="⏳",
    color="#00BCD4",
    inputs=[Port("promise", PortType.ANY, required=True)],
    outputs=[Port("result", PortType.ANY)]
)
def await_node(context: NodeContext) -> Any:
    """Wait for async operation to complete."""
    promise_value = context.get_input("promise")
    
    # In a real implementation, this would await a promise/future
    # For now, we just pass through the value
    context.set_output("result", promise_value)
    return promise_value


@node(
    namespace="flow",
    node_type="race",
    display_name="Race",
    category="Flow/Async",
    description="Return result of first completed operation",
    icon="🏃",
    color="#00BCD4",
    inputs=[
        Port("operations", PortType.ARRAY, required=True),
        Port("input", PortType.ANY, required=True)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def race_node(context: NodeContext) -> Any:
    """Return result of first completed operation."""
    operations = context.get_input("operations", [])
    input_value = context.get_input("input")
    
    # In a real implementation, this would race async operations
    # For now, we execute in sequence and return first successful result
    for operation in operations:
        try:
            if callable(operation):
                result = operation(input_value)
            elif isinstance(operation, str):
                try:
                    result = context.execute_subgraph(operation, {"input": input_value})
                except NotImplementedError:
                    result = eval(operation.replace("input", str(input_value)))
            else:
                result = input_value
            
            # Return first successful result
            context.set_output("result", result)
            return result
        except Exception:
            continue
    
    # All operations failed
    result = "All race operations failed"
    context.set_output("result", result)
    return result


@node(
    namespace="flow",
    node_type="all",
    display_name="All",
    category="Flow/Async",
    description="Wait for all operations to complete",
    icon="🎯",
    color="#00BCD4",
    inputs=[
        Port("operations", PortType.ARRAY, required=True),
        Port("input", PortType.ANY, required=True)
    ],
    outputs=[Port("results", PortType.ARRAY)]
)
def all_node(context: NodeContext) -> Any:
    """Wait for all operations to complete."""
    operations = context.get_input("operations", [])
    input_value = context.get_input("input")
    
    # Execute all operations and collect results
    results = []
    for operation in operations:
        try:
            if callable(operation):
                result = operation(input_value)
            elif isinstance(operation, str):
                try:
                    result = context.execute_subgraph(operation, {"input": input_value})
                except NotImplementedError:
                    result = eval(operation.replace("input", str(input_value)))
            else:
                result = input_value
            results.append(result)
        except Exception as e:
            results.append(f"Error: {str(e)}")
    
    context.set_output("results", results)
    return results