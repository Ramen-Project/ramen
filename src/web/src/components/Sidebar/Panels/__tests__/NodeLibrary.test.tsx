import { describe, it, expect } from 'vitest'
import { render, screen } from '../../../../test/test-utils'
import NodeLibrary from '../NodeLibrary'

describe('NodeLibrary', () => {
  it('renders node library panel', () => {
    render(<NodeLibrary />)
    
    // Check if search input is rendered
    expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument()
  })
})