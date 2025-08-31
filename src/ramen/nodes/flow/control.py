"""Control flow operations."""

import time
from typing import Any
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="flow",
    node_type="sequence",
    display_name="Sequence",
    category="Flow/Control",
    description="Execute operations in sequence",
    icon="📋",
    color="#00BCD4",
    inputs=[
        Port("operations", PortType.ARRAY, required=True),
        Port("initial_value", PortType.ANY, required=False)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def sequence_node(context: NodeContext) -> Any:
    """Execute operations in sequence."""
    operations = context.get_input("operations", [])
    initial_value = context.get_input("initial_value")
    
    result = initial_value
    for i, operation in enumerate(operations):
        try:
            if callable(operation):
                result = operation(result)
            elif isinstance(operation, str):
                try:
                    result = context.execute_subgraph(operation, {"input": result})
                except NotImplementedError:
                    # Simple string evaluation fallback
                    if result is not None:
                        result = eval(operation.replace("input", str(result)))
        except Exception as e:
            result = f"Sequence error at step {i}: {str(e)}"
            break
    
    context.set_output("result", result)
    return result


@node(
    namespace="flow",
    node_type="parallel",
    display_name="Parallel",
    category="Flow/Control",
    description="Execute operations in parallel (simulated)",
    icon="⚡",
    color="#00BCD4",
    inputs=[
        Port("operations", PortType.ARRAY, required=True),
        Port("input", PortType.ANY, required=True)
    ],
    outputs=[Port("results", PortType.ARRAY)]
)
def parallel_node(context: NodeContext) -> Any:
    """Execute operations in parallel (simulated)."""
    operations = context.get_input("operations", [])
    input_value = context.get_input("input")
    
    # In a real implementation, this would use threading or async
    # For now, we simulate parallel execution
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
            results.append(f"Parallel error: {str(e)}")
    
    context.set_output("results", results)
    return results


@node(
    namespace="flow",
    node_type="retry",
    display_name="Retry",
    category="Flow/Control",
    description="Retry operation on failure",
    icon="🔄",
    color="#00BCD4",
    inputs=[
        Port("operation", PortType.FUNCTION, required=True),
        Port("input", PortType.ANY, required=True),
        Port("max_attempts", PortType.NUMBER, required=False),
        Port("delay", PortType.NUMBER, required=False)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def retry_node(context: NodeContext) -> Any:
    """Retry operation on failure."""
    operation = context.get_input("operation")
    input_value = context.get_input("input")
    max_attempts = int(context.get_input("max_attempts", 3))
    delay = context.get_input("delay", 0)
    
    last_error = None
    for attempt in range(max_attempts):
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
            
            context.set_output("result", result)
            return result
        except Exception as e:
            last_error = e
            if delay > 0 and attempt < max_attempts - 1:
                time.sleep(delay)
    
    # All attempts failed
    result = f"Retry failed after {max_attempts} attempts: {str(last_error)}"
    context.set_output("result", result)
    return result


@node(
    namespace="flow",
    node_type="timeout",
    display_name="Timeout",
    category="Flow/Control",
    description="Execute operation with timeout",
    icon="⏱️",
    color="#00BCD4",
    inputs=[
        Port("operation", PortType.FUNCTION, required=True),
        Port("input", PortType.ANY, required=True),
        Port("timeout_seconds", PortType.NUMBER, required=True),
        Port("default_value", PortType.ANY, required=False)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def timeout_node(context: NodeContext) -> Any:
    """Execute operation with timeout (simplified implementation)."""
    operation = context.get_input("operation")
    input_value = context.get_input("input")
    timeout_seconds = context.get_input("timeout_seconds", 5)
    default_value = context.get_input("default_value")
    
    # In a real implementation, this would use threading or async with timeout
    # For now, we'll just execute normally
    try:
        start_time = time.time()
        
        if callable(operation):
            result = operation(input_value)
        elif isinstance(operation, str):
            try:
                result = context.execute_subgraph(operation, {"input": input_value})
            except NotImplementedError:
                result = eval(operation.replace("input", str(input_value)))
        else:
            result = input_value
        
        elapsed = time.time() - start_time
        if elapsed > timeout_seconds:
            result = default_value if default_value is not None else f"Timeout after {timeout_seconds}s"
        
    except Exception as e:
        result = default_value if default_value is not None else f"Timeout error: {str(e)}"
    
    context.set_output("result", result)
    return result


@node(
    namespace="flow",
    node_type="delay",
    display_name="Delay",
    category="Flow/Control",
    description="Delay execution for specified time",
    icon="⏳",
    color="#00BCD4",
    inputs=[
        Port("value", PortType.ANY, required=True),
        Port("delay_seconds", PortType.NUMBER, required=True)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def delay_node(context: NodeContext) -> Any:
    """Delay execution for specified time."""
    value = context.get_input("value")
    delay_seconds = context.get_input("delay_seconds", 1)
    
    time.sleep(max(0, delay_seconds))
    context.set_output("result", value)
    return value


@node(
    namespace="flow",
    node_type="throttle",
    display_name="Throttle",
    category="Flow/Control",
    description="Throttle execution rate",
    icon="🚦",
    color="#00BCD4",
    inputs=[
        Port("operation", PortType.FUNCTION, required=True),
        Port("input", PortType.ANY, required=True),
        Port("min_interval", PortType.NUMBER, required=True)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def throttle_node(context: NodeContext) -> Any:
    """Throttle execution rate (simplified implementation)."""
    operation = context.get_input("operation")
    input_value = context.get_input("input")
    min_interval = context.get_input("min_interval", 1)
    
    # In a real implementation, this would track last execution time
    # For now, we'll just add a delay
    time.sleep(min_interval)
    
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
        result = f"Throttle error: {str(e)}"
    
    context.set_output("result", result)
    return result