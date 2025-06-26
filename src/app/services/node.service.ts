// src/app/services/node.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NodePort, Position } from '../components/generic-node/generic-node.component';
import { nodeDefinitions } from './node-definitions';

export interface FlowNode {
  id: string;
  type: string;
  position: Position;
  inputs: NodePort[];
  outputs: NodePort[];
  content: any;
  config?: Record<string, any>;
  metadata?: {
    createdAt: string;
    lastModified: string;
    version: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NodeService {
  private nodesSubject = new BehaviorSubject<FlowNode[]>([]);
  public nodes$ = this.nodesSubject.asObservable();
  private nodeCounter = 1;

  /**
   * Add a new node of the given type at the given position.
   *
   * :param nodeType: type of node
   * :param position: { x, y } position where it should appear
   * :return: FlowNode the created node
   */
  addNode(nodeType: string, position: Position): FlowNode {
    const newNode = this.createNodeByType(nodeType, position);
    const currentNodes = this.nodesSubject.value;
    this.nodesSubject.next([...currentNodes, newNode]);
    return newNode;
  }

  /**
   * Bulk add multiple nodes (used for importing).
   *
   * :param nodes: Array of FlowNode objects to add
   * :return: void
   */
  bulkAddNodes(nodes: FlowNode[]): void {
    // Update the node counter to avoid ID conflicts
    const maxCounter = nodes.reduce((max, node) => {
      const match = node.id.match(/node-(\d+)/);
      return match ? Math.max(max, parseInt(match[1])) : max;
    }, this.nodeCounter);
    this.nodeCounter = maxCounter + 1;

    // Ensure all nodes have required metadata
    const nodesWithMetadata = nodes.map(node => ({
      ...node,
      metadata: node.metadata || {
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: '1.0.0'
      }
    }));

    this.nodesSubject.next([...nodesWithMetadata]);
  }

  /**
   * Clear all nodes from the editor.
   *
   * :return: void
   */
  clearAllNodes(): void {
    this.nodesSubject.next([]);
    this.nodeCounter = 1;
  }

  /**
   * Remove the node with the given ID.
   *
   * :param nodeId: the unique ID of the node to remove
   * :return: void
   */
  removeNode(nodeId: string): void {
    const currentNodes = this.nodesSubject.value;
    this.nodesSubject.next(currentNodes.filter(node => node.id !== nodeId));
  }

  /**
   * Update the position of an existing node.
   *
   * :param nodeId: the unique ID of the node to move
   * :param position: the new { x, y } coordinates
   * :return: void
   */
  updateNodePosition(nodeId: string, position: Position): void {
    const currentNodes = this.nodesSubject.value;
    const updatedNodes = currentNodes.map(node =>
      node.id === nodeId ? {
        ...node,
        position,
        metadata: {
          ...node.metadata,
          lastModified: new Date().toISOString()
        } as any
      } : node
    );
    this.nodesSubject.next(updatedNodes);
  }

  /**
   * Get a node by its ID.
   *
   * :param nodeId: the unique ID of the node
   * :return: FlowNode or undefined if not found
   */
  getNodeById(nodeId: string): FlowNode | undefined {
    return this.nodesSubject.value.find(node => node.id === nodeId);
  }

  /**
   * Update a node's content and/or configuration.
   *
   * :param nodeId: the unique ID of the node
   * :param updates: object containing content and/or config updates
   * :return: void
   */
  updateNodeContent(nodeId: string, updates: { content?: any; config?: Record<string, any> }): void {
    const currentNodes = this.nodesSubject.value;
    const updatedNodes = currentNodes.map(node =>
      node.id === nodeId ? {
        ...node,
        content: updates.content ? { ...node.content, ...updates.content } : node.content,
        config: updates.config ? { ...node.config, ...updates.config } : node.config,
        metadata: {
          ...node.metadata,
          lastModified: new Date().toISOString()
        } as any
      } : node
    );
    this.nodesSubject.next(updatedNodes);
  }

  /**
   * Update a specific configuration value for a node.
   *
   * :param nodeId: the unique ID of the node
   * :param key: configuration key
   * :param value: new value
   * :return: void
   */
  updateNodeConfig(nodeId: string, key: string, value: any): void {
    const node = this.getNodeById(nodeId);
    if (node) {
      const newConfig = { ...(node.config || {}), [key]: value };
      this.updateNodeContent(nodeId, { config: newConfig });
    }
  }

  /**
   * Get all nodes by type.
   *
   * :param nodeType: type of nodes to retrieve
   * :return: Array of FlowNode
   */
  getNodesByType(nodeType: string): FlowNode[] {
    return this.nodesSubject.value.filter(node => node.type === nodeType);
  }

  /**
   * Get nodes by category (based on node type patterns).
   *
   * :param category: category name
   * :return: Array of FlowNode
   */
  getNodesByCategory(category: string): FlowNode[] {
    const categoryMap: Record<string, string[]> = {
      'input': ['read-file', 'mqtt-connector'],
      'processing': ['column-selector', 'attribute-selector', 'data-filter', 'data-mapper'],
      'core-creation': ['iot-event', 'process-event', 'object-creator'],
      'utilities': ['unique-id-generator', 'object-class-selector'],
      'relationships': ['event-object-relation', 'event-event-relation'],
      'output': ['table-output', 'export-ocel', 'ocpm-discovery', 'core-metamodel']
    };

    const nodeTypes = categoryMap[category] || [];
    return this.nodesSubject.value.filter(node => nodeTypes.includes(node.type));
  }

  /**
   * Validate a node's configuration.
   *
   * :param nodeId: the unique ID of the node to validate
   * :return: validation result
   */
  validateNodeConfiguration(nodeId: string): { isValid: boolean; errors: string[]; warnings: string[] } {
    const node = this.getNodeById(nodeId);
    if (!node) {
      return { isValid: false, errors: ['Node not found'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (node.content.inputFields) {
      const missingRequired = node.content.inputFields
        .filter((field: any) => field.required && !node.config?.[field.key])
        .map((field: any) => field.label);

      if (missingRequired.length > 0) {
        errors.push(`Missing required fields: ${missingRequired.join(', ')}`);
      }
    }

    // Check file upload nodes
    if (node.content.hasFileUpload && !node.config?.['fileName']) {
      warnings.push('No file selected for upload');
    }

    // Type-specific validations
    switch (node.type) {
      case 'read-file':
        if (!node.config?.['fileName']) {
          errors.push('File must be selected');
        }
        break;

      case 'mqtt-connector':
        if (!node.config?.['brokerUrl']) {
          errors.push('MQTT broker URL is required');
        }
        if (!node.config?.['topic']) {
          errors.push('MQTT topic is required');
        }
        break;

      case 'column-selector':
        if (!node.config?.['columnName']) {
          errors.push('Column name must be specified');
        }
        break;

      case 'attribute-selector':
        if (!node.config?.['attributeKey']) {
          errors.push('Attribute key must be specified');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Clone a node (create a copy with new ID).
   *
   * :param nodeId: ID of the node to clone
   * :param position: position for the cloned node
   * :return: FlowNode or null if original not found
   */
  cloneNode(nodeId: string, position: Position): FlowNode | null {
    const originalNode = this.getNodeById(nodeId);
    if (!originalNode) return null;

    const clonedNode = this.createNodeByType(originalNode.type, position);

    // Copy configuration
    clonedNode.config = { ...originalNode.config };

    // Update content title to indicate it's a copy
    clonedNode.content.title = originalNode.content.title + ' (Copy)';

    const currentNodes = this.nodesSubject.value;
    this.nodesSubject.next([...currentNodes, clonedNode]);

    return clonedNode;
  }

  /**
   * Export nodes to a serializable format.
   *
   * :return: serializable representation of all nodes
   */
  exportNodes(): any[] {
    return this.nodesSubject.value.map(node => ({
      ...node,
      exportedAt: new Date().toISOString()
    }));
  }

  /**
   * Get pipeline statistics.
   *
   * :return: object with pipeline statistics
   */
  getPipelineStatistics(): {
    totalNodes: number;
    nodesByType: Record<string, number>;
    nodesByCategory: Record<string, number>;
    configuredNodes: number;
    validNodes: number;
  } {
    const nodes = this.nodesSubject.value;

    const nodesByType: Record<string, number> = {};
    const nodesByCategory: Record<string, number> = {
      input: 0,
      processing: 0,
      'core-creation': 0,
      utilities: 0,
      relationships: 0,
      output: 0
    };

    let configuredNodes = 0;
    let validNodes = 0;

    nodes.forEach(node => {
      // Count by type
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;

      // Count by category
      if (['read-file', 'mqtt-connector'].includes(node.type)) {
        nodesByCategory['input']++;
      } else if (['column-selector', 'attribute-selector', 'data-filter', 'data-mapper'].includes(node.type)) {
        nodesByCategory['processing']++;
      } else if (['iot-event', 'process-event', 'object-creator'].includes(node.type)) {
        nodesByCategory['core-creation']++;
      } else if (['unique-id-generator', 'object-class-selector'].includes(node.type)) {
        nodesByCategory['utilities']++;
      } else if (['event-object-relation', 'event-event-relation'].includes(node.type)) {
        nodesByCategory['relationships']++;
      } else if (['table-output', 'export-ocel', 'ocpm-discovery', 'core-metamodel'].includes(node.type)) {
        nodesByCategory['output']++;
      }

      // Check if configured
      if (node.config && Object.keys(node.config).length > 0) {
        configuredNodes++;
      }

      // Check if valid
      const validation = this.validateNodeConfiguration(node.id);
      if (validation.isValid) {
        validNodes++;
      }
    });

    return {
      totalNodes: nodes.length,
      nodesByType,
      nodesByCategory,
      configuredNodes,
      validNodes
    };
  }

  /**
   * Create a node by type with proper initialization.
   *
   * :param type: node type
   * :param position: node position
   * :return: FlowNode
   */
  private createNodeByType(type: string, position: Position): FlowNode {
    const id = `node-${this.nodeCounter++}`;
    const template = nodeDefinitions[type];

    if (template) {
      const inputsWithId = template.inputs.map((handle) => ({
        id: `${id}-${this.sanitizePortName(handle.label)}`,
        color: handle.color,
        label: handle.label
      }));

      const outputsWithId = template.outputs.map((handle) => ({
        id: `${id}-${this.sanitizePortName(handle.label)}`,
        color: handle.color,
        label: handle.label
      }));

      return {
        id,
        type,
        position,
        inputs: inputsWithId,
        outputs: outputsWithId,
        content: { ...template.content },
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          version: '1.0.0'
        }
      };
    }

    // Fallback for unknown node types
    return {
      id,
      type: 'unknown',
      position,
      inputs: [],
      outputs: [],
      content: {
        title: 'Unknown Node',
        description: `Unknown node type: ${type}`
      },
      config: {},
      metadata: {
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  /**
   * Sanitize port name for use in IDs.
   *
   * :param name: port name
   * :return: sanitized name
   */
  private sanitizePortName(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Get all nodes (current state).
   *
   * :return: Array of FlowNode
   */
  public getAllNodes(): FlowNode[] {
    return this.nodesSubject.value;
  }
}
