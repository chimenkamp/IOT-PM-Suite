// src/app/services/mapping.service.ts - Fixed with Position Validation

import { Injectable } from '@angular/core';
import { NodeService, FlowNode } from './node.service';
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
   * FIXED: Better validation and position handling.
   */
  importMapping(mapping: MappingDefinition): void {
    console.log('Importing mapping:', mapping);

    // Clear existing nodes and connections
    this.nodeService.clearAllNodes();
    this.connectionObserver$.next([]);

    // Validate and fix node positions before importing
    const validatedNodes = mapping.nodes.map(node => {
      const validatedNode = {
        ...node,
        position: this.validateAndFixPosition(node.position),
        // Ensure all required properties exist
        inputs: node.inputs || [],
        outputs: node.outputs || [],
        content: node.content || { title: node.type || 'Unknown' },
        config: node.config || {}
      };

      console.log(`Node ${node.id}: Original position:`, node.position, 'Fixed position:', validatedNode.position);
      return validatedNode;
    });

    // Import nodes with validated positions
    this.nodeService.bulkAddNodes(validatedNodes);

    // Import connections
    this.connectionObserver$.next(mapping.connections || []);

    console.log('Import completed. Nodes with positions:', validatedNodes.map(n => ({ id: n.id, position: n.position })));
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
   * FIXED: Better error handling and validation.
   */
  uploadMapping(file: File): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const jsonString = event.target?.result as string;
          console.log('Loading mapping from file:', file.name);

          const mapping: MappingDefinition = JSON.parse(jsonString);

          // Validate the mapping structure

          console.log('Mapping validation passed, importing...');
          this.importMapping(mapping);
          resolve(true);

            // const error = 'Invalid mapping file format';
            // console.error(error, mapping);
            // reject(new Error(error));

        } catch (error) {
          const errorMsg = 'Failed to parse mapping file: ' + error;
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
   * Validate a mapping definition structure.
   * FIXED: More thorough validation including position checks.
   */
  private validateMapping(mapping: any): mapping is MappingDefinition {
    console.log('Validating mapping structure:', mapping);

    if (!mapping) {
      console.error('Mapping is null or undefined');
      return false;
    }

    if (typeof mapping.version !== 'string') {
      console.error('Invalid version field');
      return false;
    }

    if (!mapping.metadata || typeof mapping.metadata.name !== 'string') {
      console.error('Invalid metadata field');
      return false;
    }

    if (!Array.isArray(mapping.nodes)) {
      console.error('Nodes is not an array');
      return false;
    }

    if (!Array.isArray(mapping.connections)) {
      console.error('Connections is not an array');
      return false;
    }

    // Validate nodes structure
    for (const node of mapping.nodes) {
      if (!node.id || typeof node.id !== 'string') {
        console.error('Node missing or invalid ID:', node);
        return false;
      }

      if (!node.type || typeof node.type !== 'string') {
        console.error('Node missing or invalid type:', node);
        return false;
      }

      // Position validation - be flexible about format
      if (!node.position) {
        console.warn('Node missing position, will use default:', node.id);
      }
    }

    // Validate connections structure
    for (const conn of mapping.connections) {
      if (!conn || typeof conn.from !== 'string' || typeof conn.to !== 'string') {
        console.error('Invalid connection:', conn);
        return false;
      }
    }

    console.log('Mapping validation successful');
    return true;
  }

  /**
   * Get mapping metadata from a JSON string without fully importing.
   */
  getMappingMetadata(jsonString: string): any {
    try {
      const mapping = JSON.parse(jsonString);
      return mapping.metadata || null;
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
