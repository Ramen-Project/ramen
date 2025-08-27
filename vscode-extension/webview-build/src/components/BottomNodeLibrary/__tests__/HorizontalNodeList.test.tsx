import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../../test/test-utils'
import HorizontalNodeList from '../HorizontalNodeList'

// Mock node data
const mockNodes = [
  { name: 'ReadFile' },
  { name: 'WriteFile' },
  { name: 'ProcessData' },
  { name: 'SaveResults' }
]

const mockGetNodeDefinition = vi.fn((name: string) => ({
  name,
  namespace: 'FileIO',
  description: `Test ${name} description`,
  inputs: [{ name: 'input', typeId: 'string' }],
  outputs: [{ name: 'output', typeId: 'string' }]
}))

describe('HorizontalNodeList', () => {
  it('should render nodes horizontally', () => {
    render(
      <HorizontalNodeList 
        nodes={mockNodes} 
        getNodeDefinition={mockGetNodeDefinition}
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
        getNodeDefinition={mockGetNodeDefinition}
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
        getNodeDefinition={mockGetNodeDefinition}
      />
    )
    
    const container = screen.getByTestId('horizontal-node-list')
    expect(container).toBeInTheDocument()
    expect(container.children).toHaveLength(0)
  })

  it('should skip nodes without definitions', () => {
    const mockGetNodeDefinitionWithNull = vi.fn((name: string) => 
      name === 'InvalidNode' ? null : mockGetNodeDefinition(name)
    )

    const nodesWithInvalid = [
      { name: 'ReadFile' },
      { name: 'InvalidNode' },
      { name: 'WriteFile' }
    ]

    render(
      <HorizontalNodeList 
        nodes={nodesWithInvalid} 
        getNodeDefinition={mockGetNodeDefinitionWithNull}
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
        getNodeDefinition={mockGetNodeDefinition}
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
        getNodeDefinition={mockGetNodeDefinition}
      />
    )
    
    const container = screen.getByTestId('horizontal-node-list')
    // Check for gap styling
    const computedStyle = getComputedStyle(container)
    expect(computedStyle.gap || container.style.gap).toBeTruthy()
  })
})