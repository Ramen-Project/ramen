import styled from "styled-components";
import { Card } from "@radix-ui/themes";
import { ReactElement } from "react";
import { Handle, Position } from "@xyflow/react";
import chroma from "chroma-js";

import { useTypeStore } from "../stores";
import * as Constants from "../constants";

export const NodeBody = styled(Card)<{
    $selected: boolean, 
    $width: number, 
    $height: number
}>`
    padding: 0;
    width: ${props => props.$width * Constants.DotsGap}px;
    height: ${props => props.$height * Constants.DotsGap}px;
    border-radius: var(--radius-5);
    border: 3px solid ${props => props.$selected ? "var(--focus-9)" : "#eee"};
    box-shadow: 0px 0px 2px 1px #33333353;
`;

const StyledHandle = styled(Handle) <{ $isInput?: boolean, $color: string }>`
    background: ${props => props.$isInput ? chroma(props.$color).alpha(0.4).hex() : props.$color};
    border: 3px solid ${props => props.$color};
    ${props => props.$isInput ? "left: -0.3rem;" : "right: -0.3rem;"}
    position: relative;
    top: 1rem;
    width: .6rem;
    height: .6rem;
    min-width: .6rem;
    min-height: .6rem;
    border-radius: .2rem;
`;

export function Port({portId, typeId, children}: {portId: string, typeId: string, children: ReactElement[]}) {
    const typeReg = useTypeStore();
    const IOType = typeReg.typesRegistries[typeId] || typeReg.typesRegistries['unknown'];
    // TODO: get type with portId
    return <StyledHandle
            $isInput
            $color={IOType.color}
            id={typeId} // TODO: replace with Port id
            position={Position.Left}
            type={"target"}
        >{children}</StyledHandle>
}