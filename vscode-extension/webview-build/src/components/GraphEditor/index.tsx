import { CSSProperties } from "react"
import { Panel, ReactFlowProvider, useStore, useViewport, Node, Edge } from '@xyflow/react';
import Workspace from "./Graph";
import styled from "styled-components";
// import { useHistoryStore } from "../../stores/HistoryStore";

interface GraphEditorProps {
  sidebarVisible?: boolean;
  onGraphDataChange?: (nodes: Node[], edges: Edge[]) => void;
  onSelectionChange?: (selection: { node?: Node; edge?: Edge } | null) => void;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  graphId?: string;
}

export default function GraphEditor({ 
  sidebarVisible: _sidebarVisible = true, 
  onGraphDataChange, 
  onSelectionChange,
  initialNodes = [],
  initialEdges = [],
  graphId
}: GraphEditorProps) {
    // const [undoHandler, setUndoHandler] = useState<(() => void) | null>(null);
    // const [redoHandler, setRedoHandler] = useState<(() => void) | null>(null);
    
    const style: CSSProperties = {
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--gray-4)',
        display: 'flex',
        flexDirection: 'row'
    }

    return (
        <div style={style}>
            <div style={{ flex: 1, minHeight: 0, width: '100%', height: '100%', position: 'relative' }}>
                <ReactFlowProvider>
                    <EditorCoordinate />
                    <Workspace 
                        onNodeSelect={() => {}}
                        onUndoRedoHandlers={(_undo, _redo) => {
                            // setUndoHandler(() => undo);
                            // setRedoHandler(() => redo);
                        }}
                        onGraphDataChange={onGraphDataChange}
                        onSelectionChange={onSelectionChange}
                        initialNodes={initialNodes}
                        initialEdges={initialEdges}
                        graphId={graphId}
                    />
                </ReactFlowProvider>
            </div>
        </div>
    );
}

function EditorCoordinate() {
    const style: CSSProperties = {
        margin: 0,
        color: "#898989",
        fontSize: ".85em",
        userSelect: "none"
    };
    
    const { x, y, zoom } = useViewport();
    const selectedNodes = useStore((state) => state.nodes.filter(node => node.selected));
    const coordinate = useStore(() => `X ${x.toFixed(0)}  Y ${y.toFixed(0)}  ${zoom.toFixed(1)}x`);
    const selectedCount = selectedNodes.length;
    
    const displayText = `${coordinate}  |  ${selectedCount} selected`;
    
    return <Panel style={style} position="bottom-center">{displayText}</Panel>;
}



