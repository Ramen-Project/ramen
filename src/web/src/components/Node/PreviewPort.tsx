import styled from "styled-components";
import chroma from "chroma-js";
import { useTypeStore } from "../../stores";
import { Flex, Text, Tooltip } from "@radix-ui/themes";
import { ReactNode } from "react";

const StyledPortHandle = styled.div<{ $isInput?: boolean, $color: string }>`
    background: ${props => props.$isInput ? chroma(props.$color).alpha(0.4).hex() : props.$color};
    border: 3px solid ${props => props.$color};
    ${props => props.$isInput ? "left: -2.2rem;" : "right: -2.2rem;"}
    width: .6rem;
    height: .6rem;
    min-width: .6rem;
    min-height: .6rem;
    border-radius: 2px;
    top: 20%;
    transform: rotate(45deg);
    position: absolute;
`;

export function PreviewPort({portId, typeId, isInput, children, portName}: {portId: string, typeId: string, isInput?: boolean, children: ReactNode, portName: string}) {
    const typeReg = useTypeStore();

    if (isInput) {
        return (
            <Flex position="relative" left="-10px" align="center">
                <Flex direction="column" align="start">
                    <Text weight="bold" size="5">{portName}</Text>
                    {children}
                </Flex>
            </Flex>
        );
    } else {
        return (
            <Flex position="relative" left="10px" align="center">
                <Flex direction="column" align="end" style={{marginRight: 4}}>
                    <Text weight="bold" size="5">{portName}</Text>
                    {children}
                </Flex>
            </Flex>
        );
    }
}