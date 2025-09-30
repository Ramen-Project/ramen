"""Debug namespace - Debugging and inspection tools."""

from ramen.nodes.debug.inspect import *
from ramen.nodes.debug.measure import *
from ramen.nodes.debug.validate import *

__all__ = [
    # Inspection tools
    'inspect_node',
    'trace_node',
    'dump_node',
    'assert_node',
    'breakpoint_node',
    'log_node',
    
    # Performance measurement
    'time_node',
    'benchmark_node',
    'profile_node',
    'memory_node',
    
    # Validation tools
    'expect_node',
    'test_node',
    'mock_node',
    'stub_node'
]