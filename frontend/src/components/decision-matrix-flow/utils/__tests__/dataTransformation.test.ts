// Basic tests for data transformation utilities
import { DecisionMatrix, Attribute, Rule, Condition, RuleAction } from '../../../../../../shared/types';
import { matrixToFlow } from '../matrixToFlow';
import { flowToMatrix, incrementVersion } from '../flowToMatrix';
import { layoutGraph } from '../layoutEngine';

describe('Data Transformation Utilities', () => {
  // Sample decision matrix for testing
  const sampleMatrix: DecisionMatrix = {
    version: '1.0',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'admin',
    description: 'Test matrix',
    active: true,
    attributes: [
      {
        name: 'frequency',
        type: 'categorical',
        possibleValues: ['daily', 'weekly', 'monthly'],
        weight: 0.7,
        description: 'How often the process runs'
      },
      {
        name: 'complexity',
        type: 'categorical',
        possibleValues: ['low', 'medium', 'high'],
        weight: 0.5,
        description: 'Process complexity'
      }
    ],
    rules: [
      {
        ruleId: 'rule-1',
        name: 'High Frequency RPA',
        description: 'Daily processes are good for RPA',
        priority: 85,
        active: true,
        conditions: [
          {
            attribute: 'frequency',
            operator: '==',
            value: 'daily'
          },
          {
            attribute: 'complexity',
            operator: '==',
            value: 'low'
          }
        ],
        action: {
          type: 'override',
          targetCategory: 'RPA',
          rationale: 'High frequency, low complexity is ideal for RPA'
        }
      }
    ]
  };

  describe('matrixToFlow', () => {
    it('should convert matrix to flow graph', () => {
      const result = matrixToFlow(sampleMatrix);
      
      expect(result.nodes).toBeDefined();
      expect(result.edges).toBeDefined();
      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.edges.length).toBeGreaterThan(0);
    });

    it('should create attribute nodes', () => {
      const result = matrixToFlow(sampleMatrix);
      const attributeNodes = result.nodes.filter(n => n.type === 'attribute');
      
      expect(attributeNodes.length).toBe(2);
      expect(attributeNodes[0].data.attribute.name).toBe('frequency');
    });

    it('should create rule nodes', () => {
      const result = matrixToFlow(sampleMatrix);
      const ruleNodes = result.nodes.filter(n => n.type === 'rule');
      
      expect(ruleNodes.length).toBe(1);
      expect(ruleNodes[0].data.rule.name).toBe('High Frequency RPA');
    });

    it('should create condition nodes', () => {
      const result = matrixToFlow(sampleMatrix);
      const conditionNodes = result.nodes.filter(n => n.type === 'condition');
      
      expect(conditionNodes.length).toBe(2);
    });

    it('should create action nodes', () => {
      const result = matrixToFlow(sampleMatrix);
      const actionNodes = result.nodes.filter(n => n.type === 'action');
      
      expect(actionNodes.length).toBe(1);
    });

    it('should create category nodes', () => {
      const result = matrixToFlow(sampleMatrix);
      const categoryNodes = result.nodes.filter(n => n.type === 'category');
      
      expect(categoryNodes.length).toBe(6); // All 6 transformation categories
    });

    it('should create edges connecting nodes', () => {
      const result = matrixToFlow(sampleMatrix);
      
      // Should have edges from attributes to conditions
      // edges from conditions to rules
      // edges from rules to actions
      // edges from actions to categories
      expect(result.edges.length).toBeGreaterThan(0);
    });
  });

  describe('flowToMatrix', () => {
    it('should convert flow graph back to matrix', () => {
      const flowResult = matrixToFlow(sampleMatrix);
      const matrix = flowToMatrix(flowResult.nodes, flowResult.edges, sampleMatrix);
      
      expect(matrix).toBeDefined();
      expect(matrix.attributes.length).toBe(2);
      expect(matrix.rules.length).toBe(1);
    });

    it('should preserve attribute data', () => {
      const flowResult = matrixToFlow(sampleMatrix);
      const matrix = flowToMatrix(flowResult.nodes, flowResult.edges, sampleMatrix);
      
      expect(matrix.attributes[0].name).toBe('frequency');
      expect(matrix.attributes[0].weight).toBe(0.7);
    });

    it('should preserve rule data', () => {
      const flowResult = matrixToFlow(sampleMatrix);
      const matrix = flowToMatrix(flowResult.nodes, flowResult.edges, sampleMatrix);
      
      expect(matrix.rules[0].name).toBe('High Frequency RPA');
      expect(matrix.rules[0].priority).toBe(85);
      expect(matrix.rules[0].conditions.length).toBe(2);
    });

    it('should increment version', () => {
      const flowResult = matrixToFlow(sampleMatrix);
      const matrix = flowToMatrix(flowResult.nodes, flowResult.edges, sampleMatrix);
      
      expect(matrix.version).not.toBe(sampleMatrix.version);
    });

    it('should set createdBy to admin', () => {
      const flowResult = matrixToFlow(sampleMatrix);
      const matrix = flowToMatrix(flowResult.nodes, flowResult.edges, sampleMatrix);
      
      expect(matrix.createdBy).toBe('admin');
    });
  });

  describe('incrementVersion', () => {
    it('should increment simple version', () => {
      expect(incrementVersion('1.0')).toBe('1.1');
      expect(incrementVersion('1.5')).toBe('1.6');
    });

    it('should increment three-part version', () => {
      expect(incrementVersion('1.0.0')).toBe('1.0.1');
      expect(incrementVersion('1.2.5')).toBe('1.2.6');
    });

    it('should handle version with v prefix', () => {
      expect(incrementVersion('v1.0')).toBe('1.1');
      expect(incrementVersion('v2.3.4')).toBe('2.3.5');
    });
  });

  describe('layoutGraph', () => {
    it('should apply layout to nodes', () => {
      const flowResult = matrixToFlow(sampleMatrix);
      const layoutResult = layoutGraph(flowResult.nodes, flowResult.edges);
      
      expect(layoutResult.nodes).toBeDefined();
      expect(layoutResult.edges).toBeDefined();
      expect(layoutResult.nodes.length).toBe(flowResult.nodes.length);
    });

    it('should set node positions', () => {
      const flowResult = matrixToFlow(sampleMatrix);
      const layoutResult = layoutGraph(flowResult.nodes, flowResult.edges);
      
      // All nodes should have positions
      layoutResult.nodes.forEach(node => {
        expect(node.position).toBeDefined();
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
      });
    });
  });

  describe('Round-trip conversion', () => {
    it('should preserve data through round-trip conversion', () => {
      // Matrix -> Flow -> Matrix
      const flowResult = matrixToFlow(sampleMatrix);
      const matrix = flowToMatrix(flowResult.nodes, flowResult.edges, sampleMatrix);
      
      // Check attributes preserved
      expect(matrix.attributes.length).toBe(sampleMatrix.attributes.length);
      expect(matrix.attributes[0].name).toBe(sampleMatrix.attributes[0].name);
      expect(matrix.attributes[0].weight).toBe(sampleMatrix.attributes[0].weight);
      
      // Check rules preserved
      expect(matrix.rules.length).toBe(sampleMatrix.rules.length);
      expect(matrix.rules[0].name).toBe(sampleMatrix.rules[0].name);
      expect(matrix.rules[0].priority).toBe(sampleMatrix.rules[0].priority);
      expect(matrix.rules[0].conditions.length).toBe(sampleMatrix.rules[0].conditions.length);
      
      // Check action preserved
      expect(matrix.rules[0].action.type).toBe(sampleMatrix.rules[0].action.type);
      expect(matrix.rules[0].action.targetCategory).toBe(sampleMatrix.rules[0].action.targetCategory);
    });
  });
});
