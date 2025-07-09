import { NodeProps, useReactFlow } from "@xyflow/react";
import { GrStatusUnknown } from "react-icons/gr";
import { IconType } from "react-icons/lib";
import { FiFileText, FiFilter, FiHash } from "react-icons/fi";

import * as Constants from "../../constants";
import { NodeBody, Port } from "./Bases";
import { Box, Container, Flex, Heading, Text } from "@radix-ui/themes";
import { useTypeStore } from "../../stores";

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

const NAMESPACE_GRADIENTS: Record<string, string> = {
    FileIO: 'linear-gradient(90deg, rgba(59,130,246,0.32) 0%, rgba(59,130,246,0.10) 100%)',
    DataOps: 'linear-gradient(90deg, rgba(245,158,66,0.32) 0%, rgba(245,158,66,0.10) 100%)',
    Math: 'linear-gradient(90deg, rgba(162,89,230,0.32) 0%, rgba(162,89,230,0.10) 100%)',
    default: 'linear-gradient(90deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)'
};

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
                fontWeight: 900,
                color: '#fff',
                textShadow: '0 2px 8px rgba(0,0,0,0.18), 0 1px 0 #fff',
                letterSpacing: '0.01em',
                margin: 0,
                flex: 1,
                zIndex: 2,
                paddingLeft: '88px',
            }}>{nodeName}</Heading>
        </Box>
    );
}

export default function OperatorNode({ data, id, selected }: NodeProps) {
    const nodeData = data as OpNodeProps;
    const typeReg = useTypeStore();
    const { getEdges } = useReactFlow();
    if (nodeData.inputs.length == 0 && nodeData.outputs.length == 0) {
        throw new Error(`No inputs or outputs on this node: ${id}`);
    }
    const edges = getEdges();
    return <>
        {/* Namespace popup above node when selected */}
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
        <NodeBody $selected={Boolean(selected)} $width={3} $height={1}>
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
                                <Port key={input.name + idx} portId={`input${idx}`} typeId={input.typeId} isInput>
                                    <Text size="2" style={{color: IOType.color, fontWeight: 500}}>{input.name}</Text>
                                </Port>
                            );
                        })}
                    </Flex>
                    <Flex direction="column" align="end" style={{gap: '0.5em'}}>
                        {nodeData.outputs.map((output, idx) => {
                            const IOType = typeReg.typesRegistries[output.typeId] || typeReg.typesRegistries['unknown'];
                            const portId = `output${idx}`;
                            const connected = edges.some(e => e.source === id && e.sourceHandle === portId);
                            return (
                                <Port key={output.name + idx} portId={portId} typeId={output.typeId} connected={connected}>
                                    <Text size="2" style={{color: IOType.color, fontWeight: 500}}>{output.name}</Text>
                                </Port>
                            );
                        })}
                    </Flex>
                </Flex>
            </Container>
        </NodeBody>
    </>;
}