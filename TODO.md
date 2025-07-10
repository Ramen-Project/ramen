# TODO

## Current Task
- [x] Implement drag-to-join functionality: drag nodes into groups to join them
- [x] Implement G key shortcut for group/ungroup operations
- [x] Support nested groups (groups within groups)
- [x] Handle all combinations of selected items with intuitive behavior
- [x] Optimize styled-components to prevent excessive class generation
- [x] Fix styled-components transient props warnings
- [x] Fix group selection issue by making GroupNodeContainer interactive
- [x] Simplify GroupNode structure to ensure proper ReactFlow selection
- [x] Allow clicks to pass through group background to connections while keeping group selectable
- [x] Fix connection label visibility to only show when hovered or selected

### Implementation Details:
- **G Key Behavior**: Toggle group/ungroup - if any groups are selected, ungroup them first, then group remaining regular nodes if 2+ remain
- **Drag-to-Join**: Visual feedback with green highlight and "Drop to join group" message when dragging nodes over groups
- **Nested Groups**: Support for groups within groups with proper positioning and hierarchy
- **Visual Feedback**: Groups highlight with green glow and scale effect when nodes are dragged over them
- **Auto-resize**: Groups automatically resize when nodes join or leave
- **Flexible Group Resizing**: Nodes can be dragged outside group boundaries to resize groups dynamically
- **Edge Selection**: Connections inside groups can be selected by setting group z-index to -1 to render behind other elements
- **Styled-components Optimization**: Used attrs method to prevent excessive class generation for dynamic styles
- **Transient Props**: Used $ prefix for styled-components props to prevent DOM warnings
- **Group Selection Fix**: Changed GroupNodeContainer to use pointer-events: auto and z-index: 1 to make groups properly selectable
- **Simplified Structure**: Removed nested GroupBorder component and made root container directly interactive with cursor pointer and hover effects
- **Transparent Background**: Made group background transparent to pointer events while adding clickable border area for selection
- **Connection Label Visibility**: Fixed edge label display to only show when edge is hovered or selected by properly checking highlighted state

## Completed
- [x] Modified minimap to render nodes in grey color by default
- [x] Minimap nodes only show colors when selected
- [x] Updated both nodeColor and nodeStrokeColor functions for consistency
- [x] Nodes inside group nodes now render with dark inverted colors (#333333) when unselected
- [x] Selected nodes inside groups show their namespace colors
- [x] Fixed group selection by making GroupNodeContainer interactive with proper pointer events and z-index
- [x] Simplified GroupNode structure by removing nested interactive elements that interfered with ReactFlow selection
- [x] Made group background transparent to pointer events to allow connection selection while keeping group selectable via border area
- [x] Fixed connection label visibility to only show when edge is hovered or selected

## Potential Improvements
- [ ] Consider making the grey color configurable via constants
- [ ] Add visual feedback for hover state in minimap
- [ ] Consider adding different stroke colors for different node types when selected
- [ ] Optimize minimap performance for large graphs
- [ ] Add minimap zoom controls or settings
- [ ] Consider using true color inversion instead of fixed dark color
- [ ] Add keyboard shortcuts help/tooltip
- [ ] Improve drag-to-join precision (currently uses node center point)
- [ ] Add undo/redo for drag-to-join operations

## Notes
- Current grey color: #999999
- Selected nodes maintain their namespace/type colors
- Group nodes use their backgroundColor property when selected
- Unselected nodes are consistently grey regardless of type
- Nodes inside groups use dark color (#333333) for visual contrast
- G key: Toggle group/ungroup functionality
- Ctrl+G: Create group (existing behavior)
- Ctrl+U: Ungroup selected groups
- Ctrl+R: Auto-resize selected groups
- Group selection: Groups are now properly selectable with simplified structure and direct interaction
- Connection selection: Clicks pass through group background to allow selecting connections while groups remain selectable via border area
- Connection labels: Only visible when edge is hovered or selected for cleaner UI 