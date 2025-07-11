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
    hasBeenResized?: boolean;
    onUngroup?: () => void;
    onRename?: (newLabel: string) => void;
    onResize?: (width: number, height: number) => void;
    onAutoResize?: () => void;
} 