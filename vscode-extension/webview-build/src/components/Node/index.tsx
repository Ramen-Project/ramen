import { NodeTypes } from "@xyflow/react";
import OperatorNode from "./OperationNode";
// import ReferenceNode from "./ReferenceNode";  // 移除：不需要 variables
import GroupNode from "./GroupNode";
import ContextManagerGroup from "./ContextManagerGroup";
import ToTypeNode from "./ToTypeNode";
import ImportNode from "./ImportNode";
import ExportNode from "./ExportNode";

export const nodeTypes: NodeTypes = {
    operator: OperatorNode,
    // reference: ReferenceNode,  // 移除：不需要 variables
    group: GroupNode,
    contextManager: ContextManagerGroup,
    toType: ToTypeNode,
    import: ImportNode,
    export: ExportNode
}