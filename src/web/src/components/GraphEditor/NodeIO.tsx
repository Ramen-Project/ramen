import { Handle, Position } from "@xyflow/react";
import styled from "styled-components";
import chroma from "chroma-js";

import { useTypeStore } from "../../stores";

const StyledHandle = styled(Handle) <{ $isInput?: boolean, $color: string }>`
    position: relative;
    background: ${props => props.$isInput ? chroma(props.$color).alpha(0.4).hex() : props.$color};
    border: 3px solid ${props => props.$color};
    ${props => props.$isInput ? "left: -0.3rem;" : "right: -0.3rem;"}
    width: .6rem;
    height: .6rem;
    min-width: .6rem;
    min-height: .6rem;
    border-radius: .2rem;
`;

export function InputPort({ typeId }: { typeId: string }) {
    const typeReg = useTypeStore();
    const IOType = typeReg.typesRegistries[typeId] || typeReg.typesRegistries['unknown'];

    return <StyledHandle
        $isInput
        $color={IOType.color}
        id={typeId}
        position={Position.Left}
        type={"target"}
    />
}

export function OutputPort({ typeId }: { typeId: string }) {
    const typeReg = useTypeStore();
    const IOType = typeReg.typesRegistries[typeId] || typeReg.typesRegistries['unknown'];

    return <StyledHandle
            $color={IOType.color}
            id={typeId}
            position={Position.Right}
            type={"source"}
        />

}