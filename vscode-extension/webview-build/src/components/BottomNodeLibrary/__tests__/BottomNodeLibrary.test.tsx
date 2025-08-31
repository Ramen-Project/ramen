import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../../test/test-utils'
import userEvent from '@testing-library/user-event'
import BottomNodeLibrary from '../BottomNodeLibrary'

// Mock the NodeDefinitionStore
vi.mock('../../../stores/NodeDefinitionStore', () => ({
  useNodeDefinitionStore: vi.fn(() => ({
    getAllCategories: vi.fn(() => [
      {
        name: 'Core',
        icon: () => null,
        color: '#607D8B',
        nodes: [
          { 
            name: 'ReadFile',
            displayName: 'ReadFile',
            namespace: 'Core',
            description: 'Read file content',
            inputs: [{ name: 'path', type: 'string' }],
            outputs: [{ name: 'content', type: 'string' }]
          },
          { 
            name: 'WriteFile',
            displayName: 'WriteFile',
            namespace: 'Core', 
            description: 'Write content to file',
            inputs: [{ name: 'path', type: 'string' }, { name: 'content', type: 'string' }],
            outputs: []
          }
        ]
      },
      {
        name: 'Math', 
        icon: () => null,
        color: '#a259e6',
        nodes: [
          { 
            name: 'Add',
            displayName: 'Add',
            namespace: 'Math',
            description: 'Add two numbers',
            inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }],
            outputs: [{ name: 'result', type: 'number' }]
          },
          { 
            name: 'Multiply',
            displayName: 'Multiply',
            namespace: 'Math',
            description: 'Multiply two numbers', 
            inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }],
            outputs: [{ name: 'result', type: 'number' }]
          }
        ]
      }
    ]),
    getNodeDefinition: vi.fn((name: string) => ({
      name,
      namespace: 'Test',
      description: `Test ${name} description`,
      inputs: [{ name: 'input', typeId: 'string' }],
      outputs: [{ name: 'output', typeId: 'string' }]
    })),
    fetchNodes: vi.fn(),
    isLoading: false,
    error: null
  }))
}))

describe('BottomNodeLibrary', () => {
  it('should be initially collapsed', () => {
    render(<BottomNodeLibrary />)
    
    // Should only show the collapsed state (tab bar visible, content hidden)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    
    // Content should not be visible when collapsed
    expect(screen.queryByText('ReadFile')).not.toBeInTheDocument()
  })

  it('should expand when space key is pressed', async () => {
    const user = userEvent.setup()
    render(<BottomNodeLibrary />)
    
    // Initially collapsed
    expect(screen.queryByText('ReadFile')).not.toBeInTheDocument()
    
    // Press space key
    await user.keyboard(' ')
    
    // Should now be expanded and show nodes
    expect(screen.getByText('ReadFile')).toBeInTheDocument()
    expect(screen.getByText('WriteFile')).toBeInTheDocument()
  })

  it('should collapse when space key is pressed again', async () => {
    const user = userEvent.setup()
    render(<BottomNodeLibrary />)
    
    // Expand first
    await user.keyboard(' ')
    expect(screen.getByText('ReadFile')).toBeInTheDocument()
    
    // Collapse again
    await user.keyboard(' ')
    expect(screen.queryByText('ReadFile')).not.toBeInTheDocument()
  })

  it('should show category tabs', () => {
    render(<BottomNodeLibrary />)
    
    // Should show tab buttons for each category
    expect(screen.getByRole('tab', { name: /Core/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Math/i })).toBeInTheDocument()
  })

  it('should switch between category tabs', async () => {
    const user = userEvent.setup()
    render(<BottomNodeLibrary />)
    
    // Expand the library
    await user.keyboard(' ')
    
    // Should show Core nodes by default (first tab)
    expect(screen.getByText('ReadFile')).toBeInTheDocument()
    expect(screen.queryByText('Add')).not.toBeInTheDocument()
    
    // Click Math tab
    await user.click(screen.getByRole('tab', { name: /Math/i }))
    
    // Should now show Math nodes
    expect(screen.getByText('Add')).toBeInTheDocument()
    expect(screen.getByText('Multiply')).toBeInTheDocument()
    expect(screen.queryByText('ReadFile')).not.toBeInTheDocument()
  })

  it('should be full width', () => {
    render(<BottomNodeLibrary />)
    
    const container = screen.getByTestId('bottom-node-library')
    expect(container).toHaveStyle({ width: '100%' })
  })
})