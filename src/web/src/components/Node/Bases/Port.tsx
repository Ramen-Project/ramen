import styled from "styled-components";
import { Handle, Position } from "@xyflow/react";
import chroma from "chroma-js";

import { useTypeStore } from "../../../stores";
import { Flex, Text, Tooltip } from "@radix-ui/themes";
import { ReactNode } from "react";

const StyledHandle = styled(Handle) <{ $isInput?: boolean, $color: string }>`
    background: ${props => props.$isInput ? chroma(props.$color).alpha(0.4).hex() : props.$color};
    border: 3px solid ${props => props.$color};
    // Reset the position
    ${props => props.$isInput ? "left: -2.2rem;" : "right: -2.2rem;"}
    width: .6rem;
    height: .6rem;
    min-width: .6rem;
    min-height: .6rem;
    border-radius: 2px;
    top: 20%;
    transform: rotate(45deg);
`;

export function Port({portId, typeId, isInput, children}: {portId: string, typeId: string, isInput?: boolean, children: ReactNode}) {
    const typeReg = useTypeStore();
    const IOType = typeReg.typesRegistries[typeId] || typeReg.typesRegistries['unknown'];
    // TODO: get type, name with portId
    return <Flex position="relative" left={isInput ? "-10px" : "10px"}>
        <Tooltip content="Int">
            <StyledHandle
                $isInput={isInput}
                $color={IOType.color}
                id={portId}
                position={isInput ? Position.Left : Position.Right}
                type={isInput ? "source" : "target"}
            />
        </Tooltip>
        {isInput ? 
            <Flex direction="column">
                <Text weight="bold" size="5" >AC</Text>
                {children}
            </Flex>
            :
            <></>
        }
    </Flex>
}