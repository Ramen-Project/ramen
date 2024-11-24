import styled from "styled-components";
import { CSSProperties } from "react";

import { IconType } from "react-icons/lib";
import { SiPython } from "react-icons/si";


export const NodeBody = styled.div<{ $selected: boolean }>`
    background: #ffffff;
    border-radius: 0px 0px 5px 5px;
    min-width: 1rem;
    min-height: 1rem;
`;

export function NodeHeader({ nodeName, nodeBrief, badge }: { nodeName: string, nodeBrief: string, badge?: IconType }) {
    const headerStyle: CSSProperties = {
        borderRadius: "5px 5px 0px 0px",
        display: "flex",
        flex: "row",
        backgroundColor: "#ffffffa9",
        justifyContent: "space-between",
        padding: "4px 5px 4px 5px",
    };
    const infoStyle: CSSProperties = {
        color: "#3f3f3f",
    }
    const nameStyle: CSSProperties = {
        fontSize: ".6rem",
        lineHeight: "110%",
        fontWeight: "bold",
    };
    const briefStyle: CSSProperties = {
        paddingLeft: "1px",
        fontSize: ".44rem",
        fontWeight: "light",
        lineHeight: "110%",
        color: "#c3c3c3",
        textOverflow: "clip"
    };

    const Badge = badge ? badge : SiPython;
    
    return (
        <div style={headerStyle}>
            <div style={infoStyle}>
            <div style={nameStyle}>{nodeName}</div>
            <div style={briefStyle}>{nodeBrief}</div>
            </div>
            <Badge color="#bcbcbc81" size="15"/>
        </div>
    );
}

export const NodeBase = styled.div<{$selected: boolean}>`
    border-radius: 5px;
    border: 1px solid ${props => props.$selected ? "#79a9f7" : "#eee"};
    box-shadow: 0px 0px 3px 1px #d4d4d4d3;
`;

import OperatorNode from "./OperationNode";

export const nodeTypes = {
    operator: OperatorNode,
}