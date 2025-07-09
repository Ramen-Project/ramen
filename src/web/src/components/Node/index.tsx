import { NodeTypes } from "@xyflow/react";
import OperatorNode from "./OperationNode";
import ReferenceNode from "./ReferenceNode";

export const nodeTypes: NodeTypes = {
    operator: OperatorNode,
    reference: ReferenceNode
}