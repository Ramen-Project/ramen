import { NodeProps } from "@xyflow/react";
import { GrStatusUnknown } from "react-icons/gr";
import { IconType } from "react-icons/lib";

import * as Constants from "../../constants";
import { NodeBody, Port } from "./Bases";
import { Box, Container, Flex, Heading, Text } from "@radix-ui/themes";

export type OpNodeProps = {
    name: string,
    namespace: string,
    brief?: string,
    inputs: Array<NodeIOProps>,
    outputs: Array<NodeIOProps>
}

function NodeHeader({ nodeName, nodeBrief, badge }: { nodeName: string, nodeBrief: string, badge?: IconType }) {

    const Badge = badge ? badge : GrStatusUnknown;

    return (
        <Flex direction="row" justify="center">
            <Box py="4">
                <Badge color="var(--gray-8)" size={Constants.DotsGap * 0.5} />
            </Box>
            <Flex direction="column" pl="4" py="4">
                <Heading size="5" trim="both" truncate mb="2">{nodeName}</Heading>
                <Text style={{color: "var(--gray-9)"}} trim="both" wrap="pretty" weight="regular">{nodeBrief}</Text>
            </Flex>
        </Flex>
    );
}

export default function OperatorNode({ data, id, selected }: NodeProps<OpNodeProps>) {
    if (data.inputs.length == 0 && data.outputs.length == 0) {
        throw new Error(`No inputs or outputs on this node: ${id}`);
    }

    return <>
        <Text hidden={!selected}
            weight="medium"
            style={{
                position: "absolute",
                top: "-1.5rem",
                left: ".5em",
                color: "var(--accent-9)",
        }}>{data.namespace}</Text>
        <NodeBody $selected={selected} $width={3} $height={1}>
            <NodeHeader nodeName={data.name} nodeBrief={data.brief} />
            <Container mx="4" mb="4">
                {/* TODO: make this a component */}
                <Flex direction="column">
                    <Flex direction="row" justify="between">
                        <Port typeId="bool" isInput></Port>
                        <Port typeId="int" />
                    </Flex>
                </Flex> 
               
            </Container>
        </NodeBody>
    </>
}