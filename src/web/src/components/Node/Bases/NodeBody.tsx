import styled from "styled-components";
import { Card } from "@radix-ui/themes";

import * as Constants from "../../../constants";

export const NodeBody = styled(Card)<{
    $selected: boolean, 
    $width: number, 
    $height: number
}>`
    padding: 0;
    padding-bottom: 4px;
    margin: 0;
    min-width: ${props => props.$width * Constants.DotsGap}px;
    min-height: ${props => props.$height * Constants.DotsGap}px;
    border-radius: 11px;
    border: ${props => props.$selected ? "3px solid var(--focus-9)" : "3px solid transparent"};
    // prevents Radix Card from hiding ports
    contain: none; 
    overflow: visible;
`;