import { CSSProperties } from "react"
import { Panel, ReactFlowProvider, useStore, useViewport } from '@xyflow/react';
import Workspace from "./Graph";
import styled from "styled-components";

export default function GraphEditor() {
    const style: CSSProperties = {
        position: 'absolute',
        width: '100%',
        height: '100%',
        bottom: 0,
        backgroundColor: '#e3e3e3'//'#252032'
    }

    return (
        <div style={style}>
            <ReactFlowProvider>
                <EditorStatus />
                <EditorCoordinate />
                <Workspace />
            </ReactFlowProvider>
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
    const coordinate = useStore(() => `X ${x.toFixed(0)}  Y ${y.toFixed(0)}  ${zoom.toFixed(1)}x`);
    return <Panel style={style} position="bottom-center">{coordinate}</Panel>;
}



const StatusElement = styled(Panel)`
    margin: 0;
    margin-right: 7px;
    font-size: small;
    color: #aaaa;
    user-select: none;
`;

function EditorStatus() {
    return (<StatusElement position='bottom-right'>Connected</StatusElement>);
}
