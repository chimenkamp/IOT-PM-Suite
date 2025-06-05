// src/app/services/node.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NodePort, Position } from '../components/generic-node/generic-node.component';

export interface FlowNode {
  id: string;
  type: string;
  position: Position;
  inputs: NodePort[];
  outputs: NodePort[];
  content: any;
}

@Injectable({
  providedIn: 'root'
})
export class NodeService {
  private nodesSubject = new BehaviorSubject<FlowNode[]>([]);

  public nodes$ = this.nodesSubject.asObservable();
  private nodeCounter = 1;

  /**
   * Adds a new node of the given type at the given position.
   *
   * :param nodeType: type of node
   * :param position: { x, y } position where it should appear
   * :return: void
   */
  addNode(nodeType: string, position: Position): void {
    const newNode = this.createNodeByType(nodeType, position);
    const currentNodes = this.nodesSubject.value;
    this.nodesSubject.next([...currentNodes, newNode]);
  }

  /**
   * Removes the node with the given ID.
   *
   * :param nodeId: the unique ID of the node to remove
   * :return: void
   */
  removeNode(nodeId: string): void {
    const currentNodes = this.nodesSubject.value;
    this.nodesSubject.next(currentNodes.filter(node => node.id !== nodeId));
  }

  /**
   * Updates the position of an existing node.
   *
   * :param nodeId: the unique ID of the node to move
   * :param position: the new { x, y } coordinates
   * :return: void
   */
  updateNodePosition(nodeId: string, position: Position): void {
    const currentNodes = this.nodesSubject.value;
    const updatedNodes = currentNodes.map(node =>
      node.id === nodeId ? { ...node, position } : node
    );
    this.nodesSubject.next(updatedNodes);
  }

