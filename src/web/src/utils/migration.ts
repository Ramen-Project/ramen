/**
 * 圖形格式版本遷移工具
 * 處理不同版本間的數據格式轉換
 */

import { RamenGraph, RamenProject, GRAPH_FORMAT_VERSION } from '../types/graph';

/**
 * 版本比較結果
 */
export enum VersionComparison {
  SAME = 0,
  NEWER = 1,
  OLDER = -1
}

/**
 * 遷移結果
 */
export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  warnings: string[];
  errors: string[];
  data: any;
}

/**
 * 遷移器介面
 */
export interface Migrator {
  fromVersion: string;
  toVersion: string;
  migrate(data: any): MigrationResult;
}

/**
 * 版本工具
 */
export class VersionUtils {
  
  /**
   * 解析版本號
   */
  static parseVersion(version: string): { major: number; minor: number; patch: number } {
    const parts = version.split('.').map(Number);
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0
    };
  }

  /**
   * 比較版本號
   */
  static compareVersions(version1: string, version2: string): VersionComparison {
    const v1 = this.parseVersion(version1);
    const v2 = this.parseVersion(version2);

    if (v1.major !== v2.major) {
      return v1.major > v2.major ? VersionComparison.NEWER : VersionComparison.OLDER;
    }
    if (v1.minor !== v2.minor) {
      return v1.minor > v2.minor ? VersionComparison.NEWER : VersionComparison.OLDER;
    }
    if (v1.patch !== v2.patch) {
      return v1.patch > v2.patch ? VersionComparison.NEWER : VersionComparison.OLDER;
    }
    
    return VersionComparison.SAME;
  }

  /**
   * 檢查版本兼容性
   */
  static isCompatible(fileVersion: string, appVersion: string = GRAPH_FORMAT_VERSION): boolean {
    const fileVer = this.parseVersion(fileVersion);
    const appVer = this.parseVersion(appVersion);
    
    // 主版本號不同則不兼容
    if (fileVer.major !== appVer.major) {
      return false;
    }
    
    // 次版本號向後兼容
    return fileVer.minor <= appVer.minor;
  }

  /**
   * 獲取版本間的差異
   */
  static getVersionDiff(from: string, to: string): {
    majorDiff: number;
    minorDiff: number;
    patchDiff: number;
  } {
    const fromVer = this.parseVersion(from);
    const toVer = this.parseVersion(to);
    
    return {
      majorDiff: toVer.major - fromVer.major,
      minorDiff: toVer.minor - fromVer.minor,
      patchDiff: toVer.patch - fromVer.patch
    };
  }
}

/**
 * 1.0.0 到 1.1.0 的遷移器 (範例)
 */
class Migration_1_0_0_to_1_1_0 implements Migrator {
  fromVersion = '1.0.0';
  toVersion = '1.1.0';

