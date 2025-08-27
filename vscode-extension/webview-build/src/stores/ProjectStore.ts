import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { RamenProject, RamenGraph, GraphMetadata } from '../types/graph';
import { GraphSerializer, GraphDeserializer } from '../utils/serialization';
import { nanoid } from 'nanoid';

interface ProjectState {
  // 專案狀態
  currentProject: RamenProject | null;
  isProjectLoaded: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: string | null;
  projectFilePath: string | null;
  
  // 專案操作
  createProject: (name: string, description?: string) => Promise<void>;
  openProject: (filePath: string) => Promise<void>;
  saveProject: () => Promise<void>;
  saveProjectAs: (filePath: string) => Promise<void>;
  closeProject: () => Promise<void>;
  
  // 專案設定
  updateProjectInfo: (updates: Partial<Pick<RamenProject, 'name' | 'description'>>) => void;
  markAsModified: () => void;
  markAsSaved: () => void;
  
  // 圖形管理
  addGraphToProject: (graph?: Partial<RamenGraph>) => string;
  removeGraphFromProject: (graphId: string) => void;
  updateGraphInProject: (graphId: string, updates: Partial<RamenGraph>) => void;
  getProjectGraph: (graphId: string) => RamenGraph | null;
}

export const useProjectStore = create<ProjectState>()(
  subscribeWithSelector((set, get) => ({
    // 初始狀態
    currentProject: null,
    isProjectLoaded: false,
    hasUnsavedChanges: false,
    lastSavedAt: null,
    projectFilePath: null,
    
    // 創建新專案
    createProject: async (name: string, description?: string) => {
      const projectId = `project-${nanoid()}`;
      const graphId = `graph-${nanoid()}`;
      
      // 創建初始圖形
      const initialGraph: RamenGraph = {
        id: graphId,
        metadata: {
          name: 'Main Graph',
          description: 'Main graph for the project',
          created_at: new Date().toISOString(),
          last_modified: new Date().toISOString(),
          version: '1.0.0'
        },
        nodes: [],
        edges: [],
        variables: []
      };
      
      // 創建專案
      const project: RamenProject = {
        id: projectId,
        name,
        description,
        graphs: [initialGraph],
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        version: '1.0.0'
      };
      
      set({
        currentProject: project,
        isProjectLoaded: true,
        hasUnsavedChanges: true,
        lastSavedAt: null,
        projectFilePath: null
      });
    },
    
    // 開啟專案
    openProject: async (filePath: string) => {
      try {
        // 這裡需要通過 API 載入檔案
        // 暫時使用模擬資料
        const response = await fetch(`/api/projects/load?path=${encodeURIComponent(filePath)}`);
        if (!response.ok) {
          throw new Error(`Failed to load project: ${response.statusText}`);
        }
        
        const projectData = await response.json();
        const project = GraphDeserializer.projectFromJSON(JSON.stringify(projectData));
        
        set({
          currentProject: project,
          isProjectLoaded: true,
          hasUnsavedChanges: false,
          lastSavedAt: new Date().toISOString(),
          projectFilePath: filePath
        });
        
        // 觸發 uv sync
        await fetch('/api/projects/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPath: filePath })
        });
        
      } catch (error) {
        console.error('Failed to open project:', error);
        throw error;
      }
    },
    
    // 保存專案
    saveProject: async () => {
      const { currentProject, projectFilePath } = get();
      if (!currentProject) {
        throw new Error('No project to save');
      }
      
      if (!projectFilePath) {
        throw new Error('No file path specified. Use saveProjectAs instead.');
      }
      
      try {
        // 更新最後修改時間
        const updatedProject = {
          ...currentProject,
          last_modified: new Date().toISOString()
        };
        
        const response = await fetch('/api/projects/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: projectFilePath,
            project: updatedProject
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to save project: ${response.statusText}`);
        }
        
        set({
          currentProject: updatedProject,
          hasUnsavedChanges: false,
          lastSavedAt: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Failed to save project:', error);
        throw error;
      }
    },
    
    // 另存專案
    saveProjectAs: async (filePath: string) => {
      const { currentProject } = get();
      if (!currentProject) {
        throw new Error('No project to save');
      }
      
      try {
        // 更新最後修改時間
        const updatedProject = {
          ...currentProject,
          last_modified: new Date().toISOString()
        };
        
        const response = await fetch('/api/projects/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath,
            project: updatedProject
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to save project: ${response.statusText}`);
        }
        
        set({
          currentProject: updatedProject,
          hasUnsavedChanges: false,
          lastSavedAt: new Date().toISOString(),
          projectFilePath: filePath
        });
        
      } catch (error) {
        console.error('Failed to save project as:', error);
        throw error;
      }
    },
    
    // 關閉專案
    closeProject: async () => {
      const { hasUnsavedChanges } = get();
      
      if (hasUnsavedChanges) {
        const shouldSave = window.confirm('You have unsaved changes. Do you want to save before closing?');
        if (shouldSave) {
          await get().saveProject();
        }
      }
      
      set({
        currentProject: null,
        isProjectLoaded: false,
        hasUnsavedChanges: false,
        lastSavedAt: null,
        projectFilePath: null
      });
    },
    
    // 更新專案資訊
    updateProjectInfo: (updates: Partial<Pick<RamenProject, 'name' | 'description'>>) => {
      set((state) => {
        if (!state.currentProject) return state;
        
        return {
          currentProject: {
            ...state.currentProject,
            ...updates,
            last_modified: new Date().toISOString()
          },
          hasUnsavedChanges: true
        };
      });
    },
    
    // 標記為已修改
    markAsModified: () => {
      set({ hasUnsavedChanges: true });
    },
    
    // 標記為已保存
    markAsSaved: () => {
      set({
        hasUnsavedChanges: false,
        lastSavedAt: new Date().toISOString()
      });
    },
    
    // 添加圖形到專案
    addGraphToProject: (graph?: Partial<RamenGraph>) => {
      const graphId = `graph-${nanoid()}`;
      
      const newGraph: RamenGraph = {
        id: graphId,
        metadata: {
          name: graph?.metadata?.name || `Graph ${Date.now()}`,
          description: graph?.metadata?.description || '',
          created_at: new Date().toISOString(),
          last_modified: new Date().toISOString(),
          version: '1.0.0',
          ...graph?.metadata
        },
        nodes: graph?.nodes || [],
        edges: graph?.edges || [],
        variables: graph?.variables || [],
        viewport: graph?.viewport,
        config: graph?.config
      };
      
      set((state) => {
        if (!state.currentProject) return state;
        
        return {
          currentProject: {
            ...state.currentProject,
            graphs: [...state.currentProject.graphs, newGraph],
            last_modified: new Date().toISOString()
          },
          hasUnsavedChanges: true
        };
      });
      
      return graphId;
    },
    
    // 從專案移除圖形
    removeGraphFromProject: (graphId: string) => {
      set((state) => {
        if (!state.currentProject) return state;
        
        return {
          currentProject: {
            ...state.currentProject,
            graphs: state.currentProject.graphs.filter(g => g.id !== graphId),
            last_modified: new Date().toISOString()
          },
          hasUnsavedChanges: true
        };
      });
    },
    
    // 更新專案中的圖形
    updateGraphInProject: (graphId: string, updates: Partial<RamenGraph>) => {
      set((state) => {
        if (!state.currentProject) return state;
        
        return {
          currentProject: {
            ...state.currentProject,
            graphs: state.currentProject.graphs.map(graph =>
              graph.id === graphId
                ? {
                    ...graph,
                    ...updates,
                    metadata: {
                      ...graph.metadata,
                      ...updates.metadata,
                      last_modified: new Date().toISOString()
                    }
                  }
                : graph
            ),
            last_modified: new Date().toISOString()
          },
          hasUnsavedChanges: true
        };
      });
    },
    
    // 取得專案中的圖形
    getProjectGraph: (graphId: string) => {
      const { currentProject } = get();
      if (!currentProject) return null;
      
      return currentProject.graphs.find(g => g.id === graphId) || null;
    }
  }))
);

// 自動保存機制
let autoSaveTimer: NodeJS.Timeout;

// 監聽變更並設置自動保存
useProjectStore.subscribe(
  (state) => state.hasUnsavedChanges,
  (hasUnsavedChanges) => {
    if (hasUnsavedChanges) {
      // 清除現有計時器
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      
      // 設置新的自動保存計時器（30秒後）
      autoSaveTimer = setTimeout(async () => {
        const state = useProjectStore.getState();
        if (state.hasUnsavedChanges && state.projectFilePath) {
          try {
            await state.saveProject();
            console.log('Project auto-saved');
          } catch (error) {
            console.error('Auto-save failed:', error);
          }
        }
      }, 30000); // 30秒自動保存
    }
  }
);