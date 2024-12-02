import styled from "styled-components";

import * as Constants from "../../../constants"

export const NodeBody = styled.div<{$selected: boolean, 
                                    $width: number, $height: number
                                }>`
    width: ${props => props.$width * Constants.DotsGap}px;
    height: ${props => props.$height * Constants.DotsGap}px;
    border-radius: var(--radius-5);
    border: 3px solid ${props => props.$selected ? "var(--focus-9)" : "#eee"};
    box-shadow: 0px 0px 2px 1px #33333353;
    background-color: var(--color-background);
`;

import OperatorNode from "./OperationNode";
import ReferenceNode from "./ReferenceNode";

export const nodeTypes = {
    operator: OperatorNode,
    reference: ReferenceNode
}