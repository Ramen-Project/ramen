# Ramen Group Nodes Design

## Overview
Group Nodes are a fundamental design pattern in Ramen that leverage ReactFlow's parent-child node hierarchy to create composable, visual control structures. Unlike traditional visual programming systems that treat control flow as separate node types, Ramen embeds logic directly within expandable group containers.

---

## Core Philosophy

### Principle: **Visual Scope = Logical Scope**
Group Nodes make the execution context visually explicit:
- What's inside the group is what gets executed in that context
- No hidden behavior or implicit control flow
- Direct manipulation of nested logic

### Principle: **Function Definition Through Structure**
Instead of passing functions as abstract parameters:
- Functions are defined as subgraphs within groups
- The group itself **is** the higher-order function
- Composition through visual nesting, not parameter passing

---

## Group Node Types

### 1. Collection Transform Groups

These replace traditional Map/Filter/Reduce nodes that accept function parameters.

#### Map Group
```
┌──────────────── Map ────────────────┐
│  Input: array                       │
│                                     │
│  For each item:                     │
│    [Import: item] → [logic] → [Export: result]
│                                     │
│  Output: transformed array          │
└─────────────────────────────────────┘
```

**Iteration Variables:**
- `item`: Current array element
- `index`: Current iteration index

**Behavior:**
- Executes embedded graph once per array element
- Collects outputs into result array
- Preserves iteration order

**UI Features:**
- Collapsible/expandable view
- Shows iteration count when collapsed
- Visual indication of transformation logic

#### Filter Group
```
┌──────────────── Filter ────────────────┐
│  Input: array                          │
│                                        │
│  Keep item if condition is true:       │
│    [Import: item] → [condition] → [Export: boolean]
│                                        │
│  Output: filtered array                │
└────────────────────────────────────────┘
```

**Iteration Variables:**
- `item`: Current array element
- `index`: Current iteration index

**Behavior:**
- Executes embedded graph as predicate
- Keeps items where result is truthy
- Must return boolean value

**Validation:**
- Warns if output is not boolean
- Shows filter efficiency (% kept/removed)

#### Reduce Group
```
┌──────────────── Reduce ────────────────┐
│  Input: array, initial (optional)     │
│                                        │
│  For each item, update accumulator:   │
│    [Import: accumulator] ──┐          │
│    [Import: item] ──────────┤          │
│                              ↓          │
│                        [logic] → [Export: new_accumulator]
│                                        │
│  Output: final value                   │
└────────────────────────────────────────┘
```

**Iteration Variables:**
- `accumulator`: Current accumulated value
- `item`: Current array element
- `index`: Current iteration index

**Behavior:**
- Initializes accumulator with `initial` or first element
- Updates accumulator each iteration
- Returns final accumulated value

**Common Patterns:**
- Sum: `accumulator + item`
- Product: `accumulator * item`
- Concatenation: `accumulator.append(item)`

---

### 2. Context Manager Groups

Implement Python's context manager protocol (`with` statement) visually.

#### File Context Group
```
┌──────────────── File Context ────────────────┐
│  Resource: path="/data/input.txt"           │
│                                              │
│  __enter__ → [file_handle] ──┐              │
│                                ↓              │
│  Protected operations:                       │
│    [read] → [process] → [write]             │
│                                ↓              │
│  __exit__ ← [cleanup]                        │
│                                              │
└──────────────────────────────────────────────┘
```

**Lifecycle:**
- `__enter__`: Acquire resource, provide handles to children
- Body: Protected operations with guaranteed cleanup
- `__exit__`: Release resource, handle exceptions

**Supported Contexts:**
- File I/O: `open()` wrapper
- Lock: Thread/async synchronization
- Transaction: Database transactions
- Timer: Performance measurement
- Custom: User-defined contexts

