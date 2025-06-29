// src/app/services/node.service.ts - Fixed Node Service

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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
    // Ensure positions are properly formatted
    const processedNodes = nodes.map(node => ({
      ...node,
      position: {
        x: Number(node.position?.x) || 0,
        y: Number(node.position?.y) || 0
      },
      // Ensure all required properties exist
      inputs: node.inputs || [],
      outputs: node.outputs || [],
      content: node.content || { title: node.type },
      config: node.config || {}
    }));

    // Reset node counter based on loaded nodes to avoid ID conflicts
    const maxNodeNumber = processedNodes.reduce((max, node) => {
      const match = node.id.match(/node-(\d+)/);
      return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);

    this.nodeCounter = maxNodeNumber;

    this.nodesSubject.next(processedNodes);
    console.log('Bulk added nodes with preserved positions:', processedNodes);
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
   */
  private createNodeFromType(nodeId: string, nodeType: string, position: Position): FlowNode {
    // Ensure position is properly formatted
    const validPosition = {
      x: Number(position.x) || 0,
      y: Number(position.y) || 0
    };

    const nodeDefinitions: Record<string, Partial<FlowNode>> = {
      'read-file': {
        inputs: [],
        outputs: [{ id: `${nodeId}-output-0`, color: 'nord-blue', label: 'Raw Data' }],
        content: {
          title: 'Read File',
          description: 'Load data from CSV, XML, YAML or JSON files',
          hasFileUpload: true,
          inputFields: [
            { key: 'encoding', label: 'File Encoding', type: 'select', options: ['utf-8', 'latin-1', 'cp1252'], required: false },
            { key: 'delimiter', label: 'CSV Delimiter', type: 'text', placeholder: 'Auto-detect', required: false }
          ]
        }
      },
      'mqtt-connector': {
        inputs: [],
        outputs: [{ id: `${nodeId}-output-0`, color: 'nord-blue', label: 'Stream Data' }],
        content: {
          title: 'MQTT Connector',
          description: 'Connect to MQTT sensor stream for real-time data',
          inputFields: [
            { key: 'broker', label: 'MQTT Broker', type: 'text', placeholder: 'mqtt://localhost:1883', required: true },
            { key: 'topic', label: 'Topic', type: 'text', placeholder: 'sensors/+/data', required: true },
            { key: 'qos', label: 'QoS Level', type: 'select', options: ['0', '1', '2'], required: false }
          ]
        }
      },
      'column-selector': {
        inputs: [{ id: `${nodeId}-input-0`, color: 'nord-blue', label: 'Raw Data' }],
        outputs: [{ id: `${nodeId}-output-0`, color: 'nord-red', label: 'Series' }],
        content: {
          title: 'Column Selector',
          description: 'Convert Raw Data column to Series',
          inputFields: [
            { key: 'columnName', label: 'Column Name', type: 'text', placeholder: 'Enter column name', required: true }
          ]
        }
      },
      'attribute-selector': {
        inputs: [{ id: `${nodeId}-input-0`, color: 'nord-red', label: 'Series' }],
        outputs: [{ id: `${nodeId}-output-0`, color: 'nord-yellow', label: 'Attribute' }],
        content: {
          title: 'Attribute Selector',
          description: 'Select attributes from Series data',
          inputFields: [
            { key: 'attributeType', label: 'Attribute Type', type: 'select', options: ['id', 'timestamp', 'value', 'metadata'], required: true }
          ]
        }
      },
      'data-filter': {
        inputs: [{ id: `${nodeId}-input-0`, color: 'nord-red', label: 'Series' }],
        outputs: [{ id: `${nodeId}-output-0`, color: 'nord-red', label: 'Filtered Series' }],
        content: {
          title: 'Data Filter',
          description: 'Apply conditions to filter Series data',
          inputFields: [
            { key: 'condition', label: 'Filter Condition', type: 'text', placeholder: 'value > 0', required: true },
            { key: 'operator', label: 'Operator', type: 'select', options: ['>', '<', '>=', '<=', '==', '!='], required: true }
          ]
        }
      },
      'iot-event': {
        inputs: [{ id: `${nodeId}-input-0`, color: 'nord-yellow', label: 'Attributes' }],
        outputs: [{ id: `${nodeId}-output-0`, color: 'nord-green', label: 'IoT Events' }],
        content: {
          title: 'IoT Event',
          description: 'Create IoT events with ID, Type, Timestamp, Metadata',
          inputFields: [
            { key: 'eventType', label: 'Event Type', type: 'text', placeholder: 'sensor_reading', required: true },
            { key: 'timestampFormat', label: 'Timestamp Format', type: 'select', options: ['ISO8601', 'Unix', 'Custom'], required: false }
          ]
        }
      },
      'object-creator': {
        inputs: [{ id: `${nodeId}-input-0`, color: 'nord-yellow', label: 'Attributes' }],
        outputs: [{ id: `${nodeId}-output-0`, color: 'nord-purple', label: 'Objects' }],
        content: {
          title: 'Object Creator',
          description: 'Create objects with ID, Type, Class, Metadata',
          inputFields: [
            { key: 'objectClass', label: 'Object Class', type: 'text', placeholder: 'Device', required: true },
            { key: 'objectType', label: 'Object Type', type: 'text', placeholder: 'Sensor', required: true }
          ]
        }
      },
      'table-output': {
        inputs: [{ id: `${nodeId}-input-0`, color: 'core-model', label: 'CORE Model' }],
        outputs: [],
        content: {
          title: 'Table Output',
          description: 'Display data in tabular format',
          displayOnly: true
        }
      },
      'export-ocel': {
        inputs: [{ id: `${nodeId}-input-0`, color: 'core-model', label: 'CORE Model' }],
        outputs: [],
        content: {
          title: 'Export to OCEL',
          description: 'Export CORE metamodel to OCEL format',
          inputFields: [
            { key: 'filename', label: 'Output Filename', type: 'text', placeholder: 'output.jsonocel', required: true }
          ]
        }
      }
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
      return { ...baseNode, ...nodeDefinition };
    }

    return baseNode;
  }
}
