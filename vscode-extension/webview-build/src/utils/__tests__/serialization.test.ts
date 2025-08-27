/**
 * 圖形序列化和反序列化測試
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GraphSerializer, GraphDeserializer, FormatValidator, GraphConverter } from '../serialization';
import { RamenGraph, RamenProject, NodeMetadata, Position } from '../../types/graph';

describe('GraphSerializer', () => {
  let sampleGraph: RamenGraph;
  let sampleProject: RamenProject;

  beforeEach(() => {
    // 建立測試用的圖形數據
    sampleGraph = {
      id: 'test-graph-1',
      metadata: {
        name: 'Test Graph',
        description: 'A test graph for serialization',
        createdAt: '2023-01-01T00:00:00Z',
        lastModified: '2023-01-01T00:00:00Z',
        version: '1.0.0',
        author: 'Test User',
        tags: ['test', 'demo']
      },
      nodes: [
        {
          id: 'node-1',
          metadata: {
            type: 'operator',
            name: 'Add Numbers',
            namespace: 'Math',
            description: 'Adds two numbers together'
          } as NodeMetadata,
          position: { x: 100, y: 200 } as Position,
          inputs: [
            { id: 'input-1', name: 'a', typeId: 'float', isInput: true },
            { id: 'input-2', name: 'b', typeId: 'float', isInput: true }
          ],
          outputs: [
            { id: 'output-1', name: 'result', typeId: 'float', isInput: false }
          ]
        }
      ],
      edges: [
        {
          id: 'edge-1',
          sourceNodeId: 'node-1',
          sourcePortId: 'output-1',
          targetNodeId: 'node-2',
          targetPortId: 'input-1'
        }
      ],
      variables: []
    };

    sampleProject = {
      id: 'test-project-1',
      name: 'Test Project',
      description: 'A test project',
      graphs: [sampleGraph],
      createdAt: '2023-01-01T00:00:00Z',
      lastModified: '2023-01-01T00:00:00Z',
      version: '1.0.0'
    };
  });

  describe('toJSON', () => {
    it('should serialize graph to JSON string', () => {
      const json = GraphSerializer.toJSON(sampleGraph);
      expect(json).toBeDefined();
      expect(typeof json).toBe('string');
      
      // 確保 JSON 可以被解析
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(sampleGraph.id);
      expect(parsed.metadata.name).toBe(sampleGraph.metadata.name);
    });

    it('should create pretty formatted JSON by default', () => {
      const json = GraphSerializer.toJSON(sampleGraph);
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('should create compact JSON when pretty is false', () => {
      const json = GraphSerializer.toJSON(sampleGraph, false);
      expect(json).not.toContain('\n');
    });
  });

  describe('projectToJSON', () => {
    it('should serialize project to JSON string', () => {
      const json = GraphSerializer.projectToJSON(sampleProject);
      expect(json).toBeDefined();
      expect(typeof json).toBe('string');
      
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(sampleProject.id);
      expect(parsed.name).toBe(sampleProject.name);
      expect(parsed.graphs).toHaveLength(1);
    });
  });

  describe('createGraphFile', () => {
    it('should create valid graph file structure', () => {
      const graphFile = GraphSerializer.createGraphFile(sampleGraph);
      
      expect(graphFile.header).toBeDefined();
      expect(graphFile.header.format).toBe('ramen-graph');
      expect(graphFile.header.version).toBeDefined();
      expect(graphFile.header.createdAt).toBeDefined();
      expect(graphFile.graph).toBe(sampleGraph);
    });
  });

  describe('createProjectFile', () => {
    it('should create valid project file structure', () => {
      const projectFile = GraphSerializer.createProjectFile(sampleProject);
      
      expect(projectFile.header).toBeDefined();
      expect(projectFile.header.format).toBe('ramen-project');
      expect(projectFile.header.version).toBeDefined();
      expect(projectFile.header.createdAt).toBeDefined();
      expect(projectFile.project).toBe(sampleProject);
    });
  });
});

describe('GraphDeserializer', () => {
  let sampleGraphJSON: string;
  let sampleProjectJSON: string;

  beforeEach(() => {
    const sampleGraph = {
      id: 'test-graph-1',
      metadata: {
        name: 'Test Graph',
        version: '1.0.0',
        createdAt: '2023-01-01T00:00:00Z',
        lastModified: '2023-01-01T00:00:00Z'
      },
      nodes: [],
      edges: [],
      variables: []
    };

    const sampleProject = {
      id: 'test-project-1',
      name: 'Test Project',
      graphs: [sampleGraph],
      version: '1.0.0',
      createdAt: '2023-01-01T00:00:00Z',
      lastModified: '2023-01-01T00:00:00Z'
    };

    sampleGraphJSON = JSON.stringify(sampleGraph);
    sampleProjectJSON = JSON.stringify(sampleProject);
  });

  describe('fromJSON', () => {
    it('should deserialize valid graph JSON', () => {
      const graph = GraphDeserializer.fromJSON(sampleGraphJSON);
      
      expect(graph.id).toBe('test-graph-1');
      expect(graph.metadata.name).toBe('Test Graph');
      expect(graph.nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => {
        GraphDeserializer.fromJSON('invalid json');
      }).toThrow();
    });

    it('should throw error for JSON missing required fields', () => {
      const invalidGraph = { name: 'Invalid' };
      
      expect(() => {
        GraphDeserializer.fromJSON(JSON.stringify(invalidGraph));
      }).toThrow('Invalid graph structure');
    });
  });

  describe('projectFromJSON', () => {
    it('should deserialize valid project JSON', () => {
      const project = GraphDeserializer.projectFromJSON(sampleProjectJSON);
      
      expect(project.id).toBe('test-project-1');
      expect(project.name).toBe('Test Project');
      expect(project.graphs).toHaveLength(1);
    });

    it('should throw error for invalid project structure', () => {
      const invalidProject = { name: 'Invalid' };
      
      expect(() => {
        GraphDeserializer.projectFromJSON(JSON.stringify(invalidProject));
      }).toThrow('Invalid project structure');
    });
  });
});

describe('FormatValidator', () => {
  describe('isValidRamenFile', () => {
    it('should return true for .ramen files', () => {
      const file = new File([''], 'test.ramen', { type: 'application/json' });
      expect(FormatValidator.isValidRamenFile(file)).toBe(true);
    });

    it('should return true for .ramen-project files', () => {
      const file = new File([''], 'test.ramen-project', { type: 'application/json' });
      expect(FormatValidator.isValidRamenFile(file)).toBe(true);
    });

    it('should return false for other file types', () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' });
      expect(FormatValidator.isValidRamenFile(file)).toBe(false);
    });
  });

  describe('isValidGraphJSON', () => {
    it('should return true for valid graph JSON', () => {
      const validGraph = {
        id: 'test',
        metadata: { name: 'Test' },
        nodes: [],
        edges: []
      };
      expect(FormatValidator.isValidGraphJSON(JSON.stringify(validGraph))).toBe(true);
    });

    it('should return false for invalid graph JSON', () => {
      const invalidGraph = { name: 'Test' };
      expect(FormatValidator.isValidGraphJSON(JSON.stringify(invalidGraph))).toBe(false);
    });

    it('should return false for malformed JSON', () => {
      expect(FormatValidator.isValidGraphJSON('invalid json')).toBe(false);
    });
  });

  describe('isValidProjectJSON', () => {
    it('should return true for valid project JSON', () => {
      const validProject = {
        id: 'test',
        name: 'Test Project',
        graphs: []
      };
      expect(FormatValidator.isValidProjectJSON(JSON.stringify(validProject))).toBe(true);
    });

    it('should return false for invalid project JSON', () => {
      const invalidProject = { name: 'Test' };
      expect(FormatValidator.isValidProjectJSON(JSON.stringify(invalidProject))).toBe(false);
    });
  });

  describe('detectFileType', () => {
    it('should detect graph files', () => {
      const file = new File([''], 'test.ramen', { type: 'application/json' });
      expect(FormatValidator.detectFileType(file)).toBe('graph');
    });

    it('should detect project files', () => {
      const file = new File([''], 'test.ramen-project', { type: 'application/json' });
      expect(FormatValidator.detectFileType(file)).toBe('project');
    });

    it('should return unknown for other files', () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' });
      expect(FormatValidator.detectFileType(file)).toBe('unknown');
    });
  });
});

describe('GraphConverter', () => {
  describe('fromReactFlow', () => {
    it('should convert ReactFlow format to Ramen format', () => {
      const reactFlowNodes = [
        {
          id: 'node-1',
          type: 'operator',
          position: { x: 100, y: 200 },
          data: {
            name: 'Test Node',
            namespace: 'Math',
            brief: 'A test node',
            inputs: [{ id: 'input-1', name: 'a', typeId: 'float', isInput: true }],
            outputs: [{ id: 'output-1', name: 'result', typeId: 'float', isInput: false }]
          }
        }
      ];

      const reactFlowEdges = [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
          sourceHandle: 'output-1',
          targetHandle: 'input-1'
        }
      ];

      const metadata = {
        id: 'test-graph',
        name: 'Test Graph'
      };

      const ramenGraph = GraphConverter.fromReactFlow(reactFlowNodes, reactFlowEdges, metadata);

      expect(ramenGraph.id).toBe('test-graph');
      expect(ramenGraph.metadata.name).toBe('Test Graph');
      expect(ramenGraph.nodes).toHaveLength(1);
      expect(ramenGraph.edges).toHaveLength(1);
      
      const node = ramenGraph.nodes[0];
      expect(node.id).toBe('node-1');
      expect(node.metadata.name).toBe('Test Node');
      expect(node.position).toEqual({ x: 100, y: 200 });
      
      const edge = ramenGraph.edges[0];
      expect(edge.sourceNodeId).toBe('node-1');
      expect(edge.targetNodeId).toBe('node-2');
      expect(edge.sourcePortId).toBe('output-1');
      expect(edge.targetPortId).toBe('input-1');
    });
  });

  describe('toReactFlow', () => {
    it('should convert Ramen format to ReactFlow format', () => {
      const ramenGraph: RamenGraph = {
        id: 'test-graph',
        metadata: {
          name: 'Test Graph',
          createdAt: '2023-01-01T00:00:00Z',
          lastModified: '2023-01-01T00:00:00Z',
          version: '1.0.0'
        },
        nodes: [
          {
            id: 'node-1',
            metadata: {
              type: 'operator',
              name: 'Test Node',
              namespace: 'Math',
              description: 'A test node'
            },
            position: { x: 100, y: 200 },
            inputs: [{ id: 'input-1', name: 'a', typeId: 'float', isInput: true }],
            outputs: [{ id: 'output-1', name: 'result', typeId: 'float', isInput: false }]
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            sourcePortId: 'output-1',
            targetNodeId: 'node-2',
            targetPortId: 'input-1'
          }
        ],
        variables: []
      };

      const { nodes, edges } = GraphConverter.toReactFlow(ramenGraph);

      expect(nodes).toHaveLength(1);
      expect(edges).toHaveLength(1);
      
      const node = nodes[0];
      expect(node.id).toBe('node-1');
      expect(node.type).toBe('operator');
      expect(node.position).toEqual({ x: 100, y: 200 });
      expect(node.data.name).toBe('Test Node');
      expect(node.data.namespace).toBe('Math');
      
      const edge = edges[0];
      expect(edge.source).toBe('node-1');
      expect(edge.target).toBe('node-2');
      expect(edge.sourceHandle).toBe('output-1');
      expect(edge.targetHandle).toBe('input-1');
    });
  });
});