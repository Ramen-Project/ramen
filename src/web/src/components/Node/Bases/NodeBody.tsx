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
    border-radius: var(--radius-5);
    border: 3px solid ${props => props.$selected ? "var(--focus-9)" : "#ffffff00"};
    box-shadow: 0px 0px 2px 1px #33333353;
    // prevents Radix Card from hiding ports
    contain: none; 
    overflow: visible;
`;