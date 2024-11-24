import { create } from 'zustand';

interface GraphState {
    varRegistries: {[id: string]: {name: string, typeId: string}}
    addVar: (varId: string, name: string, typeId: string) => void
}

export const useGraphStore = create<GraphState>()((set) => ({
    varRegistries: {
        '1': {name: 'SampleVar1', typeId: 'bool'}
    },
    addVar: (varId: string, name: string, typeId: string) => 
        set((state) => ({varRegistries: {varId: {name: name, typeId: typeId}, ...state.varRegistries}})),
}));