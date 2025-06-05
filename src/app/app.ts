// src/app/app.component.ts

import { Component, Inject } from '@angular/core';
import { FFlowModule } from '@foblex/flow';
import { NodeService } from './services/node.service';
import { MappingService } from './services/mapping.service';
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
  imports: [NodeEditorComponent, MappingToolbarComponent, FFlowModule, CommonModule],
  template: `
    <div class="app-container">
      <div class="sidebar">
        <div class="sidebar-header">
          <h2>IoT Process Mining Suite</h2>
          <p>Node-based data mapping tool</p>
        </div>

        <!-- Mapping Operations Toolbar -->
        <app-mapping-toolbar></app-mapping-toolbar>

        <div class="node-library">
          @for (category of nodeCategories; track category.title) {
            <div class="category-section">
              <div
                class="category-header"
                (click)="toggleCategory(category)"
                [class.collapsed]="category.collapsed"
              >
                <span class="category-icon">{{ category.collapsed ? '▶' : '▼' }}</span>
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
                      <div class="node-preview" [class]="'node-preview-' + node.color">
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
            <h4>Port Types</h4>
            <div class="legend-item">
              <div class="port nord-blue"></div>
              <span>Raw Data</span>
            </div>
            <div class="legend-item">
              <div class="port nord-green"></div>
              <span>Events</span>
            </div>
            <div class="legend-item">
              <div class="port nord-purple"></div>
              <span>Objects</span>
            </div>
            <div class="legend-item">
              <div class="port nord-red"></div>
              <span>Observations</span>
            </div>
            <div class="legend-item">
              <div class="port nord-orange"></div>
              <span>Relationships</span>
            </div>
            <div class="legend-item">
              <div class="port nord-yellow"></div>
              <span>Attributes</span>
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
          <app-node-editor></app-node-editor>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./app.scss']
})
export class AppComponent {

  nodeCategories: NodeCategory[] = [
    {
      title: 'Data Input & Loading',
      nodes: [
        {
          type: 'file-loader',
          label: 'File Loader',
          description: 'Load XES/XML event logs from files',
          color: 'nord-blue',
          hasInputs: false,
          hasOutputs: true
        },
        {
          type: 'data-source',
          label: 'Data Source',
          description: 'Manual data input or external connection',
          color: 'nord-blue',
          hasInputs: false,
          hasOutputs: true
        }
      ]
    },
    {
      title: 'Data Processing',
      nodes: [
        {
          type: 'event-parser',
          label: 'Event Parser',
          description: 'Parse raw XML/XES events to structured data',
          color: 'nord-green',
          hasInputs: true,
          hasOutputs: true
        },
        {
          type: 'attribute-selector',
          label: 'Attribute Selector',
          description: 'Extract specific attributes from events',
          color: 'nord-yellow',
          hasInputs: true,
          hasOutputs: true
        },
        {
          type: 'column-selector',
          label: 'Column Selector',
          description: 'Select specific columns from data tables',
          color: 'nord-red',
          hasInputs: true,
          hasOutputs: true
        },
        {
          type: 'data-mapper',
          label: 'Data Mapper',
          description: 'Apply mapping transformations to data',
          color: 'nord-yellow',
          hasInputs: true,
          hasOutputs: true
        },
        {
          type: 'data-filter',
          label: 'Data Filter',
          description: 'Filter data based on conditions',
          color: 'nord-yellow',
          hasInputs: true,
          hasOutputs: true
        }
      ]
    },
    {
      title: 'Core Model Creation',
      nodes: [
        {
          type: 'object-creator',
          label: 'Object Creator',
          description: 'Create CORE model objects (resources, cases, etc.)',
          color: 'nord-purple',
          hasInputs: true,
          hasOutputs: true
        },
        {
          type: 'process-event-creator',
          label: 'Process Event Creator',
          description: 'Create process events for CORE model',
          color: 'nord-green',
          hasInputs: true,
          hasOutputs: true
        },
        {
          type: 'observation-creator',
          label: 'Observation Creator',
          description: 'Create sensor observations',
          color: 'nord-red',
          hasInputs: true,
          hasOutputs: true
        }
      ]
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
          hasOutputs: true
        },
        {
          type: 'event-event-relation',
          label: 'Event-Event Relation',
          description: 'Create relationships between events',
          color: 'nord-orange',
          hasInputs: true,
          hasOutputs: true
        }
      ]
    },
    {
      title: 'Collections',
      nodes: [
        {
          type: 'objects-collection',
          label: 'Objects Collection',
          description: 'Collect and manage object instances',
          color: 'nord-purple',
          hasInputs: true,
          hasOutputs: true
        },
        {
          type: 'events-collection',
          label: 'Events Collection',
          description: 'Collect and manage process events',
          color: 'nord-green',
          hasInputs: true,
          hasOutputs: true
        },
        {
          type: 'observations-collection',
          label: 'Observations Collection',
          description: 'Collect and manage sensor observations',
          color: 'nord-red',
          hasInputs: true,
          hasOutputs: true
        },
        {
          type: 'eo-relations-collection',
          label: 'E-O Relations',
          description: 'Collect event-object relationships',
          color: 'nord-orange',
          hasInputs: true,
          hasOutputs: true
        },
        {
          type: 'ee-relations-collection',
          label: 'E-E Relations',
          description: 'Collect event-event relationships',
          color: 'nord-orange',
          hasInputs: true,
          hasOutputs: true
        }
      ]
    },
    {
      title: 'Output & Export',
      nodes: [
        {
          type: 'core-metamodel',
          label: 'CORE Metamodel',
          description: 'Final CORE metamodel output',
          color: 'core-model',
          hasInputs: true,
          hasOutputs: true
        },
        {
          type: 'summary-output',
          label: 'Summary Output',
          description: 'Display metamodel summary statistics',
          color: 'core-model',
          hasInputs: true,
          hasOutputs: false
        },
        {
          type: 'table-output',
          label: 'Table Output',
          description: 'Display data in tabular format',
          color: 'core-model',
          hasInputs: true,
          hasOutputs: false
        },
        {
          type: 'export-output',
          label: 'Export Output',
          description: 'Export metamodel to various file formats',
          color: 'core-model',
          hasInputs: true,
          hasOutputs: false
        },
        {
          type: 'discover-OCEL-model',
          label: 'Discover OCEL Model',
          description: 'Discover and visualize OCEL model from data',
          color: 'core-model',
          hasInputs: true,
          hasOutputs: false
        },

      ]
    },
    {
      title: 'Utilities',
      collapsed: true,
      nodes: [
        {
          type: 'value-extractor',
          label: 'Value Extractor',
          description: 'Extract specific values using expressions',
          color: 'nord-yellow',
          hasInputs: true,
          hasOutputs: true
        },
        {
          type: 'timestamp-parser',
          label: 'Timestamp Parser',
          description: 'Parse timestamp strings to datetime objects',
          color: 'nord-yellow',
          hasInputs: true,
          hasOutputs: true
        },
        {
          type: 'uuid-generator',
          label: 'UUID Generator',
          description: 'Generate unique identifiers',
          color: 'nord-yellow',
          hasInputs: false,
          hasOutputs: true
        }
      ]
    }
  ];

  constructor(
    private nodeService: NodeService,
    private mappingService: MappingService
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
        y: event.offsetY
      });
    }
  }
}
