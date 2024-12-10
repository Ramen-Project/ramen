import { NodeProps } from '@xyflow/react'
import { NodeBody } from './Bases'
import { CSSProperties } from 'react';

export default function ReferenceNode({ data, id, selected }: NodeProps){
    const nameStyle: CSSProperties = {
        fontSize: ".5rem",
        lineHeight: "110%",
        fontWeight: "bold",
    };
    return <NodeBody $selected={selected}>
        <div style={nameStyle}>Hi</div>
    </NodeBody>
}