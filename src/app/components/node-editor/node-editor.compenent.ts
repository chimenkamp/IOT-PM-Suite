// src/app/components/node-editor/node-editor.component.ts - Complete file with image display functionality

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FCanvasChangeEvent, FCanvasComponent, FCreateConnectionEvent, FFlowModule } from '@foblex/flow';
import { NodeService, FlowNode } from '../../services/node.service';
import { MappingService, Connection } from '../../services/mapping.service';
import { PipelineService } from '../../services/pipeline.service';
import { ApiService } from '../../services/api.service';
import { Observable } from 'rxjs';
import { BrowserService } from '@foblex/platform';
import { PointExtensions } from '@foblex/2d';

interface NodeStatus {
  type: 'ready' | 'error' | 'warning' | 'success';
  message: string;
}

@Component({
  selector: 'app-node-editor',
  standalone: true,
  imports: [CommonModule, FFlowModule, FormsModule],
  template: `
    <f-flow
      fDraggable
      (fLoaded)="onLoaded()"
      (fCreateConnection)="onCreateConnection($event)"
      (fNodeMoved)="onNodeMoved($event)">
      <f-canvas fZoom (fCanvasChange)="onCanvasChanged($event)">
        <f-connection-for-create fBehavior="floating"></f-connection-for-create>

        @for (connection of connections; track connection.to) {
          <f-connection
            [fReassignDisabled]="false"
            [fOutputId]="connection.from"
            [fInputId]="connection.to"
            fBehavior="floating"
          >
          </f-connection>
        }

        @for (node of this.nodes$ | async; track $index) {
          <div
            class="generic-node"
            [class.node-error]="node.hasError"
            [class.selected]="selectedNodeId === node.id"
            [class.has-image]="node.content.hasImageDisplay && node.config?.['processImageUrl']"
            fNode
            fDragHandle
            [fNodeId]="node.id"
            [fNodePosition]="{ x: node.position.x, y: node.position.y }"
            (click)="selectNode(node.id)"
          >
            <!-- Error Indicator -->
            @if (node.hasError) {
              <div class="error-badge" [title]="node.errorMessage || 'Node execution failed'">
                ⚠️
              </div>
            }

            <!-- Input ports -->
            @if (node.inputs.length > 0) {
              <div class="ports-container inputs">
                @for (input of node.inputs; track input.id) {
                  <div class="port-group">
                    <div
                      fNodeInput
                      [fInputId]="input.id"
                      [fInputMultiple]="true"
                      [class]="'port input-port ' + input.color"
                      [title]="input.label + ' (' + getDataTypeFromColor(input.color) + ')'"
                    ></div>
                    <span class="port-label">{{ input.label }}</span>
                  </div>
                }
              </div>
            }

            <!-- Node Header -->
            <div class="node-header" [class.has-error]="node.hasError">
              <h4 class="node-title">{{ node.content.title }}</h4>
              @if (node.content.description) {
                <p class="node-description">{{ node.content.description }}</p>
              }

              <!-- Status indicator for executable nodes -->
              @if (getNodeStatus(node); as status) {
                <div class="node-status">
                  <span [class]="'status-indicator ' + status.type">{{ status.message }}</span>
                </div>
              }

              <!-- Error message display -->
              @if (node.hasError && node.errorMessage) {
                <div class="error-message">
                  <div class="error-header">Execution Error:</div>
                  <div class="error-text">{{ node.errorMessage }}</div>
                </div>
              }
            </div>

            <!-- Node Configuration -->
            <div class="node-body">
              <!-- File Upload for file-based nodes -->
              @if (node.content.hasFileUpload) {
                <div class="config-section">
                  <label class="file-upload-label">
                    <input
                      type="file"
                      (change)="onFileSelected($event, node.id)"
                      [accept]="getFileAcceptTypes(node.type)"
                      class="file-input">
                    <span class="file-upload-button">📁 Choose File</span>
                  </label>
                  @if (node.config && node.config?.['fileName']) {
                    <div class="file-info">
                      <small>{{ node.config['fileName'] }}</small>
                    </div>
                  }
                </div>
              }

              <!-- Configuration Fields -->
              @if (node.content.inputFields && !node.content.displayOnly) {
                <div class="config-section">
                  @for (field of node.content.inputFields; track field.key) {
                    <div class="field-group">
                      <label [for]="node.id + '_' + field.key" class="field-label">
                        {{ field.label }}
                        @if (field.required) {
                          <span class="required-indicator">*</span>
                        }
                      </label>

                      <!-- Text Input -->
                      @if (field.type === 'text' || field.type === 'number') {
                        <input
                          [id]="node.id + '_' + field.key"
                          [type]="field.type"
                          [placeholder]="field.placeholder || ''"
                          [ngModel]="node.config?.[field.key] || ''"
                          (ngModelChange)="updateNodeConfig(node.id, field.key, $event)"
                          class="field-input"
                          [class.required-field]="field.required && !node.config?.[field.key]">
                      }

                      <!-- Select Dropdown -->
                      @if (field.type === 'select') {
                        <select
                          [id]="node.id + '_' + field.key"
                          [ngModel]="node.config?.[field.key] || ''"
                          (ngModelChange)="updateNodeConfig(node.id, field.key, $event)"
                          class="field-select"
                          [class.required-field]="field.required && !node.config?.[field.key]">
                          <option value="" disabled>Select {{ field.label }}</option>
                          @for (option of field.options; track option) {
                            <option [value]="option">{{ option }}</option>
                          }
                        </select>
                      }

                      <!-- Checkbox -->
                      @if (field.type === 'checkbox') {
                        <label class="checkbox-label">
                          <input
                            type="checkbox"
                            [id]="node.id + '_' + field.key"
                            [ngModel]="node.config?.[field.key] || false"
                            (ngModelChange)="updateNodeConfig(node.id, field.key, $event)"
                            class="field-checkbox">
                          <span class="checkbox-text">{{ field.label }}</span>
                        </label>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Display-only nodes with enhanced image support -->
              @if (node.content.displayOnly) {
                <div class="display-section" [class.has-image]="node.content.hasImageDisplay">
                  @if (node.content.status) {
                    <div class="status-display">
                      <span class="status-text">Status: {{ node.content.status }}</span>
                    </div>
                  }

                  <!-- Process Discovery Image Display -->
                  @if (node.content.hasImageDisplay) {
                    <div class="image-display">
                      @if (node.config?.['processImageUrl'] && !node.config?.['imageLoadError']) {
                        <div class="image-header">
                          <strong>Process Model:</strong>
                          <div class="image-actions">
                            <button
                              class="image-action-btn"
                              (click)="openImageInNewTab(node.config['processImageUrl'])"
                              title="Open image in new tab">
                              🔍 View Full
                            </button>
                            <button
                              class="image-action-btn"
                              (click)="downloadProcessImage(node.id)"
                              title="Download image">
                              💾 Download
                            </button>
                          </div>
                        </div>
                        <div class="image-container">

                          <img
                            [src]="node.config['processImageUrl']"
                            [alt]="'Process model for ' + node.content.title"
                            class="process-image zoom-available"
                            (load)="onImageLoaded(node.id)"
                            (error)="onImageError(node.id, $event)"
                            (click)="openImageInNewTab(node.config['processImageUrl'])"
                            [title]="'Click to enlarge - Generated at: ' + (node.config['generatedAt'] || 'Unknown time')">
                        </div>
                      } @else if (node.config?.['imageLoading']) {
                        <div class="image-container">
                          <div class="image-overlay">
                            <div class="loading-spinner"></div>
                            <span>Generating process model...</span>
                          </div>
                        </div>
                      } @else if (node.config?.['imageLoadError']) {
                        <div class="image-error-display">
                          <div class="error-icon">❌</div>
                          <div class="error-message">{{ node.config['imageErrorMessage'] || 'Failed to load process model image' }}</div>
                          <button
                            class="retry-button"
                            (click)="refreshProcessModel(node.id)"
                            title="Retry loading image">
                            🔄 Retry
                          </button>
                        </div>
                      } @else {
                        <div class="image-placeholder">
                          <div class="placeholder-icon">📊</div>
                          <div class="placeholder-text">Execute pipeline to generate process model</div>
                        </div>
                      }

                      <!-- Discovery Statistics -->
                      @if (node.config?.['discoveryStats'] && node.config?.['showStatistics']) {
                        <div class="discovery-stats">
                          <h6>Discovery Statistics:</h6>
                          <div class="stats-grid">
                            @for (stat of getDiscoveryStatsArray(node.config['discoveryStats']); track stat.label) {
                              <div class="stat-item">
                                <span class="stat-label">{{ stat.label }}:</span>
                                <span class="stat-value">{{ stat.value }}</span>
                              </div>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }

                  <!-- Results display area (existing) -->
                  @if (node.config && node.config?.['results']) {
                    <div class="results-display">
                      <div class="results-summary">
                        <strong>Results:</strong>
                        <pre>{{ formatResults(node.config['results']) }}</pre>
                      </div>
                    </div>
                  }

                  <!-- Execution logs (existing) -->
                  @if (node.config && node.config?.['logs']) {
                    <div class="logs-display">
                      <details class="logs-details">
                        <summary>Execution Logs ({{ node.config['logs'].length }})</summary>
                        <div class="logs-content">
                          @for (log of node.config['logs']; track $index) {
                            <div class="log-entry">{{ log }}</div>
                          }
                        </div>
                      </details>
                    </div>
                  }
                </div>
              }

              <!-- Node Actions -->
              @if (!node.content.displayOnly) {
                <div class="node-actions">
                  <button
                    class="action-button test-button"
                    (click)="testNode(node.id)"
                    [disabled]="!canTestNode(node)"
                    title="Test this node configuration">
                    🧪 Test
                  </button>
                  <button
                    class="action-button delete-button"
                    (click)="deleteNode(node.id)"
                    title="Delete this node">
                    🗑️ Delete
                  </button>
                </div>
                }
                 @if (node.content.displayOnly) {
                <div class="node-actions">
                  <button
                    class="action-button delete-button"
                    (click)="deleteNode(node.id)"
                    title="Delete this node">
                    🗑️ Delete
                  </button>
                </div>
                 }
            </div>

            <!-- Output ports -->
            @if (node.outputs.length > 0) {
              <div class="ports-container outputs">
                @for (output of node.outputs; track output.id) {
                  <div class="port-group">
                    <span class="port-label">{{ output.label }}</span>
                    <div
                      fNodeOutput
                      [fOutputMultiple]="true"
                      [fOutputId]="output.id"
                      [fCanBeConnectedInputs]="canConnectTo(output.id)"
                      [class]="'port output-port ' + output.color"
                      [title]="output.label + ' (' + getDataTypeFromColor(output.color) + ')'"
                    ></div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </f-canvas>

      <!-- Pipeline Status Panel -->
      @if (showStatusPanel) {
        <div class="pipeline-status-panel">
          <div class="status-header">
            <h3>Pipeline Status</h3>
            <button class="close-button" (click)="showStatusPanel = false">✕</button>
          </div>
          <div class="status-content">
            <div class="status-item">
              <span class="status-label">Nodes:</span>
              <span class="status-value">{{ currentNodes.length }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Connections:</span>
              <span class="status-value">{{ connections.length }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Validation:</span>
              <span [class]="'status-value ' + (pipelineValid ? 'valid' : 'invalid')">
                {{ pipelineValid ? 'Valid' : 'Invalid' }}
              </span>
            </div>
            <div class="status-item">
              <span class="status-label">Error Nodes:</span>
              <span [class]="'status-value ' + (getErrorNodeCount() > 0 ? 'invalid' : 'valid')">
                {{ getErrorNodeCount() }}
              </span>
            </div>
          </div>
          <!-- Debug section -->
          @if (showDebugPanel) {
            <div class="debug-section">
              <button class="action-button" (click)="clearAllErrors()">🔄 Clear Errors</button>
              <button class="action-button" (click)="resetPositions()">🔄 Reset Positions</button>
            </div>
          }
        </div>
      }
    </f-flow>
  `,
  styleUrls: ['./node-editor.component.scss']
})
export class NodeEditorComponent implements OnDestroy, OnInit {
  public nodes$!: Observable<FlowNode[]>;
  public currentNodes: FlowNode[] = [];
  public connections: Connection[] = [];
  public selectedNodeId: string | null = null;
  public showStatusPanel = false;
  public showDebugPanel = false;
  public pipelineValid = false;

