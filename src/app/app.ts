import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { FFlowModule } from '@foblex/flow';
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
        <!-- Header -->
        <div class="sidebar-header">
          <h2>BROOM: IoT Process Mining</h2>
          <p>
            <strong>B</strong>ox fo<strong>r</strong> I<strong>O</strong>T-Enhanced Pr<strong>o</strong>cess <strong>M</strong>ining
          </p>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <button
            class="quick-action-btn execute-btn"
            (click)="executePipeline()"
            [disabled]="!canExecutePipeline()"
            title="Execute the current pipeline">
            <span>▶️</span>
            Execute
          </button>
          <button
            class="quick-action-btn validate-btn"
            (click)="validatePipeline()"
            title="Validate pipeline connections">
            <span>✓</span>
            Validate
          </button>
        </div>

        <!-- Sidebar Content with Tabs -->
        <div class="sidebar-content">
          <!-- Tab Navigation -->
          <div class="sidebar-tabs">
            <button
              class="sidebar-tab"
              [class.active]="activeTab === 'nodes'"
              (click)="setActiveTab('nodes')">
              📦 Nodes
            </button>
            <button
              class="sidebar-tab"
              [class.active]="activeTab === 'tools'"
              (click)="setActiveTab('tools')">
              🔧 Tools
            </button>
            <button
              class="sidebar-tab"
              [class.active]="activeTab === 'status'"
              (click)="setActiveTab('status')">
              📊 Status
            </button>
          </div>

          <!-- Tab Content -->
          <div class="tab-content">
            <!-- Nodes Tab -->
            <div class="tab-panel" [class.active]="activeTab === 'nodes'">
              <div class="node-library">
                @for (category of nodeCategories; track category.title) {
                <div class="category-section">
                  <div
                    class="category-header"
                    (click)="toggleCategory(category)">
                    <span class="category-icon" [class.collapsed]="category.collapsed">▼</span>
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
                      [title]="node.description">
                      <div class="node-preview" [class]="'node-preview-' + node.color">
                        <div class="node-label">{{ node.label }}</div>
                        <div class="node-ports">
                          @if (node.hasInputs) {
                          <div class="port" [class]="node.color"></div>
                          }
                          @if (node.hasOutputs) {
                          <div class="port" [class]="node.color"></div>
                          }
                        </div>
                      </div>
                    </div>
                    }
                  </div>
                  }
                </div>
                }
              </div>
            </div>

            <!-- Tools Tab -->
            <div class="tab-panel" [class.active]="activeTab === 'tools'">
              <!-- Integration of Mapping Toolbar Component -->
              <app-mapping-toolbar></app-mapping-toolbar>
            </div>

            <!-- Status Tab -->
            <div class="tab-panel" [class.active]="activeTab === 'status'">
              <div class="toolbar-content">
                <!-- Pipeline Statistics -->
                <div class="toolbar-section">
                  <h4>📊 Pipeline Statistics</h4>
                  <div class="section-content">
                    <div class="status-grid">
                      <div class="status-item">
                        <span class="status-label">Nodes:</span>
                        <span class="status-value">{{ getPipelineStats().nodes }}</span>
                      </div>
                      <div class="status-item">
                        <span class="status-label">Connections:</span>
                        <span class="status-value">{{ getPipelineStats().connections }}</span>
                      </div>
                      <div class="status-item">
                        <span class="status-label">Sources:</span>
                        <span class="status-value">{{ getPipelineStats().dataSources }}</span>
                      </div>
                      <div class="status-item">
                        <span class="status-label">Outputs:</span>
                        <span class="status-value">{{ getPipelineStats().outputs }}</span>
                      </div>
                      <div class="status-item">
                        <span class="status-label">Processing:</span>
                        <span class="status-value">{{ getPipelineStats().processing }}</span>
                      </div>
                      <div class="status-item">
                        <span class="status-label">Errors:</span>
                        <span class="status-value">{{ getPipelineStats().errors }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Connection Status -->
                <div class="toolbar-section">
                  <h4>🔗 Connection Status</h4>
                  <div class="section-content">
                    <div class="connection-indicator" [class]="connectionStatusClass">
                      <span class="status-dot"></span>
                      <span>{{ connectionStatusText }}</span>
                    </div>
                  </div>
                </div>

                <!-- Data Types Legend -->
                <div class="toolbar-section">
                  <h4>🎨 Data Types</h4>
                  <div class="section-content">
                    <div class="status-grid">
                      <div class="status-item">
                        <div class="port nord-blue"></div>
                        <span class="status-label">DataFrame</span>
                      </div>
                      <div class="status-item">
                        <div class="port nord-red"></div>
                        <span class="status-label">Series</span>
                      </div>
                      <div class="status-item">
                        <div class="port nord-yellow"></div>
                        <span class="status-label">Attribute</span>
                      </div>
                      <div class="status-item">
                        <div class="port nord-green"></div>
                        <span class="status-label">Events</span>
                      </div>
                      <div class="status-item">
                        <div class="port nord-purple"></div>
                        <span class="status-label">Objects</span>
                      </div>
                      <div class="status-item">
                        <div class="port nord-orange"></div>
                        <span class="status-label">Relations</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Editor Area -->
      <div class="editor-container">
        <div class="flow-editor" (drop)="onDrop($event)" (dragover)="onDragOver($event)">
          <div class="grid-background"></div>
          <app-node-editor #nodeEditor></app-node-editor>
        </div>
      </div>

      <!-- Floating Toolbar (Optional quick actions) -->
      <div class="floating-toolbar">
        <button class="floating-btn" (click)="executePipeline()"
                [disabled]="!canExecutePipeline()" title="Execute">
          ▶️
        </button>
        <button class="floating-btn" (click)="validatePipeline()" title="Validate">
          ✓
        </button>
        <button class="floating-btn" (click)="clearPipeline()"
                [disabled]="!hasContent()" title="Clear">
          🗑️
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./app.scss'],
})
export class AppComponent implements OnInit {
  title = 'BROOM IoT Process Mining';
  connectionStatusClass = 'disconnected';
  connectionStatusIcon = '⚫';
  connectionStatusText = 'Connecting...';

