import { CSSProperties } from "react"
import { Panel, ReactFlowProvider, useStore, useViewport } from '@xyflow/react';
import Workspace from "./Graph";
import EditorMenubar from "./Menubar";
import styled from "styled-components";

export default function GraphEditor() {
    const style: CSSProperties = {
        position: 'absolute',
        width: '100%',
        height: '100%',
        bottom: 0,
        backgroundColor: 'var(--gray-4)',
        display: 'flex',
        flexDirection: 'column'
    }

    return (
        <div style={style}>
            <EditorMenubar />
            <div style={{ flex: 1, position: 'relative' }}>
                <ReactFlowProvider>
                    <EditorStatus />
                    <EditorCoordinate />
                    <Workspace />
                </ReactFlowProvider>
            </div>
        </div>
    )
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
