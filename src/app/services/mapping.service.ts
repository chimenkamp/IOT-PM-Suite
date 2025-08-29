// src/app/services/mapping.service.ts

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

  // mapping.service.ts
  private isNodeHandleArray(arr: any[]): boolean {
    return Array.isArray(arr) && arr.every(p => p && typeof p.id === 'string' && 'label' in p && 'color' in p);
  }

  private toNodeHandles(ports: any[] | undefined, fallback: any[] | undefined): any[] {
    if (this.isNodeHandleArray(ports || [])) return ports!;
    if (Array.isArray(ports) && ports.length > 0) {
      // Convert pipeline ports {id, name, dataType} -> NodeHandle {id, label, color}
      return ports.map(p => ({
        id: p.id,
        label: p.name || p.label || 'Port',
        color: this.mapDataTypeToColor(p.dataType || 'Unknown')
      }));
    }
    // Fallback to nodeDefinitions (already proper NodeHandles)
    return fallback || [];
  }
  /**
   * If all node positions are within a tiny bounding box, spread them on a grid.
   * This only affects obviously broken legacy files and is a no-op otherwise.
   */
  private decollapsePositions(nodes: FlowNode[]): FlowNode[] {
    if (!nodes || nodes.length < 2) return nodes;

    const xs = nodes.map(n => Number(n.position?.x || 0));
    const ys = nodes.map(n => Number(n.position?.y || 0));
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);

    const width = maxX - minX;
    const height = maxY - minY;

    // "Collapsed" if everything is inside a 20×20 px box
    if (width > 20 || height > 20) return nodes;

    const cols = Math.ceil(Math.sqrt(nodes.length));
    const gapX = 240; // grid cell width
    const gapY = 160; // grid cell height
    const originX = 100;
    const originY = 100;

    return nodes.map((n, i) => {
      const cx = i % cols;
      const cy = Math.floor(i / cols);
      return {
        ...n,
        position: { x: originX + cx * gapX, y: originY + cy * gapY },
      };
    });
  }

  importMapping(data: MappingDefinition | PipelineDefinition): void {
    this.nodeService.clearAllNodes();
    this.connectionObserver$.next([]);

    const mapping = this.convertToMappingFormat(data);

    const validatedNodes = mapping.nodes.map(node => {
      const nodeDefinition = nodeDefinitions[node.type];

      const validatedNode = {
        ...node,
        position: this.validateAndFixPosition(node.position),
        inputs: this.toNodeHandles(node.inputs as any[], nodeDefinition?.inputs),
        outputs: this.toNodeHandles(node.outputs as any[], nodeDefinition?.outputs),
        content: nodeDefinition ? { ...nodeDefinition.content, ...(node as any).content } :
                  ((node as any).content || { title: node.type || 'Unknown' }),
        config: (node as any).config || {}
      };

      return validatedNode;
    });

    const adjustedNodes = this.decollapsePositions(validatedNodes);

    // Import nodes
    this.nodeService.bulkAddNodes(adjustedNodes as FlowNode[]);
    const simpleConnections = this.convertConnectionsFormat(mapping.connections);
    this.connectionObserver$.next(simpleConnections);
  }

  /**
   * Convert pipeline format to mapping format.
   */
  private convertToMappingFormat(data: any): MappingDefinition {
    // Be strict: mapping files must have metadata.name and FlowNode-like ports
    const looksLikeMapping =
      data &&
      data.metadata &&
      typeof data.metadata === 'object' &&
      typeof data.metadata.name === 'string' &&
      Array.isArray(data.nodes) &&
      Array.isArray(data.connections);

    if (looksLikeMapping) {
      return data as MappingDefinition;
    }

    // Fallback: treat as pipeline and convert
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
      'COREModel': 'core-model',
      // New data types for CAIRO parsing
      'Traces': 'nord-red',
      'StreamPoints': 'nord-red',
      'StreamEvents': 'nord-green',
      'StreamMetadata': 'nord-yellow',
      'LifecycleData': 'nord-yellow',
      'Elements': 'nord-red',
      'Attributes': 'nord-yellow',
      'FlattenedData': 'nord-red',
      'ContextRelationships': 'nord-orange',
      'MappedAttributes': 'nord-yellow'
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
      'ocpm-discovery': 'OCPM Model Discovery',
      // CAIRO XML Parsing Nodes
      'xml-trace-extractor': 'XML Trace Extractor',
      'case-object-extractor': 'Case Object Extractor',
      'stream-point-extractor': 'Stream Point Extractor',
      'iot-event-from-stream': 'IoT Event From Stream',
      'trace-event-linker': 'Trace Event Linker',
      // Generic XML Processing Nodes
      'xml-element-selector': 'XML Element Selector',
      'xml-attribute-extractor': 'XML Attribute Extractor',
      'nested-list-processor': 'Nested List Processor',
      // Stream Processing Nodes
      'lifecycle-calculator': 'Lifecycle Calculator',
      'stream-aggregator': 'Stream Aggregator',
      'stream-event-creator': 'Stream Event Creator',
      'stream-metadata-extractor': 'Stream Metadata Extractor',
      // Additional Object Creation
      'dynamic-object-creator': 'Dynamic Object Creator',
      'attribute-mapper': 'Attribute Mapper',
      'context-based-linker': 'Context-Based Linker'
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
      'ocpm-discovery': 'Discover object-centric process model in browser',
      // CAIRO XML Parsing Nodes
      'xml-trace-extractor': 'Extract traces from XML log structure using XPath selectors',
      'case-object-extractor': 'Create case objects from trace concept names with lifecycle data',
      'stream-point-extractor': 'Extract stream measurement points from nested XML structures',
      'iot-event-from-stream': 'Transform stream points into IoT events with context linking',
      'trace-event-linker': 'Link IoT events to case objects based on trace context',
      // Generic XML Processing Nodes
      'xml-element-selector': 'Select XML elements using XPath expressions',
      'xml-attribute-extractor': 'Extract specific attributes from XML elements',
      'nested-list-processor': 'Process and flatten nested list structures from XML',
      // Stream Processing Nodes
      'lifecycle-calculator': 'Calculate object lifecycle from temporal stream data',
      'stream-aggregator': 'Aggregate stream measurements by time windows or groups',
      'stream-event-creator': 'Create structured events from stream measurement data',
      'stream-metadata-extractor': 'Extract metadata attributes from stream structures',
      // Additional Object Creation
      'dynamic-object-creator': 'Create objects dynamically from attribute data sources',
      'attribute-mapper': 'Map and transform attributes with custom expressions',
      'context-based-linker': 'Create relationships based on shared context attributes'
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