  private createNodeByType(type: string, position: Position): FlowNode {
    const id = `node-${this.nodeCounter++}`;

    switch (type) {
      // ============ INPUT/LOADING NODES ============
      case 'file-loader':
        return {
          id,
          type: 'file-loader',
          position,
          inputs: [],
          outputs: [{ id: `${id}-raw-data`, color: 'nord-blue', label: 'Raw Data' }],
          content: {
            title: 'File Loader',
            description: 'Load XES/XML event logs',
            hasInput: true,
            inputPlaceholder: 'File path pattern (e.g., *.xes)',
            configOptions: ['recursive', 'file-pattern']
          }
        };

      case 'data-source':
        return {
          id,
          type: 'data-source',
          position,
          inputs: [],
          outputs: [{ id: `${id}-raw-data`, color: 'nord-blue', label: 'Raw Events' }],
          content: {
            title: 'Data Source',
            description: 'Manual data input or connection',
            hasInput: true,
            inputPlaceholder: 'Raw event data'
          }
        };

      // ============ PROCESSING NODES ============
      case 'event-parser':
        return {
          id,
          type: 'event-parser',
          position,
          inputs: [{ id: `${id}-raw-data`, color: 'nord-blue', label: 'Raw Data' }],
          outputs: [{ id: `${id}-events`, color: 'nord-green', label: 'Parsed Events' }],
          content: {
            title: 'Event Parser',
            description: 'Parse raw XML events to structured data',
            hasSelect: true,
            selectOptions: ['XES', 'XML', 'JSON'],
            selectLabel: 'Parser Type'
          }
        };

      case 'attribute-selector':
        return {
          id,
          type: 'attribute-selector',
          position,
          inputs: [{ id: `${id}-events`, color: 'nord-green', label: 'Events' }],
          outputs: [{ id: `${id}-attributes`, color: 'nord-yellow', label: 'Attributes' }],
          content: {
            title: 'Attribute Selector',
            description: 'Extract specific attributes from events',
            hasInput: true,
            inputPlaceholder: 'Attribute key (e.g., concept:name)',
            configOptions: ['case-sensitive', 'default-value']
          }
        };

      case 'stream-extractor':
        return {
          id,
          type: 'stream-extractor',
          position,
          inputs: [{ id: `${id}-events`, color: 'nord-green', label: 'Events' }],
          outputs: [{ id: `${id}-streams`, color: 'nord-red', label: 'Stream Points' }],
          content: {
            title: 'Stream Point Extractor',
            description: 'Extract sensor stream data from events',
            configOptions: ['system-type', 'observation-type']
          }
        };

      case 'data-mapper':
        return {
          id,
          type: 'data-mapper',
          position,
          inputs: [
            { id: `${id}-source`, color: 'nord-yellow', label: 'Source Data' },
            { id: `${id}-mapping`, color: 'nord-orange', label: 'Mapping Rules' }
          ],
          outputs: [{ id: `${id}-mapped`, color: 'nord-yellow', label: 'Mapped Data' }],
          content: {
            title: 'Data Mapper',
            description: 'Apply mapping transformations',
            hasInput: true,
            inputPlaceholder: 'Mapping expression'
          }
        };

      case 'data-filter':
        return {
          id,
          type: 'data-filter',
          position,
          inputs: [{ id: `${id}-data`, color: 'nord-yellow', label: 'Data' }],
          outputs: [{ id: `${id}-filtered`, color: 'nord-yellow', label: 'Filtered Data' }],
          content: {
            title: 'Data Filter',
            description: 'Filter data based on conditions',
            hasInput: true,
            inputPlaceholder: 'Filter condition'
          }
        };

      // ============ CORE MODEL CREATION NODES ============
      case 'object-creator':
        return {
          id,
          type: 'object-creator',
          position,
          inputs: [
            { id: `${id}-id`, color: 'nord-yellow', label: 'Object ID' },
            { id: `${id}-type`, color: 'nord-yellow', label: 'Object Type' },
            { id: `${id}-attributes`, color: 'nord-yellow', label: 'Attributes' }
          ],
          outputs: [{ id: `${id}-object`, color: 'nord-purple', label: 'Object' }],
          content: {
            title: 'Object Creator',
            description: 'Create CORE model objects',
            hasSelect: true,
            selectOptions: ['RESOURCE', 'CASE', 'ACTIVITY', 'CUSTOM'],
            selectLabel: 'Object Class'
          }
        };

      case 'process-event-creator':
        return {
          id,
          type: 'process-event-creator',
          position,
          inputs: [
            { id: `${id}-name`, color: 'nord-yellow', label: 'Event Name' },
            { id: `${id}-timestamp`, color: 'nord-yellow', label: 'Timestamp' },
            { id: `${id}-resource`, color: 'nord-yellow', label: 'Resource' },
            { id: `${id}-attributes`, color: 'nord-yellow', label: 'Attributes' }
          ],
          outputs: [{ id: `${id}-process-event`, color: 'nord-green', label: 'Process Event' }],
          content: {
            title: 'Process Event Creator',
            description: 'Create process events for CORE model',
            hasInput: true,
            inputPlaceholder: 'Activity name'
          }
        };

      case 'observation-creator':
        return {
          id,
          type: 'observation-creator',
          position,
          inputs: [
            { id: `${id}-system`, color: 'nord-yellow', label: 'System' },
            { id: `${id}-timestamp`, color: 'nord-yellow', label: 'Timestamp' },
            { id: `${id}-value`, color: 'nord-yellow', label: 'Value' },
            { id: `${id}-type`, color: 'nord-yellow', label: 'Observation Type' }
          ],
          outputs: [{ id: `${id}-observation`, color: 'nord-red', label: 'Observation' }],
          content: {
            title: 'Observation Creator',
            description: 'Create sensor observations',
            hasSelect: true,
            selectOptions: ['temperature', 'pressure', 'motion', 'custom'],
            selectLabel: 'Sensor Type'
          }
        };

      case 'event-object-relation':
        return {
          id,
          type: 'event-object-relation',
          position,
          inputs: [
            { id: `${id}-event`, color: 'nord-green', label: 'Event' },
            { id: `${id}-object`, color: 'nord-purple', label: 'Object' }
          ],
          outputs: [{ id: `${id}-relation`, color: 'nord-orange', label: 'E-O Relationship' }],
          content: {
            title: 'Event-Object Relation',
            description: 'Create event-object relationships',
            hasSelect: true,
            selectOptions: ['executes', 'involves', 'uses', 'creates'],
            selectLabel: 'Relationship Type'
          }
        };

      case 'event-event-relation':
        return {
          id,
          type: 'event-event-relation',
          position,
          inputs: [
            { id: `${id}-source-event`, color: 'nord-green', label: 'Source Event' },
            { id: `${id}-target-event`, color: 'nord-green', label: 'Target Event' }
          ],
          outputs: [{ id: `${id}-relation`, color: 'nord-orange', label: 'E-E Relationship' }],
          content: {
            title: 'Event-Event Relation',
            description: 'Create event-event relationships',
            hasSelect: true,
            selectOptions: ['derived_from', 'correlates', 'precedes', 'triggers'],
            selectLabel: 'Qualifier'
          }
        };

      // ============ COLLECTION NODES ============
      case 'objects-collection':
        return {
          id,
          type: 'objects-collection',
          position,
          inputs: [{ id: `${id}-objects`, color: 'nord-purple', label: 'Objects' }],
          outputs: [{ id: `${id}-collection`, color: 'nord-purple', label: 'Objects Collection' }],
          content: {
            title: 'Objects Collection',
            description: 'Collect and manage object instances',
            displayOnly: true
          }
        };

      case 'events-collection':
        return {
          id,
          type: 'events-collection',
          position,
          inputs: [{ id: `${id}-events`, color: 'nord-green', label: 'Process Events' }],
          outputs: [{ id: `${id}-collection`, color: 'nord-green', label: 'Events Collection' }],
          content: {
            title: 'Process Events Collection',
            description: 'Collect and manage process events',
            displayOnly: true
          }
        };

      case 'observations-collection':
        return {
          id,
          type: 'observations-collection',
          position,
          inputs: [{ id: `${id}-observations`, color: 'nord-red', label: 'Observations' }],
          outputs: [{ id: `${id}-collection`, color: 'nord-red', label: 'Observations Collection' }],
          content: {
            title: 'Observations Collection',
            description: 'Collect and manage sensor observations',
            displayOnly: true
          }
        };

      case 'eo-relations-collection':
        return {
          id,
          type: 'eo-relations-collection',
          position,
          inputs: [{ id: `${id}-relations`, color: 'nord-orange', label: 'E-O Relations' }],
          outputs: [{ id: `${id}-collection`, color: 'nord-orange', label: 'E-O Collection' }],
          content: {
            title: 'Event-Object Relations',
            description: 'Collect event-object relationships',
            displayOnly: true
          }
        };

      case 'ee-relations-collection':
        return {
          id,
          type: 'ee-relations-collection',
          position,
          inputs: [{ id: `${id}-relations`, color: 'nord-orange', label: 'E-E Relations' }],
          outputs: [{ id: `${id}-collection`, color: 'nord-orange', label: 'E-E Collection' }],
          content: {
            title: 'Event-Event Relations',
            description: 'Collect event-event relationships',
            displayOnly: true
          }
        };

      // ============ OUTPUT NODES ============
      case 'core-metamodel':
        return {
          id,
          type: 'core-metamodel',
          position,
          inputs: [
            { id: `${id}-objects`, color: 'nord-purple', label: 'Objects' },
            { id: `${id}-process-events`, color: 'nord-green', label: 'Process Events' },
            { id: `${id}-observations`, color: 'nord-red', label: 'Observations' },
            { id: `${id}-eo-relations`, color: 'nord-orange', label: 'E-O Relations' },
            { id: `${id}-ee-relations`, color: 'nord-orange', label: 'E-E Relations' }
          ],
          outputs: [{ id: `${id}-metamodel`, color: 'core-model', label: 'CORE Metamodel' }],
          content: {
            title: 'CORE Metamodel',
            description: 'Final CORE metamodel output',
            displayOnly: true,
            status: 'ready'
          }
        };

      case 'summary-output':
        return {
          id,
          type: 'summary-output',
          position,
          inputs: [{ id: `${id}-metamodel`, color: 'core-model', label: 'CORE Metamodel' }],
          outputs: [],
          content: {
            title: 'Summary Output',
            description: 'Display metamodel summary statistics',
            displayOnly: true
          }
        };

      case 'table-output':
        return {
          id,
          type: 'table-output',
          position,
          inputs: [{ id: `${id}-data`, color: 'core-model', label: 'Table Data' }],
          outputs: [],
          content: {
            title: 'Table Output',
            description: 'Display data in tabular format',
            displayOnly: true
          }
        };

      case 'export-output':
        return {
          id,
          type: 'export-output',
          position,
          inputs: [{ id: `${id}-metamodel`, color: 'core-model', label: 'CORE Metamodel' }],
          outputs: [],
          content: {
            title: 'Export Output',
            description: 'Export metamodel to file formats',
            hasSelect: true,
            selectOptions: ['JSON', 'XML', 'OCEL', 'PM4PY'],
            selectLabel: 'Export Format'
          }
        };

      // ============ UTILITY NODES ============
      case 'value-extractor':
        return {
          id,
          type: 'value-extractor',
          position,
          inputs: [{ id: `${id}-data`, color: 'nord-yellow', label: 'Data' }],
          outputs: [{ id: `${id}-value`, color: 'nord-yellow', label: 'Extracted Value' }],
          content: {
            title: 'Value Extractor',
            description: 'Extract specific values from data',
            hasInput: true,
            inputPlaceholder: 'XPath or JSONPath expression'
          }
        };

      case 'timestamp-parser':
        return {
          id,
          type: 'timestamp-parser',
          position,
          inputs: [{ id: `${id}-timestamp`, color: 'nord-yellow', label: 'Timestamp String' }],
          outputs: [{ id: `${id}-datetime`, color: 'nord-yellow', label: 'DateTime' }],
          content: {
            title: 'Timestamp Parser',
            description: 'Parse timestamp strings to datetime objects',
            hasInput: true,
            inputPlaceholder: 'Date format (e.g., %Y-%m-%d %H:%M:%S)'
          }
        };

      case 'uuid-generator':
        return {
          id,
          type: 'uuid-generator',
          position,
          inputs: [],
          outputs: [{ id: `${id}-uuid`, color: 'nord-yellow', label: 'UUID' }],
          content: {
            title: 'UUID Generator',
            description: 'Generate unique identifiers',
            hasSelect: true,
            selectOptions: ['uuid4', 'uuid1', 'incremental'],
            selectLabel: 'ID Type'
          }
        };

      // ============ DEFAULT CASE ============
      default:
        return {
          id,
          type: 'unknown',
          position,
          inputs: [],
          outputs: [],
          content: { title: 'Unknown Node', description: 'Unknown node type' }
        };
    }
  }

  public getAllNodes(): FlowNode[] {
    return this.nodesSubject.value;
  }
}
