/**
 * 版本遷移測試
 */

import { describe, it, expect } from 'vitest';
import { 
  VersionUtils, 
  VersionComparison, 
  MigrationManager, 
  BackwardCompatibility 
} from '../migration';
import { GRAPH_FORMAT_VERSION } from '../../types/graph';

describe('VersionUtils', () => {
  describe('parseVersion', () => {
    it('should parse standard version strings', () => {
      expect(VersionUtils.parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
      expect(VersionUtils.parseVersion('0.0.1')).toEqual({ major: 0, minor: 0, patch: 1 });
      expect(VersionUtils.parseVersion('10.20.30')).toEqual({ major: 10, minor: 20, patch: 30 });
    });

    it('should handle partial version strings', () => {
      expect(VersionUtils.parseVersion('1.2')).toEqual({ major: 1, minor: 2, patch: 0 });
      expect(VersionUtils.parseVersion('1')).toEqual({ major: 1, minor: 0, patch: 0 });
    });

    it('should handle empty or invalid version strings', () => {
      expect(VersionUtils.parseVersion('')).toEqual({ major: 0, minor: 0, patch: 0 });
      expect(VersionUtils.parseVersion('invalid')).toEqual({ major: 0, minor: 0, patch: 0 });
    });
  });

  describe('compareVersions', () => {
    it('should return SAME for identical versions', () => {
      expect(VersionUtils.compareVersions('1.0.0', '1.0.0')).toBe(VersionComparison.SAME);
      expect(VersionUtils.compareVersions('2.5.3', '2.5.3')).toBe(VersionComparison.SAME);
    });

    it('should return NEWER for higher versions', () => {
      expect(VersionUtils.compareVersions('1.1.0', '1.0.0')).toBe(VersionComparison.NEWER);
      expect(VersionUtils.compareVersions('2.0.0', '1.9.9')).toBe(VersionComparison.NEWER);
      expect(VersionUtils.compareVersions('1.0.1', '1.0.0')).toBe(VersionComparison.NEWER);
    });

    it('should return OLDER for lower versions', () => {
      expect(VersionUtils.compareVersions('1.0.0', '1.1.0')).toBe(VersionComparison.OLDER);
      expect(VersionUtils.compareVersions('1.9.9', '2.0.0')).toBe(VersionComparison.OLDER);
      expect(VersionUtils.compareVersions('1.0.0', '1.0.1')).toBe(VersionComparison.OLDER);
    });
  });

  describe('isCompatible', () => {
    it('should return true for same major version', () => {
      expect(VersionUtils.isCompatible('1.0.0', '1.1.0')).toBe(true);
      expect(VersionUtils.isCompatible('1.2.0', '1.3.0')).toBe(true);
    });

    it('should return false for different major version', () => {
      expect(VersionUtils.isCompatible('1.0.0', '2.0.0')).toBe(false);
      expect(VersionUtils.isCompatible('2.0.0', '1.0.0')).toBe(false);
    });

    it('should return false for newer minor version in file', () => {
      expect(VersionUtils.isCompatible('1.2.0', '1.1.0')).toBe(false);
    });
  });

  describe('getVersionDiff', () => {
    it('should calculate version differences correctly', () => {
      expect(VersionUtils.getVersionDiff('1.0.0', '1.1.0')).toEqual({
        majorDiff: 0,
        minorDiff: 1,
        patchDiff: 0
      });

      expect(VersionUtils.getVersionDiff('1.0.0', '2.0.0')).toEqual({
        majorDiff: 1,
        minorDiff: 0,
        patchDiff: 0
      });

      expect(VersionUtils.getVersionDiff('1.2.3', '1.2.5')).toEqual({
        majorDiff: 0,
        minorDiff: 0,
        patchDiff: 2
      });
    });
  });
});

describe('MigrationManager', () => {
  describe('needsMigration', () => {
    it('should return true for older versions', () => {
      expect(MigrationManager.needsMigration('1.0.0', '1.1.0')).toBe(true);
      expect(MigrationManager.needsMigration('0.9.0', '1.0.0')).toBe(true);
    });

    it('should return false for same or newer versions', () => {
      expect(MigrationManager.needsMigration('1.0.0', '1.0.0')).toBe(false);
      expect(MigrationManager.needsMigration('1.1.0', '1.0.0')).toBe(false);
    });
  });

  describe('migrate', () => {
    it('should return original data for same version', () => {
      const testData = { id: 'test', metadata: { version: '1.0.0' } };
      const result = MigrationManager.migrate(testData, '1.0.0', '1.0.0');

      expect(result.success).toBe(true);
      expect(result.fromVersion).toBe('1.0.0');
      expect(result.toVersion).toBe('1.0.0');
      expect(result.data).toEqual(testData);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle missing migration path', () => {
      const testData = { id: 'test' };
      const result = MigrationManager.migrate(testData, '0.1.0', '2.0.0');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('No migration path found');
    });
  });

  describe('migrateGraph', () => {
    it('should migrate graph data with version in metadata', () => {
      const graphData = {
        id: 'test-graph',
        metadata: {
          name: 'Test Graph',
          version: '1.0.0'
        },
        nodes: [],
        edges: []
      };

      const result = MigrationManager.migrateGraph(graphData);
      expect(result.fromVersion).toBe('1.0.0');
    });

    it('should use default version for graph without version', () => {
      const graphData = {
        id: 'test-graph',
        metadata: { name: 'Test Graph' },
        nodes: [],
        edges: []
      };

      const result = MigrationManager.migrateGraph(graphData);
      expect(result.fromVersion).toBe('1.0.0'); // 預設版本
    });
  });

  describe('migrateProject', () => {
    it('should migrate project with graphs', () => {
      const projectData = {
        id: 'test-project',
        name: 'Test Project',
        version: '1.0.0',
        graphs: [
          {
            id: 'graph-1',
            metadata: { name: 'Graph 1', version: '1.0.0' },
            nodes: [],
            edges: []
          }
        ]
      };

      const result = MigrationManager.migrateProject(projectData);
      expect(result.fromVersion).toBe('1.0.0');
      expect(result.data.graphs).toHaveLength(1);
    });
  });

  describe('getSupportedVersions', () => {
    it('should return list of supported versions', () => {
      const versions = MigrationManager.getSupportedVersions();
      expect(Array.isArray(versions)).toBe(true);
      expect(versions.length).toBeGreaterThan(0);
      expect(versions).toContain(GRAPH_FORMAT_VERSION);
    });

    it('should return versions in descending order', () => {
      const versions = MigrationManager.getSupportedVersions();
      for (let i = 1; i < versions.length; i++) {
        const comparison = VersionUtils.compareVersions(versions[i-1], versions[i]);
        expect(comparison).toBe(VersionComparison.NEWER);
      }
    });
  });
});

describe('BackwardCompatibility', () => {
  describe('loadLegacyFormat', () => {
    it('should detect and convert ReactFlow format', () => {
      const legacyData = {
        nodes: [
          {
            id: 'node-1',
            type: 'operator',
            position: { x: 100, y: 200 },
            data: {
              name: 'Test Node',
              namespace: 'Math',
              brief: 'A test node'
            }
          }
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
            sourceHandle: 'output-1',
            targetHandle: 'input-1'
          }
        ]
      };

      const result = BackwardCompatibility.loadLegacyFormat(legacyData);
      
      expect(result.success).toBe(true);
      expect(result.graph).toBeDefined();
      expect(result.graph!.id).toBeDefined();
      expect(result.graph!.metadata.name).toBe('Migrated Graph');
      expect(result.graph!.nodes).toHaveLength(1);
      expect(result.graph!.edges).toHaveLength(1);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should return failure for unknown format', () => {
      const unknownData = {
        someProperty: 'value'
      };

      const result = BackwardCompatibility.loadLegacyFormat(unknownData);
      
      expect(result.success).toBe(false);
      expect(result.warnings).toContain('Unknown legacy format');
    });

    it('should handle conversion errors gracefully', () => {
      const invalidData = {
        nodes: 'invalid',
        edges: null
      };

      const result = BackwardCompatibility.loadLegacyFormat(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      // 這個案例會回傳 'Unknown legacy format' 因為不符合任何已知格式
      expect(result.warnings[0]).toContain('Unknown legacy format');
    });
  });
});