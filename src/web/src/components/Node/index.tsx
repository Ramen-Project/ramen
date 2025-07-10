import { NodeTypes } from "@xyflow/react";
import OperatorNode from "./OperationNode";
import ReferenceNode from "./ReferenceNode";
import GroupNode from "./GroupNode";
import SubflowNode from "./SubflowNode";

export const nodeTypes: NodeTypes = {
    operator: OperatorNode,
    reference: ReferenceNode,
    group: GroupNode,
    subflow: SubflowNode
}