// src/app/app.component.ts

import { Component } from '@angular/core';
import { FFlowModule } from '@foblex/flow';
import { NodeService } from './services/node.service';
import { NodeEditorComponent } from './components/node-editor/node-editor.compenent';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NodeEditorComponent, FFlowModule],
  template: `
    <div class="app-container">
      <div class="sidebar">
        <h3>Node Library</h3>
        <div class="node-library">
          <!-- Draggable library nodes -->
          <div
            class="library-node"
            draggable="true"
            (dragstart)="onDragStart($event, 'input')"
            data-node-type="input"
          >
            <div class="node-preview input-node">
              <span>Input Node</span>
              <div class="output-port nord-blue"></div>
            </div>
          </div>

          <div
            class="library-node"
            draggable="true"
            (dragstart)="onDragStart($event, 'process')"
            data-node-type="process"
          >
            <div class="node-preview process-node">
              <div class="input-port nord-green"></div>
              <span>Process Node</span>
              <div class="output-port nord-purple"></div>
            </div>
          </div>

          <div
            class="library-node"
            draggable="true"
            (dragstart)="onDragStart($event, 'output')"
            data-node-type="output"
          >
            <div class="node-preview output-node">
              <div class="input-port nord-red"></div>
              <span>Output Node</span>
            </div>
          </div>
        </div>
      </div>

      <div class="editor-container">
        <div
          class="flow-editor"
          (drop)="onDrop($event)"
          (dragover)="onDragOver($event)"
        >
          <div class="grid-background"></div>
          <!-- This now shows NodeEditorComponent, which in turn renders all nodes -->
          <app-node-editor></app-node-editor>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./app.scss']
})
export class AppComponent {
  constructor(private nodeService: NodeService) {}

  /**
   * Called when user starts dragging a library node.
   *
   * :param event: DragEvent
   * :param nodeType: string identifier for the node type (e.g. 'input')
   * :return: void
   */
  onDragStart(event: DragEvent, nodeType: string): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', nodeType);
    }
  }

  /**
   * Prevent default so drop event can fire.
   *
   * :param event: DragEvent
   * :return: void
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  /**
   * Called when a library node is dropped onto the editor canvas.
   * Adds a new node via NodeService.
   *
   * :param event: DragEvent
   * :return: void
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    const nodeType = event.dataTransfer?.getData('text/plain');
    console.log('Dropped node type:', nodeType);
    if (nodeType) {
      this.nodeService.addNode(nodeType, {
        x: event.offsetX,
        y: event.offsetY
      });
    }
  }
}
