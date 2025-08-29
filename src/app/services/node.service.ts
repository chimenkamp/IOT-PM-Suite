// src/app/services/node.service.ts - Updated with error highlighting support

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { nodeDefinitions, NodeTemplate, Position } from './node-definitions';

export interface NodeHandle {
  id: string;
  color: string;
  label: string;
}

export interface NodeContent {
  title: string;
  description: string;
  hasInput?: boolean;
  inputPlaceholder?: string;
  hasSelect?: boolean;
  selectOptions?: string[];
  selectLabel?: string;
  configOptions?: string[];
  hasImageDisplay?: boolean;
  displayOnly?: boolean;
  status?: string;
  hasFileUpload?: boolean;
  hasMultipleInputs?: boolean;
  inputFields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'number' | 'checkbox';
    options?: string[];
    placeholder?: string;
    required?: boolean;
  }>;
}

export interface FlowNode {
  id: string;
  type: string;
  position: Position;
  inputs: NodeHandle[];
  outputs: NodeHandle[];
  content: NodeContent;
  config?: Record<string, any>;
  hasError?: boolean;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NodeService {
  private nodesSubject = new BehaviorSubject<FlowNode[]>([]);
  private nodeIdCounter = 1;

  public nodes$: Observable<FlowNode[]> = this.nodesSubject.asObservable();

  /**
   * Get all nodes.
   */
  getAllNodes(): FlowNode[] {
    return this.nodesSubject.getValue();
  }

  /**
   * Get node by ID.
   */
  getNodeById(id: string): FlowNode | undefined {
    return this.nodesSubject.getValue().find(node => node.id === id);
  }

  /**
   * Add a new node to the canvas.
   */
  addNode(nodeType: string, position: Position): FlowNode {
    const nodeTemplate = nodeDefinitions[nodeType];
    if (!nodeTemplate) {
      throw new Error(`Unknown node type: ${nodeType}`);
    }

    const nodeId = `node-${this.nodeIdCounter++}`;

    const newNode: FlowNode = {
      id: nodeId,
      type: nodeType,
      position,
      inputs: nodeTemplate.inputs.map(input => ({
        ...input,
        id: input.id.replace('{nodeId}', nodeId)
      })),
      outputs: nodeTemplate.outputs.map(output => ({
        ...output,
        id: output.id.replace('{nodeId}', nodeId)
      })),
      content: { ...nodeTemplate.content },
      config: {},
      hasError: false
    };

    const currentNodes = this.nodesSubject.getValue();
    this.nodesSubject.next([...currentNodes, newNode]);

    console.log(`Added node: ${nodeId} of type ${nodeType} at position (${position.x}, ${position.y})`);
    return newNode;
  }

  /**
   * Remove a node by ID.
   */
  removeNode(nodeId: string): void {
    const currentNodes = this.nodesSubject.getValue();
    const updatedNodes = currentNodes.filter(node => node.id !== nodeId);
    this.nodesSubject.next(updatedNodes);
    console.log(`Removed node: ${nodeId}`);
  }

  /**
   * Update node position.
   */
  updateNodePosition(nodeId: string, position: Position): void {
    const currentNodes = this.nodesSubject.getValue();
    const updatedNodes = currentNodes.map(node =>
      node.id === nodeId ? { ...node, position } : node
    );
    this.nodesSubject.next(updatedNodes);
  }

  /**
   * Update node configuration.
   */
  updateNodeConfig(nodeId: string, config: Record<string, any>): void {
    const currentNodes = this.nodesSubject.getValue();
    const updatedNodes = currentNodes.map(node =>
      node.id === nodeId ? { ...node, config: { ...node.config, ...config } } : node
    );
    this.nodesSubject.next(updatedNodes);
    console.log(`Updated config for node ${nodeId}:`, config);
  }

  /**
   * Set error state for a node.
   */
  setNodeError(nodeId: string, hasError: boolean, errorMessage?: string): void {
    const currentNodes = this.nodesSubject.getValue();
    const updatedNodes = currentNodes.map(node =>
      node.id === nodeId ? {
        ...node,
        hasError,
        errorMessage: hasError ? errorMessage : undefined
      } : node
    );
    this.nodesSubject.next(updatedNodes);
    console.log(`Set error state for node ${nodeId}: ${hasError}`, errorMessage);
  }

  /**
   * Clear all error states from nodes.
   */
  clearAllErrors(): void {
    const currentNodes = this.nodesSubject.getValue();
    const updatedNodes = currentNodes.map(node => ({
      ...node,
      hasError: false,
      errorMessage: undefined
    }));
    this.nodesSubject.next(updatedNodes);
    console.log('Cleared all node error states');
  }

  /**
   * Highlight nodes with errors based on log analysis.
   */
  highlightErrorNodes(logs: string[]): string[] {
    const failedNodeIds: string[] = [];

    // Parse logs to find failed nodes
    logs.forEach(log => {
      if (log.toLowerCase().includes('failed')) {
        // Extract node ID from log messages like "Node node-2 failed: ..."
        const nodeIdMatch = log.match(/node-([\d]+)/);
        if (nodeIdMatch) {
          const nodeId = nodeIdMatch[0]; // Full match like "node-2"
          failedNodeIds.push(nodeId);

          // Extract error message
          const errorMatch = log.match(/failed:\s*(.+)$/);
          const errorMessage = errorMatch ? errorMatch[1] : 'Node execution failed';

          this.setNodeError(nodeId, true, errorMessage);
        }
      }
    });

    return failedNodeIds;
  }

  /**
   * Get nodes with errors.
   */
  getErrorNodes(): FlowNode[] {
    return this.nodesSubject.getValue().filter(node => node.hasError);
  }

  /**
   * Bulk add nodes (for importing).
   */
  bulkAddNodes(nodes: FlowNode[]): void {
    // Update counter to avoid ID conflicts
    nodes.forEach(node => {
      const nodeNumber = parseInt(node.id.replace('node-', ''));
      if (nodeNumber >= this.nodeIdCounter) {
        this.nodeIdCounter = nodeNumber + 1;
      }
    });

    this.nodesSubject.next(nodes);
    console.log(`Bulk added ${nodes.length} nodes`);
  }

  /**
   * Clear all nodes.
   */
  clearAllNodes(): void {
    this.nodesSubject.next([]);
    this.nodeIdCounter = 1;
    console.log('Cleared all nodes');
  }

  /**
   * Get node configuration validation errors.
   */
  validateNodeConfig(nodeId: string): { isValid: boolean; errors: string[] } {
    const node = this.getNodeById(nodeId);
    if (!node) {
      return { isValid: false, errors: ['Node not found'] };
    }

    const errors: string[] = [];

    if (node.content.inputFields) {
      node.content.inputFields
        .filter(field => field.required)
        .forEach(field => {
          const value = node.config?.[field.key];
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            errors.push(`${field.label} is required`);
          }
        });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get node statistics.
   */
  getNodeStatistics(): {
    total: number;
    byType: Record<string, number>;
    withErrors: number;
    configured: number;
  } {
    const nodes = this.nodesSubject.getValue();

    const byType: Record<string, number> = {};
    let withErrors = 0;
    let configured = 0;

    nodes.forEach(node => {
      // Count by type
      byType[node.type] = (byType[node.type] || 0) + 1;

      // Count errors
      if (node.hasError) {
        withErrors++;
      }

      // Count configured (has at least one config value)
      if (node.config && Object.keys(node.config).length > 0) {
        configured++;
      }
    });

    return {
      total: nodes.length,
      byType,
      withErrors,
      configured
    };
  }

  /**
   * Export nodes data for debugging.
   */
  exportNodesData(): any {
    return {
      nodes: this.nodesSubject.getValue(),
      nodeIdCounter: this.nodeIdCounter,
      statistics: this.getNodeStatistics()
    };
  }

  /**
   * Animate error highlight for a specific node.
   */
  flashErrorNode(nodeId: string): void {
    const node = this.getNodeById(nodeId);
    if (!node) return;

    // Set temporary error state for visual feedback
    this.setNodeError(nodeId, true, 'Execution failed');

    // Clear after animation duration
    setTimeout(() => {
      // Only clear if this was a temporary flash (no persistent error message)
      if (node.errorMessage === 'Execution failed') {
        this.setNodeError(nodeId, false);
      }
    }, 2000);
  }

  /**
   * Get nodes by execution order (for highlighting execution flow).
   */
  getExecutionPath(startNodeId: string): string[] {
    // This would implement a topological sort to determine execution order
    // For now, return a simple path based on connections
    const nodes = this.nodesSubject.getValue();
    const visited = new Set<string>();
    const path: string[] = [];

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      path.push(nodeId);

      // In a real implementation, this would follow connection relationships
      // to determine the next nodes in the execution path
    };

    traverse(startNodeId);
    return path;
  }
}
