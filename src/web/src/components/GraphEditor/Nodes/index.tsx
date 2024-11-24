import styled from "styled-components";

export const NodeBody = styled.div<{$selected: boolean}>`
    min-width: 1rem;
    min-height: 1rem;
    border-radius: 5px;
    border: 1px solid ${props => props.$selected ? "#5e99f7" : "#eee"};
    box-shadow: 0px 0px 3px 1px #d4d4d4d3;
    background-color: #fff;
`;

import OperatorNode from "./OperationNode";
import ReferenceNode from "./ReferenceNode";

export const nodeTypes = {
    operator: OperatorNode,
    reference: ReferenceNode
}