import { NodeProps } from "@xyflow/react";
import { SiPython } from 'react-icons/si'

import { NodeIOProps } from "./NodeIO";
import styled from "styled-components";

export type OpNodeProps = {
    name: string,
    namespace: string,
    brief?: string,
    inputs: Array<NodeIOProps>,
    outputs: Array<NodeIOProps>
}

const Namespace = styled.div`
    position: fixed;
    top: -10px;
    left: 5px;
    font-size:.4rem;
    color: #afafaf;
`;

const NodeBody = styled.div<{$selected: boolean}>`
    border-radius: 5px;
    border: 1px solid ${props => props.$selected ? "#79a9f7" : "#eee"};
    box-shadow: 0px 0px 3px 1px #d4d4d4d3;
`;

export default function OperatorNode({ data, id, selected }: NodeProps<OpNodeProps>) {
    if(data.inputs.length == 0 && data.outputs.length == 0) {
        throw new Error(`No inputs or outputs on this node: ${id}`);
    }
    
    return <>
        <Namespace hidden={!selected}>{data.namespace}</Namespace>
        <NodeBody $selected={selected}>
            HI
        </NodeBody>
    </>
}