/**
 * 專案管理狀態測試
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectStore } from '../ProjectStore';

// Mock fetch
global.fetch = vi.fn();

describe('ProjectStore', () => {
  beforeEach(() => {
    // 重置 store 狀態
    act(() => {
      useProjectStore.setState({
        currentProject: null,
        isProjectLoaded: false,
        hasUnsavedChanges: false,
        lastSavedAt: null,
        projectFilePath: null
      });
    });
    
    // 重置 mock
    vi.clearAllMocks();
  });

  describe('初始狀態', () => {
    it('應該有正確的初始狀態', () => {
      const { result } = renderHook(() => useProjectStore());
      
      expect(result.current.currentProject).toBeNull();
      expect(result.current.isProjectLoaded).toBe(false);
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.lastSavedAt).toBeNull();
      expect(result.current.projectFilePath).toBeNull();
    });
  });

  describe('createProject', () => {
    it('應該創建新專案', async () => {
      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.createProject('測試專案', '這是一個測試專案');
      });
      
      expect(result.current.currentProject).not.toBeNull();
      expect(result.current.currentProject?.name).toBe('測試專案');
      expect(result.current.currentProject?.description).toBe('這是一個測試專案');
      expect(result.current.isProjectLoaded).toBe(true);
      expect(result.current.hasUnsavedChanges).toBe(true);
      expect(result.current.currentProject?.graphs).toHaveLength(1);
    });

    it('應該創建包含初始圖形的專案', async () => {
      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.createProject('測試專案');
      });
      
      const project = result.current.currentProject!;
      expect(project.graphs).toHaveLength(1);
      expect(project.graphs[0].metadata.name).toBe('Main Graph');
      expect(project.graphs[0].nodes).toEqual([]);
      expect(project.graphs[0].edges).toEqual([]);
    });
  });

  describe('openProject', () => {
    it('應該載入專案檔案', async () => {
      const mockProjectData = {
        id: 'project-1',
        name: '已存在的專案',
        description: '測試描述',
        graphs: [{
          id: 'graph-1',
          metadata: { name: 'Graph 1', version: '1.0.0' },
          nodes: [],
          edges: [],
          variables: []
        }],
        version: '1.0.0',
        created_at: '2023-01-01T00:00:00Z',
        last_modified: '2023-01-01T00:00:00Z'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData)
      });

      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.openProject('/path/to/project.ramen-project');
      });
      
      expect(result.current.currentProject?.name).toBe('已存在的專案');
      expect(result.current.isProjectLoaded).toBe(true);
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.projectFilePath).toBe('/path/to/project.ramen-project');
    });

    it('應該處理載入錯誤', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      });

      const { result } = renderHook(() => useProjectStore());
      
      await expect(
        act(async () => {
          await result.current.openProject('/invalid/path.ramen-project');
        })
      ).rejects.toThrow('Failed to load project: Not Found');
    });
  });

  describe('saveProject', () => {
    it('應該保存專案到檔案', async () => {
      const { result } = renderHook(() => useProjectStore());
      
      // 先創建專案
      await act(async () => {
        await result.current.createProject('測試專案');
      });

      // 設置檔案路徑
      act(() => {
        useProjectStore.setState({ 
          projectFilePath: '/path/to/project.ramen-project' 
        });
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
      
      await act(async () => {
        await result.current.saveProject();
      });
      
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.lastSavedAt).not.toBeNull();
      expect(global.fetch).toHaveBeenCalledWith('/api/projects/save', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }));
    });

    it('應該在沒有檔案路徑時拋出錯誤', async () => {
      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.createProject('測試專案');
      });
      
      await expect(
        act(async () => {
          await result.current.saveProject();
        })
      ).rejects.toThrow('No file path specified');
    });
  });

  describe('updateProjectInfo', () => {
    it('應該更新專案資訊', async () => {
      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.createProject('原始名稱', '原始描述');
      });
      
      act(() => {
        result.current.updateProjectInfo({
          name: '新名稱',
          description: '新描述'
        });
      });
      
      expect(result.current.currentProject?.name).toBe('新名稱');
      expect(result.current.currentProject?.description).toBe('新描述');
      expect(result.current.hasUnsavedChanges).toBe(true);
    });
  });

  describe('圖形管理', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useProjectStore());
      await act(async () => {
        await result.current.createProject('測試專案');
      });
    });

    it('應該添加新圖形到專案', () => {
      const { result } = renderHook(() => useProjectStore());
      
      let graphId: string;
      act(() => {
        graphId = result.current.addGraphToProject({
          metadata: { name: '新圖形' }
        });
      });
      
      expect(result.current.currentProject?.graphs).toHaveLength(2);
      expect(result.current.hasUnsavedChanges).toBe(true);
      
      const newGraph = result.current.currentProject?.graphs.find(g => g.id === graphId);
      expect(newGraph?.metadata.name).toBe('新圖形');
    });

    it('應該從專案移除圖形', () => {
      const { result } = renderHook(() => useProjectStore());
      
      const initialGraphId = result.current.currentProject!.graphs[0].id;
      
      // 先添加另一個圖形，這樣移除後不會是空的
      act(() => {
        result.current.addGraphToProject();
      });
      
      act(() => {
        result.current.removeGraphFromProject(initialGraphId);
      });
      
      expect(result.current.currentProject?.graphs).toHaveLength(1);
      expect(result.current.hasUnsavedChanges).toBe(true);
      expect(
        result.current.currentProject?.graphs.find(g => g.id === initialGraphId)
      ).toBeUndefined();
    });

    it('應該更新專案中的圖形', () => {
      const { result } = renderHook(() => useProjectStore());
      
      const graphId = result.current.currentProject!.graphs[0].id;
      
      act(() => {
        result.current.updateGraphInProject(graphId, {
          metadata: { name: '更新的圖形名稱' }
        });
      });
      
      const updatedGraph = result.current.currentProject?.graphs.find(g => g.id === graphId);
      expect(updatedGraph?.metadata.name).toBe('更新的圖形名稱');
      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('應該取得專案中的圖形', () => {
      const { result } = renderHook(() => useProjectStore());
      
      const graphId = result.current.currentProject!.graphs[0].id;
      const graph = result.current.getProjectGraph(graphId);
      
      expect(graph).not.toBeNull();
      expect(graph?.id).toBe(graphId);
    });
  });

  describe('closeProject', () => {
    it('應該關閉專案並重置狀態', async () => {
      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.createProject('測試專案');
      });
      
      // Mock window.confirm to return false (don't save)
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      await act(async () => {
        await result.current.closeProject();
      });
      
      expect(result.current.currentProject).toBeNull();
      expect(result.current.isProjectLoaded).toBe(false);
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.projectFilePath).toBeNull();
    });
  });
});