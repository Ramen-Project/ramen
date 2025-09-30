import { create } from 'zustand';

interface TypeState {
    typesRegistries: {[id: string]: {name: string, color: string}}
}

export const useTypeStore = create<TypeState>()(() => ({
    typesRegistries: {
        'unknown': {name: '<UNKNOWN>', color: '#888888'},
        'bool': {name: 'Boolean', color: '#96ef3c'},
        'int': {name: 'Integer', color: '#4287f5'},
        'str': {name: 'String', color: '#C3A492'},
        'float': {name: 'Float', color: '#FF8F00'},
        'double': {name: 'Double', color: '#AF47D2'},
        'tuple': {name: 'Tuple', color: '#ff0073'},
        'list': {name: 'List', color: 'rgb(255, 128, 192)'},
        'exception': {name: 'Exception', color: '#ff4444'},
        'dict': {name: 'Dictionary', color: '#00cc88'},
        'count': {name: 'Count', color: '#ffaa00'},
        // Backend PortType enum (from ramen/nodes/base.py PortType)
        'any': {name: 'Any', color: '#9E9E9E'},
        'number': {name: 'Number', color: '#4287f5'},
        'string': {name: 'String', color: '#C3A492'},
        'boolean': {name: 'Boolean', color: '#96ef3c'},
        'array': {name: 'Array', color: 'rgb(255, 128, 192)'},
        'object': {name: 'Object', color: '#00cc88'},
        'function': {name: 'Function', color: '#AF47D2'},
        'null': {name: 'Null', color: '#666666'},
        'undefined': {name: 'Undefined', color: '#777777'},
    }
}));
