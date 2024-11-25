import { Flex, Select, Text } from "@radix-ui/themes";
import { InputPort, OutputPort } from "./NodeIO";
import styled from "styled-components";

const PlaceholerBase = styled.div`
    position: relative;
`;

export function InputPlaceholder({}: {}) {
    
    return <PlaceholerBase style={{
        left: "-.1rem",
    }}>
        <InputPort />
        <Flex gap="2">
            <Text>Hi</Text>
            <Select.Root defaultValue="A">
                <Select.Trigger/>
                <Select.Content>
                    <Select.Item value="A">A</Select.Item>
                </Select.Content>
            </Select.Root>
        </Flex>
    </PlaceholerBase>
}

export function OutputPlaceholder({}: {}) {
    
    return <PlaceholerBase style={{
        justifyContent: "right",
        right: "-.1rem",
    }}>
        <OutputPort />
    </PlaceholerBase>
}