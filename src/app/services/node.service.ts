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

    this.nodesSubject.next([...nodes]);
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
   * Update a node's content.
   *
   * :param nodeId: the unique ID of the node
   * :param content: new content object
   * :return: void
   */
  updateNodeContent(nodeId: string, content: any): void {
    const currentNodes = this.nodesSubject.value;
    const updatedNodes = currentNodes.map(node =>
      node.id === nodeId ? { ...node, content: { ...node.content, ...content } } : node
    );
    this.nodesSubject.next(updatedNodes);
  }

  private createNodeByType(type: string, position: Position): FlowNode {
    const id = `node-${this.nodeCounter++}`;
    const template = nodeDefinitions[type];

    if (template) {
        const inputsWithId = template.inputs.map((handle) => ({
            id: `${id}-${handle.label.toLowerCase().replace(/ /g, '-')}`,
            color: handle.color,
            label: handle.label
        }));

        const outputsWithId = template.outputs.map((handle) => ({
            id: `${id}-${handle.label.toLowerCase().replace(/ /g, '-')}`,
            color: handle.color,
            label: handle.label
        }));

        return {
            id,
            type,
            position,
            inputs: inputsWithId,
            outputs: outputsWithId,
            content: template.content
        };
    }

    return {
        id,
        type: 'unknown',
        position,
        inputs: [],
        outputs: [],
        content: {
            title: 'Unknown Node',
            description: 'Unknown node type'
        }
    };
}


  public getAllNodes(): FlowNode[] {
    return this.nodesSubject.value;
  }
}
