
import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FFlowModule } from '@foblex/flow';

export interface NodePort {
  id: string;
  color: string;
  label: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface NodeContent {
  title: string;
  hasFileDownload?: boolean;
  description: string;
  status?: string;
  hasImageDisplay?: boolean;
}

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-generic-node',
  standalone: true,
  imports: [CommonModule, FFlowModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <f-node
      [fNodeId]="nodeId"
      [fNodePosition]="position"
      [class.node-error]="hasError"
      [title]="errorMessage || content?.description || ''"
      class="flow-node"
      [class]="nodeTypeClass">

      <!-- Input Ports -->
      <f-node-input
        *ngFor="let input of inputs"
        [fInputId]="input.id"
        [class]="'input-port ' + input.color">
        <div class="port-handle" [class]="input.color">
          <span class="port-label input-label">{{ input.label }}</span>
        </div>
      </f-node-input>

      <!-- Node Content -->
      <div class="node-content" [class.has-error]="hasError">
        <div class="node-header">
          <h3 class="node-title">{{ content?.title || 'Node' }}</h3>
          <div class="node-status" *ngIf="content?.status || hasError">
            <span *ngIf="hasError" class="error-indicator" title="Node has errors">⚠️</span>
            <span *ngIf="content?.status && !hasError" class="status-text">{{ content.status }}</span>
          </div>
        </div>

        <div class="node-description" *ngIf="content?.description">
          {{ content.description }}
        </div>

        <div class="error-message" *ngIf="hasError && errorMessage">
          <div class="error-header">Execution Error:</div>
          <div class="error-text">{{ errorMessage }}</div>
        </div>
      </div>

      <!-- Output Ports -->
      <f-node-output
        *ngFor="let output of outputs"
        [fOutputId]="output.id"
        [class]="'output-port ' + output.color">
        <div class="port-handle" [class]="output.color">
          <span class="port-label output-label">{{ output.label }}</span>
        </div>
      </f-node-output>
    </f-node>
  `,
  styleUrls: ['./generic-node.component.scss']
})
export class GenericNodeComponent implements OnInit, OnChanges {
  @Input() nodeId!: string;
  @Input() nodeType!: string;
  @Input() position: Position = { x: 0, y: 0 };
  @Input() inputs: NodePort[] = [];
  @Input() outputs: NodePort[] = [];
  @Input() content?: NodeContent;
  @Input() hasError: boolean = false;
  @Input() errorMessage?: string;

  nodeTypeClass: string = '';

  constructor() {}

  ngOnInit(): void {
    this.updateNodeTypeClass();
    console.log(`GenericNodeComponent initialized: ${this.  inputs}`);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['nodeType']) {
      this.updateNodeTypeClass();
    }

    if (changes['hasError']) {
      console.log(`Node ${this.nodeId} error state changed:`, this.hasError);
    }
  }

  private updateNodeTypeClass(): void {
    // Generate CSS class based on node type for custom styling
    this.nodeTypeClass = `node-type-${this.nodeType?.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
  }
}
