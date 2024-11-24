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

    }
}));