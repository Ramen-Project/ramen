import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock VSCode API
global.acquireVsCodeApi = () => ({
  postMessage: () => {},
  setState: () => {},
  getState: () => ({}),
})

// Mock fetch API for API calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    statusText: 'OK',
    json: () => Promise.resolve({
      success: true,
      nodes: [
        {
          nodeTemplate: 'ReadFile',
          category: 'File Operations',
          description: 'Read file content',
          inputs: [{ name: 'path', type: 'string' }],
          outputs: [{ name: 'content', type: 'string' }]
        },
        {
          nodeTemplate: 'WriteFile',
          category: 'File Operations',
          description: 'Write content to file',
          inputs: [
            { name: 'path', type: 'string' },
            { name: 'content', type: 'string' }
          ],
          outputs: []
        }
      ]
    }),
    text: () => Promise.resolve(''),
  } as Response)
)