  migrate(data: any): MigrationResult {
    const result: MigrationResult = {
      success: true,
      fromVersion: this.fromVersion,
      toVersion: this.toVersion,
      warnings: [],
      errors: [],
      data: { ...data }
    };

    try {
      // 範例：添加新的 metadata 欄位
      if (result.data.metadata && !result.data.metadata.tags) {
        result.data.metadata.tags = [];
        result.warnings.push('Added missing tags field to metadata');
      }

      // 範例：更新節點結構
      if (result.data.nodes) {
        result.data.nodes = result.data.nodes.map((node: any) => {
          if (!node.metadata.category) {
            node.metadata.category = 'Utilities';
            result.warnings.push(`Added default category to node ${node.id}`);
          }
          return node;
        });
      }

      // 更新版本號
      if (result.data.metadata) {
        result.data.metadata.version = this.toVersion;
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Migration failed: ${error.message}`);
    }

    return result;
  }
}

/**
 * 遷移管理器
 */
export class MigrationManager {
  private static migrators: Migrator[] = [
    new Migration_1_0_0_to_1_1_0(),
    // 未來的遷移器可以在這裡添加
  ];

  /**
   * 獲取可用的遷移路徑
   */
  static getMigrationPath(fromVersion: string, toVersion: string): Migrator[] {
    const path: Migrator[] = [];
    let currentVersion = fromVersion;

    while (VersionUtils.compareVersions(currentVersion, toVersion) === VersionComparison.OLDER) {
      const migrator = this.migrators.find(m => m.fromVersion === currentVersion);
      
      if (!migrator) {
        throw new Error(`No migration path found from ${currentVersion} to ${toVersion}`);
      }
      
      path.push(migrator);
      currentVersion = migrator.toVersion;
    }

    return path;
  }

  /**
   * 執行遷移
   */
  static migrate(data: any, fromVersion: string, toVersion: string = GRAPH_FORMAT_VERSION): MigrationResult {
    // 如果版本相同，不需要遷移
    if (VersionUtils.compareVersions(fromVersion, toVersion) === VersionComparison.SAME) {
      return {
        success: true,
        fromVersion,
        toVersion,
        warnings: [],
        errors: [],
        data
      };
    }

    try {
      const migrationPath = this.getMigrationPath(fromVersion, toVersion);
      let currentData = data;
      const allWarnings: string[] = [];
      const allErrors: string[] = [];

      for (const migrator of migrationPath) {
        const result = migrator.migrate(currentData);
        
        if (!result.success) {
          return {
            success: false,
            fromVersion,
            toVersion,
            warnings: allWarnings.concat(result.warnings),
            errors: allErrors.concat(result.errors),
            data: currentData
          };
        }

        currentData = result.data;
        allWarnings.push(...result.warnings);
        allErrors.push(...result.errors);
      }

      return {
        success: true,
        fromVersion,
        toVersion,
        warnings: allWarnings,
        errors: allErrors,
        data: currentData
      };

    } catch (error) {
      return {
        success: false,
        fromVersion,
        toVersion,
        warnings: [],
        errors: [`Migration failed: ${error.message}`],
        data
      };
    }
  }

  /**
   * 自動遷移圖形數據
   */
  static migrateGraph(graphData: any): MigrationResult {
    const fileVersion = graphData.metadata?.version || '1.0.0';
    return this.migrate(graphData, fileVersion);
  }

  /**
   * 自動遷移專案數據
   */
  static migrateProject(projectData: any): MigrationResult {
    const fileVersion = projectData.version || '1.0.0';
    
    // 先遷移專案級別的數據
    const projectResult = this.migrate(projectData, fileVersion);
    
    if (!projectResult.success) {
      return projectResult;
    }

    // 遷移每個圖形
    const migratedGraphs: any[] = [];
    const allWarnings = [...projectResult.warnings];
    const allErrors = [...projectResult.errors];

    for (const graph of projectResult.data.graphs || []) {
      const graphResult = this.migrateGraph(graph);
      
      if (!graphResult.success) {
        allErrors.push(`Failed to migrate graph ${graph.id}: ${graphResult.errors.join(', ')}`);
        continue;
      }
      
      migratedGraphs.push(graphResult.data);
      allWarnings.push(...graphResult.warnings);
      allErrors.push(...graphResult.errors);
    }

    return {
      success: allErrors.length === 0,
      fromVersion: fileVersion,
      toVersion: GRAPH_FORMAT_VERSION,
      warnings: allWarnings,
      errors: allErrors,
      data: {
        ...projectResult.data,
        graphs: migratedGraphs
      }
    };
  }

  /**
   * 檢查是否需要遷移
   */
  static needsMigration(version: string, targetVersion: string = GRAPH_FORMAT_VERSION): boolean {
    return VersionUtils.compareVersions(version, targetVersion) === VersionComparison.OLDER;
  }

  /**
   * 獲取所有支援的版本
   */
  static getSupportedVersions(): string[] {
    const versions = new Set<string>();
    
    // 添加所有遷移器的版本
    this.migrators.forEach(migrator => {
      versions.add(migrator.fromVersion);
      versions.add(migrator.toVersion);
    });
    
    // 添加當前版本
    versions.add(GRAPH_FORMAT_VERSION);
    
    return Array.from(versions).sort((a, b) => 
      VersionUtils.compareVersions(a, b) === VersionComparison.NEWER ? -1 : 1
    );
  }
}

/**
 * 向後兼容性工具
 */
export class BackwardCompatibility {
  
  /**
   * 嘗試從舊格式載入數據
   */
  static loadLegacyFormat(data: any): { success: boolean; graph?: RamenGraph; warnings: string[] } {
    const warnings: string[] = [];
    
    try {
      // 檢查是否為 ReactFlow 格式
      if (data.nodes && data.edges && !data.metadata) {
        warnings.push('Detected legacy ReactFlow format, converting...');
        
        const graph: RamenGraph = {
          id: `migrated-${Date.now()}`,
          metadata: {
            name: 'Migrated Graph',
            description: 'Converted from legacy format',
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            version: GRAPH_FORMAT_VERSION
          },
          nodes: this.convertLegacyNodes(data.nodes),
          edges: this.convertLegacyEdges(data.edges),
          variables: [],
          viewport: data.viewport
        };
        
        return { success: true, graph, warnings };
      }
      
      // 其他舊格式檢查...
      
      return { success: false, warnings: ['Unknown legacy format'] };
      
    } catch (error) {
      return { success: false, warnings: [`Failed to convert legacy format: ${error.message}`] };
    }
  }

  /**
   * 轉換舊的節點格式
   */
  private static convertLegacyNodes(legacyNodes: any[]): any[] {
    return legacyNodes.map(node => ({
      id: node.id,
      metadata: {
        type: node.type || 'operator',
        name: node.data?.name || node.id,
        namespace: node.data?.namespace || 'default',
        description: node.data?.brief || node.data?.description
      },
      position: node.position,
      inputs: node.data?.inputs || [],
      outputs: node.data?.outputs || [],
      parentId: node.parentId,
      selected: node.selected,
      visible: !node.hidden,
      data: node.data
    }));
  }

  /**
   * 轉換舊的邊格式
   */
  private static convertLegacyEdges(legacyEdges: any[]): any[] {
    return legacyEdges.map(edge => ({
      id: edge.id,
      sourceNodeId: edge.source,
      sourcePortId: edge.sourceHandle || 'output0',
      targetNodeId: edge.target,
      targetPortId: edge.targetHandle || 'input0',
      label: edge.label,
      selected: edge.selected,
      visible: !edge.hidden,
      style: edge.style,
      data: edge.data
    }));
  }
}