import { CSSProperties, useState } from "react"
import { Panel, ReactFlowProvider, useStore, useViewport } from '@xyflow/react';
import Workspace from "./Graph";
import EditorMenubar from "./Menubar";
import Sidebar from "../Sidebar";
import { NodeLibrary, Properties, History } from "../Sidebar/Panels";
import styled from "styled-components";
import { useHistoryStore } from "../../stores/HistoryStore";

interface GraphEditorProps {
  // Removed onOpenThemePanel prop
}

export default function GraphEditor({}: GraphEditorProps) {
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [sidebarVisible, setSidebarVisible] = useState(true);
    
    // History store
    const { undo, redo, canUndo, canRedo, goToHistory, clearHistory } = useHistoryStore();

    const style: CSSProperties = {
        position: 'absolute',
        width: '100%',
        height: '100%',
        bottom: 0,
        backgroundColor: 'var(--gray-4)',
        display: 'flex',
        flexDirection: 'column'
    }

    const handleNodeUpdate = (nodeId: string, data: any) => {
        // This would be implemented to actually update the node in the graph
        console.log('Update node:', nodeId, data);
        if (selectedNode && selectedNode.id === nodeId) {
            setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...data } });
        }
    };

    return (
        <div style={style}>
            <EditorMenubar 
                sidebarVisible={sidebarVisible}
                onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
            />
            <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
                {sidebarVisible && (
                    <Sidebar width={320}>
                        <NodeLibrary />
                        <Properties 
                            selectedNode={selectedNode}
                            onUpdateNode={handleNodeUpdate}
                        />
                        <History 
                            onUndo={undo}
                            onRedo={redo}
                            canUndo={canUndo()}
                            canRedo={canRedo()}
                            onGoToHistory={goToHistory}
                            onClearHistory={clearHistory}
                        />
                    </Sidebar>
                )}
                <div style={{ flex: 1, position: 'relative' }}>
                    <ReactFlowProvider>
                        <EditorStatus />
                        <EditorCoordinate />
                        <Workspace onNodeSelect={setSelectedNode} />
                    </ReactFlowProvider>
                </div>
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
