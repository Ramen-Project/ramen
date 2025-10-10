import { NodeProps } from "@xyflow/react";
import { NodeBody, Port } from "./Bases";
import { Box, Container, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import { useTypeStore } from "../../stores";
import { useState, useCallback } from "react";
import { FiUpload } from "react-icons/fi";

export type ExportNodeProps = {
    name: string,
    namespace: string,
    brief?: string,
    inputs: Array<{ name: string, type: string }>,
    outputs: Array<{ name: string, type: string }>,
    color?: string,
    export_name?: string,
    description?: string
}

function ExportHeader({ typeColor }: { typeColor: string }) {
    return (
        <Flex px="3" py="2" align="center" gap="2"
            style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.15)',
            }}>
            <Box style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                background: typeColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}>
                <FiUpload size={12} color="#fff" />
            </Box>
            <Text size="2" weight="bold" style={{
                color: '#fff',
                letterSpacing: '0.02em',
            }}>Export</Text>
        </Flex>
    );
}

export default function ExportNode({ data, id, selected }: NodeProps) {
    const nodeData = data as ExportNodeProps;
    const typeReg = useTypeStore();

    const inputType = nodeData.inputs?.[0]?.type || 'any';
    const IOType = typeReg.typesRegistries[inputType] || typeReg.typesRegistries['unknown'];
    const typeColor = IOType.color || '#4CAF50';

    const [exportName, setExportName] = useState(nodeData.export_name || "output");

    const handleExportNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setExportName(newName);
        if (data) {
            (data as any).export_name = newName;
        }
    }, [data]);

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
        <NodeBody $selected={Boolean(selected)} $width={1.8} $height={1}>
            <ExportHeader typeColor={typeColor} />
            <Container mx="3" mt="2">
                <Flex direction="column" align="start" style={{ gap: '0.4em' }}>
                    {nodeData.inputs.map((input, idx) => {
                        const displayName = input.name.charAt(0).toUpperCase() + input.name.slice(1);
                        const portIOType = typeReg.typesRegistries[input.type] || typeReg.typesRegistries['unknown'];
                        return (
                            <Port key={input.name + idx} portId={`input${idx}`} typeId={input.type} isInput>
                                <Text size="1" weight="bold">{displayName}</Text>
                                <Text size="1" style={{ color: portIOType.color, opacity: 0.7, fontSize: '10px' }}>{portIOType.name}</Text>
                            </Port>
                        );
                    })}
                </Flex>
            </Container>
            <Box px="3" py="2">
                <TextField.Root
                    value={exportName}
                    onChange={handleExportNameChange}
                    placeholder="output"
                    size="1"
                    style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        fontWeight: 600,
                    }}
                />
            </Box>
        </NodeBody>
    </>;
}
