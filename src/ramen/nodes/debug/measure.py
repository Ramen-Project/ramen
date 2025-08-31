"""Performance measurement tools."""

import time
import os
from typing import Any
from ..base import node, NodeContext, Port, PortType

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False


@node(
    namespace="debug",
    node_type="time",
    display_name="Time",
    category="Debug/Measure",
    description="Measure execution time of operation",
    icon="⏱️",
    color="#F44336",
    inputs=[
        Port("operation", PortType.FUNCTION, required=True),
        Port("input", PortType.ANY, required=True)
    ],
    outputs=[
        Port("result", PortType.ANY),
        Port("duration", PortType.NUMBER),
        Port("timestamp", PortType.NUMBER)
    ]
)
def time_node(context: NodeContext) -> Any:
    """Measure execution time of operation."""
    operation = context.get_input("operation")
    input_value = context.get_input("input")
    
    start_time = time.time()
    timestamp = start_time
    
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
        result = f"Time measurement error: {str(e)}"
    
    end_time = time.time()
    duration = end_time - start_time
    
    context.set_output("result", result)
    context.set_output("duration", duration)
    context.set_output("timestamp", timestamp)
    return result


@node(
    namespace="debug",
    node_type="benchmark",
    display_name="Benchmark",
    category="Debug/Measure",
    description="Benchmark operation multiple times",
    icon="🏃",
    color="#F44336",
    inputs=[
        Port("operation", PortType.FUNCTION, required=True),
        Port("input", PortType.ANY, required=True),
        Port("iterations", PortType.NUMBER, required=False),
        Port("warmup", PortType.NUMBER, required=False)
    ],
    outputs=[
        Port("result", PortType.ANY),
        Port("avg_time", PortType.NUMBER),
        Port("min_time", PortType.NUMBER),
        Port("max_time", PortType.NUMBER),
        Port("times", PortType.ARRAY)
    ]
)
def benchmark_node(context: NodeContext) -> Any:
    """Benchmark operation multiple times."""
    operation = context.get_input("operation")
    input_value = context.get_input("input")
    iterations = int(context.get_input("iterations", 10))
    warmup = int(context.get_input("warmup", 0))
    
    # Warmup runs
    for _ in range(warmup):
        try:
            if callable(operation):
                operation(input_value)
            elif isinstance(operation, str):
                try:
                    context.execute_subgraph(operation, {"input": input_value})
                except NotImplementedError:
                    eval(operation.replace("input", str(input_value)))
        except Exception:
            pass
    
    # Actual benchmark runs
    times = []
    result = None
    
    for i in range(iterations):
        start_time = time.time()
        
        try:
            if callable(operation):
                current_result = operation(input_value)
            elif isinstance(operation, str):
                try:
                    current_result = context.execute_subgraph(operation, {"input": input_value})
                except NotImplementedError:
                    current_result = eval(operation.replace("input", str(input_value)))
            else:
                current_result = input_value
            
            if i == 0:  # Use result from first iteration
                result = current_result
                
        except Exception as e:
            current_result = f"Benchmark error: {str(e)}"
            if i == 0:
                result = current_result
        
        end_time = time.time()
        times.append(end_time - start_time)
    
    avg_time = sum(times) / len(times) if times else 0
    min_time = min(times) if times else 0
    max_time = max(times) if times else 0
    
    context.set_output("result", result)
    context.set_output("avg_time", avg_time)
    context.set_output("min_time", min_time)
    context.set_output("max_time", max_time)
    context.set_output("times", times)
    return result


@node(
    namespace="debug",
    node_type="profile",
    display_name="Profile",
    category="Debug/Measure",
    description="Profile operation performance",
    icon="📊",
    color="#F44336",
    inputs=[
        Port("operation", PortType.FUNCTION, required=True),
        Port("input", PortType.ANY, required=True)
    ],
    outputs=[
        Port("result", PortType.ANY),
        Port("profile", PortType.OBJECT)
    ]
)
def profile_node(context: NodeContext) -> Any:
    """Profile operation performance."""
    operation = context.get_input("operation")
    input_value = context.get_input("input")
    
    start_time = time.time()
    start_memory = _get_memory_usage()
    
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
        result = f"Profile error: {str(e)}"
    
    end_time = time.time()
    end_memory = _get_memory_usage()
    
    profile = {
        "execution_time": end_time - start_time,
        "memory_before": start_memory,
        "memory_after": end_memory,
        "memory_delta": end_memory - start_memory if start_memory and end_memory else None,
        "timestamp": start_time
    }
    
    context.set_output("result", result)
    context.set_output("profile", profile)
    return result


@node(
    namespace="debug",
    node_type="memory",
    display_name="Memory Usage",
    category="Debug/Measure",
    description="Get current memory usage information",
    icon="🧠",
    color="#F44336",
    inputs=[Port("trigger", PortType.ANY, required=False)],
    outputs=[Port("memory_info", PortType.OBJECT)]
)
def memory_node(context: NodeContext) -> Any:
    """Get current memory usage information."""
    # Trigger input is just to allow this node to be executed in a pipeline
    context.get_input("trigger")
    
    memory_info = {
        "process_memory": _get_memory_usage(),
        "system_memory": _get_system_memory(),
        "pid": os.getpid()
    }
    
    context.set_output("memory_info", memory_info)
    return memory_info


def _get_memory_usage():
    """Get current process memory usage in MB."""
    if not HAS_PSUTIL:
        return None
    try:
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / 1024 / 1024  # Convert to MB
    except Exception:
        return None


def _get_system_memory():
    """Get system memory information."""
    if not HAS_PSUTIL:
        return None
    try:
        memory = psutil.virtual_memory()
        return {
            "total": memory.total / 1024 / 1024,  # MB
            "available": memory.available / 1024 / 1024,  # MB
            "used": memory.used / 1024 / 1024,  # MB
            "percentage": memory.percent
        }
    except Exception:
        return None