import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../../../test/test-utils'
import ResizeHandle from '../ResizeHandle'

const mockOnHeightChange = vi.fn()

describe('ResizeHandle', () => {
  beforeEach(() => {
    mockOnHeightChange.mockClear()
  })

  it('should render resize handle', () => {
    render(
      <ResizeHandle 
        height={300}
        minHeight={100}
        maxHeight={800}
        onHeightChange={mockOnHeightChange}
      />
    )
    
    expect(screen.getByTestId('resize-handle')).toBeInTheDocument()
  })

  it('should have correct cursor style', () => {
    render(
      <ResizeHandle 
        height={300}
        minHeight={100}
        maxHeight={800}
        onHeightChange={mockOnHeightChange}
      />
    )
    
    const handle = screen.getByTestId('resize-handle')
    expect(handle).toHaveStyle({ cursor: 'ns-resize' })
  })

  it('should handle mouse down and start dragging', () => {
    render(
      <ResizeHandle 
        height={300}
        minHeight={100}
        maxHeight={800}
        onHeightChange={mockOnHeightChange}
      />
    )
    
    const handle = screen.getByTestId('resize-handle')
    
    // Mouse down should add dragging class or state
    fireEvent.mouseDown(handle, { clientY: 100 })
    
    // Should show visual feedback when dragging
    const computedStyle = getComputedStyle(handle)
    expect(parseFloat(computedStyle.opacity)).toBeGreaterThan(0)
  })

  it('should resize when dragging upward', () => {
    render(
      <ResizeHandle 
        height={300}
        minHeight={100}
        maxHeight={800}
        onHeightChange={mockOnHeightChange}
      />
    )
    
    const handle = screen.getByTestId('resize-handle')
    
    // Start drag
    fireEvent.mouseDown(handle, { clientY: 100 })
    
    // Move up (decrease Y = increase height)
    fireEvent.mouseMove(document, { clientY: 50 })
    
    // Should call onHeightChange with increased height
    expect(mockOnHeightChange).toHaveBeenCalledWith(350) // 300 + (100 - 50)
  })

  it('should resize when dragging downward', () => {
    render(
      <ResizeHandle 
        height={300}
        minHeight={100}
        maxHeight={800}
        onHeightChange={mockOnHeightChange}
      />
    )
    
    const handle = screen.getByTestId('resize-handle')
    
    // Start drag
    fireEvent.mouseDown(handle, { clientY: 100 })
    
    // Move down (increase Y = decrease height)
    fireEvent.mouseMove(document, { clientY: 150 })
    
    // Should call onHeightChange with decreased height
    expect(mockOnHeightChange).toHaveBeenCalledWith(250) // 300 - (150 - 100)
  })

  it('should respect minimum height constraint', () => {
    render(
      <ResizeHandle 
        height={300}
        minHeight={100}
        maxHeight={800}
        onHeightChange={mockOnHeightChange}
      />
    )
    
    const handle = screen.getByTestId('resize-handle')
    
    // Start drag
    fireEvent.mouseDown(handle, { clientY: 100 })
    
    // Try to drag way down (should be clamped to minHeight)
    fireEvent.mouseMove(document, { clientY: 500 })
    
    expect(mockOnHeightChange).toHaveBeenCalledWith(100) // Clamped to minHeight
  })

  it('should respect maximum height constraint', () => {
    render(
      <ResizeHandle 
        height={300}
        minHeight={100}
        maxHeight={800}
        onHeightChange={mockOnHeightChange}
      />
    )
    
    const handle = screen.getByTestId('resize-handle')
    
    // Start drag
    fireEvent.mouseDown(handle, { clientY: 100 })
    
    // Try to drag way up (should be clamped to maxHeight)
    fireEvent.mouseMove(document, { clientY: -600 })
    
    expect(mockOnHeightChange).toHaveBeenCalledWith(800) // Clamped to maxHeight
  })

  it('should stop dragging on mouse up', () => {
    render(
      <ResizeHandle 
        height={300}
        minHeight={100}
        maxHeight={800}
        onHeightChange={mockOnHeightChange}
      />
    )
    
    const handle = screen.getByTestId('resize-handle')
    
    // Start drag
    fireEvent.mouseDown(handle, { clientY: 100 })
    
    // Make a move during drag
    fireEvent.mouseMove(document, { clientY: 150 })
    
    // End drag
    fireEvent.mouseUp(document)
    
    // Further mouse moves should not trigger onHeightChange
    fireEvent.mouseMove(document, { clientY: 200 })
    
    // Should only have been called once during the actual drag
    expect(mockOnHeightChange).toHaveBeenCalledTimes(1)
  })

  it('should have initial opacity of 0', () => {
    render(
      <ResizeHandle 
        height={300}
        minHeight={100}
        maxHeight={800}
        onHeightChange={mockOnHeightChange}
      />
    )
    
    const handle = screen.getByTestId('resize-handle')
    
    // Should be initially hidden/low opacity
    const initialStyle = getComputedStyle(handle)
    expect(parseFloat(initialStyle.opacity)).toBe(0)
  })

  it('should handle double click to reset to default height', () => {
    const defaultHeight = 400
    
    render(
      <ResizeHandle 
        height={300}
        minHeight={100}
        maxHeight={800}
        defaultHeight={defaultHeight}
        onHeightChange={mockOnHeightChange}
      />
    )
    
    const handle = screen.getByTestId('resize-handle')
    
    // Double click should reset to default height
    fireEvent.doubleClick(handle)
    
    expect(mockOnHeightChange).toHaveBeenCalledWith(defaultHeight)
  })
})