import { create } from 'zustand';
import { getExtensionClient, ExtensionMessageType } from '../api/ExtensionClient';

export interface TypeConverterState {
  // Maps source_type -> target_type -> converter_node_type
  converters: Record<string, Record<string, string>>;
  isLoading: boolean;
  error: string | null;

  fetchConverters: () => Promise<void>;
  findConverter: (sourceType: string, targetType: string) => string | null;
  clearError: () => void;
}

// Fetch type converters from backend using ExtensionClient
async function fetchConvertersFromAPI(): Promise<Record<string, Record<string, string>>> {
  try {
    // Check if we're in VSCode webview environment
    if (typeof window !== 'undefined' && (window as any).vscode) {
      console.log('🔄 [TypeConverterStore] VSCode webview detected, using ExtensionClient');

      // Use ExtensionClient for unified communication
      const extensionClient = getExtensionClient();

      const response = await extensionClient.request<void, any>(
        ExtensionMessageType.FETCH_TYPE_CONVERTERS,
        undefined,
        30000 // 30 seconds timeout
      );

      if (response) {
        console.log('🔄 [TypeConverterStore] Successfully received type converters');
        // Response 可能直接是 converters，或包在 data 中
        return response.converters || response || {};
      } else {
        console.error('🔄 [TypeConverterStore] Invalid response format:', response);
        throw new Error('Invalid response format');
      }
    } else {
      // Non-VSCode environment - use direct WebSocket
      console.log('🔄 [TypeConverterStore] Non-VSCode environment, using WebSocket');

      // This would use WebSocket client directly
      // For now, return empty object as fallback
      console.warn('🔄 [TypeConverterStore] WebSocket not implemented yet');
      return {};
    }
  } catch (error) {
    console.error('Error fetching type converters:', error);
    throw error;
  }
}

export const useTypeConverterStore = create<TypeConverterState>()((set, get) => ({
  converters: {},
  isLoading: false,
  error: null,

  fetchConverters: async () => {
    set({ isLoading: true, error: null });

    try {
      console.log('🔄 Starting to fetch type converters from API...');
      const converters = await fetchConvertersFromAPI();
      console.log('🔄 Successfully fetched converters:', converters);
      set({ converters, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch type converters';
      console.error('🔄 Error loading type converters:', errorMessage);

      set({
        converters: {},
        isLoading: false,
        error: `Failed to load type converters: ${errorMessage}`
      });
    }
  },

  findConverter: (sourceType: string, targetType: string): string | null => {
    const { converters } = get();

    // Same type - no conversion needed
    if (sourceType === targetType) {
      return null;
    }

    // Exact match
    if (converters[sourceType]?.[targetType]) {
      return converters[sourceType][targetType];
    }

    // ANY can convert to specific types
    if (sourceType === 'any' && converters['any']?.[targetType]) {
      return converters['any'][targetType];
    }

    // Specific type can convert to ANY (rarely needed)
    if (targetType === 'any' && converters[sourceType]?.['any']) {
      return converters[sourceType]['any'];
    }

    return null;
  },

  clearError: () => {
    set({ error: null });
  }
}));

// Initialize type converters after a delay
let retryCount = 0;
const maxRetries = 3;

const tryFetchConverters = () => {
  const store = useTypeConverterStore.getState();

  // Check if we already have converters
  if (Object.keys(store.converters).length > 0) {
    console.log('🔄 Type converters already loaded');
    return;
  }

  console.log(`🔄 Attempting to fetch type converters (attempt ${retryCount + 1}/${maxRetries})`);

  store.fetchConverters().catch((error) => {
    console.error('🔄 Failed to fetch type converters:', error);
    retryCount++;

    if (retryCount < maxRetries) {
      console.log(`🔄 Retrying in ${retryCount * 2} seconds...`);
      setTimeout(tryFetchConverters, retryCount * 2000);
    }
  });
};

// Start after initial delay (after node definitions are loaded)
setTimeout(tryFetchConverters, 1000);
