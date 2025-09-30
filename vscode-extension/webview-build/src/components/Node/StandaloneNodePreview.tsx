import React from 'react';
import { FiFileText, FiFilter, FiHash, FiCpu, FiHome, FiPlus, FiDatabase, FiGitBranch, FiBox, FiTool, FiBarChart } from "react-icons/fi";
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
    outputs: Array<NodeIOProps>,
    color?: string
}

// Package/Category icons (not namespace)
const PACKAGE_ICONS: Record<string, any> = {
    // Main categories
    Core: FiHome,
    Math: FiPlus,
    Collection: FiDatabase,
    Logic: FiGitBranch,
    String: FiFileText,
    Type: FiBox,
    Flow: FiGitBranch,
    Object: FiBox,
    Debug: FiTool,
    
    // Also support lowercase versions
    core: FiHome,
    math: FiPlus,
    collection: FiDatabase,
    logic: FiGitBranch,
    string: FiFileText,
    type: FiBox,
    flow: FiGitBranch,
    object: FiBox,
    debug: FiTool,
    
    // Legacy support
    FileIO: FiFileText,
    DataOps: FiFilter,
    builtin: FiCpu,
    
    default: FiCpu
};

// Default fallback color if node doesn't have a color defined
const DEFAULT_NODE_COLOR = '#666666';

const PreviewContainer = styled.div<{ $scale: number }>`
    transform: scale(${props => props.$scale});
    transform-origin: center;
    width: fit-content;
    height: fit-content;
    border-radius: 6px;
    background: transparent;
    margin-bottom: 8px;
    cursor: grab;
    position: relative;
    padding: 0;
    margin: 0 0 8px 0;
    pointer-events: auto;
    user-select: none;
    transition: transform 0.2s ease, background 0.2s ease;
    
    &:hover {
        background: var(--gray-2);
        transform: scale(${props => props.$scale * 1.05}) translateY(-3px);
    }
`;

function NodeHeader({ nodeName, namespace, color }: { nodeName: string, namespace: string, color?: string }) {
    // Extract package/category from namespace (e.g., "core.io" -> "core")
    const packageName = namespace.split('.')[0] || namespace;
    const capitalizedPackage = packageName.charAt(0).toUpperCase() + packageName.slice(1);

    const Icon = PACKAGE_ICONS[capitalizedPackage] || PACKAGE_ICONS[packageName] || PACKAGE_ICONS.default;
    const headerColor = color || DEFAULT_NODE_COLOR;
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
                background: headerColor,
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
    scale = 1, 
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
                <NodeHeader nodeName={nodeData.name} namespace={nodeData.namespace} color={nodeData.color} />
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