  public readonly fCanvas = viewChild(FCanvasComponent);
  private readonly _fBrowser = inject(BrowserService);

  constructor(
    private nodeService: NodeService,
    private mappingService: MappingService,
    private pipelineService: PipelineService,
    private apiService: ApiService,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.nodes$ = this.nodeService.nodes$;

    this.nodes$.subscribe(nodes => {
      this.currentNodes = nodes;
      this.validatePipeline();
      this.changeDetectorRef.detectChanges();

      console.log('Nodes updated, current positions:',
        nodes.map(n => ({ id: n.id, position: n.position, hasError: n.hasError }))
      );
    });
  }

  ngOnInit(): void {
    this.mappingService.connectionObserver$.subscribe(connections => {
      this.connections = connections;
      this.validatePipeline();
      this.changeDetectorRef.detectChanges();
    });

    let canvas = this.fCanvas();
    if (canvas) {
      // Canvas is ready
    } else {
      console.warn('Canvas component not available');
    }
  }

  protected onLoaded(): void {
    this.fCanvas()?.fitToScreen(PointExtensions.initialize(100, 100), false);
    console.log('Canvas loaded, current nodes:', this.currentNodes.length);
  }

  protected onCanvasChanged(event: FCanvasChangeEvent): void {
    // Canvas change handling
  }

