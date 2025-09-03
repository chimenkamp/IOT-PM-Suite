// src/app/app.ts - Updated with log dialog and error highlighting

import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';import { FFlowModule } from '@foblex/flow';
import { NodeService } from './services/node.service';
import { MappingService } from './services/mapping.service';
import { PipelineService } from './services/pipeline.service';
import { ApiService } from './services/api.service';
import { MappingToolbarComponent } from './components/mapping-toolbar/mapping-toolbar.component';
import {
  LogDialogComponent,
  LogDialogData,
} from './components/log-dialog/log-dialog.component';
import { CommonModule } from '@angular/common';
import { NodeEditorComponent } from './components/node-editor/node-editor.compenent';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

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
    MatDialogModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="app-container">
      <div class="sidebar">
        <div class="sidebar-header">
          <h2>BROOM: IoT-Enhanced Process Mining</h2>
          <p>
            Tool<strong>B</strong>ox fo<strong>R</strong>
            I<strong>O</strong>T-Enhanced Pr<strong>O</strong>cess
            <strong>M</strong>ining
          </p>
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

          <!-- Execution Status Display -->
          <div class="execution-status" [class]="lastExecutionStatus">
            <div class="status-indicator">
              <span class="status-icon">{{ executionStatusIcon }}</span>
              <span class="status-text">{{ executionStatusText }}</span>
            </div>
            @if (lastExecutionResult) {
            <button
              class="view-logs-btn"
              (click)="showLastExecutionLogs()"
              title="View execution logs"
            >
              📋 View Logs
            </button>
            }
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
          <!-- Add template reference variable -->
          <app-node-editor #nodeEditor></app-node-editor>
        </div>
      </div>
    </div>

    <!-- Connection Status Indicator -->
    <div class="connection-status" [class]="connectionStatusClass">
      <span class="status-icon">{{ connectionStatusIcon }}</span>
      <span class="status-text">{{ connectionStatusText }}</span>
    </div>
  `,
  styleUrls: ['./app.scss'],
})
export class AppComponent implements OnInit {
  title = 'BROOM IoT Process Mining';
  connectionStatusClass = 'disconnected';
  connectionStatusIcon = '⚫';
  connectionStatusText = 'Connecting...';

  // Execution status tracking
  lastExecutionStatus = 'idle';
  executionStatusIcon = '⚪';
  executionStatusText = 'Ready';
  lastExecutionResult: any = null;

  @ViewChild('nodeEditor') nodeEditorRef!: NodeEditorComponent;

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
      ],
    },
    {
      title: 'CAIRO XML Parsing',
      nodes: [
        {
          type: 'xml-trace-extractor',
          label: 'XML Trace Extractor',
          description: 'Extract traces from XML log structure (CAIRO format)',
          color: 'nord-red',
          hasInputs: true,
          hasOutputs: true,
        },
        {
          type: 'case-object-extractor',
          label: 'Case Object Extractor',
          description:
            'Extract case objects from trace data with lifecycle information',
          color: 'nord-purple',
          hasInputs: true,
          hasOutputs: true,
        },
        {
          type: 'stream-point-extractor',
          label: 'Stream Point Extractor',
          description: 'Extract stream points from trace data structure',
          color: 'nord-red',
          hasInputs: true,
          hasOutputs: true,
        },
        {
          type: 'iot-event-from-stream',
          label: 'IoT Event From Stream',
          description:
            'Create IoT events from stream point data with case context',
          color: 'nord-green',
          hasInputs: true,
          hasOutputs: true,
        },
        {
          type: 'trace-event-linker',
          label: 'Trace Event Linker',
          description: 'Link IoT events to their corresponding case objects',
          color: 'nord-orange',
          hasInputs: true,
          hasOutputs: true,
        },
      ],
    },
    {
      title: 'Generic XML Processing',
      nodes: [
        {
          type: 'xml-element-selector',
          label: 'XML Element Selector',
          description:
            'Select specific elements from XML structure using XPath',
          color: 'nord-red',
          hasInputs: true,
          hasOutputs: true,
        },
        {
          type: 'xml-attribute-extractor',
          label: 'XML Attribute Extractor',
          description: 'Extract attributes from XML elements',
          color: 'nord-yellow',
          hasInputs: true,
          hasOutputs: true,
        },
        {
          type: 'nested-list-processor',
          label: 'Nested List Processor',
          description: 'Process nested list structures from XML',
          color: 'nord-red',
          hasInputs: true,
          hasOutputs: true,
        },
      ],
    },
    {
      title: 'Stream Processing',
      nodes: [
        {
          type: 'lifecycle-calculator',
          label: 'Lifecycle Calculator',
          description: 'Calculate lifecycle start/end times from stream data',
          color: 'nord-yellow',
          hasInputs: true,
          hasOutputs: true,
        },
        {
          type: 'stream-aggregator',
          label: 'Stream Aggregator',
          description: 'Aggregate stream data by time windows or event groups',
          color: 'nord-red',
          hasInputs: true,
          hasOutputs: true,
        },
        {
          type: 'stream-event-creator',
          label: 'Stream Event Creator',
          description:
            'Create events from individual stream measurement points',
          color: 'nord-green',
          hasInputs: true,
          hasOutputs: true,
        },
        {
          type: 'stream-metadata-extractor',
          label: 'Stream Metadata Extractor',
          description: 'Extract metadata from stream measurement points',
          color: 'nord-yellow',
          hasInputs: true,
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
        {
          type: 'attribute-mapper',
          label: 'Attribute Mapper',
          description: 'Map and transform attributes from source data',
          color: 'nord-yellow',
          hasInputs: true,
          hasOutputs: true,
        },
      ],
    },
    {
      title: 'CORE Model Nodes',
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
        {
          type: 'dynamic-object-creator',
          label: 'Dynamic Object Creator',
          description: 'Create objects dynamically from attribute data',
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
        {
          type: 'context-based-linker',
          label: 'Context-Based Linker',
          description:
            'Create relationships based on shared context attributes',
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
    private pipelineService: PipelineService,
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Monitor backend connection status
    this.apiService.connectionStatus$.subscribe((isConnected) => {
      this.updateConnectionStatus(isConnected);
    });

    // Initial connection check
    this.apiService.checkConnection();
  }

  /**
   * Update connection status display.
   */
  private updateConnectionStatus(isConnected: boolean): void {
    if (isConnected) {
      this.connectionStatusClass = 'connected';
      this.connectionStatusIcon = '🟢';
      this.connectionStatusText = 'Backend Connected';
    } else {
      this.connectionStatusClass = 'disconnected';
      this.connectionStatusIcon = '🔴';
      this.connectionStatusText = 'Backend Disconnected';
    }
  }

  /**
   * Toggle the collapsed state of a category.
   */
  toggleCategory(category: NodeCategory): void {
    category.collapsed = !category.collapsed;
  }

  /**
   * Called when user starts dragging a library node.
   */
  onDragStart(event: DragEvent, nodeType: string): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', nodeType);
    }
  }

  /**
   * Prevent default so drop event can fire.
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const nodeType = event.dataTransfer?.getData('text/plain');
    console.log('Dropped node type:', nodeType);

    if (nodeType) {
      const canvasPosition = this.transformDropCoordinates(event);

      console.log('Screen coordinates:', {
        x: event.clientX,
        y: event.clientY,
      });
      console.log('Canvas coordinates:', canvasPosition);

      this.nodeService.addNode(nodeType, canvasPosition);
    }
  }

  /**
   * Transform drop event coordinates to canvas coordinates.
   */
  private transformDropCoordinates(event: DragEvent): { x: number; y: number } {
    try {
      const canvasPosition = this.nodeEditorRef?.transformScreenToCanvas(
        event.clientX,
        event.clientY
      );

      if (canvasPosition) {
        return {
          x: Math.round(canvasPosition.x),
          y: Math.round(canvasPosition.y),
        };
      }
    } catch (error) {
      console.warn('Failed to use canvas coordinate transformation:', error);
    }

    return this.manualCoordinateTransform(event);
  }

  /**
   * Manual coordinate transform fallback used only if the component helper fails.
   */
  private manualCoordinateTransform(event: DragEvent): {
    x: number;
    y: number;
  } {
    try {
      const root = (event.currentTarget as HTMLElement) || document.body;
      const canvasHost = root.querySelector('f-canvas') as HTMLElement | null;
      if (!canvasHost) return { x: event.offsetX || 0, y: event.offsetY || 0 };

      // Find deepest transformed descendant
      const all = Array.from(canvasHost.querySelectorAll<HTMLElement>('*'));
      all.push(canvasHost);
      let layer: HTMLElement = canvasHost;
      for (const el of all) {
        const t = getComputedStyle(el).transform;
        if (t && t !== 'none') layer = el;
      }

      const rect = layer.getBoundingClientRect();
      const m = getComputedStyle(layer).transform;
      const mm = m.match(/matrix\(([-0-9., e]+)\)/);
      if (!mm)
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };

      const [a, , , d, e, f] = mm[1].split(',').map((v) => Number(v.trim()));
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;

      return {
        x:
          (localX - (Number.isFinite(e) ? e : 0)) /
          (Number.isFinite(a) && a !== 0 ? a : 1),
        y:
          (localY - (Number.isFinite(f) ? f : 0)) /
          (Number.isFinite(d) && d !== 0 ? d : 1),
      };
    } catch {
      return { x: event.offsetX || 0, y: event.offsetY || 0 };
    }
  }

  /**
   * Check if pipeline can be executed.
   */
  canExecutePipeline(): boolean {
    const nodes = this.nodeService.getAllNodes();
    const connections = this.mappingService.connectionObserver$.getValue();
    return nodes.length > 0 && connections.length > 0;
  }

  /**
   * Execute pipeline with proper OCPM node handling and debugging.
   */
  executePipeline(): void {
    if (!this.canExecutePipeline()) {
      this.snackBar.open(
        'Pipeline cannot be executed. Please add nodes and connections.',
        'Close',
        {
          duration: 5000,
        }
      );
      return;
    }

    // Clear previous errors
    this.nodeService.clearAllErrors();


    const ocpmNodes = this.nodeService
      .getAllNodes()
      .filter((node) => node.type === 'ocpm-discovery');
    console.log(
      'Found OCPM nodes for loading state:',
      ocpmNodes.length,
      ocpmNodes.map((n) => n.id)
    );

    // Set loading state for OCPM Discovery nodes
    ocpmNodes.forEach((node) => {
      console.log(`Setting loading state for OCPM node: ${node.id}`);
      this.nodeService.updateNodeConfig(node.id, {
        imageLoading: true,
        processImageUrl: null,
        imageLoadError: false,
        imageErrorMessage: null,
      });
    });

    this.updateExecutionStatus('running', '⏳', 'Executing pipeline...');

    const nodes = this.nodeService.getAllNodes();
    const connections = this.mappingService.connectionObserver$.getValue();
    const pipeline = this.apiService.createPipelineDefinition(
      nodes,
      connections
    );

    console.log('Executing pipeline:', pipeline);

    this.apiService.executePipeline(pipeline).subscribe({
      next: (result) => {
        console.log('Pipeline execution completed:', result);
        this.lastExecutionResult = result;

        if (result.success) {
          this.updateExecutionStatus(
            'success',
            '✅',
            'Pipeline executed successfully'
          );

          this.nodeEditorRef.addProcessImage(result.results?.process_discovery || '');

          // Check for any failed nodes in the logs
          const failedNodes = this.nodeService.highlightErrorNodes(
            result.logs || []
          );

          if (failedNodes.length > 0) {
            this.updateExecutionStatus(
              'partial',
              '⚠️',
              `Completed with ${failedNodes.length} node(s) failed`
            );
          }
        } else {
          this.updateExecutionStatus(
            'failed',
            '❌',
            'Pipeline execution failed'
          );

          // Clear loading state for OCPM nodes on failure
          ocpmNodes.forEach((node) => {
            this.nodeService.updateNodeConfig(node.id, {
              imageLoading: false,
              imageLoadError: true,
              imageErrorMessage: 'Pipeline execution failed',
            });
          });

          // Highlight failed nodes
          this.nodeService.highlightErrorNodes(result.logs || []);
        }

        // Always show the log dialog
        this.showLogDialog(result);

        // Handle execution results
        if (result.results) {
          console.log('Pipeline results:', result.results);
          this.showResults(result.results);
        }
      },
      error: (error) => {
        console.error('Pipeline execution failed:', error);

        // Clear loading state for OCPM nodes on error
        ocpmNodes.forEach((node) => {
          this.nodeService.updateNodeConfig(node.id, {
            imageLoading: false,
            imageLoadError: true,
            imageErrorMessage: 'Pipeline execution failed',
          });
        });

        this.lastExecutionResult = {
          success: false,
          executionId: 'error',
          logs: [`Pipeline execution error: ${error}`],
          errors: [error],
          results: [],
        };

        this.updateExecutionStatus('failed', '❌', 'Execution failed');
        this.snackBar.open(`Pipeline execution failed: ${error}`, 'Close', {
          duration: 8000,
        });
      },
    });
  }

  /**
   * Enhanced showResults with debugging and proper UI updates.
   */
  private showResults(results: any): void {
    console.log('Execution results:', results);

    // Handle process discovery image URL
    if (results.process_discovery) {
      console.log(
        'Process discovery image available:',
        results.process_discovery
      );

      // Find the OCPM Discovery nodes
      const ocpmNodes = this.nodeService
        .getAllNodes()
        .filter((node) => node.type === 'ocpm-discovery');
      console.log(
        'Found OCPM nodes for image update:',
        ocpmNodes.length,
        ocpmNodes.map((n) => n.id)
      );

      if (ocpmNodes.length === 0) {
        console.warn('No OCPM Discovery nodes found to display the image!');
        this.snackBar.open(
          'Process model generated but no OCPM Discovery node found to display it',
          'Close',
          {
            duration: 5000,
          }
        );
        return;
      }

      ocpmNodes.forEach((node) => {
        console.log(
          `Updating OCPM node ${node.id} with image URL: ${results.process_discovery}`
        );

        // Update node configuration with image data
        this.nodeService.updateNodeConfig(node.id, {
          processImageUrl: results.process_discovery,
          generatedAt: new Date().toISOString(),
          imageLoading: false,
          imageLoadError: false,
        });

        // Verify the update took effect
        setTimeout(() => {
          const updatedNode = this.nodeService.getNodeById(node.id);
          console.log(
            'Updated node config after image URL set:',
            updatedNode?.config
          );
        }, 100);
      });

      this.snackBar.open(
        'Process model generated and displayed in OCPM Discovery node',
        'View Node',
        {
          duration: 5000,
        }
      );
    }

    // Handle discovery statistics if available
    if (results.discovery_stats) {
      console.log('Discovery statistics:', results.discovery_stats);

      // Update OCPM nodes with statistics
      const ocpmNodes = this.nodeService
        .getAllNodes()
        .filter((node) => node.type === 'ocpm-discovery');

      ocpmNodes.forEach((node) => {
        this.nodeService.updateNodeConfig(node.id, {
          discoveryStats: results.discovery_stats,
        });
      });
    }

    // Rest of existing showResults logic...
    if (results.core_model) {
      console.log('CORE Model created with:', results.core_components);
      this.snackBar.open('CORE Model successfully created', 'View Details', {
        duration: 5000,
      });
    }

    if (results.extended_table) {
      console.log('Extended table has', results.extended_table.length, 'rows');
      this.snackBar.open(
        `Extended table created with ${results.extended_table.length} rows`,
        'Close',
        {
          duration: 3000,
        }
      );
    }
  }

  /**
   * Show the log dialog with execution results.
   */
  private showLogDialog(executionResult: any): void {
    const failedNodes = this.nodeService.highlightErrorNodes(
      executionResult.logs || []
    );

    const dialogData: LogDialogData = {
      executionId: executionResult.executionId || 'unknown',
      logs: executionResult.logs || [],
      errors: executionResult.errors || [],
      success: executionResult.success,
      completedAt: executionResult.completedAt,
      failedNodes: failedNodes,
    };

    const dialogRef = this.dialog.open(LogDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      maxHeight: '80vh',
      data: dialogData,
      disableClose: false,
      autoFocus: true,
    });

    dialogRef.afterClosed().subscribe(() => {
      console.log('Log dialog closed');
    });
  }

  /**
   * Show logs from the last execution.
   */
  showLastExecutionLogs(): void {
    if (this.lastExecutionResult) {
      this.showLogDialog(this.lastExecutionResult);
    }
  }

  /**
   * Update execution status display.
   */
  private updateExecutionStatus(
    status: string,
    icon: string,
    text: string
  ): void {
    this.lastExecutionStatus = status;
    this.executionStatusIcon = icon;
    this.executionStatusText = text;
  }

  /**
   * Validate the current pipeline.
   */
  validatePipeline(): void {
    const nodes = this.nodeService.getAllNodes();
    const connections = this.mappingService.connectionObserver$.getValue();
    const pipeline = this.apiService.createPipelineDefinition(
      nodes,
      connections
    );

    this.apiService.validatePipeline(pipeline).subscribe({
      next: (result) => {
        if (result.isValid) {
          this.snackBar.open(
            'Pipeline is valid and ready for execution!',
            'Close',
            {
              duration: 3000,
            }
          );
        } else {
          const errorMessage =
            'Pipeline validation failed:\n' +
            result.errors.join('\n') +
            (result.warnings.length > 0
              ? '\n\nWarnings:\n' + result.warnings.join('\n')
              : '');

          this.snackBar.open(
            'Pipeline validation failed - see console for details',
            'Close',
            {
              duration: 5000,
            }
          );
          console.error(errorMessage);
        }
      },
      error: (error) => {
        this.snackBar.open(`Pipeline validation failed: ${error}`, 'Close', {
          duration: 5000,
        });
      },
    });
  }

  /**
   * Get pipeline statistics.
   */
  getPipelineStats(): any {
    const nodes = this.nodeService.getAllNodes();
    const connections = this.mappingService.connectionObserver$.getValue();

    return {
      nodes: nodes.length,
      connections: connections.length,
      dataSources: nodes.filter((n) =>
        ['read-file', 'mqtt-connector'].includes(n.type)
      ).length,
      processing: nodes.filter((n) =>
        [
          'column-selector',
          'attribute-selector',
          'data-filter',
          'data-mapper',
        ].includes(n.type)
      ).length,
      outputs: nodes.filter((n) =>
        ['table-output', 'export-ocel', 'ocpm-discovery'].includes(n.type)
      ).length,
      errors: this.nodeService.getErrorNodes().length,
    };
  }

  /**
   * Clear the entire pipeline.
   */
  clearPipeline(): void {
    if (confirm('Are you sure you want to clear the entire pipeline?')) {
      this.nodeService.clearAllNodes();
      this.mappingService.connectionObserver$.next([]);
      this.updateExecutionStatus('idle', '⚪', 'Ready');
      this.lastExecutionResult = null;
    }
  }

  /**
   * Export pipeline definition.
   */
  exportPipeline(): void {
    const nodes = this.nodeService.getAllNodes();
    const connections = this.mappingService.connectionObserver$.getValue();
    const pipeline = this.apiService.createPipelineDefinition(
      nodes,
      connections
    );

    const jsonString = JSON.stringify(pipeline, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    this.apiService.downloadFile(blob, `broom_pipeline_${Date.now()}.json`);
  }

  /**
   * Test backend connection.
   */
  testConnection(): void {
    this.apiService.checkConnection();
  }
}
