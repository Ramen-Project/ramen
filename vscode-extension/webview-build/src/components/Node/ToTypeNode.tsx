import { NodeProps } from "@xyflow/react";
import { FiArrowRight } from "react-icons/fi";
import { NodeBody, Port } from "./Bases";
import { Box, Container, Flex, Text } from "@radix-ui/themes";
import { useTypeStore } from "../../stores";
import styled, { keyframes } from "styled-components";

export type ToTypeNodeProps = {
    name: string,
    namespace: string,
    brief?: string,
    inputs: Array<{ name: string, type: string }>,
    outputs: Array<{ name: string, type: string }>,
    color?: string
}

// 轉換動畫：從左到右的脈動效果
const flowAnimation = keyframes`
    0% {
        transform: translateX(-100%) scaleX(0);
        opacity: 0;
    }
    50% {
        opacity: 0.6;
    }
    100% {
        transform: translateX(200%) scaleX(1);
        opacity: 0;
    }
`;

// 轉換容器樣式
const ConversionContainer = styled(Box)<{ $color: string }>`
    position: relative;
    background: linear-gradient(
        135deg,
        rgba(${props => hexToRgb(props.$color)}, 0.15) 0%,
        rgba(${props => hexToRgb(props.$color)}, 0.05) 100%
    );
    border: 2px dashed ${props => props.$color};
    border-radius: 12px;
    padding: 16px;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        width: 30%;
        height: 2px;
        background: linear-gradient(
            90deg,
            transparent 0%,
            ${props => props.$color} 50%,
            transparent 100%
        );
        transform: translateY(-50%);
        animation: ${flowAnimation} 2s ease-in-out infinite;
    }
`;

// 型態標籤樣式
const TypeBadge = styled(Box)<{ $color: string }>`
    background: ${props => props.$color};
    color: white;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

// 轉換箭頭樣式
const ConversionArrow = styled(Box)<{ $color: string }>`
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${props => props.$color};
    font-size: 24px;
    animation: pulse 1.5s ease-in-out infinite;

    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
            opacity: 0.7;
        }
        50% {
            transform: scale(1.2);
            opacity: 1;
        }
    }
`;

// 輔助函數：將 hex 轉換為 rgb
function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '121, 85, 72'; // 默認棕色
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

export default function ToTypeNode({ data, id, selected }: NodeProps) {
    const nodeData = data as ToTypeNodeProps;
    const typeReg = useTypeStore();
    const nodeColor = nodeData.color || '#795548'; // 棕色作為默認顏色

    // 獲取輸入和輸出型態
    const inputType = nodeData.inputs[0]?.type;
    const outputType = nodeData.outputs[0]?.type;
    const inputTypeInfo = typeReg.typesRegistries[inputType] || typeReg.typesRegistries['unknown'];
    const outputTypeInfo = typeReg.typesRegistries[outputType] || typeReg.typesRegistries['unknown'];

    return <>
        {selected && (
            <Text weight="medium"
                style={{
                    position: "absolute",
                    top: "-1.5rem",
                    left: ".5em",
                    color: "var(--accent-9)",
                    zIndex: 10,
                }}>{nodeData.namespace}</Text>
        )}
        <NodeBody $selected={Boolean(selected)} $width={2.8} $height={1}>
            {/* 轉換視覺化區域 */}
            <ConversionContainer $color={nodeColor} style={{ marginTop: '16px' }}>
                <Flex direction="row" align="center" justify="center" gap="3" style={{ minHeight: '60px' }}>
                    {/* 輸入型態 */}
                    <TypeBadge $color={inputTypeInfo.color}>
                        {inputTypeInfo.name}
                    </TypeBadge>

                    {/* 轉換箭頭 */}
                    <ConversionArrow $color={nodeColor}>
                        <FiArrowRight />
                    </ConversionArrow>

                    {/* 輸出型態 */}
                    <TypeBadge $color={outputTypeInfo.color}>
                        {outputTypeInfo.name}
                    </TypeBadge>
                </Flex>
            </ConversionContainer>

            {/* Ports 區域 */}
            <Container mx="4" mb="3">
                <Flex direction="row" justify="between" style={{ gap: '1em' }}>
                    {/* 輸入 Port */}
                    <Flex direction="column" align="start" style={{ gap: '0.5em' }}>
                        {nodeData.inputs.map((input, idx) => {
                            const IOType = typeReg.typesRegistries[input.type] || typeReg.typesRegistries['unknown'];
                            const displayName = input.name.charAt(0).toUpperCase() + input.name.slice(1);
                            return (
                                <Port key={input.name + idx} portId={`input${idx}`} typeId={input.type} isInput>
                                    <Text size="2" weight="bold">{displayName}</Text>
                                    <Text size="1" style={{ color: IOType.color, opacity: 0.8 }}>{IOType.name}</Text>
                                </Port>
                            );
                        })}
                    </Flex>

                    {/* 輸出 Port */}
                    <Flex direction="column" align="end" style={{ gap: '0.5em' }}>
                        {nodeData.outputs.map((output, idx) => {
                            const IOType = typeReg.typesRegistries[output.type] || typeReg.typesRegistries['unknown'];
                            const displayName = output.name.charAt(0).toUpperCase() + output.name.slice(1);
                            return (
                                <Port key={output.name + idx} portId={`output${idx}`} typeId={output.type}>
                                    <Text size="2" weight="bold">{displayName}</Text>
                                    <Text size="1" style={{ color: IOType.color, opacity: 0.8 }}>{IOType.name}</Text>
                                </Port>
                            );
                        })}
                    </Flex>
                </Flex>
            </Container>
        </NodeBody>
    </>;
}
