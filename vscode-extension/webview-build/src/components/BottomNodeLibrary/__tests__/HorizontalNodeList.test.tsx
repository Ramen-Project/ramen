import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../../test/test-utils'
import HorizontalNodeList from '../HorizontalNodeList'

// Mock node data with full node definitions
const mockNodes = [
  { 
    name: 'ReadFile',
    displayName: 'ReadFile',
    namespace: 'FileIO',
    description: 'Read file content',
    inputs: [{ name: 'path', type: 'string' }],
    outputs: [{ name: 'content', type: 'string' }]
  },
  { 
    name: 'WriteFile',
    displayName: 'WriteFile', 
    namespace: 'FileIO',
    description: 'Write content to file',
    inputs: [{ name: 'path', type: 'string' }, { name: 'content', type: 'string' }],
    outputs: []
  },
  { 
    name: 'ProcessData',
    displayName: 'ProcessData',
    namespace: 'Processing',
    description: 'Process data',
    inputs: [{ name: 'data', type: 'any' }],
    outputs: [{ name: 'result', type: 'any' }]
  },
  { 
    name: 'SaveResults',
    displayName: 'SaveResults',
    namespace: 'Output',
    description: 'Save processing results',
    inputs: [{ name: 'data', type: 'any' }],
    outputs: []
  }
]

describe('HorizontalNodeList', () => {
  it('should render nodes horizontally', () => {
    render(
      <HorizontalNodeList 
        nodes={mockNodes}
      />
    )
    
    // All nodes should be rendered
    expect(screen.getByText('ReadFile')).toBeInTheDocument()
    expect(screen.getByText('WriteFile')).toBeInTheDocument()
    expect(screen.getByText('ProcessData')).toBeInTheDocument()
    expect(screen.getByText('SaveResults')).toBeInTheDocument()
  })

  it('should have horizontal scroll container', () => {
    render(
      <HorizontalNodeList 
        nodes={mockNodes}
      />
    )
    
    const container = screen.getByTestId('horizontal-node-list')
    expect(container).toHaveStyle({
      display: 'flex',
      overflowX: 'auto'
    })
  })

  it('should handle empty nodes array', () => {
    render(
      <HorizontalNodeList 
        nodes={[]}
      />
    )
    
    const container = screen.getByTestId('horizontal-node-list')
    expect(container).toBeInTheDocument()
    expect(container.children).toHaveLength(0)
  })

  it('should skip nodes without definitions', () => {
    const nodesWithInvalid = [
      { 
        name: 'ReadFile',
        displayName: 'ReadFile',
        namespace: 'FileIO',
        description: 'Read file content',
        inputs: [{ name: 'path', type: 'string' }],
        outputs: [{ name: 'content', type: 'string' }]
      },
      // Invalid node - missing required fields
      { name: 'InvalidNode' },
      { 
        name: 'WriteFile',
        displayName: 'WriteFile',
        namespace: 'FileIO', 
        description: 'Write content to file',
        inputs: [{ name: 'path', type: 'string' }, { name: 'content', type: 'string' }],
        outputs: []
      }
    ]

    render(
      <HorizontalNodeList 
        nodes={nodesWithInvalid}
      />
    )
    
    // Should render valid nodes but skip invalid one
    expect(screen.getByText('ReadFile')).toBeInTheDocument()
    expect(screen.getByText('WriteFile')).toBeInTheDocument()
    expect(screen.queryByText('InvalidNode')).not.toBeInTheDocument()
  })

  it('should handle drag start events on nodes', async () => {
    
    render(
      <HorizontalNodeList 
        nodes={mockNodes} 
      />
    )
    
    const firstNode = screen.getByText('ReadFile').closest('[draggable="true"]')
    expect(firstNode).toBeInTheDocument()
    expect(firstNode).toHaveAttribute('draggable', 'true')
  })

  it('should apply correct spacing between nodes', () => {
    render(
      <HorizontalNodeList 
        nodes={mockNodes} 
      />
    )
    
    const container = screen.getByTestId('horizontal-node-list')
    // Check for gap styling
    const computedStyle = getComputedStyle(container)
    expect(computedStyle.gap || container.style.gap).toBeTruthy()
  })
})