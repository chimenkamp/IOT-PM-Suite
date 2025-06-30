// src/app/services/mapping.service.ts - Fixed with Pipeline Format Support

import { Injectable } from '@angular/core';
import { NodeService, FlowNode } from './node.service';
import { nodeDefinitions } from './node-definitions';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Connection {
  from: string;
  to: string;
}

export interface MappingDefinition {
  version: string;
  metadata: {
    name: string;
    description?: string;
    createdAt: string;
    modifiedAt: string;
  };
  nodes: FlowNode[];
  connections: Connection[];
}

// Pipeline format interface (matches the JSON structure you're using)
export interface PipelineDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  nodes: any[];
  connections: any[];
  executionOrder?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MappingService {

  public connectionObserver$: BehaviorSubject<Connection[]> = new BehaviorSubject<Connection[]>([]);

  constructor(private nodeService: NodeService) {}

  public addConnection(connection: Connection): void {
    const currentConnections = this.connectionObserver$.getValue();
    if (!currentConnections.some(conn => conn.from === connection.from && conn.to === connection.to)) {
      this.connectionObserver$.next([...currentConnections, connection]);
    }
  }

  public removeConnection(connection: Connection): void {
    const currentConnections = this.connectionObserver$.getValue();
    const updatedConnections = currentConnections.filter(
      conn => !(conn.from === connection.from && conn.to === connection.to)
    );
    this.connectionObserver$.next(updatedConnections);
  }

  /**
   * Export the current mapping to a JSON definition.
   * FIXED: Ensure positions are properly serialized.
   */
  exportMapping(name: string, description?: string): MappingDefinition {
    const now = new Date().toISOString();
    const nodes = this.nodeService.getAllNodes();

    // Ensure all nodes have valid positions before exporting
    const validatedNodes = nodes.map(node => ({
      ...node,
      position: {
        x: Number(node.position?.x) || 0,
        y: Number(node.position?.y) || 0
      }
    }));

    console.log('Exporting mapping with nodes:', validatedNodes.map(n => ({ id: n.id, position: n.position })));

    return {
      version: '1.0.0',
      metadata: {
        name,
        description: description || '',
        createdAt: now,
        modifiedAt: now
      },
      nodes: validatedNodes,
      connections: [...this.connectionObserver$.getValue()]
    };
  }

  /**
   * Import a mapping definition and restore the nodes and connections.
   * FIXED: Support both mapping and pipeline formats, better validation and position handling.
   */
  importMapping(data: MappingDefinition | PipelineDefinition): void {
    console.log('Importing data:', data);

    // Clear existing nodes and connections
    this.nodeService.clearAllNodes();
    this.connectionObserver$.next([]);

    // Convert pipeline format to mapping format if needed
    const mapping = this.convertToMappingFormat(data);

    // Validate and fix node positions before importing
    const validatedNodes = mapping.nodes.map(node => {
      // Get the full node definition to restore complete content
      const nodeDefinition = nodeDefinitions[node.type];

      const validatedNode = {
        ...node,
        position: this.validateAndFixPosition(node.position),
        // Ensure all required properties exist, but prefer the imported data
        inputs: node.inputs && node.inputs.length > 0 ? node.inputs : (nodeDefinition?.inputs || []),
        outputs: node.outputs && node.outputs.length > 0 ? node.outputs : (nodeDefinition?.outputs || []),
        // Use the full content definition from nodeDefinitions, but preserve any custom content
        content: nodeDefinition ? {
          ...nodeDefinition.content,
          // Override with any custom content from the saved file
          ...(node.content || {})
        } : (node.content || { title: node.type || 'Unknown' }),
        // Preserve the config values from the saved file
        config: node.config || {}
      };

      console.log(`Node ${node.id}: Original position:`, node.position, 'Fixed position:', validatedNode.position);
      console.log(`Node ${node.id}: Content restored:`, validatedNode.content);
      console.log(`Node ${node.id}: Config restored:`, validatedNode.config);

      return validatedNode;
    });

    // Import nodes with validated positions
    this.nodeService.bulkAddNodes(validatedNodes);

    // Convert and import connections
    const simpleConnections = this.convertConnectionsFormat(mapping.connections);
    this.connectionObserver$.next(simpleConnections);

    console.log('Import completed. Nodes with positions:', validatedNodes.map(n => ({ id: n.id, position: n.position })));
    console.log('Imported connections:', simpleConnections);
  }

  /**
   * Convert pipeline format to mapping format.
   */
  private convertToMappingFormat(data: any): MappingDefinition {
    // Check if it's already in mapping format
    if (data.metadata && typeof data.metadata === 'object') {
      return data as MappingDefinition;
    }

    // Convert pipeline format to mapping format
    const pipelineData = data as PipelineDefinition;
    return {
      version: pipelineData.version || '1.0.0',
      metadata: {
        name: pipelineData.name || 'Imported Pipeline',
        description: pipelineData.description || '',
        createdAt: pipelineData.createdAt || new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      },
      nodes: this.convertNodesFormat(pipelineData.nodes || []),
      connections: pipelineData.connections || []
    };
  }

  /**
   * Convert pipeline nodes to FlowNode format.
   */
  private convertNodesFormat(pipelineNodes: any[]): FlowNode[] {
    return pipelineNodes.map(node => {
      // Get the full node definition from nodeDefinitions
      const nodeDefinition = nodeDefinitions[node.type];

      // Convert pipeline node format to FlowNode format
      const flowNode: FlowNode = {
        id: node.id,
        type: node.type,
        position: node.position || { x: 0, y: 0 },
        inputs: (node.inputs || []).map((input: any) => ({
          id: input.id,
          color: this.mapDataTypeToColor(input.dataType || 'Unknown'),
          label: input.name || input.label || 'Input'
        })),
        outputs: (node.outputs || []).map((output: any) => ({
          id: output.id,
          color: this.mapDataTypeToColor(output.dataType || 'Unknown'),
          label: output.name || output.label || 'Output'
        })),
        // Use the full content definition from nodeDefinitions if available
        content: nodeDefinition ? { ...nodeDefinition.content } : {
          title: this.getNodeTitle(node.type),
          description: this.getNodeDescription(node.type)
        },
        // Preserve the config values from the saved file
        config: node.config || {}
      };

      return flowNode;
    });
  }

  /**
   * Convert pipeline connections to simple Connection format.
   */
  private convertConnectionsFormat(pipelineConnections: any[]): Connection[] {
    return pipelineConnections.map(conn => {
      // Handle both simple and complex connection formats
      if (conn.from && conn.to) {
        // Already in simple format
        return { from: conn.from, to: conn.to };
      } else if (conn.fromPortId && conn.toPortId) {
        // Pipeline format with detailed port IDs
        return { from: conn.fromPortId, to: conn.toPortId };
      } else {
        console.warn('Unknown connection format:', conn);
        return { from: '', to: '' };
      }
    }).filter(conn => conn.from && conn.to); // Filter out invalid connections
  }

  /**
   * Map data types to colors.
   */
  private mapDataTypeToColor(dataType: string): string {
    const typeColorMap: Record<string, string> = {
      'DataFrame': 'nord-blue',
      'Series': 'nord-red',
      'Attribute': 'nord-yellow',
      'Event': 'nord-green',
      'Object': 'nord-purple',
      'Relationship': 'nord-orange',
      'COREModel': 'core-model'
    };
    return typeColorMap[dataType] || 'nord-blue';
  }

  /**
   * Get node title from type.
   */
  private getNodeTitle(nodeType: string): string {
    const titleMap: Record<string, string> = {
      'read-file': 'Read File',
      'column-selector': 'Column Selector',
      'attribute-selector': 'Attribute Selector',
      'data-filter': 'Data Filter',
      'data-mapper': 'Data Mapper',
      'iot-event': 'IoT Event',
      'process-event': 'Process Event',
      'object-creator': 'Object Creator',
      'unique-id-generator': 'Unique ID Generator',
      'object-class-selector': 'Object Class Selector',
      'event-object-relation': 'Event-Object Relationship',
      'event-event-relation': 'Event-Event Relationship',
      'core-metamodel': 'CORE Metamodel',
      'table-output': 'Table Output',
      'export-ocel': 'Export to OCEL',
      'ocpm-discovery': 'OCPM Model Discovery'
    };
    return titleMap[nodeType] || nodeType;
  }

  /**
   * Get node description from type.
   */
  private getNodeDescription(nodeType: string): string {
    const descriptionMap: Record<string, string> = {
      'read-file': 'Load data from CSV, XML, YAML or JSON files',
      'column-selector': 'Takes Raw Data and converts specific column to Series',
      'attribute-selector': 'Select attributes from Series data',
      'data-filter': 'Apply conditions to filter Series data',
      'data-mapper': 'Apply mapping transformations to Series data',
      'iot-event': 'Create IoT events for CORE model from sensor data',
      'process-event': 'Create process events for CORE model',
      'object-creator': 'Create objects with ID, Type, Class, and Metadata',
      'unique-id-generator': 'Generate unique identifiers for events and objects',
      'object-class-selector': 'Select object class for CORE model objects',
      'event-object-relation': 'Create relationships between events and objects',
      'event-event-relation': 'Create derivation relationships between events',
      'core-metamodel': 'Construct the final CORE metamodel from events and relationships',
      'table-output': 'Display data in tabular format',
      'export-ocel': 'Export CORE metamodel to OCEL format',
      'ocpm-discovery': 'Discover object-centric process model in browser'
    };
    return descriptionMap[nodeType] || 'Node description';
  }

  /**
   * Validate and fix node position data.
   */
  private validateAndFixPosition(position: any): { x: number; y: number } {
    // Handle various position formats that might exist in saved files
    if (!position) {
      console.warn('Missing position data, using default (100, 100)');
      return { x: 100, y: 100 };
    }

    let x = 0;
    let y = 0;

    // Handle different position formats
    if (typeof position === 'object') {
      x = Number(position.x) || 0;
      y = Number(position.y) || 0;
    } else if (Array.isArray(position) && position.length >= 2) {
      x = Number(position[0]) || 0;
      y = Number(position[1]) || 0;
    }

    // Ensure positions are within reasonable bounds
    x = Math.max(0, Math.min(x, 10000));
    y = Math.max(0, Math.min(y, 10000));

    return { x, y };
  }

  /**
   * Download the current mapping as a JSON file.
   */
  downloadMapping(name: string, description?: string): void {
    const mapping = this.exportMapping(name, description);
    const jsonString = JSON.stringify(mapping, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_mapping.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('Downloaded mapping:', name);
  }

  /**
   * Upload and import a mapping from a JSON file.
   * FIXED: Better error handling and validation, support for both formats.
   */
  uploadMapping(file: File): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const jsonString = event.target?.result as string;
          console.log('Loading mapping from file:', file.name);

          const data = JSON.parse(jsonString);

          // Validate the data structure (be more flexible)
          if (!this.validateInputData(data)) {
            const error = 'Invalid file format - missing required fields';
            console.error(error, data);
            reject(new Error(error));
            return;
          }

          console.log('Data validation passed, importing...');
          this.importMapping(data);
          resolve(true);

        } catch (error) {
          const errorMsg = 'Failed to parse file: ' + error;
          console.error(errorMsg);
          reject(new Error(errorMsg));
        }
      };

      reader.onerror = () => {
        const error = 'Failed to read file';
        console.error(error);
        reject(new Error(error));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Validate input data (support both mapping and pipeline formats).
   */
  private validateInputData(data: any): boolean {
    console.log('Validating input data:', data);

    if (!data) {
      console.error('Data is null or undefined');
      return false;
    }

    // Check for mapping format
    if (data.metadata && data.metadata.name && Array.isArray(data.nodes) && Array.isArray(data.connections)) {
      console.log('Detected mapping format');
      return true;
    }

    // Check for pipeline format
    if (data.name && Array.isArray(data.nodes) && Array.isArray(data.connections)) {
      console.log('Detected pipeline format');
      return true;
    }

    console.error('Invalid data format - missing required fields');
    return false;
  }

  /**
   * Get mapping metadata from a JSON string without fully importing.
   */
  getMappingMetadata(jsonString: string): any {
    try {
      const data = JSON.parse(jsonString);

      // Handle both formats
      if (data.metadata) {
        return data.metadata;
      } else {
        return {
          name: data.name || 'Unknown',
          description: data.description || '',
          createdAt: data.createdAt || new Date().toISOString(),
          modifiedAt: new Date().toISOString()
        };
      }
    } catch {
      return null;
    }
  }

  /**
   * Reset canvas positions (utility function for debugging).
   */
  resetNodePositions(): void {
    const nodes = this.nodeService.getAllNodes();
    let x = 100;
    let y = 100;

    nodes.forEach((node, index) => {
      const newPosition = {
        x: x + (index % 3) * 300,
        y: y + Math.floor(index / 3) * 200
      };

      this.nodeService.updateNodePosition(node.id, newPosition);
      console.log(`Reset position for node ${node.id}:`, newPosition);
    });
  }
}
