import { NodeProps } from "@xyflow/react";
import { NodeBody } from "./Bases";

export default function ReferenceNode({ selected }: NodeProps){
    return <NodeBody $selected={selected || false} $width={2} $height={1}>
        <div>Reference Node</div>
    </NodeBody>
}