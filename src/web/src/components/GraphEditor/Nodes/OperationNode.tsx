import { NodeProps } from "@xyflow/react";
import { SiPython } from 'react-icons/si'
import styled from "styled-components";
import { CSSProperties } from "react";
import { IconType } from "react-icons/lib";

import { NodeBody } from ".";

export type OpNodeProps = {
    name: string,
    namespace: string,
    brief?: string,
    inputs: Array<NodeIOProps>,
    outputs: Array<NodeIOProps>
}

const Namespace = styled.div`
    position: fixed;
    top: -8px;
    left: 5px;
    font-size:.4rem;
    color: #afafaf;
`;

function NodeHeader({ nodeName, nodeBrief, badge }: { nodeName: string, nodeBrief: string, badge?: IconType }) {
    const headerStyle: CSSProperties = {
        borderRadius: "5px 5px 0px 0px",
        display: "flex",
        flex: "row",
        justifyContent: "space-between",
        padding: "4px 5px 4px 5px",
    };
    const infoStyle: CSSProperties = {
        color: "#3f3f3f",
    }
    const nameStyle: CSSProperties = {
        minWidth: "4.5rem",
        maxWidth: "4.5rem",
        textOverflow: "ellipsis",
        overflow: "hidden",
        fontSize: "1rem",
        lineHeight: "110%",
        fontWeight: "bold",
    };
    const briefStyle: CSSProperties = {
        paddingLeft: "1px",
        fontSize: ".5rem",
        fontWeight: "light",
        lineHeight: "110%",
        color: "#c3c3c3",
        overflow: "clip",
        textOverflow: "ellipsis",
        maxWidth: "4.5rem",
    };

    const Badge = badge ? badge : SiPython;

    return (
        <div style={headerStyle}>
            <div style={infoStyle}>
                <div style={nameStyle}>{nodeName}</div>
                <div style={briefStyle}>{nodeBrief}</div>
            </div>
            <Badge color="#bcbcbc40" size="15" />
        </div>
    );
}

export default function OperatorNode({ data, id, selected }: NodeProps<OpNodeProps>) {
    if (data.inputs.length == 0 && data.outputs.length == 0) {
        throw new Error(`No inputs or outputs on this node: ${id}`);
    }

    return <>
        <Namespace hidden={!selected}>{data.namespace}</Namespace>
        <NodeBody style={{maxWidth: 120, maxHeight: 120}} $selected={selected}>
            <NodeHeader nodeName={data.name} nodeBrief={data.brief} />

        </NodeBody>
    </>
}