  /**
   * Handle node moved events to update positions in service.
   */
  public onNodeMoved(event: any): void {
    const nodeId = event.fNodeId;
    const newPosition = event.fNodePosition;

    if (nodeId && newPosition) {
      console.log(`Node ${nodeId} moved to:`, newPosition);

      this.nodeService.updateNodePosition(nodeId, {
        x: Number(newPosition.x),
        y: Number(newPosition.y)
      });
    }
  }

  public ngOnDestroy(): void {
    this._fBrowser.document.documentElement.style.removeProperty('--flow-scale');
  }

  public onCreateConnection(event: FCreateConnectionEvent): void {
    if (!event.fInputId) {
      return;
    }

    const newConnection: Connection = {
      from: event.fOutputId,
      to: event.fInputId
    };

    if (!this.isValidConnection(newConnection)) {
      console.warn('Invalid connection attempted:', newConnection);
      return;
    }

    this.connections.push(newConnection);
    this.mappingService.addConnection(newConnection);
    this.changeDetectorRef.detectChanges();
  }

  /**
   * Select a node for configuration.
   */
  public selectNode(nodeId: string): void {
    this.selectedNodeId = nodeId;
    this.changeDetectorRef.detectChanges();
  }

  /**
   * Update node configuration.
   */
  public updateNodeConfig(nodeId: string, key: string, value: any): void {
    const node = this.nodeService.getNodeById(nodeId);
    if (node) {
      const newConfig = { ...(node.config || {}), [key]: value };
      this.nodeService.updateNodeConfig(nodeId, newConfig);
    }
  }

