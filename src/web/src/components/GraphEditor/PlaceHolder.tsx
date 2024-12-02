import { Box, Flex, Grid, Select, Text } from "@radix-ui/themes";
import { InputPort, OutputPort } from "./NodeIO";
import styled from "styled-components";
import { ReactElement } from "react";

export function InputPlaceholder({name, children}: {name: string, children: ReactElement[]}) {
    return <Flex px="2">
        <InputPort typeId="int"/>
        <Grid columns="1" rows="1" px="0" py="1">
            <Text size="3" weight="medium">{name ? name : "Unnamed"}</Text>
            {children}
        </Grid>
    </Flex>
}

export function OutputPlaceholder({}: {}) {
    
    return <Flex>
        <OutputPort />
    </Flex>
}