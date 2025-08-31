import { FiFileText, FiFilter, FiHash, FiBarChart, FiCode, FiGlobe, FiImage, FiClock, FiLayers, FiZap, FiSearch, FiSettings, FiCpu, FiHome, FiPlus, FiDatabase, FiGitBranch, FiBox, FiTool } from "react-icons/fi";
import { NodeBody, Port } from "./Bases";
import { Box, Container, Flex, Heading, Text } from "@radix-ui/themes";
import { useTypeStore } from "../../stores";

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

function PreviewNodeHeader({ nodeName, namespace }: { nodeName: string, namespace: string }) {
    const Icon = NAMESPACE_ICONS[namespace] || NAMESPACE_ICONS.default;
    const color = NAMESPACE_COLORS[namespace] || NAMESPACE_COLORS.default;
    
    return (
        <Box px="0" pt="3" pb="3"
            style={{
                position: 'relative',
                background: 'linear-gradient(90deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderRadius: 'var(--radius-3) var(--radius-3) 0 0',
                borderBottom: '1px solid rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                minHeight: '36px',
                overflow: 'hidden',
            }}>
            {/* Absolutely positioned colored accent */}
            <Box style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '54px',
                height: '100%',
                background: color,
                clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0% 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                zIndex: 1,
                flexShrink: 0,
                paddingLeft: '12px'
            }}>
                <Icon size={20} color="#fff" />
            </Box>
            <Heading size="3" trim="both" style={{
                fontWeight: 600,
                fontFamily: 'Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif',
                color: '#fff',
                letterSpacing: '0.01em',
                margin: 0,
                flex: 1,
                zIndex: 2,
                paddingLeft: '66px',
                fontSize: '13px'
            }}>{nodeName}</Heading>
        </Box>
    );
}

interface NodePreviewProps {
    nodeData: PreviewNodeProps;
    scale?: number;
}

export default function NodePreview({ nodeData, scale = 0.8 }: NodePreviewProps) {
    const typeReg = useTypeStore();
    
    return (
        <div style={{ 
            transform: `scale(${scale})`, 
            transformOrigin: 'top left',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 10px 40px rgba(0,0,0,0.4))'
        }}>
            <NodeBody $selected={false} $width={3} $height={1} style={{ 
                minWidth: '260px',
                border: '2px solid rgba(255,255,255,0.15)',
                backgroundColor: 'var(--gray-1)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
            }}>
                <PreviewNodeHeader nodeName={nodeData.name} namespace={nodeData.namespace} />
                <Box px="3" py="2">
                    <Text size="1" style={{
                        color: '#888',
                        fontStyle: 'italic',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'normal',
                        lineHeight: 1.3,
                        fontSize: '11px'
                    }}>{nodeData.brief}</Text>
                </Box>
                <Container mx="3" mb="3">
                    <Flex direction="row" justify="between" style={{gap: '0.8em'}}>
                        <Flex direction="column" align="start" style={{gap: '0.3em'}}>
                            {nodeData.inputs.map((input, idx) => {
                                const IOType = typeReg.typesRegistries[input.typeId] || typeReg.typesRegistries['unknown'];
                                return (
                                    <div key={input.name + idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                                        <div style={{ 
                                            width: '8px', 
                                            height: '8px', 
                                            borderRadius: '50%', 
                                            backgroundColor: IOType.color,
                                            border: '1px solid rgba(255,255,255,0.3)'
                                        }} />
                                        <Text size="1" style={{color: IOType.color, fontWeight: 500, fontSize: '10px'}}>
                                            {input.name}
                                        </Text>
                                    </div>
                                );
                            })}
                        </Flex>
                        <Flex direction="column" align="end" style={{gap: '0.3em'}}>
                            {nodeData.outputs.map((output, idx) => {
                                const IOType = typeReg.typesRegistries[output.typeId] || typeReg.typesRegistries['unknown'];
                                return (
                                    <div key={output.name + idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                                        <Text size="1" style={{color: IOType.color, fontWeight: 500, fontSize: '10px'}}>
                                            {output.name}
                                        </Text>
                                        <div style={{ 
                                            width: '8px', 
                                            height: '8px', 
                                            borderRadius: '50%', 
                                            backgroundColor: IOType.color,
                                            border: '1px solid rgba(255,255,255,0.3)'
                                        }} />
                                    </div>
                                );
                            })}
                        </Flex>
                    </Flex>
                </Container>
            </NodeBody>
        </div>
    );
}