  /**
   * Handle file selection for file upload nodes.
   */
  public onFileSelected(event: Event, nodeId: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.updateNodeConfig(nodeId, 'fileName', file.name);
      this.updateNodeConfig(nodeId, 'fileSize', file.size);
      this.updateNodeConfig(nodeId, 'fileType', file.type);
      this.updateNodeConfig(nodeId, 'file', file);

      const fileType = this.apiService.getFileTypeFromName(file.name);
      this.apiService.uploadDataset(file, fileType).subscribe({
        next: (result) => {
          console.log('File uploaded for node:', result);
          this.updateNodeConfig(nodeId, 'fileId', result.fileId);
          this.updateNodeConfig(nodeId, 'uploadStatus', 'success');
        },
        error: (error) => {
          console.error('File upload failed:', error);
          this.updateNodeConfig(nodeId, 'uploadStatus', 'error');
          this.updateNodeConfig(nodeId, 'uploadError', error);
        }
      });
    }
  }

  /**
   * Get file accept types for different node types.
   */
  public getFileAcceptTypes(nodeType: string): string {
    const acceptTypes: Record<string, string> = {
      'read-file': '.csv,.xml,.json,.yaml,.yml,.xes',
      'data-source': '.csv,.json,.txt'
    };
    return acceptTypes[nodeType] || '*';
  }

  /**
   * Get data type name from color code.
   */
  public getDataTypeFromColor(color: string): string {
    const colorMap: Record<string, string> = {
      'nord-blue': 'DataFrame',
      'nord-red': 'Series',
      'nord-yellow': 'Attribute',
      'nord-green': 'Event',
      'nord-purple': 'Object',
      'nord-orange': 'Relationship',
      'core-model': 'CORE Model'
    };
    return colorMap[color] || 'Unknown';
  }

  /**
   * Get node status for display.
   */
  public getNodeStatus(node: FlowNode): NodeStatus | null {
    // If node has an error, show error status
    if (node.hasError) {
      return {
        type: 'error',
        message: 'Execution failed'
      };
    }

    // Check if node is properly configured
    if (node.content.inputFields) {
      const missingRequired = node.content.inputFields
        .filter((field: any) => field.required && !node.config?.[field.key]);

      if (missingRequired.length > 0) {
        return {
          type: 'error',
          message: `Missing required: ${missingRequired.map((f: any) => f.label).join(', ')}`
        };
      }
    }

    // Check file upload nodes
    if (node.content.hasFileUpload && !node.config?.['fileName']) {
      return {
        type: 'warning',
        message: 'No file selected'
      };
    }

    // Check upload status
    if (node.config?.['uploadStatus'] === 'error') {
      return {
        type: 'error',
        message: 'File upload failed'
      };
    }

    // Check if node has proper connections
    const hasRequiredInputs = node.inputs.length === 0 ||
      node.inputs.some(input =>
        this.connections.some(conn => conn.to === input.id)
      );

    if (!hasRequiredInputs) {
      return {
        type: 'warning',
        message: 'Missing input connections'
      };
    }

    // Check test status
    if (node.config?.['testStatus'] === 'success') {
      return {
        type: 'success',
        message: 'Test passed'
      };
    }

    if (node.config?.['testStatus'] === 'error') {
      return {
        type: 'error',
        message: 'Test failed'
      };
    }

    // Special handling for image display nodes
    if (node.content.hasImageDisplay) {
      if (node.config?.['processImageUrl']) {
        return {
          type: 'success',
          message: 'Process model generated'
        };
      } else if (node.config?.['imageLoading']) {
        return {
          type: 'warning',
          message: 'Generating model...'
        };
      } else if (node.config?.['imageLoadError']) {
        return {
          type: 'error',
          message: 'Image generation failed'
        };
      }
    }

    return {
      type: 'ready',
      message: 'Ready'
    };
  }

  /**
   * Test a single node configuration.
   */
  public testNode(nodeId: string): void {
    const node = this.nodeService.getNodeById(nodeId);
    if (!node) return;

    console.log('Testing node:', node);

    this.apiService.testNode({
      id: node.id,
      type: node.type,
      config: node.config,
      inputs: node.inputs,
      outputs: node.outputs
    }).subscribe({
      next: (result) => {
        console.log('Node test result:', result);
        if (result.success) {
          this.updateNodeConfig(nodeId, 'testStatus', 'success');
          this.updateNodeConfig(nodeId, 'lastTested', new Date().toISOString());
          this.updateNodeConfig(nodeId, 'testMessage', result.message);
        } else {
          this.updateNodeConfig(nodeId, 'testStatus', 'error');
          this.updateNodeConfig(nodeId, 'testError', result.message);
        }
      },
      error: (error) => {
        console.error('Node test failed:', error);
        this.updateNodeConfig(nodeId, 'testStatus', 'error');
        this.updateNodeConfig(nodeId, 'testError', error);
      }
    });
  }

  /**
   * Check if a node can be tested.
   */
  public canTestNode(node: FlowNode): boolean {
    if (node.content.displayOnly) return false;

    if (node.content.inputFields) {
      const missingRequired = node.content.inputFields
        .filter((field: any) => field.required && !node.config?.[field.key]);
      return missingRequired.length === 0;
    }

    return true;
  }

  /**
   * Delete a node.
   */
  public deleteNode(nodeId: string): void {
    if (confirm('Are you sure you want to delete this node?')) {
      const nodeConnections = this.connections.filter(conn =>
        this.extractNodeIdFromPortId(conn.from) === nodeId ||
        this.extractNodeIdFromPortId(conn.to) === nodeId
      );

      nodeConnections.forEach(conn => {
        this.mappingService.removeConnection(conn);
      });

      this.nodeService.removeNode(nodeId);

      if (this.selectedNodeId === nodeId) {
        this.selectedNodeId = null;
      }
    }
  }

  /**
   * Format results for display.
   */
  public formatResults(results: any): string {
    if (typeof results === 'object') {
      return JSON.stringify(results, null, 2);
    }
    return String(results);
  }

  /**
   * Check which input ports can be connected to an output port.
   */
  public canConnectTo(outputId: string): string[] {
    const outputNode = this.currentNodes.find(node =>
      node.outputs.some(output => output.id === outputId)
    );

    if (!outputNode) return [];

    const outputPort = outputNode.outputs.find(output => output.id === outputId);
    if (!outputPort) return [];

    return this.currentNodes
      .flatMap(node => node.inputs)
      .filter(input => input.color === outputPort.color)
      .map(input => input.id);
  }

  /**
   * Toggle status panel visibility.
   */
  public toggleStatusPanel(): void {
    this.showStatusPanel = !this.showStatusPanel;
  }

  /**
   * Get count of nodes with errors.
   */
  public getErrorNodeCount(): number {
    return this.currentNodes.filter(node => node.hasError).length;
  }

  /**
   * Clear all errors from nodes.
   */
  public clearAllErrors(): void {
    this.nodeService.clearAllErrors();
  }

  /**
   * Get pipeline statistics.
   */
  public getPipelineStats(): any {
    return {
      totalNodes: this.currentNodes.length,
      totalConnections: this.connections.length,
      readyNodes: this.currentNodes.filter(node => this.getNodeStatus(node)?.type === 'ready').length,
      errorNodes: this.currentNodes.filter(node => this.getNodeStatus(node)?.type === 'error').length,
      warningNodes: this.currentNodes.filter(node => this.getNodeStatus(node)?.type === 'warning').length
    };
  }

  /**
   * Export pipeline as JSON.
   */
  public exportPipeline(): void {
    const pipeline = this.apiService.createPipelineDefinition(this.currentNodes, this.connections);
    const jsonString = JSON.stringify(pipeline, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    this.apiService.downloadFile(blob, `pipeline_${Date.now()}.json`);
  }

  /**
   * Validate pipeline and update status.
   */
  private validatePipeline(): void {
    if (this.currentNodes.length > 0) {
      const pipeline = this.apiService.createPipelineDefinition(this.currentNodes, this.connections);
      this.apiService.validatePipeline(pipeline).subscribe({
        next: (result) => {
          this.pipelineValid = result.isValid;
        },
        error: () => {
          const validation = this.pipelineService.validatePipeline();
          this.pipelineValid = validation.isValid;
        }
      });
    } else {
      this.pipelineValid = false;
    }
  }

  /**
   * Check if a connection is valid.
   */
  private isValidConnection(connection: Connection): boolean {
    const fromNode = this.currentNodes.find(node =>
      node.outputs.some(output => output.id === connection.from)
    );
    const toNode = this.currentNodes.find(node =>
      node.inputs.some(input => input.id === connection.to)
    );

    if (!fromNode || !toNode) return false;

    const fromPort = fromNode.outputs.find(output => output.id === connection.from);
    const toPort = toNode.inputs.find(input => input.id === connection.to);

    if (!fromPort || !toPort) return false;

    return fromPort.color === toPort.color;
  }

  /**
   * Extract node ID from port ID.
   */
  private extractNodeIdFromPortId(portId: string): string {
    const parts = portId.split('-');
    return parts.slice(0, 2).join('-');
  }

  /**
   * Clear all nodes and connections.
   */
  public clearAll(): void {
    if (confirm('Are you sure you want to clear everything?')) {
      this.nodeService.clearAllNodes();
      this.mappingService.connectionObserver$.next([]);
      this.selectedNodeId = null;
    }
  }

  /**
   * Fit canvas to screen.
   */
  public fitToScreen(): void {
    this.fCanvas()?.fitToScreen(PointExtensions.initialize(50, 50), true);
  }

  /**
   * Center the canvas view.
   */
  public centerView(): void {
    this.fCanvas()?.resetZoom();
  }

  public addProcessImage(img_url: string): void {
    console.log('Adding process image:', img_url);
  }

  /**
   * Find the element inside the canvas that actually carries the CSS transform.
   * We prefer the deepest element with a non-'none' transform.
   */
  private getTransformedCanvasLayer(): HTMLElement | null {
    const host = this.fCanvas()?.hostElement as HTMLElement | null;
    if (!host) return null;

    // Look for the deepest transformed descendant
    const all = Array.from(host.querySelectorAll<HTMLElement>('*'));
    // Include the host as a fallback
    all.push(host);

    let transformed: HTMLElement | null = null;
    for (const el of all) {
      const t = window.getComputedStyle(el).transform;
      if (t && t !== 'none') transformed = el;
    }
    return transformed || host;
  }

  /**
   * Parse a CSS matrix(...) string into {scaleX, scaleY, translateX, translateY}.
   */
  private parseCssMatrix(transform: string): { scaleX: number; scaleY: number; translateX: number; translateY: number } {
    // matrix(a, b, c, d, e, f)  =>  scaleX=a, scaleY=d, translateX=e, translateY=f
    const m = transform.match(/matrix\(([-0-9., e]+)\)/);
    if (!m) return { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0 };
    const [a, , , d, e, f] = m[1].split(',').map(v => Number(v.trim()));
    return {
      scaleX: Number.isFinite(a) ? a : 1,
      scaleY: Number.isFinite(d) ? d : 1,
      translateX: Number.isFinite(e) ? e : 0,
      translateY: Number.isFinite(f) ? f : 0,
    };
  }

  /**
   * Transform screen (client) coordinates to canvas world coordinates.
   * Works regardless of current zoom/pan.
   */
  public transformScreenToCanvas(screenX: number, screenY: number): { x: number; y: number } | null {
    try {
      const layer = this.getTransformedCanvasLayer();
      if (!layer) return null;

      // Use the rect of the transformed layer, not the <f-canvas> host.
      const rect = layer.getBoundingClientRect();
      const { scaleX, scaleY, translateX, translateY } = this.parseCssMatrix(getComputedStyle(layer).transform);

      // Coordinates relative to the transformed layer
      const localX = screenX - rect.left;
      const localY = screenY - rect.top;

      // Invert the affine transform
      const worldX = (localX - translateX) / (scaleX || 1);
      const worldY = (localY - translateY) / (scaleY || 1);

      return { x: worldX, y: worldY };
    } catch (err) {
      console.error('transformScreenToCanvas failed:', err);
      return null;
    }
  }

  /**
   * Get current canvas transformation info for debugging.
   */
  public getCanvasTransformation(): any {
    try {
      const canvas = this.fCanvas();
      if (!canvas) return null;

      const canvasElement = this.fCanvas()?.hostElement;
      if (!canvasElement) return null;

      const style = window.getComputedStyle(canvasElement);
      const rect = canvasElement.getBoundingClientRect();

      return {
        transform: style.transform,
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        },
        elementInfo: {
          offsetLeft: canvasElement.offsetLeft,
          offsetTop: canvasElement.offsetTop,
          scrollLeft: canvasElement.scrollLeft,
          scrollTop: canvasElement.scrollTop
        }
      };
    } catch (error) {
      console.error('Error getting canvas transformation:', error);
      return null;
    }
  }

  /**
   * Reset all node positions to a grid layout.
   */
  public resetPositions(): void {
    if (confirm('Reset all node positions to a grid layout?')) {
      this.mappingService.resetNodePositions();
    }
  }

  // ============ IMAGE DISPLAY METHODS ============

  /**
   * Open image in new tab for full-size viewing.
   */
  public openImageInNewTab(imageUrl: string): void {
    if (imageUrl) {
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
    }
  }

  /**
   * Handle successful image loading.
   */
  public onImageLoaded(nodeId: string): void {
    console.log(`Process image loaded successfully for node ${nodeId}`);
    this.updateNodeConfig(nodeId, 'imageLoading', false);
    this.updateNodeConfig(nodeId, 'imageLoadError', false);
  }

  /**
   * Handle image loading errors.
   */
  public onImageError(nodeId: string, event: Event): void {
    console.error(`Failed to load process image for node ${nodeId}:`, event);
    this.updateNodeConfig(nodeId, 'imageLoading', false);
    this.updateNodeConfig(nodeId, 'imageLoadError', true);
    this.updateNodeConfig(nodeId, 'imageErrorMessage', 'Failed to load process model image');
  }

  public forceUIUpdate(): void {
    this.changeDetectorRef.detectChanges();
  }

  /**
   * Convert discovery statistics object to array for template iteration.
   */
  public getDiscoveryStatsArray(stats: any): Array<{label: string, value: string}> {
    if (!stats || typeof stats !== 'object') {
      return [];
    }

    const statsArray = [];

    // Common statistics that might be returned
    const statLabels: Record<string, string> = {
      'nodes': 'Nodes',
      'edges': 'Edges',
      'activities': 'Activities',
      'cases': 'Cases',
      'events': 'Events',
      'objects': 'Objects',
      'relationships': 'Relationships',
      'traces': 'Traces',
      'executionTime': 'Execution Time',
      'algorithm': 'Algorithm Used',
      'noiseFiltered': 'Noise Filtered'
    };

    for (const [key, value] of Object.entries(stats)) {
      const label = statLabels[key] || key.charAt(0).toUpperCase() + key.slice(1);
      statsArray.push({
        label,
        value: typeof value === 'number' ? value.toLocaleString() : String(value)
      });
    }

    return statsArray;
  }

  /**
   * Download the process model image.
   */
  public downloadProcessImage(nodeId: string): void {
    const node = this.getNodeById(nodeId);
    const imageUrl = node?.config?.['processImageUrl'];

    if (!imageUrl) {
      console.warn('No image URL available for download');
      return;
    }

    // Create a temporary link to download the image
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `process_model_${nodeId}_${Date.now()}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Refresh the process model by re-executing the discovery node.
   */
  public refreshProcessModel(nodeId: string): void {
    const node = this.getNodeById(nodeId);
    if (!node) return;

    // Set loading state
    this.updateNodeConfig(nodeId, 'imageLoading', true);
    this.updateNodeConfig(nodeId, 'processImageUrl', null);

    // Clear previous error states
    this.updateNodeConfig(nodeId, 'imageLoadError', false);
    this.updateNodeConfig(nodeId, 'imageErrorMessage', null);

    console.log('Process model refresh requested for node:', nodeId);
  }

  /**
   * Helper method to get node by ID.
   */
  private getNodeById(nodeId: string): FlowNode | undefined {
    return this.currentNodes.find(node => node.id === nodeId);
  }
}
