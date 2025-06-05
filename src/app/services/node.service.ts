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
  private nodesSubject = new BehaviorSubject<FlowNode[]>([
    // Initial sample nodes
    {
      id: 'node-1',
      type: 'sample',
      position: { x: 100, y: 100 },
      inputs: [{ id: 'other_in', color: 'nord-blue', label: 'Input' }],
      outputs: [
        { id: 'out2', color: 'nord-purple', label: 'purple' },
        { id: 'out1', color: 'nord-green', label: 'green' },
        { id: 'out3', color: 'nord-red', label: 'red' },
      ],
      content: { title: 'Sample Node', description: 'Custom content here' }
    },
    {
      id: 'node-2',
      type: 'process',
      position: { x: 300, y: 200 },
      inputs: [
        { id: 'in1', color: 'nord-green', label: 'green' },
        { id: 'in2', color: 'nord-blue', label: 'blue' },
        { id: 'in3', color: 'nord-orange', label: 'orange' },
        { id: 'in4', color: 'nord-purple', label: 'purple' }
      ],
      outputs: [{ id: 'other_out', color: 'nord-purple', label: 'Result' }],
      content: { title: 'Process Node', hasInput: true, hasSelect: true }
    }
  ]);

  public nodes$ = this.nodesSubject.asObservable();
  private nodeCounter = 3;

  /**
   * Adds a new node of the given type at the given position.
   *
   * :param nodeType: type of node ('input' | 'process' | 'output', etc.)
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
      case 'input':
        return {
          id,
          type: 'input',
          position,
          inputs: [],
          outputs: [{ id: `${id}-out1`, color: 'nord-blue', label: 'Data' }],
          content: {
            title: 'Input Node',
            description: 'Provides data input',
            hasInput: true,
            inputPlaceholder: 'Enter value'
          }
        };

      case 'process':
        return {
          id,
          type: 'process',
          position,
          inputs: [
            { id: `${id}-in1`, color: 'nord-blue', label: 'Data In' },
            { id: `${id}-in2`, color: 'nord-green', label: 'Config' }
          ],
          outputs: [{ id: `${id}-out1`, color: 'nord-purple', label: 'Result' }],
          content: {
            title: 'Process Node',
            description: 'Processes incoming data',
            hasInput: true,
            hasSelect: true,
            inputPlaceholder: 'Parameter'
          }
        };

      case 'output':
        return {
          id,
          type: 'output',
          position,
          inputs: [{ id: `${id}-in1`, color: 'nord-purple', label: 'Result' }],
          outputs: [],
          content: {
            title: 'Output Node',
            description: 'Displays final result',
            displayOnly: true
          }
        };

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
}
