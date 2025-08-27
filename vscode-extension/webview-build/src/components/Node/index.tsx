import { NodeTypes } from "@xyflow/react";
import OperatorNode from "./OperationNode";
import ReferenceNode from "./ReferenceNode";
import GroupNode from "./GroupNode";

export const nodeTypes: NodeTypes = {
    operator: OperatorNode,
    reference: ReferenceNode,
    group: GroupNode
}