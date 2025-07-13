import React from 'react';
import { ReactFlow, ReactFlowProvider, Node } from '@xyflow/react';
import OperatorNode from './OperationNode';
import { OpNodeProps } from './OperationNode';
import styled from 'styled-components';

interface NodePreviewItemProps {
    nodeData: OpNodeProps;
    scale?: number;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
}

const nodeTypes = {
    operator: OperatorNode,
};

const PreviewContainer = styled.div<{ $scale: number }>`
    transform: scale(${props => props.$scale});
    transform-origin: center;
    width: fit-content;
    border-radius: 6px;
    background: transparent;
    margin-bottom: 8px;
    cursor: grab;
    transition: all 0.2s ease;
    position: relative;
    
    &:hover {
        background: var(--gray-2);
        transform: scale(${props => props.$scale}) translateY(-1px);
    }
    
    &:active {
        cursor: grabbing;
        transform: scale(${props => props.$scale}) translateY(0);
    }
`;

const ReactFlowContainer = styled.div`
    width: 300px;
    height: 200px;
    position: relative;
    pointer-events: none;
    background-color: transparent;
`;

export default function NodePreviewItem({ 
    nodeData, 
    scale = 0.5, 
    draggable = false, 
    onDragStart 
}: NodePreviewItemProps) {
    // Create a proper ReactFlow node
    const previewNode: Node = {
        id: 'preview-node',
        type: 'operator',
        position: { x: 0, y: 0 },
        data: nodeData,
        selected: false,
        dragging: false,
        dragHandle: undefined,
        connectable: false,
    };

    return (
        <PreviewContainer 
            $scale={scale}
            draggable={draggable}
            onDragStart={onDragStart}
        >
            <ReactFlowProvider>
                <ReactFlowContainer>
                    <ReactFlow
                        nodes={[previewNode]}
                        edges={[]}
                        nodeTypes={nodeTypes}
                        elementsSelectable={false}
                        nodesConnectable={false}
                        nodesDraggable={false}
                        zoomOnScroll={false}
                        zoomOnPinch={false}
                        panOnScroll={false}
                        panOnDrag={false}
                        proOptions={{ hideAttribution: true }}
                        fitView
                        fitViewOptions={{ padding: 0 }} // clip out the ports
                    />
                </ReactFlowContainer>
            </ReactFlowProvider>
        </PreviewContainer>
    );
}