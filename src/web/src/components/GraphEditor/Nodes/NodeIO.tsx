import { CSSProperties } from "react";
import { Handle, Position } from "@xyflow/react";
import styled from "styled-components";

import { useTypeStore } from "../../../stores";
import chroma from "chroma-js";

export type NodeIOProps = {
    name: string,
    typeId: string
}

const StyledHandle = styled(Handle)<{$isInput?: boolean, $color: string}>`
    background: ${props => props.$isInput ? chroma(props.$color).alpha(0.4).hex() : props.$color};
    border: 1px solid ${props => props.$color};
    ${props => props.$isInput ? "left: -2px;" : "right: -2px;"}
    width: 4px;
    height: 4px;
    min-width: 4px;
    min-height: 4px;
    border-radius: 1px;
`;

export function NodeIOPort({isInput, name, typeId, labelPadding}: {isInput?: boolean, name: string, typeId: string, labelPadding?: string}) {
    const typeReg = useTypeStore();
    const IOType = typeReg.typesRegistries[typeId] || typeReg.typesRegistries['unknown'];
    const handleContainerStyle: CSSProperties = {
        display: "flex",
        flex: "row",
        justifyContent: isInput ? "left" : "right",
        position: "relative",
        left: isInput ? "-10px": "10px",
        paddingLeft: isInput ? "5px" : "0px",
        paddingRight: isInput ? "0px" : "5px"
    }

    const handleNameStyle: CSSProperties = {
        color: "#3f3f3f",
        fontSize: ".55rem",
        lineHeight: "180%",
    }
    return (
        <div style={handleContainerStyle}>
            {/* TODO: Add output shape preview right next to disconnected  */}
            {
                isInput ?
                (
                    <>
                        <StyledHandle 
                            $isInput 
                            $color={IOType.color} 
                            id={typeId} 
                            position={Position.Left} 
                            type={"target"}
                        />
                        <div style={{...handleNameStyle, paddingLeft: labelPadding || "5px"}}>{name}</div>
                    </>
                ) :
                (
                    <>
                        <div style={{...handleNameStyle, paddingRight: labelPadding || "5px"}}>{name}</div>
                        <StyledHandle 
                            $color={IOType.color} 
                            id={typeId} 
                            position={Position.Right} 
                            type={"source"}
                        />
                    </>
                )
            }
        </div>
    );
}

export function InputPorts({inputs, padding}: {inputs: NodeIOProps[], padding?: number}) {
    return (
        <div style={{paddingRight: (padding || 20)}}>
            {inputs.map((props: NodeIOProps, idx: number) => (<NodeIOPort isInput key={idx} name={props.name} typeId={props.typeId} />))}
        </div>
    )
}

export function OutputPorts({outputs, padding}: {outputs: NodeIOProps[], padding?: number}){
    return (
        <div style={{paddingLeft: (padding || 20)}}>
            {outputs.map((props: NodeIOProps, idx: number) => (<NodeIOPort isInput={false} key={idx} name={props.name} typeId={props.typeId}/>))}
        </div>
    )
}

export const NodeIOContainer = styled.div`
    display: flex;
    justify-content: space-between;
    font-size: .5rem;
`;