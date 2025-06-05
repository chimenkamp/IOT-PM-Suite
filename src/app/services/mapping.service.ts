// src/app/services/mapping.service.ts

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
   *
   * :param name: Name for the mapping
   * :param description: Optional description
   * :return: MappingDefinition object
   */
  exportMapping(name: string, description?: string): MappingDefinition {
    const now = new Date().toISOString();

    return {
      version: '1.0.0',
      metadata: {
        name,
        description: description || '',
        createdAt: now,
        modifiedAt: now
      },
      nodes: this.nodeService.getAllNodes(),
      connections: [...this.connectionObserver$.getValue()]
    };
  }

  /**
   * Import a mapping definition and restore the nodes and connections.
   *
   * :param mapping: MappingDefinition to import
   * :return: void
   */
  importMapping(mapping: MappingDefinition): void {
    // Clear existing nodes and connections
    this.nodeService.clearAllNodes();
    this.connectionObserver$.next([]);

    // Import nodes
    this.nodeService.bulkAddNodes(mapping.nodes);

    this.connectionObserver$.next(mapping.connections);
  }

  /**
   * Download the current mapping as a JSON file.
   *
   * :param name: Name for the mapping file
   * :param description: Optional description
   * :return: void
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
  }

  /**
   * Upload and import a mapping from a JSON file.
   *
   * :param file: File object to import
   * :return: Promise<boolean> - Success status
   */
  uploadMapping(file: File): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const jsonString = event.target?.result as string;
          const mapping: MappingDefinition = JSON.parse(jsonString);

          // Validate the mapping structure
          if (this.validateMapping(mapping)) {
            this.importMapping(mapping);
            resolve(true);
          } else {
            reject(new Error('Invalid mapping file format'));
          }
        } catch (error) {
          reject(new Error('Failed to parse mapping file: ' + error));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Validate a mapping definition structure.
   *
   * :param mapping: MappingDefinition to validate
   * :return: boolean - Whether the mapping is valid
   */
  private validateMapping(mapping: any): mapping is MappingDefinition {
    return (
      mapping &&
      typeof mapping.version === 'string' &&
      mapping.metadata &&
      typeof mapping.metadata.name === 'string' &&
      Array.isArray(mapping.nodes) &&
      Array.isArray(mapping.connections) &&
      mapping.connections.every((conn: any) =>
        conn && typeof conn.from === 'string' && typeof conn.to === 'string'
      )
    );
  }

  /**
   * Get mapping metadata from a JSON string without fully importing.
   *
   * :param jsonString: JSON string to parse
   * :return: Metadata object or null if invalid
   */
  getMappingMetadata(jsonString: string): any {
    try {
      const mapping = JSON.parse(jsonString);
      return mapping.metadata || null;
    } catch {
      return null;
    }
  }
}