  // Tab management
  activeTab: 'nodes' | 'tools' | 'status' = 'nodes';

  // Execution status tracking
  lastExecutionStatus = 'idle';
  executionStatusIcon = '⚪';
  executionStatusText = 'Ready';
  lastExecutionResult: any = null;

  @ViewChild('nodeEditor') nodeEditorRef!: NodeEditorComponent;

  nodeCategories: NodeCategory[] = [
    {
      title: 'Data Input & Loading',
      collapsed: false,
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
      collapsed: true,
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
          description: 'Extract case objects from trace data with lifecycle information',
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
          description: 'Create IoT events from stream point data with case context',
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
      title: 'Data Processing',
      collapsed: true,
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
      title: 'CORE Model',
      collapsed: true,
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
      collapsed: true,
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
   * Set the active tab in the sidebar.
   */
  setActiveTab(tab: 'nodes' | 'tools' | 'status'): void {
    this.activeTab = tab;
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
   * Check if there's content in the pipeline.
   */
  hasContent(): boolean {
    const stats = this.getPipelineStats();
    return stats.nodes > 0 || stats.connections > 0;
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

    if (nodeType) {
      const canvasPosition = this.transformDropCoordinates(event);
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
   * Manual coordinate transform fallback.
   */
  private manualCoordinateTransform(event: DragEvent): { x: number; y: number } {
    try {
      const root = (event.currentTarget as HTMLElement) || document.body;
      const canvasHost = root.querySelector('f-canvas') as HTMLElement | null;
      if (!canvasHost) return { x: event.offsetX || 0, y: event.offsetY || 0 };

      const rect = canvasHost.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
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
   * Execute pipeline.
   */
  executePipeline(): void {
    if (!this.canExecutePipeline()) {
      this.snackBar.open('Pipeline cannot be executed. Please add nodes and connections.', 'Close', {
        duration: 5000,
      });
      return;
    }

    this.nodeService.clearAllErrors();
    this.updateExecutionStatus('running', '⏳', 'Executing pipeline...');

    const nodes = this.nodeService.getAllNodes();
    const connections = this.mappingService.connectionObserver$.getValue();
    const pipeline = this.apiService.createPipelineDefinition(nodes, connections);

    this.apiService.executePipeline(pipeline).subscribe({
      next: (result) => {
        this.lastExecutionResult = result;

        if (result.success) {
          this.updateExecutionStatus('success', '✅', 'Pipeline executed successfully');
          const failedNodes = this.nodeService.highlightErrorNodes(result.logs || []);
          if (failedNodes.length > 0) {
            this.updateExecutionStatus('partial', '⚠️', `Completed with ${failedNodes.length} node(s) failed`);
          }
        } else {
          this.updateExecutionStatus('failed', '❌', 'Pipeline execution failed');
          this.nodeService.highlightErrorNodes(result.logs || []);
        }

        // this.showLogDialog(result);
        if (result.results) {
          this.showResults(result.results);
        }
      },
      error: (error) => {
        console.error('Pipeline execution failed:', error);
        this.updateExecutionStatus('failed', '❌', 'Execution failed');
        this.snackBar.open(`Pipeline execution failed: ${error}`, 'Close', {
          duration: 8000,
        });
      },
    });
  }

  /**
   * Validate pipeline.
   */
  validatePipeline(): void {
    const nodes = this.nodeService.getAllNodes();
    const connections = this.mappingService.connectionObserver$.getValue();
    const pipeline = this.apiService.createPipelineDefinition(nodes, connections);

    this.apiService.validatePipeline(pipeline).subscribe({
      next: (result) => {
        if (result.isValid) {
          this.snackBar.open('Pipeline is valid and ready for execution!', 'Close', {
            duration: 3000,
          });
        } else {
          const errorMessage = 'Pipeline validation failed:\n' +
            result.errors.join('\n') +
            (result.warnings.length > 0 ? '\n\nWarnings:\n' + result.warnings.join('\n') : '');

          this.snackBar.open('Pipeline validation failed - see console for details', 'Close', {
            duration: 5000,
          });
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
   * Show execution results.
   */
  private showResults(results: any): void {
    console.log('Execution results:', results);

    if (results.process_discovery) {
      const ocpmNodes = this.nodeService.getAllNodes().filter(node => node.type === 'ocpm-discovery');

      ocpmNodes.forEach(node => {
        this.nodeService.updateNodeConfig(node.id, {
          processImageUrl: results.process_discovery,
          generatedAt: new Date().toISOString(),
          imageLoading: false,
          imageLoadError: false,
        });
      });

      this.snackBar.open('Process model generated and displayed in OCPM Discovery node', 'View Node', {
        duration: 5000,
      });
    }

    if (results.core_model) {
      this.snackBar.open('CORE Model successfully created', 'View Details', {
        duration: 5000,
      });
    }
  }

  /**
   * Show log dialog.
   */
  private showLogDialog(executionResult: any): void {
    const failedNodes = this.nodeService.highlightErrorNodes(executionResult.logs || []);

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
  }

  /**
   * Show logs from last execution.
   */
  showLastExecutionLogs(): void {
    if (this.lastExecutionResult) {
      this.showLogDialog(this.lastExecutionResult);
    }
  }

  /**
   * Update execution status.
   */
  private updateExecutionStatus(status: string, icon: string, text: string): void {
    this.lastExecutionStatus = status;
    this.executionStatusIcon = icon;
    this.executionStatusText = text;
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
      dataSources: nodes.filter(n => ['read-file', 'mqtt-connector'].includes(n.type)).length,
      processing: nodes.filter(n => ['column-selector', 'attribute-selector', 'data-filter', 'data-mapper'].includes(n.type)).length,
      outputs: nodes.filter(n => ['table-output', 'export-ocel', 'ocpm-discovery'].includes(n.type)).length,
      errors: this.nodeService.getErrorNodes().length,
    };
  }

  /**
   * Clear pipeline.
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
   * Export pipeline.
   */
  exportPipeline(): void {
    const nodes = this.nodeService.getAllNodes();
    const connections = this.mappingService.connectionObserver$.getValue();
    const pipeline = this.apiService.createPipelineDefinition(nodes, connections);

    const jsonString = JSON.stringify(pipeline, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    this.apiService.downloadFile(blob, `broom_pipeline_${Date.now()}.json`);
  }

  /**
   * Test connection.
   */
  testConnection(): void {
    this.apiService.checkConnection();
  }

  /**
   * Upload dataset.
   */
  uploadDataset(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json,.xml,.yaml,.yml';

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        // Handle file upload logic here
        this.snackBar.open(`Selected file: ${file.name}`, 'Close', { duration: 3000 });
      }
    };

    input.click();
  }

  /**
   * Load pipeline.
   */
  loadPipeline(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        // Handle pipeline loading logic here
        this.snackBar.open(`Loading pipeline: ${file.name}`, 'Close', { duration: 3000 });
      }
    };

    input.click();
  }

  /**
   * Load example pipeline.
   */
  loadExamplePipeline(): void {
    // Load example pipeline logic
    this.snackBar.open('Loading example pipeline...', 'Close', { duration: 3000 });
  }
}
