// src/app/services/node.service.ts - Fixed Node Service

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { nodeDefinitions, NodeTemplate } from './node-definitions';

export interface NodePort {
  id: string;
  color: string;
  label: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface NodeContent {
  title: string;
  description?: string;
  hasFileUpload?: boolean;
  displayOnly?: boolean;
  inputFields?: any[];
  status?: string;
}

export interface FlowNode {
  id: string;
  type: string;
  position: Position;
  inputs: NodePort[];
  outputs: NodePort[];
  content: NodeContent;
  config?: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class NodeService {
  private nodesSubject = new BehaviorSubject<FlowNode[]>([]);
  public nodes$ = this.nodesSubject.asObservable();
  private nodeCounter = 0;

  constructor() {}

  /**
   * Add a new node to the flow.
   */
  addNode(nodeType: string, position: Position): string {
    const nodeId = `node-${++this.nodeCounter}`;
    const newNode = this.createNodeFromType(nodeId, nodeType, position);

    const currentNodes = this.nodesSubject.getValue();
    this.nodesSubject.next([...currentNodes, newNode]);

    console.log('Added node:', newNode);
    return nodeId;
  }

  /**
   * Bulk add nodes (used when loading from file).
   * FIXED: Properly preserve positions and reset node counter.
   */
  bulkAddNodes(nodes: FlowNode[]): void {
    // Ensure positions are properly formatted and nodes have complete structure
    const processedNodes = nodes.map(node => {
      // For loaded nodes, we don't need to replace template IDs since they should already have proper IDs
      // But we need to ensure the node has the complete definition
      const nodeDefinition = nodeDefinitions[node.type];

      let processedInputs = node.inputs || [];
      let processedOutputs = node.outputs || [];

      // If the node has empty or missing ports, restore them from definition
      if (nodeDefinition) {
        if (processedInputs.length === 0 && nodeDefinition.inputs.length > 0) {
          processedInputs = nodeDefinition.inputs.map(input => ({
            ...input,
            id: input.id.replace('{nodeId}', node.id)
          }));
        }

        if (processedOutputs.length === 0 && nodeDefinition.outputs.length > 0) {
          processedOutputs = nodeDefinition.outputs.map(output => ({
            ...output,
            id: output.id.replace('{nodeId}', node.id)
          }));
        }
      }

      return {
        ...node,
        position: {
          x: Number(node.position?.x) || 0,
          y: Number(node.position?.y) || 0
        },
        inputs: processedInputs,
        outputs: processedOutputs,
        content: node.content || { title: node.type },
        config: node.config || {}
      };
    });

    // Reset node counter based on loaded nodes to avoid ID conflicts
    const maxNodeNumber = processedNodes.reduce((max, node) => {
      const match = node.id.match(/node-(\d+)/);
      return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);

    this.nodeCounter = maxNodeNumber;

    this.nodesSubject.next(processedNodes);
    console.log('Bulk added nodes with preserved positions and restored content:', processedNodes);
  }

  /**
   * Get a node by ID.
   */
  getNodeById(nodeId: string): FlowNode | undefined {
    return this.nodesSubject.getValue().find(node => node.id === nodeId);
  }

  /**
   * Update node content/configuration.
   */
  updateNodeContent(nodeId: string, updates: Partial<FlowNode>): void {
    const currentNodes = this.nodesSubject.getValue();
    const updatedNodes = currentNodes.map(node =>
      node.id === nodeId
        ? {
            ...node,
            ...updates,
            // Preserve position if not explicitly updated
            position: updates.position || node.position
          }
        : node
    );
    this.nodesSubject.next(updatedNodes);
  }

  /**
   * Update node position (called during drag operations).
   */
  updateNodePosition(nodeId: string, position: Position): void {
    const currentNodes = this.nodesSubject.getValue();
    const updatedNodes = currentNodes.map(node =>
      node.id === nodeId
        ? { ...node, position: { x: Number(position.x), y: Number(position.y) } }
        : node
    );
    this.nodesSubject.next(updatedNodes);
  }

  /**
   * Remove a node from the flow.
   */
  removeNode(nodeId: string): void {
    const currentNodes = this.nodesSubject.getValue();
    const filteredNodes = currentNodes.filter(node => node.id !== nodeId);
    this.nodesSubject.next(filteredNodes);
  }

  /**
   * Clear all nodes.
   */
  clearAllNodes(): void {
    this.nodesSubject.next([]);
    this.nodeCounter = 0;
  }

  /**
   * Get all nodes.
   */
  getAllNodes(): FlowNode[] {
    return this.nodesSubject.getValue();
  }

  /**
   * Clone a node at a new position.
   */
  cloneNode(nodeId: string, newPosition: Position): string {
    const sourceNode = this.getNodeById(nodeId);
    if (!sourceNode) throw new Error('Node not found');

    const clonedId = `node-${++this.nodeCounter}`;
    const clonedNode: FlowNode = {
      ...sourceNode,
      id: clonedId,
      position: { x: Number(newPosition.x), y: Number(newPosition.y) },
      inputs: sourceNode.inputs.map(input => ({
        ...input,
        id: input.id.replace(sourceNode.id, clonedId)
      })),
      outputs: sourceNode.outputs.map(output => ({
        ...output,
        id: output.id.replace(sourceNode.id, clonedId)
      }))
    };

    const currentNodes = this.nodesSubject.getValue();
    this.nodesSubject.next([...currentNodes, clonedNode]);

    return clonedId;
  }

  /**
   * Create a node from type definition.
   * FIXED: Properly replace template IDs with actual node IDs.
   */
  private createNodeFromType(nodeId: string, nodeType: string, position: Position): FlowNode {
    // Ensure position is properly formatted
    const validPosition = {
      x: Number(position.x) || 0,
      y: Number(position.y) || 0
    };

    const baseNode: FlowNode = {
      id: nodeId,
      type: nodeType,
      position: validPosition,
      inputs: [],
      outputs: [],
      content: { title: nodeType },
      config: {}
    };

    const nodeDefinition = nodeDefinitions[nodeType];
    if (nodeDefinition) {
      // Replace template IDs with actual node IDs
      const processedInputs = nodeDefinition.inputs.map(input => ({
        ...input,
        id: input.id.replace('{nodeId}', nodeId)
      }));

      const processedOutputs = nodeDefinition.outputs.map(output => ({
        ...output,
        id: output.id.replace('{nodeId}', nodeId)
      }));

      return {
        ...baseNode,
        ...nodeDefinition,
        inputs: processedInputs,
        outputs: processedOutputs
      };
    }

    return baseNode;
  }
}
