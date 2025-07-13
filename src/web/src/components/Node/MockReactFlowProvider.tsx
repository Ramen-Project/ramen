import React, { createContext, useContext, ReactNode } from 'react';

// Mock ReactFlow context for preview components
const MockReactFlowContext = createContext({
  getNode: () => null,
  getEdges: () => [],
  // Add other ReactFlow context methods as needed
});

interface MockReactFlowProviderProps {
  children: ReactNode;
}

export function MockReactFlowProvider({ children }: MockReactFlowProviderProps) {
  const mockContextValue = {
    getNode: () => null,
    getEdges: () => [],
  };

  return (
    <MockReactFlowContext.Provider value={mockContextValue}>
      {children}
    </MockReactFlowContext.Provider>
  );
}

// Mock the useReactFlow hook for preview components
export function useMockReactFlow() {
  return useContext(MockReactFlowContext);
}