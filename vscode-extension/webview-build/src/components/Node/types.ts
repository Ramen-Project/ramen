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

export type ContextManagerNodeData = {
    label: string;
    contextType: 'file' | 'lock' | 'transaction' | 'timer' | 'custom';
    resourceConfig?: any;
    enterPorts?: Array<{ name: string; type: string }>;
    exitPorts?: Array<{ name: string; type: string }>;
    width?: number;
    height?: number;
    hasBeenInitialized?: boolean;
    childCount?: number;
    onUngroup?: () => void;
    onRename?: (newLabel: string) => void;
    onResize?: (width: number, height: number) => void;
    onAutoResize?: () => void;
} 