import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../../test/test-utils'
import userEvent from '@testing-library/user-event'
import BottomNodeLibrary from '../BottomNodeLibrary'

// Mock the NodeDefinitionStore
const mockGetAllCategories = vi.fn()
const mockGetNodeDefinition = vi.fn()

vi.mock('../../../stores/NodeDefinitionStore', () => ({
  useNodeDefinitionStore: vi.fn(() => ({
    getAllCategories: mockGetAllCategories,
    getNodeDefinition: mockGetNodeDefinition
  }))
}))

const mockCategories = [
  {
    name: 'FileIO',
    icon: () => 'FileIcon',
    color: '#3b82f6',
    nodes: [
      { name: 'ReadFile' },
      { name: 'WriteFile' },
      { name: 'ProcessData' }
    ]
  },
  {
    name: 'Math',
    icon: () => 'MathIcon', 
    color: '#a259e6',
    nodes: [
      { name: 'Add' },
      { name: 'Multiply' },
      { name: 'Calculate' }
    ]
  },
  {
    name: 'DataOps',
    icon: () => 'DataIcon',
    color: '#f59e42', 
    nodes: [
      { name: 'Filter' },
      { name: 'Transform' },
      { name: 'ReadData' }
    ]
  }
]

describe('Search Integration', () => {
  beforeEach(() => {
    mockGetAllCategories.mockReturnValue(mockCategories)
    mockGetNodeDefinition.mockImplementation((name: string) => ({
      name,
      namespace: 'Test',
      description: `Test ${name} description`, 
      inputs: [{ name: 'input', typeId: 'string' }],
      outputs: [{ name: 'output', typeId: 'string' }]
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render search input when expanded', async () => {
    const user = userEvent.setup()
    render(<BottomNodeLibrary />)
    
    // Expand the library
    await user.keyboard(' ')
    
    // Should show search input
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('should filter nodes across all categories when searching', async () => {
    const user = userEvent.setup()
    render(<BottomNodeLibrary />)
    
    // Expand the library
    await user.keyboard(' ')
    
    // Search for "Read" - should match ReadFile and ReadData
    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, 'Read')
    
    // Should show ReadFile and ReadData
    expect(screen.getByText('ReadFile')).toBeInTheDocument()
    expect(screen.getByText('ReadData')).toBeInTheDocument()
    
    // Should not show other nodes
    expect(screen.queryByText('Add')).not.toBeInTheDocument()
    expect(screen.queryByText('Transform')).not.toBeInTheDocument()
  })

  it('should show "All Results" tab when searching', async () => {
    const user = userEvent.setup()
    render(<BottomNodeLibrary />)
    
    // Expand the library
    await user.keyboard(' ')
    
    // Start searching
    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, 'File')
    
    // Should show "All Results" tab
    expect(screen.getByRole('tab', { name: /all results/i })).toBeInTheDocument()
    
    // Original category tabs should be hidden or inactive
    expect(screen.queryByRole('tab', { name: /FileIO/i })).not.toBeInTheDocument()
  })

  it('should clear search when ESC is pressed', async () => {
    const user = userEvent.setup()
    render(<BottomNodeLibrary />)
    
    // Expand the library
    await user.keyboard(' ')
    
    // Search for something
    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, 'Read')
    
    // Verify search results are showing
    expect(screen.getByDisplayValue('Read')).toBeInTheDocument()
    
    // Focus the search input and press ESC to clear
    searchInput.focus()
    await user.keyboard('{Escape}')
    
    // Search should be cleared and normal tabs restored
    expect(screen.getByDisplayValue('')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /FileIO/i })).toBeInTheDocument()
  })

  it('should restore category tabs when search is cleared', async () => {
    const user = userEvent.setup()
    render(<BottomNodeLibrary />)
    
    // Expand the library
    await user.keyboard(' ')
    
    // Search for something
    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, 'File')
    
    // Should be in search mode
    expect(screen.getByRole('tab', { name: /all results/i })).toBeInTheDocument()
    
    // Clear search
    await user.clear(searchInput)
    
    // Category tabs should be restored
    expect(screen.getByRole('tab', { name: /FileIO/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Math/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /DataOps/i })).toBeInTheDocument()
    
    // All Results tab should be gone
    expect(screen.queryByRole('tab', { name: /all results/i })).not.toBeInTheDocument()
  })

  it('should search in node descriptions and properties', async () => {
    // Mock more detailed node definitions
    mockGetNodeDefinition.mockImplementation((name: string) => {
      const definitions: Record<string, { name: string; namespace: string; description: string; inputs: Array<{ name: string; typeId: string }>; outputs: Array<{ name: string; typeId: string }> }> = {
        'ReadFile': {
          name: 'ReadFile',
          namespace: 'FileIO',
          description: 'Reads data from CSV files',
          inputs: [{ name: 'path', typeId: 'string' }],
          outputs: [{ name: 'data', typeId: 'dataframe' }]
        },
        'Add': {
          name: 'Add',
          namespace: 'Math',
          description: 'Mathematical addition operation',
          inputs: [{ name: 'a', typeId: 'number' }, { name: 'b', typeId: 'number' }],
          outputs: [{ name: 'result', typeId: 'number' }]
        }
      }
      return definitions[name] || { name, namespace: 'Test', description: `Test ${name}`, inputs: [], outputs: [] }
    })
    
    const user = userEvent.setup()
    render(<BottomNodeLibrary />)
    
    // Expand the library
    await user.keyboard(' ')
    
    // Search for "CSV" in description
    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, 'CSV')
    
    // Should find ReadFile (description contains "CSV")
    expect(screen.getByText('ReadFile')).toBeInTheDocument()
    
    // Should not find Add (no CSV in description)
    expect(screen.queryByText('Add')).not.toBeInTheDocument()
  })

  it('should handle empty search results gracefully', async () => {
    const user = userEvent.setup()
    render(<BottomNodeLibrary />)
    
    // Expand the library
    await user.keyboard(' ')
    
    // Search for something that doesn't exist
    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, 'NonExistentNode')
    
    // Should show "All Results" tab but no nodes
    expect(screen.getByRole('tab', { name: /all results/i })).toBeInTheDocument()
    
    // Should not show any node names
    mockCategories.forEach(category => {
      category.nodes.forEach(node => {
        expect(screen.queryByText(node.name)).not.toBeInTheDocument()
      })
    })
  })
})