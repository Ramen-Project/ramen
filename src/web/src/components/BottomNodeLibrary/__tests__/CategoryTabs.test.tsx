import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../../test/test-utils'
import userEvent from '@testing-library/user-event'
import CategoryTabs from '../CategoryTabs'

// Mock category data
const mockCategories = [
  {
    name: 'FileIO',
    icon: () => 'FileIcon',
    color: '#3b82f6',
    nodes: [{ name: 'ReadFile' }, { name: 'WriteFile' }]
  },
  {
    name: 'Math',
    icon: () => 'MathIcon',
    color: '#a259e6',
    nodes: [{ name: 'Add' }, { name: 'Multiply' }]
  },
  {
    name: 'DataOps',
    icon: () => 'DataIcon',
    color: '#f59e42',
    nodes: [{ name: 'Filter' }, { name: 'Transform' }]
  }
]

const mockOnTabChange = vi.fn()

describe('CategoryTabs', () => {
  beforeEach(() => {
    mockOnTabChange.mockClear()
  })

  it('should render all category tabs', () => {
    render(
      <CategoryTabs 
        categories={mockCategories}
        activeTabIndex={0}
        onTabChange={mockOnTabChange}
      />
    )
    
    // All tabs should be rendered
    expect(screen.getByRole('tab', { name: /FileIO/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Math/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /DataOps/i })).toBeInTheDocument()
  })

  it('should show correct active tab', () => {
    render(
      <CategoryTabs 
        categories={mockCategories}
        activeTabIndex={1}
        onTabChange={mockOnTabChange}
      />
    )
    
    const mathTab = screen.getByRole('tab', { name: /Math/i })
    const fileTab = screen.getByRole('tab', { name: /FileIO/i })
    
    expect(mathTab).toHaveAttribute('aria-selected', 'true')
    expect(fileTab).toHaveAttribute('aria-selected', 'false')
  })

  it('should call onTabChange when tab is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <CategoryTabs 
        categories={mockCategories}
        activeTabIndex={0}
        onTabChange={mockOnTabChange}
      />
    )
    
    // Click Math tab (index 1)
    await user.click(screen.getByRole('tab', { name: /Math/i }))
    
    expect(mockOnTabChange).toHaveBeenCalledWith(1)
    expect(mockOnTabChange).toHaveBeenCalledTimes(1)
  })

  it('should display category icons', () => {
    render(
      <CategoryTabs 
        categories={mockCategories}
        activeTabIndex={0}
        onTabChange={mockOnTabChange}
      />
    )
    
    // Icons should be rendered (as text in this mock)
    expect(screen.getByText('FileIcon')).toBeInTheDocument()
    expect(screen.getByText('MathIcon')).toBeInTheDocument()
    expect(screen.getByText('DataIcon')).toBeInTheDocument()
  })

  it('should show node counts as badges', () => {
    render(
      <CategoryTabs 
        categories={mockCategories}
        activeTabIndex={0}
        onTabChange={mockOnTabChange}
      />
    )
    
    // Each category should show its node count
    // All categories have 2 nodes each, so there should be 3 "2"s
    expect(screen.getAllByText('2')).toHaveLength(3)
  })

  it('should apply category colors to active tab', () => {
    render(
      <CategoryTabs 
        categories={mockCategories}
        activeTabIndex={0}
        onTabChange={mockOnTabChange}
      />
    )
    
    const activeTab = screen.getByRole('tab', { name: /FileIO/i })
    // Should have some visual indication of being active (border-bottom color)
    expect(activeTab).toHaveStyle({
      borderBottomColor: '#3b82f6'
    })
  })

  it('should handle empty categories array', () => {
    render(
      <CategoryTabs 
        categories={[]}
        activeTabIndex={0}
        onTabChange={mockOnTabChange}
      />
    )
    
    const tablist = screen.getByRole('tablist')
    expect(tablist).toBeInTheDocument()
    expect(tablist.children).toHaveLength(0)
  })

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup()
    
    render(
      <CategoryTabs 
        categories={mockCategories}
        activeTabIndex={0}
        onTabChange={mockOnTabChange}
      />
    )
    
    const firstTab = screen.getByRole('tab', { name: /FileIO/i })
    firstTab.focus()
    
    // Arrow right should move to next tab
    await user.keyboard('{ArrowRight}')
    expect(mockOnTabChange).toHaveBeenCalledWith(1)
    
    // Arrow left should move to previous tab  
    await user.keyboard('{ArrowLeft}')
    expect(mockOnTabChange).toHaveBeenCalledWith(0)
  })
})