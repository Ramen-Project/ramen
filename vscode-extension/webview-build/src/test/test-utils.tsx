import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Create a custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { ...options })

export * from '@testing-library/react'
export { customRender as render }