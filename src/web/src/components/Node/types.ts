export type NodeIOProps = {
    name: string,
    typeId: string
}

export type OpNodeProps = {
    name: string,
    namespace: string,
    brief?: string,
    inputs: Array<NodeIOProps>,
    outputs: Array<NodeIOProps>
}

export type GroupNodeData = {
    label: string;
    width?: number;
    height?: number;
    backgroundColor?: string;
    childCount?: number;
    onUngroup?: () => void;
    onRename?: (newLabel: string) => void;
    onResize?: (width: number, height: number) => void;
    onAutoResize?: () => void;
}

export type SubflowNodeData = {
    label: string;
    width?: number;
    height?: number;
    backgroundColor?: string;
    childCount?: number;
    onUngroup?: () => void;
    onRename?: (newLabel: string) => void;
    onResize?: (width: number, height: number) => void;
    onAutoResize?: () => void;
} 