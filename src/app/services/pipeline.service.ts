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
  private readonly backendUrl = 'http://localhost:5100/api';
  // private readonly backendUrl = 'https://iot-pm-suite-backend.onrender.com/api'; // Updated port

  constructor(
    private nodeService: NodeService,
    private mappingService: MappingService,
    private http: HttpClient
  ) {}

  /**
   * Create a pipeline definition from current nodes and connections.
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

    // Check for required node configurations (expanded for CAIRO nodes)
    nodes.forEach(node => {
      const validation = this.validateNodeConfiguration(node);
      if (validation.errors.length > 0) {
        errors.push(`Node "${node.content.title}": ${validation.errors.join(', ')}`);
      }
      if (validation.warnings.length > 0) {
        warnings.push(`Node "${node.content.title}": ${validation.warnings.join(', ')}`);
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
   * Validate individual node configuration (expanded for CAIRO nodes).
   */
  private validateNodeConfiguration(node: FlowNode): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (node.content.inputFields) {
      const missingRequired = node.content.inputFields
        .filter((field: any) => field.required && !node.config?.[field.key])
        .map((field: any) => field.label);

      if (missingRequired.length > 0) {
        errors.push(`Missing required configuration: ${missingRequired.join(', ')}`);
      }
    }

    // CAIRO-specific validations
    switch (node.type) {
      case 'xml-trace-extractor':
        if (!node.config['traceXPath']) {
          errors.push('XPath expression for traces is required');
        }
        if (!node.config['traceIdentifier']) {
          errors.push('Trace identifier attribute is required');
        }
        break;

      case 'case-object-extractor':
        if (!node.config['caseIdAttribute']) {
          errors.push('Case ID attribute is required');
        }
        if (!node.config['objectType']) {
          errors.push('Object type must be specified');
        }
        break;

      case 'stream-point-extractor':
        if (!node.config['streamPointsPath']) {
          errors.push('Stream points path is required');
        }
        if (!node.config['timestampField']) {
          errors.push('Timestamp field mapping is required');
        }
        break;

      case 'iot-event-from-stream':
        if (!node.config['streamIdField']) {
          errors.push('Stream ID field is required');
        }
        if (!node.config['eventClass']) {
          errors.push('Event class must be selected');
        }
        break;

      case 'xml-element-selector':
        if (!node.config['xpath']) {
          errors.push('XPath expression is required');
        }
        if (!node.config['outputFormat']) {
          errors.push('Output format must be selected');
        }
        break;

      case 'stream-aggregator':
        if (!node.config['aggregationField']) {
          errors.push('Aggregation field is required');
        }
        if (!node.config['aggregationFunction']) {
          errors.push('Aggregation function must be selected');
        }
        break;

      case 'attribute-mapper':
        if (!node.config['sourceField']) {
          errors.push('Source field is required');
        }
        if (!node.config['targetAttribute']) {
          errors.push('Target attribute is required');
        }
        break;

      case 'context-based-linker':
        if (!node.config['contextAttribute']) {
          errors.push('Context attribute is required');
        }
        if (!node.config['relationshipType']) {
          errors.push('Relationship type must be selected');
        }
        break;

      // Existing validations
      case 'read-file':
        if (!node.config['fileName']) {
          errors.push('File must be selected');
        }
        if (!node.config['fileType']) {
          errors.push('File type must be specified');
        }
        break;

      case 'column-selector':
        if (!node.config['columnName']) {
          errors.push('Column name must be specified');
        }
        break;

      case 'data-filter':
        if (!node.config['condition']) {
          errors.push('Filter condition must be specified');
        }
        if (!node.config['operator']) {
          errors.push('Filter operator must be selected');
        }
        break;
    }

    return { errors, warnings };
  }

  /**
   * Execute the pipeline by sending it to the backend.
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
   * Upload dataset to backend.
   */
  async uploadDataset(formData: FormData): Promise<any> {
    try {
      const response = await this.http.post(
        `${this.backendUrl}/dataset/upload`,
        formData
      ).toPromise();

      return response;
    } catch (error) {
      throw new Error(`Failed to upload dataset: ${error}`);
    }
  }

  /**
   * Test connection to backend.
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.http.get(
        `${this.backendUrl}/health`
      ).toPromise();

      return !!response;
    } catch (error) {
      return false;
    }
  }

  /**
   * Map color codes to data types (expanded for CAIRO nodes).
   */
  private mapColorToDataType(color: string): string {
    const colorMap: Record<string, string> = {
      'nord-blue': 'DataFrame',
      'nord-red': 'Series',
      'nord-yellow': 'Attribute',
      'nord-green': 'Event',
      'nord-purple': 'Object',
      'nord-orange': 'Relationship',
      'core-model': 'COREModel',
      // New data types for CAIRO parsing
      'traces': 'Traces',
      'stream-points': 'StreamPoints',
      'stream-events': 'StreamEvents',
      'stream-metadata': 'StreamMetadata',
      'lifecycle-data': 'LifecycleData',
      'elements': 'Elements',
      'flattened-data': 'FlattenedData',
      'context-relationships': 'ContextRelationships',
      'mapped-attributes': 'MappedAttributes'
    };
    return colorMap[color] || 'Unknown';
  }

  /**
   * Extract node ID from port ID.
   */
  private extractNodeIdFromPortId(portId: string): string {
    const parts = portId.split('-');
    return parts.slice(0, 2).join('-'); // "node-X"
  }

  /**
   * Get data type for a connection.
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

  /**
   * Create a sample CAIRO pipeline for testing.
   */
  createSampleCAIROPipeline(): PipelineDefinition {
    return {
      id: 'cairo-sample-pipeline',
      name: 'Sample CAIRO XML Processing Pipeline',
      description: 'A sample pipeline for processing CAIRO XML sensor stream data',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      nodes: [
        {
          id: 'node-1',
          type: 'read-file',
          position: { x: 100, y: 100 },
          config: { fileType: 'XML' },
          inputs: [],
          outputs: [{ id: 'node-1-output-0', name: 'Raw Data', dataType: 'DataFrame' }]
        },
        {
          id: 'node-2',
          type: 'xml-trace-extractor',
          position: { x: 400, y: 100 },
          config: { traceXPath: 'log/trace', traceIdentifier: 'concept:name' },
          inputs: [{ id: 'node-2-input-0', name: 'XML Data', dataType: 'DataFrame' }],
          outputs: [{ id: 'node-2-output-0', name: 'Traces', dataType: 'Series' }]
        },
        {
          id: 'node-3',
          type: 'case-object-extractor',
          position: { x: 100, y: 300 },
          config: { caseIdAttribute: 'concept:name', objectType: 'case_object', extractLifecycle: true },
          inputs: [{ id: 'node-3-input-0', name: 'Traces', dataType: 'Series' }],
          outputs: [{ id: 'node-3-output-0', name: 'Case Objects', dataType: 'Object' }]
        },
        {
          id: 'node-4',
          type: 'stream-point-extractor',
          position: { x: 700, y: 100 },
          config: { streamPointsPath: 'list/list/list', timestampField: 'date', eventDataPath: 'string' },
          inputs: [{ id: 'node-4-input-0', name: 'Traces', dataType: 'Series' }],
          outputs: [{ id: 'node-4-output-0', name: 'Stream Points', dataType: 'Series' }]
        },
        {
          id: 'node-5',
          type: 'iot-event-from-stream',
          position: { x: 700, y: 300 },
          config: { streamIdField: 'stream:id', streamSourceField: 'stream:source', streamValueField: 'stream:value', eventClass: 'iot_event' },
          inputs: [
            { id: 'node-5-input-0', name: 'Stream Points', dataType: 'Series' },
            { id: 'node-5-input-1', name: 'Case ID', dataType: 'Attribute' }
          ],
          outputs: [{ id: 'node-5-output-0', name: 'IoT Events', dataType: 'Event' }]
        }
      ],
      connections: [
        {
          id: 'connection-1',
          fromNodeId: 'node-1',
          fromPortId: 'node-1-output-0',
          toNodeId: 'node-2',
          toPortId: 'node-2-input-0',
          dataType: 'DataFrame'
        },
        {
          id: 'connection-2',
          fromNodeId: 'node-2',
          fromPortId: 'node-2-output-0',
          toNodeId: 'node-3',
          toPortId: 'node-3-input-0',
          dataType: 'Series'
        },
        {
          id: 'connection-3',
          fromNodeId: 'node-2',
          fromPortId: 'node-2-output-0',
          toNodeId: 'node-4',
          toPortId: 'node-4-input-0',
          dataType: 'Series'
        }
      ]
    };
  }

  /**
   * Get pipeline templates (expanded with CAIRO template).
   */
  getPipelineTemplates(): PipelineDefinition[] {
    return [
      {
        id: 'iot-basic',
        name: 'Basic IoT Processing',
        description: 'Basic pipeline for IoT sensor data',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        nodes: [],
        connections: []
      },
      {
        id: 'process-mining',
        name: 'Process Mining Pipeline',
        description: 'Pipeline for process mining analysis',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        nodes: [],
        connections: []
      },
      {
        id: 'cairo-xml',
        name: 'CAIRO XML Processing',
        description: 'Pipeline for processing CAIRO XML sensor stream logs',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        nodes: [],
        connections: []
      }
    ];
  }
}
