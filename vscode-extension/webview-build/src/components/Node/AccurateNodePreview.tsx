import React from 'react';
import { FiFileText, FiFilter, FiHash, FiBarChart, FiCode, FiGlobe, FiImage, FiClock, FiLayers, FiZap, FiSearch, FiSettings, FiCpu, FiHome, FiPlus, FiDatabase, FiGitBranch, FiBox, FiTool } from "react-icons/fi";
import { NodeBody } from "./Bases";
import { Box, Container, Flex, Heading, Text } from "@radix-ui/themes";
import { useTypeStore } from "../../stores";
import { MockReactFlowProvider } from './MockReactFlowProvider';

export type NodeIOProps = {
    name: string,
    typeId: string
}

export type PreviewNodeProps = {
    name: string,
    namespace: string,
    brief?: string,
    inputs: Array<NodeIOProps>,
    outputs: Array<NodeIOProps>
}

const NAMESPACE_ICONS: Record<string, any> = {
    // Legacy namespaces
    FileIO: FiFileText,
    DataOps: FiFilter,
    Math: FiHash,
    MachineLearning: FiBarChart,
    builtin: FiCpu,
    TextProcessing: FiCode,
    WebAPI: FiGlobe,
    ImageProcessing: FiImage,
    TimeSeries: FiClock,
    Database: FiLayers,
    Automation: FiZap,
    DataQuality: FiSearch,
    Utilities: FiSettings,
    builtin: FiCpu,
    
    // New namespaces
    core: FiHome,
    math: FiPlus,
    collection: FiDatabase,
    logic: FiGitBranch,
    string: FiFileText,
    type: FiBox,
    flow: FiGitBranch,
    object: FiBox,
    debug: FiTool,
    ml: FiBarChart,
    
    default: FiFileText
};

const NAMESPACE_COLORS: Record<string, string> = {
    // Legacy namespaces
    FileIO: '#3b82f6',
    DataOps: '#f59e42',
    Math: '#a259e6',
    MachineLearning: '#ef4444',
    builtin: '#10b981',
    TextProcessing: '#06b6d4',
    WebAPI: '#10b981',
    ImageProcessing: '#f97316',
    TimeSeries: '#84cc16',
    Database: '#6366f1',
    Automation: '#f59e0b',
    DataQuality: '#ec4899',
    Utilities: '#6b7280',
    builtin: '#10b981',
    
    // New namespaces
    core: '#607D8B',
    math: '#4CAF50',
    collection: '#2196F3',
    logic: '#9C27B0',
    string: '#FF5722',
    type: '#795548',
    flow: '#00BCD4',
    object: '#FF9800',
    debug: '#F44336',
    ml: '#ef4444',
    
    default: '#bbb'
};

// Simplified Port component for previews (no actual handles)
function PreviewPort({portId, typeId, isInput, children}: {portId: string, typeId: string, isInput?: boolean, children: React.ReactNode}) {
    const typeReg = useTypeStore();
    const IOType = typeReg?.typesRegistries?.[typeId] || typeReg?.typesRegistries?.['unknown'] || { name: 'Unknown', color: '#888888' };
    
    if (isInput) {
        return (
            <Flex position="relative" left="-10px" align="center">
                {/* Simplified handle for preview - no actual ReactFlow handle */}
                <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    backgroundColor: IOType.color,
                    border: '2px solid white',
                    marginRight: '8px',
                    flexShrink: 0
                }} />
                <Flex direction="column" align="start">
                    <Text weight="bold" size="5" style={{ fontSize: '10px', opacity: 0.7 }}>{portId}</Text>
                    {children}
                </Flex>
            </Flex>
        );
    } else {
        return (
            <Flex position="relative" left="10px" align="center">
                <Flex direction="column" align="end" style={{marginRight: 8}}>
                    <Text weight="bold" size="5" style={{ fontSize: '10px', opacity: 0.7 }}>{portId}</Text>
                    {children}
                </Flex>
                {/* Simplified handle for preview - no actual ReactFlow handle */}
                <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    backgroundColor: IOType.color,
                    border: '2px solid white',
                    flexShrink: 0
                }} />
            </Flex>
        );
    }
}

function AccurateNodeHeader({ nodeName, namespace }: { nodeName: string, namespace: string }) {
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
            {/* Absolutely positioned colored accent */}
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

interface AccurateNodePreviewProps {
    nodeData: PreviewNodeProps;
    scale?: number;
}

export default function AccurateNodePreview({ nodeData, scale = 0.8 }: AccurateNodePreviewProps) {
    const typeReg = useTypeStore();
    
    return (
        <MockReactFlowProvider>
            <div style={{ 
                transform: `scale(${scale})`, 
                transformOrigin: 'center',
                pointerEvents: 'none',
                width: 'fit-content'
            }}>
                <NodeBody $selected={false} $width={3} $height={1} style={{
                    minWidth: scale < 0.7 ? '280px' : '260px'
                }}>
                    <AccurateNodeHeader nodeName={nodeData.name} namespace={nodeData.namespace} />
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
                                    const IOType = typeReg?.typesRegistries?.[input.typeId] || typeReg?.typesRegistries?.['unknown'] || { name: 'Unknown', color: '#888888' };
                                    return (
                                        <PreviewPort key={input.name + idx} portId={`input${idx}`} typeId={input.typeId} isInput>
                                            <Text size="2" style={{color: IOType.color, fontWeight: 500}}>{input.name}</Text>
                                        </PreviewPort>
                                    );
                                })}
                            </Flex>
                            <Flex direction="column" align="end" style={{gap: '0.5em'}}>
                                {nodeData.outputs.map((output, idx) => {
                                    const IOType = typeReg?.typesRegistries?.[output.typeId] || typeReg?.typesRegistries?.['unknown'] || { name: 'Unknown', color: '#888888' };
                                    const portId = `output${idx}`;
                                    return (
                                        <PreviewPort key={output.name + idx} portId={portId} typeId={output.typeId}>
                                            <Text size="2" style={{color: IOType.color, fontWeight: 500}}>{output.name}</Text>
                                        </PreviewPort>
                                    );
                                })}
                            </Flex>
                        </Flex>
                    </Container>
                </NodeBody>
            </div>
        </MockReactFlowProvider>
    );
}