#### Transaction Context Group
```
┌──────────────── Transaction ────────────────┐
│  Database: connection=db                    │
│                                             │
│  Begin Transaction ──→ [transaction] ──┐    │
│                                         ↓    │
│  Atomic operations:                          │
│    [insert] → [update] → [validate]         │
│                                         ↓    │
│  Commit/Rollback based on result            │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 3. Conditional Groups (Future)

Visual representation of if/else branches.

#### If-Else Group
```
┌──────────────── If-Else ────────────────┐
│  Condition: [expression]                │
│                                         │
│  ├─ If True:                            │
│  │   [then_branch_logic]                │
│  │                                      │
│  └─ Else:                               │
│      [else_branch_logic]                │
│                                         │
│  Output: selected branch result         │
└─────────────────────────────────────────┘
```

**Design Consideration:**
Only the selected branch executes (lazy evaluation), unlike current if-then-else node that evaluates both branches.

---

### 4. Loop Groups (Future)

Visual loops with explicit iteration logic.

#### While Group
```
┌──────────────── While ────────────────┐
│  Continue while: [condition]          │
│                                       │
│  Loop body:                           │
│    [Import: state] → [transform] → [Export: next_state]
│                                       │
│  Max iterations: 1000 (safety)        │
└───────────────────────────────────────┘
```

#### For-Range Group
```
┌──────────────── For Range ────────────┐
│  Range: start=0, end=10, step=1       │
│                                       │
│  For each i:                          │
│    [Import: i] → [logic] → [Export: result]
│                                       │
└───────────────────────────────────────┘
```

---

## Technical Implementation

### Frontend (ReactFlow)

#### Group Node Structure
```typescript
interface GroupNodeData {
  // Identity
  label: string;
  groupType: 'map' | 'filter' | 'reduce' | 'context' | 'if-else' | 'while';

  // Iteration variables (for collection groups)
  iterationVars?: string[];  // e.g., ["item", "index"]

  // Layout
  width?: number;
  height?: number;
  collapsed?: boolean;

  // State
  hasBeenInitialized?: boolean;
  childCount?: number;

  // Context-specific configuration
  config?: {
    // Map/Filter/Reduce
    arrayInputPort?: string;
    resultOutputPort?: string;

    // Context Manager
    contextType?: 'file' | 'lock' | 'transaction' | 'timer' | 'custom';
    resourceConfig?: any;

    // Conditional
    conditionExpression?: string;

    // Loop
    maxIterations?: number;
  };
}
```

#### Parent-Child Relationship
```typescript
// Child nodes reference their parent
interface ChildNode {
  id: string;
  parentId: string;  // Group node ID
  // ... other properties
}

// Group node tracks children
const getChildNodes = (groupId: string, nodes: Node[]) => {
  return nodes.filter(node => node.parentId === groupId);
};
```

#### Visual States
- **Expanded**: Full view with child nodes visible
- **Collapsed**: Compact view showing summary (e.g., "3 operations")
- **Executing**: Highlight during execution
- **Error**: Visual indication of failures

### Backend (Python)

#### Node Model Extension
```python
@dataclass
class NodeMetadata:
    type: Literal[
        'operator',
        'variable',
        'constant',
        'group',           # Generic group
        'map_group',       # Map transformation
        'filter_group',    # Filter transformation
        'reduce_group',    # Reduce transformation
        'context_group',   # Context manager
        'comment'
    ]

    # Group-specific metadata
    iteration_vars: Optional[List[str]] = None
    context_type: Optional[str] = None

@dataclass
class RamenNode:
    id: NodeId
    metadata: NodeMetadata
    parent_id: Optional[NodeId] = None

    # Embedded subgraph for group nodes
    embedded_graph: Optional[RamenGraph] = None
```

#### Execution Model

**Embedded Graph Execution:**
```python
def execute_group_node(context: NodeContext) -> Any:
    # Get embedded subgraph
    embedded_graph = context.metadata.get("embedded_graph")

    if not embedded_graph:
        # Empty group, pass through or default behavior
        return None

    # Prepare iteration variables
    iteration_inputs = prepare_iteration_vars(context)

    # Execute embedded graph
    executor = get_executor(context)
    result = executor.execute(
        embedded_graph,
        inputs=iteration_inputs,
        context=None
    )

    # Extract outputs (via Export nodes)
    return extract_outputs(result)
```

**Import/Export in Embedded Graphs:**
- `Import` nodes: Bring iteration variables into scope
- `Export` nodes: Define return values from group
- Names must match declared iteration variables

**Example Map Execution:**
```python
def map_group_node(context: NodeContext) -> Any:
    array = context.get_input("array", [])
    embedded_graph = context.metadata.get("embedded_graph")

    results = []
    for i, item in enumerate(array):
        # Execute embedded graph with iteration vars
        result = execute_embedded_graph(
            embedded_graph,
            inputs={"item": item, "index": i}
        )
        results.append(result)

    return results
