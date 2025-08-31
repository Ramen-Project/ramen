"""Object manipulation namespace - Dictionary and object operations."""

from .access import *
from .transform import *
from .utility import *

__all__ = [
    # Object access
    'get_property_node',
    'set_property_node',
    'has_property_node',
    'delete_property_node',
    'keys_node',
    'values_node',
    'entries_node',
    
    # Object transform
    'merge_objects_node',
    'pick_node',
    'omit_node',
    'map_object_node',
    'filter_object_node',
    'transform_object_node',
    
    # Object utility
    'clone_node',
    'freeze_node',
    'size_node',
    'empty_node',
    'assign_node',
    'flatten_object_node'
]