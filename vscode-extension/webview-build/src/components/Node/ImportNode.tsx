import { NodeProps } from "@xyflow/react";
import { NodeBody, Port } from "./Bases";
import { Box, Container, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import { useTypeStore } from "../../stores";
import { useState, useCallback } from "react";
import { FiDownload } from "react-icons/fi";

export type ImportNodeProps = {
    name: string,
    namespace: string,
    brief?: string,
    inputs: Array<{ name: string, type: string }>,
    outputs: Array<{ name: string, type: string }>,
    color?: string,
    import_name?: string,
    description?: string,
    default_value?: any,
    required?: boolean
}

function ImportHeader({ typeColor }: { typeColor: string }) {
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
                <FiDownload size={12} color="#fff" />
            </Box>
            <Text size="2" weight="bold" style={{
                color: '#fff',
                letterSpacing: '0.02em',
            }}>Import</Text>
        </Flex>
    );
}

export default function ImportNode({ data, id, selected }: NodeProps) {
    const nodeData = data as ImportNodeProps;
    const typeReg = useTypeStore();

    const outputType = nodeData.outputs?.[0]?.type || 'any';
    const IOType = typeReg.typesRegistries[outputType] || typeReg.typesRegistries['unknown'];
    const typeColor = IOType.color || '#2196F3';

    const [importName, setImportName] = useState(nodeData.import_name || "input");

    const handleImportNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setImportName(newName);
        if (data) {
            (data as any).import_name = newName;
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
            <ImportHeader typeColor={typeColor} />
            <Box px="3" py="2">
                <TextField.Root
                    value={importName}
                    onChange={handleImportNameChange}
                    placeholder="parameter"
                    size="1"
                    style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        fontWeight: 600,
                    }}
                />
            </Box>
            <Container mx="3" mb="2">
                <Flex direction="column" align="end" style={{ gap: '0.4em' }}>
                    {nodeData.outputs.map((output, idx) => {
                        const displayName = output.name.charAt(0).toUpperCase() + output.name.slice(1);
                        const portIOType = typeReg.typesRegistries[output.type] || typeReg.typesRegistries['unknown'];
                        return (
                            <Port key={output.name + idx} portId={`output${idx}`} typeId={output.type}>
                                <Text size="1" weight="bold">{displayName}</Text>
                                <Text size="1" style={{ color: portIOType.color, opacity: 0.7, fontSize: '10px' }}>{portIOType.name}</Text>
                            </Port>
                        );
                    })}
                </Flex>
            </Container>
        </NodeBody>
    </>;
}
