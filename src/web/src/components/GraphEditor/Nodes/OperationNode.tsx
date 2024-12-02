import { NodeProps } from "@xyflow/react";
import { SiPython } from 'react-icons/si'
import { IconType } from "react-icons/lib";

import * as Constants from "../../../constants";
import { NodeBody } from ".";
import { InputPlaceholder, OutputPlaceholder } from "../PlaceHolder";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";

export type OpNodeProps = {
    name: string,
    namespace: string,
    brief?: string,
    inputs: Array<NodeIOProps>,
    outputs: Array<NodeIOProps>
}

function NodeHeader({ nodeName, nodeBrief, badge }: { nodeName: string, nodeBrief: string, badge?: IconType }) {

    const Badge = badge ? badge : SiPython;

    return (
        <Flex direction="row" justify="between" px="3">
            <Flex direction="column" py="0">
                <Heading size="5" trim="both" truncate mb="2">{nodeName}</Heading>
                <Text style={{color: "var(--gray-9)"}} trim="both" wrap="pretty" weight="regular">{nodeBrief}</Text>
            </Flex>
            <Box pt={"2"}>
                <Badge color="#bcbcbc40" size={Constants.DotsGap * 0.5} />
            </Box>
        </Flex>
    );
}

export default function OperatorNode({ data, id, selected }: NodeProps<OpNodeProps>) {
    if (data.inputs.length == 0 && data.outputs.length == 0) {
        throw new Error(`No inputs or outputs on this node: ${id}`);
    }

    return <>
        <Text hidden={!selected}
            weight={"medium"}
            style={{
                position: "absolute",
                top: "-1.5rem",
                left: ".5em",
                color: "var(--accent-9)",
            }}>{data.namespace}</Text>
        <NodeBody $selected={selected} $width={3}>
            <NodeHeader nodeName={data.name} nodeBrief={data.brief} />
            <Flex direction="column" justify="between" mb="2">
                <InputPlaceholder />
                <InputPlaceholder />
                <OutputPlaceholder />
            </Flex>
        </NodeBody>
    </>
}