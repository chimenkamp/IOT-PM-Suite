// src/app/app.ts

import { Component } from '@angular/core';
import { FFlowModule } from '@foblex/flow';
import { NodeService } from './services/node.service';
import { MappingService } from './services/mapping.service';
import { PipelineService } from './services/pipeline.service';
import { MappingToolbarComponent } from './components/mapping-toolbar/mapping-toolbar.component';
import { CommonModule } from '@angular/common';
import { NodeEditorComponent } from './components/node-editor/node-editor.compenent';

interface NodeCategory {
  title: string;
  nodes: NodeDefinition[];
  collapsed?: boolean;
}

interface NodeDefinition {
  type: string;
  label: string;
  description: string;
  color: string;
  hasInputs: boolean;
  hasOutputs: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    NodeEditorComponent,
    MappingToolbarComponent,
    FFlowModule,
    CommonModule,
  ],
  template: `
    <div class="app-container">
      <div class="sidebar">
        <div class="sidebar-header">
          <h2>BROOM: IoT-Enhanced Process Mining</h2>
          <p>Node-based pipeline for CORE metamodel creation</p>
        </div>

        <!-- Pipeline Operations Toolbar -->
        <app-mapping-toolbar></app-mapping-toolbar>

        <div class="node-library">
          @for (category of nodeCategories; track category.title) {
          <div class="category-section">
            <div
              class="category-header"
              (click)="toggleCategory(category)"
              [class.collapsed]="category.collapsed"
            >
              <span class="category-icon">{{
                category.collapsed ? '▶' : '▼'
              }}</span>
              <h3>{{ category.title }}</h3>
            </div>

            @if (!category.collapsed) {
            <div class="category-content">
              @for (node of category.nodes; track node.type) {
              <div
                class="library-node"
                draggable="true"
                (dragstart)="onDragStart($event, node.type)"
                [attr.data-node-type]="node.type"
                [title]="node.description"
              >
                <div
                  class="node-preview"
                  [class]="'node-preview-' + node.color"
                >
                  @if (node.hasInputs) {
                  <div class="input-port" [class]="node.color"></div>
                  }
                  <span class="node-label">{{ node.label }}</span>
                  @if (node.hasOutputs) {
                  <div class="output-port" [class]="node.color"></div>
                  }
                </div>
              </div>
              }
            </div>
            }
          </div>
          }
        </div>

        <div class="sidebar-footer">
          <div class="port-legend">
            <h4>Data Types</h4>

            <div class="container">
              <div class="row">
                <div class="col">
                  <div class="legend-item">
                    <div class="port nord-blue"></div>
                    <span>Raw Data (DataFrame)</span>
                  </div>
                  <div class="legend-item">
                    <div class="port nord-red"></div>
                    <span>Series</span>
                  </div>
                  <div class="legend-item">
                    <div class="port nord-yellow"></div>
                    <span>Attribute</span>
                  </div>
                  <div class="legend-item">
                    <div class="port nord-green"></div>
                    <span>Events</span>
                  </div>
                </div>
                <div class="col">
                  <div class="legend-item">
                    <div class="port nord-purple"></div>
                    <span>Objects</span>
                  </div>
                  <div class="legend-item">
                    <div class="port nord-orange"></div>
                    <span>Relationships</span>
                  </div>
                  <div class="legend-item">
                    <div class="port core-model"></div>
                    <span>CORE Model</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="pipeline-controls">
            <div class="row">
              <div class="col-8">
                <button
                  class="control-button execute-button"
                  (click)="executePipeline()"
                  [disabled]="!canExecutePipeline()"
                  title="Execute the current pipeline"
                >
                  ▶️ Execute Pipeline
                </button>
              </div>
              <div class="col-4">
                <button
              class="control-button validate-button"
              (click)="validatePipeline()"
              title="Validate pipeline connections"
              >
                ✓ Validate
              </button>

                </div>
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
          <app-node-editor #nodeEditor></app-node-editor>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./app.scss'],
})
export class AppComponent {
  nodeCategories: NodeCategory[] = [
    {
      title: 'Data Input & Loading',
      nodes: [
        {
          type: 'read-file',
          label: 'Read File',
          description: 'Load data from CSV, XML, YAML or JSON files',
          color: 'nord-blue',
          hasInputs: false,
          hasOutputs: true,
        },
        {
          type: 'mqtt-connector',
          label: 'MQTT Connector',
          description: 'Connect to MQTT sensor stream for real-time data',
          color: 'nord-blue',
          hasInputs: false,
          hasOutputs: true,
        },
      ],
    },
    {
      title: 'Data Processing',
      nodes: [
        {
          type: 'column-selector',
          label: 'Column Selector',
          description: 'Convert Raw Data column to Series',
          color: 'nord-red',
          hasInputs: true,
          hasOutputs: true,
        },
        {
          type: 'attribute-selector',
          label: 'Attribute Selector',
          description: 'Select attributes from Series data',
          color: 'nord-yellow',
          hasInputs: true,
          hasOutputs: true,
        },
        {
          type: 'data-filter',
          label: 'Data Filter',
          description: 'Apply conditions to filter Series data',
          color: 'nord-red',
          hasInputs: true,
          hasOutputs: true,
        },
        {
          type: 'data-mapper',
          label: 'Data Mapper',
          description: 'Apply mapping transformations to Series',
          color: 'nord-red',
          hasInputs: true,
          hasOutputs: true,
        },
      ],
    },
    {
      title: 'CORE Model Creation',
      nodes: [
        {
          type: 'iot-event',
          label: 'IoT Event',
          description: 'Create IoT events with ID, Type, Timestamp, Metadata',
          color: 'nord-green',
          hasInputs: true,
          hasOutputs: true,
        },
        {
          type: 'process-event',
          label: 'Process Event',
          description: 'Create process events with Activity Label',
          color: 'nord-green',
          hasInputs: true,
          hasOutputs: true,
        },
        {
          type: 'object-creator',
          label: 'Object Creator',
          description: 'Create objects with ID, Type, Class, Metadata',
          color: 'nord-purple',
          hasInputs: true,
          hasOutputs: true,
        },
      ],
    },
    {
      title: 'Utilities',
      nodes: [
        {
          type: 'unique-id-generator',
          label: 'Unique ID Generator',
          description: 'Generate unique identifiers',
          color: 'nord-yellow',
          hasInputs: false,
          hasOutputs: true,
        },
        {
          type: 'object-class-selector',
          label: 'Object Class Selector',
          description: 'Select object class for CORE model',
          color: 'nord-yellow',
          hasInputs: false,
          hasOutputs: true,
        },
      ],
    },
    {
      title: 'Relationships',
      nodes: [
        {
          type: 'event-object-relation',
          label: 'Event-Object Relation',
          description: 'Create relationships between events and objects',
          color: 'nord-orange',
          hasInputs: true,
          hasOutputs: true,
        },
        {
          type: 'event-event-relation',
          label: 'Event-Event Relation',
          description: 'Create derivation relationships between events',
          color: 'nord-orange',
          hasInputs: true,
          hasOutputs: true,
        },
      ],
    },
    {
      title: 'CORE Model Construction',
      nodes: [
        {
          type: 'core-metamodel',
          label: 'CORE Metamodel',
          description: 'Construct the final CORE metamodel',
          color: 'core-model',
          hasInputs: true,
          hasOutputs: true,
        },
      ],
    },
    {
      title: 'Output & Export',
      nodes: [
        {
          type: 'table-output',
          label: 'Table Output',
          description: 'Display data in tabular format',
          color: 'core-model',
          hasInputs: true,
          hasOutputs: false,
        },
        {
          type: 'export-ocel',
          label: 'Export to OCEL',
          description: 'Export CORE metamodel to OCEL format',
          color: 'core-model',
          hasInputs: true,
          hasOutputs: false,
        },
        {
          type: 'ocpm-discovery',
          label: 'OCPM Discovery',
          description: 'Discover object-centric process model in browser',
          color: 'core-model',
          hasInputs: true,
          hasOutputs: false,
        },
      ],
    },
  ];

  constructor(
    private nodeService: NodeService,
    private mappingService: MappingService,
    private pipelineService: PipelineService
  ) {}

  /**
   * Toggle the collapsed state of a category.
   *
   * :param category: NodeCategory to toggle
   * :return: void
   */
  toggleCategory(category: NodeCategory): void {
    category.collapsed = !category.collapsed;
  }

  /**
   * Called when user starts dragging a library node.
   *
   * :param event: DragEvent
   * :param nodeType: string identifier for the node type
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
        y: event.offsetY,
      });
    }
  }

  /**
   * Check if pipeline can be executed (has nodes and connections).
   *
   * :return: boolean
   */
  canExecutePipeline(): boolean {
    const nodes = this.nodeService.getAllNodes();
    const connections = this.mappingService.connectionObserver$.getValue();
    return nodes.length > 0 && connections.length > 0;
  }

  /**
   * Execute the current pipeline.
   *
   * :return: void
   */
  executePipeline(): void {
    if (!this.canExecutePipeline()) {
      alert('Pipeline cannot be executed. Please add nodes and connections.');
      return;
    }

    const pipeline = this.pipelineService.createPipelineDefinition();
    console.log('Executing pipeline:', pipeline);

    // Here you would send the pipeline to the backend for execution
    this.pipelineService
      .executePipeline(pipeline)
      .then((result) => {
        console.log('Pipeline execution completed:', result);
        // Handle execution results
      })
      .catch((error) => {
        console.error('Pipeline execution failed:', error);
        alert('Pipeline execution failed: ' + error.message);
      });
  }

  /**
   * Validate the current pipeline for correctness.
   *
   * :return: void
   */
  validatePipeline(): void {
    const validationResult = this.pipelineService.validatePipeline();

    if (validationResult.isValid) {
      alert('Pipeline is valid and ready for execution!');
    } else {
      alert(
        'Pipeline validation failed:\n' + validationResult.errors.join('\n')
      );
    }
  }
}
