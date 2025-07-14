import styled from "styled-components";
import { Card } from "@radix-ui/themes";

import * as Constants from "../../../constants";

export const NodeBody = styled(Card)<{
    $selected: boolean, 
    $width: number, 
    $height: number
}>`
    padding: 0;
    margin: 0;
    min-width: ${props => props.$width * Constants.DotsGap}px;
    min-height: ${props => props.$height * Constants.DotsGap}px;
    border-radius: 8px;
    border-color: ${props => props.$selected ? "var(--focus-9)" : "#ffffff00"};
    // prevents Radix Card from hiding ports
    contain: none; 
    overflow: visible;
`;