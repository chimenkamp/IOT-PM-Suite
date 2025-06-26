// src/app/services/pipeline.service.ts

import { Injectable } from '@angular/core';
import { NodeService, FlowNode } from './node.service';
import { MappingService, Connection } from './mapping.service';
import { HttpClient } from '@angular/common/http';

export interface PipelineDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  nodes: PipelineNode[];
  connections: PipelineConnection[];
  executionOrder?: string[];
}

export interface PipelineNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  inputs: PipelinePort[];
  outputs: PipelinePort[];
}

export interface PipelinePort {
  id: string;
  name: string;
  dataType: string;
}

export interface PipelineConnection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
  dataType: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExecutionResult {
  success: boolean;
  executionId: string;
  results: Record<string, any>;
  logs: string[];
  errors?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PipelineService {
  private readonly backendUrl = 'http://localhost:5000/api'; // Configure as needed

  constructor(
    private nodeService: NodeService,
    private mappingService: MappingService,
    private http: HttpClient
  ) {}

  /**
   * Create a pipeline definition from current nodes and connections.
   *
   * :return: PipelineDefinition
   */
  createPipelineDefinition(): PipelineDefinition {
    const nodes = this.nodeService.getAllNodes();
    const connections = this.mappingService.connectionObserver$.getValue();

    const pipelineNodes: PipelineNode[] = nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      config: node.config || {},
      inputs: node.inputs.map(input => ({
        id: input.id,
        name: input.label,
        dataType: this.mapColorToDataType(input.color)
      })),
      outputs: node.outputs.map(output => ({
        id: output.id,
        name: output.label,
        dataType: this.mapColorToDataType(output.color)
      }))
    }));

    const pipelineConnections: PipelineConnection[] = connections.map((conn, index) => ({
      id: `connection-${index}`,
      fromNodeId: this.extractNodeIdFromPortId(conn.from),
      fromPortId: conn.from,
      toNodeId: this.extractNodeIdFromPortId(conn.to),
      toPortId: conn.to,
      dataType: this.getConnectionDataType(conn, nodes)
    }));

    return {
      id: `pipeline-${Date.now()}`,
      name: `Pipeline-${new Date().toISOString().split('T')[0]}`,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      nodes: pipelineNodes,
      connections: pipelineConnections,
      executionOrder: this.calculateExecutionOrder(pipelineNodes, pipelineConnections)
    };
  }

  /**
   * Validate the current pipeline for correctness.
   *
   * :return: ValidationResult
   */
  validatePipeline(): ValidationResult {
    const nodes = this.nodeService.getAllNodes();
    const connections = this.mappingService.connectionObserver$.getValue();

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if pipeline has nodes
    if (nodes.length === 0) {
      errors.push('Pipeline must contain at least one node');
    }

    // Check for input nodes (data sources)
    const inputNodes = nodes.filter(node =>
      node.type === 'read-file' || node.type === 'mqtt-connector'
    );
    if (inputNodes.length === 0) {
      errors.push('Pipeline must have at least one input node (Read File or MQTT Connector)');
    }

    // Check for output nodes
    const outputNodes = nodes.filter(node =>
      node.type === 'table-output' || node.type === 'export-ocel' || node.type === 'ocpm-discovery'
    );
    if (outputNodes.length === 0) {
      warnings.push('Consider adding an output node to visualize results');
    }

    // Check for disconnected nodes
    const connectedNodeIds = new Set();
    connections.forEach(conn => {
      connectedNodeIds.add(this.extractNodeIdFromPortId(conn.from));
      connectedNodeIds.add(this.extractNodeIdFromPortId(conn.to));
    });

    const disconnectedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));
    if (disconnectedNodes.length > 0) {
      warnings.push(`${disconnectedNodes.length} node(s) are not connected: ${disconnectedNodes.map(n => n.content.title).join(', ')}`);
    }

    // Check for type compatibility in connections
    connections.forEach((conn, index) => {
      const fromNode = nodes.find(n => n.outputs.some(o => o.id === conn.from));
      const toNode = nodes.find(n => n.inputs.some(i => i.id === conn.to));

      if (!fromNode || !toNode) {
        errors.push(`Connection ${index + 1}: Invalid node reference`);
        return;
      }

      const fromPort = fromNode.outputs.find(o => o.id === conn.from);
      const toPort = toNode.inputs.find(i => i.id === conn.to);

      if (!fromPort || !toPort) {
        errors.push(`Connection ${index + 1}: Invalid port reference`);
        return;
      }

      if (fromPort.color !== toPort.color) {
        errors.push(`Connection ${index + 1}: Type mismatch between ${fromPort.label} (${fromPort.color}) and ${toPort.label} (${toPort.color})`);
      }
    });

    // Check for required node configurations
    nodes.forEach(node => {
      if (node.content.inputFields) {
        const missingRequired = node.content.inputFields
          .filter((field: any) => field.required && !node.config?.[field.key])
          .map((field: any) => field.label);

        if (missingRequired.length > 0) {
          errors.push(`Node "${node.content.title}": Missing required configuration: ${missingRequired.join(', ')}`);
        }
      }
    });

    // Check for cycles in the pipeline
    if (this.hasCycles(nodes, connections)) {
      errors.push('Pipeline contains cycles, which are not allowed');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Execute the pipeline by sending it to the backend.
   *
   * :param pipeline: PipelineDefinition to execute
   * :return: Promise<ExecutionResult>
   */
  async executePipeline(pipeline: PipelineDefinition): Promise<ExecutionResult> {
    try {
      // Validate before execution
      const validation = this.validatePipeline();
      if (!validation.isValid) {
        throw new Error('Pipeline validation failed: ' + validation.errors.join(', '));
      }

      // Send pipeline to backend for execution
      const response = await this.http.post<ExecutionResult>(
        `${this.backendUrl}/pipeline/execute`,
        pipeline
      ).toPromise();

      return response || {
        success: false,
        executionId: '',
        results: {},
        logs: [],
        errors: ['No response from backend']
      };
    } catch (error) {
      console.error('Pipeline execution error:', error);
      throw new Error(`Pipeline execution failed: ${error}`);
    }
  }

  /**
   * Get execution status and results.
   *
   * :param executionId: ID of the execution to check
   * :return: Promise<ExecutionResult>
   */
  async getExecutionStatus(executionId: string): Promise<ExecutionResult> {
    try {
      const response = await this.http.get<ExecutionResult>(
        `${this.backendUrl}/pipeline/execution/${executionId}`
      ).toPromise();

      return response || {
        success: false,
        executionId,
        results: {},
        logs: [],
        errors: ['No response from backend']
      };
    } catch (error) {
      throw new Error(`Failed to get execution status: ${error}`);
    }
  }

  /**
   * Map color codes to data types.
   *
   * :param color: Color code from node definition
   * :return: string data type name
   */
  private mapColorToDataType(color: string): string {
    const colorMap: Record<string, string> = {
      'nord-blue': 'DataFrame',
      'nord-red': 'Series',
      'nord-yellow': 'Attribute',
      'nord-green': 'Event',
      'nord-purple': 'Object',
      'nord-orange': 'Relationship',
      'core-model': 'COREModel'
    };
    return colorMap[color] || 'Unknown';
  }

  /**
   * Extract node ID from port ID.
   *
   * :param portId: Port ID in format "node-X-port-name"
   * :return: string node ID
   */
  private extractNodeIdFromPortId(portId: string): string {
    const parts = portId.split('-');
    return parts.slice(0, 2).join('-'); // "node-X"
  }

  /**
   * Get data type for a connection.
   *
   * :param connection: Connection object
   * :param nodes: Array of nodes
   * :return: string data type
   */
  private getConnectionDataType(connection: Connection, nodes: FlowNode[]): string {
    const fromNode = nodes.find(n => n.outputs.some(o => o.id === connection.from));
    if (fromNode) {
      const fromPort = fromNode.outputs.find(o => o.id === connection.from);
      if (fromPort) {
        return this.mapColorToDataType(fromPort.color);
      }
    }
    return 'Unknown';
  }

  /**
   * Calculate execution order using topological sort.
   *
   * :param nodes: Array of pipeline nodes
   * :param connections: Array of pipeline connections
   * :return: Array of node IDs in execution order
   */
  private calculateExecutionOrder(nodes: PipelineNode[], connections: PipelineConnection[]): string[] {
    const nodeIds = nodes.map(n => n.id);
    const dependencies: Record<string, string[]> = {};

    // Initialize dependencies
    nodeIds.forEach(id => {
      dependencies[id] = [];
    });

    // Build dependency graph
    connections.forEach(conn => {
      dependencies[conn.toNodeId].push(conn.fromNodeId);
    });

    // Topological sort
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      dependencies[nodeId].forEach(depId => {
        visit(depId);
      });

      result.push(nodeId);
    };

    nodeIds.forEach(nodeId => {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    });

    return result;
  }

  /**
   * Check if the pipeline has cycles.
   *
   * :param nodes: Array of nodes
   * :param connections: Array of connections
   * :return: boolean indicating if cycles exist
   */
  private hasCycles(nodes: FlowNode[], connections: Connection[]): boolean {
    const nodeIds = nodes.map(n => n.id);
    const graph: Record<string, string[]> = {};

    // Initialize graph
    nodeIds.forEach(id => {
      graph[id] = [];
    });

    // Build adjacency list
    connections.forEach(conn => {
      const fromNodeId = this.extractNodeIdFromPortId(conn.from);
      const toNodeId = this.extractNodeIdFromPortId(conn.to);
      graph[fromNodeId].push(toNodeId);
    });

    // DFS cycle detection
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      for (const neighbor of graph[nodeId]) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of nodeIds) {
      if (!visited.has(nodeId)) {
        if (hasCycleDFS(nodeId)) return true;
      }
    }

    return false;
  }
}
