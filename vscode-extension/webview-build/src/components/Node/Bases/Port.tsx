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
    width: 1rem;
    height: 1rem;
    min-width: 1rem;
    min-height: 1rem;
    border-radius: 2px;
    top: 20%;
    transform: rotate(45deg);
`;

export function Port({portId, typeId, isInput, children}: {portId: string, typeId: string, isInput?: boolean, connected?: boolean, children: ReactNode}) {
    const typeReg = useTypeStore();
    const IOType = typeReg.typesRegistries[typeId] || typeReg.typesRegistries['unknown'];
    // For input: [port] [name]
    // For output: [name] [port]
    if (isInput) {
        return (
            <Flex position="relative" left="-10px" align="center">
                <Tooltip content={IOType.name}>
                    <StyledHandle
                        $isInput={true}
                        $color={IOType.color}
                        id={portId}
                        position={Position.Left}
                        type="target"
                    />
                </Tooltip>
                <Flex direction="column" align="start">
                    {children}
                </Flex>
            </Flex>
        );
    } else {
        return (
            <Flex position="relative" left="10px" align="center">
                <Tooltip content={IOType.name}>
                    <StyledHandle
                        $isInput={false}
                        $color={IOType.color}
                        id={portId}
                        position={Position.Right}
                        type="source"
                    />
                </Tooltip>
                <Flex direction="column" align="end" style={{marginRight: 4}}>
                    {children}
                </Flex>
            </Flex>
        );
    }
}