```

---

## Design Patterns

### Pattern 1: Nested Transformations
```
Map Group
├─ Filter Group
│  └─ [condition logic]
└─ [transformation logic]
```
Process: Filter each item's children, then transform

### Pattern 2: Context-Protected Operations
```
File Context Group
└─ Map Group
   └─ [write each item to file]
```
Process: Open file once, write multiple items, guaranteed close

### Pattern 3: Accumulation with State
```
Reduce Group
└─ Context Manager Group (transaction)
   └─ [database update per item]
```
Process: Transactional reduce operation

---

## Advantages Over Traditional Approaches

### vs. Function Parameter Nodes
❌ **Old Way:**
```
[array] → [Map] → [result]
           ↑
      [Lambda Node] (separate, abstract)
```

✅ **Group Node Way:**
```
Map Group: [array] → {embedded logic} → [result]
```

**Benefits:**
- No indirection through function parameters
- Logic is inline and visible
- Easier to understand and debug
- Natural visual hierarchy

### vs. Code-Based Definitions
❌ **Code:**
```python
result = map(lambda x: x * 2, array)
```

✅ **Visual:**
```
Map Group
├─ Import: item
├─ Multiply: item × 2
└─ Export: result
```

**Benefits:**
- Self-documenting
- Type-safe with visual feedback
- Easier for non-programmers
- Debuggable with intermediate values

---

## Future Extensions

### 1. Generic Group Templates
Allow users to create custom group types:
```
Custom "Batch Process" Group
├─ Configuration: batch_size, retry_count
├─ Input handling logic
├─ Batching logic
├─ Error recovery logic
└─ Output aggregation
```

### 2. Group-to-Function Compilation
Export groups as standalone Python functions:
```python
# Generated from Map Group
def map_transform(item, index):
    # Compiled from embedded graph
    result = item * 2
    return result
```

### 3. Recursive Groups
Groups that can contain instances of themselves:
```
Recursive Tree Traversal Group
├─ Import: node
├─ Process: node.value
└─ Map Group: node.children
   └─ Recursive reference to parent group
```

### 4. Async/Parallel Groups
Execute iterations concurrently:
```
Async Map Group
├─ Concurrency: 5
└─ [async operation per item]
```

---

## Implementation Roadmap

### Phase 1: Foundation (Current)
- [x] Basic Group Node infrastructure
- [x] Parent-child relationships
- [x] Drag-and-drop into groups
- [x] Group visual styling

### Phase 2: Collection Groups (Next)
- [ ] Map Group implementation
- [ ] Filter Group implementation
- [ ] Reduce Group implementation
- [ ] Embedded graph execution
- [ ] Import/Export node integration

### Phase 3: Advanced Groups
- [ ] Context Manager Groups
- [ ] Conditional Groups (If-Else)
- [ ] Loop Groups (While, For-Range)

### Phase 4: Optimization
- [ ] Collapse/expand state persistence
- [ ] Performance optimization for large iterations
- [ ] Parallel execution for independent groups

---

## Best Practices

### When to Use Group Nodes

✅ **Use Group Nodes For:**
- Collection transformations (map, filter, reduce)
- Resource management (files, connections, locks)
- Logical scoping (conditionals, loops)
- Reusable patterns (custom templates)

❌ **Avoid Group Nodes For:**
- Simple single operations (use regular nodes)
- Pure data passing (use direct edges)
- Overly nested hierarchies (refactor to subgraphs)

### Design Guidelines

1. **One Responsibility Per Group**
   - Each group should do one thing well
   - Avoid mixing concerns (e.g., filtering + transformation)

2. **Clear Iteration Variables**
   - Use descriptive names (`item`, `accumulator`, not `x`, `y`)
   - Document expected types in group description

3. **Explicit Import/Export**
   - Always use Import nodes for iteration variables
   - Always use Export nodes for return values
   - Avoid relying on implicit behavior

4. **Visual Clarity**
   - Keep groups at reasonable size (not too large)
   - Use collapse feature for complex groups
   - Add descriptive labels and documentation

---

## Related Documents

- [Graph.md](./Graph.md) - Core graph model
- [Execution.md](./Execution.md) - Execution model
- [Toppings.md](./Toppings.md) - Plugin system

---

**Last Updated:** 2025-10-09
**Status:** Design Document (Phase 1 Complete, Phase 2 In Planning)
