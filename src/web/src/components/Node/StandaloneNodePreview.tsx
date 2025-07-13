import React from 'react';
import { FiFileText, FiFilter, FiHash } from "react-icons/fi";
import { NodeBody } from "./Bases";
import { PreviewPort } from "./PreviewPort";
import { Box, Container, Flex, Heading, Text } from "@radix-ui/themes";
import { useTypeStore } from "../../stores";
import styled from 'styled-components';

export type NodeIOProps = {
    name: string,
    typeId: string
}

export type OpNodeProps = {
    name: string,
    namespace: string,
    brief?: string,
    inputs: Array<NodeIOProps>,
    outputs: Array<NodeIOProps>
}

const NAMESPACE_ICONS: Record<string, any> = {
    FileIO: FiFileText,
    DataOps: FiFilter,
    Math: FiHash,
    default: FiFileText
};

const NAMESPACE_COLORS: Record<string, string> = {
    FileIO: '#3b82f6',
    DataOps: '#f59e42',
    Math: '#a259e6',
    default: '#bbb'
};

const PreviewContainer = styled.div<{ $scale: number }>`
    transform: scale(${props => props.$scale});
    transform-origin: center;
    width: fit-content;
    border-radius: 6px;
    background: transparent;
    margin-bottom: 8px;
    cursor: grab;
    transition: all 0.2s ease;
    position: relative;
    padding: 0 2.5rem;
    margin: 0 -2.5rem 8px -2.5rem;
    
    &:hover {
        background: var(--gray-2);
        transform: scale(${props => props.$scale}) translateY(-1px);
    }
    
    &:active {
        cursor: grabbing;
        transform: scale(${props => props.$scale}) translateY(0);
    }
`;

function NodeHeader({ nodeName, namespace }: { nodeName: string, namespace: string }) {
    const Icon = NAMESPACE_ICONS[namespace] || NAMESPACE_ICONS.default;
    const color = NAMESPACE_COLORS[namespace] || NAMESPACE_COLORS.default;
    return (
        <Box px="0" pt="4" pb="4"
            style={{
                position: 'relative',
                background: 'linear-gradient(90deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderRadius: 'var(--radius-5) var(--radius-5) 0 0',
                borderBottom: '1.5px solid rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                minHeight: '48px',
                overflow: 'hidden',
            }}>
            <Box style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '72px',
                height: '100%',
                background: color,
                clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0% 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                zIndex: 1,
                flexShrink: 0,
                paddingLeft: '16px'
            }}>
                <Icon size={28} color="#fff" />
            </Box>
            <Heading size="5" trim="both" style={{
                fontWeight: 700,
                fontFamily: 'Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif',
                color: '#fff',
                letterSpacing: '0.01em',
                margin: 0,
                flex: 1,
                zIndex: 2,
                paddingLeft: '88px',
            }}>{nodeName}</Heading>
        </Box>
    );
}

interface StandaloneNodePreviewProps {
    nodeData: OpNodeProps;
    scale?: number;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
}

export default function StandaloneNodePreview({ 
    nodeData, 
    scale = 0.9, 
    draggable = false, 
    onDragStart 
}: StandaloneNodePreviewProps) {
    const typeReg = useTypeStore();

    if (nodeData.inputs.length === 0 && nodeData.outputs.length === 0) {
        return null;
    }

    return (
        <PreviewContainer 
            $scale={scale}
            draggable={draggable}
            onDragStart={onDragStart}
        >
            <NodeBody $selected={false} $width={3} $height={1}>
                <NodeHeader nodeName={nodeData.name} namespace={nodeData.namespace} />
                <Box px="4" py="2">
                    <Text size="2" style={{
                        color: '#888',
                        fontStyle: 'italic',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'normal',
                        lineHeight: 1.4
                    }}>{nodeData.brief}</Text>
                </Box>
                <Container mx="4" mb="4">
                    <Flex direction="row" justify="between" style={{gap: '1em'}}>
                        <Flex direction="column" align="start" style={{gap: '0.5em'}}>
                            {nodeData.inputs.map((input, idx) => {
                                const IOType = typeReg.typesRegistries[input.typeId] || typeReg.typesRegistries['unknown'];
                                return (
                                    <PreviewPort key={input.name + idx} portId={`input${idx}`} typeId={input.typeId} isInput portName={input.name}>
                                        <Text size="2" style={{color: IOType.color, fontWeight: 500}}>{IOType.name}</Text>
                                    </PreviewPort>
                                );
                            })}
                        </Flex>
                        <Flex direction="column" align="end" style={{gap: '0.5em'}}>
                            {nodeData.outputs.map((output, idx) => {
                                const IOType = typeReg.typesRegistries[output.typeId] || typeReg.typesRegistries['unknown'];
                                const portId = `output${idx}`;
                                return (
                                    <PreviewPort key={output.name + idx} portId={portId} typeId={output.typeId} portName={output.name}>
                                        <Text size="2" style={{color: IOType.color, fontWeight: 500}}>{IOType.name}</Text>
                                    </PreviewPort>
                                );
                            })}
                        </Flex>
                    </Flex>
                </Container>
            </NodeBody>
        </PreviewContainer>
    );
}