"""
Collection nodes for functional-style data processing.
"""

from .transform import *
from .query import *
from .operations import *
from .sort import *

__all__ = [
    # Transform operations (functional style)
    'map_node',
    'filter_node',
    'reduce_node',
    'flat_map_node',
    'scan_node',
    
    # Query operations
    'find_node',
    'find_index_node',
    'some_node',
    'every_node',
    'includes_node',
    
    # Array operations
    'take_node',
    'skip_node',
    'slice_node',
    'concat_node',
    'zip_node',
    'unzip_node',
    'chunk_node',
    'flatten_node',
    'length_node',
    'get_node',
    'set_node',
    'append_node',
    'prepend_node',
    
    # Sort and group
    'sort_node',
    'sort_by_node',
    'reverse_node',
    'group_by_node',
    'partition_node',
    'unique_node',
    
    # Set operations
    'union_node',
    'intersection_node',
    'difference_node',
]