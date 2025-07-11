import { CSSProperties, useState } from "react"
import { Panel, ReactFlowProvider, useStore, useViewport } from '@xyflow/react';
import Workspace from "./Graph";
import styled from "styled-components";
import { useHistoryStore } from "../../stores/HistoryStore";

interface GraphEditorProps {
  sidebarVisible?: boolean;
}

export default function GraphEditor({ sidebarVisible = true }: GraphEditorProps) {
    const [undoHandler, setUndoHandler] = useState<(() => void) | null>(null);
    const [redoHandler, setRedoHandler] = useState<(() => void) | null>(null);
    
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
                    <EditorStatus />
                    <EditorCoordinate />
                    <Workspace 
                        onNodeSelect={() => {}}
                        onUndoRedoHandlers={(undo, redo) => {
                            setUndoHandler(() => undo);
                            setRedoHandler(() => redo);
                        }}
                        // TODO: Pass nodes/edges as props in the future
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



const StatusElement = styled(Panel)`
    margin: 0;
    margin-left: 7px;
    font-size: small;
    color: #aaaa;
    user-select: none;
`;

function EditorStatus() {
    return (<StatusElement position='bottom-left'>Connected</StatusElement>);
}
