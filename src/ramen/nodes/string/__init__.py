"""String processing namespace - Text manipulation operations."""

from .basic import *
from .format import *
from .search import *
from .transform import *

__all__ = [
    # Basic string operations
    'concat_node',
    'length_node',
    'slice_node',
    'repeat_node',
    'reverse_node',
    'trim_node',
    'pad_node',
    
    # Format operations
    'format_node',
    'template_node',
    'join_node',
    'split_node',
    'lines_node',
    'words_node',
    
    # Search operations
    'contains_node',
    'starts_with_node',
    'ends_with_node',
    'find_node',
    'count_node',
    'match_node',
    
    # Transform operations
    'upper_node',
    'lower_node',
    'title_node',
    'capitalize_node',
    'replace_node',
    'regex_replace_node'
]