import { Component, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MappingService } from '../../services/mapping.service';
import { NodeService } from '../../services/node.service';
import { PipelineService, ValidationResult } from '../../services/pipeline.service';
import { ApiService, ValidationResponse } from '../../services/api.service';
import { CAIROTemplateService } from '../../services/cairo-template.service';

@Component({
  selector: 'app-mapping-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mapping-toolbar">
      <!-- Priority Pipeline Operations -->
      <!-- <div class="toolbar-section">
        <h4>⚡ Pipeline Operations</h4>
        <div class="section-content">
          <div class="priority-actions">
            <button
              class="execute-button"
              (click)="executePipeline()"
              [disabled]="!canExecutePipeline()"
              title="Execute the current pipeline">
              <span class="button-icon">▶️</span>
              Execute Pipeline
            </button>
            <button
              class="validate-button"
              (click)="validatePipeline()"
              title="Validate pipeline connections">
              <span class="button-icon">✓</span>
              Validate
            </button>
          </div>
          <div class="single-column">
            <button
              class="toolbar-button"
              (click)="loadExamplePipeline()"
              title="Load example pipeline">
              <span class="button-icon">📋</span>
              Load Example Pipeline
            </button>
          </div>
        </div>
      </div> -->

      <!-- File Operations -->
      <div class="toolbar-section">
        <h4>📁 File Operations</h4>
        <div class="section-content">
          <div class="button-grid">
            <button
              class="toolbar-button upload-button"
              (click)="triggerDatasetInput()"
              title="Upload dataset to server">
              <span class="button-icon">📂</span>
              Upload Dataset
            </button>
            <button
              class="toolbar-button save-button"
              (click)="openSaveDialog()"
              [disabled]="!hasContent()"
              title="Save current pipeline definition">
              <span class="button-icon">💾</span>
              Save Pipeline
            </button>
            <button
              class="toolbar-button load-button"
              (click)="triggerPipelineInput()"
              title="Load pipeline from file">
              <span class="button-icon">📁</span>
              Load Pipeline
            </button>
            <button
              class="toolbar-button clear-button"
              (click)="clearPipeline()"
              [disabled]="!hasContent()"
              title="Clear all nodes and connections">
              <span class="button-icon">🗑️</span>
              Clear Pipeline
            </button>
          </div>
        </div>
      </div>

      <!-- Pipeline Statistics -->
      <!-- <div class="toolbar-section" *ngIf="hasContent()">
        <h4>📊 Pipeline Statistics</h4>
        <div class="section-content">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Nodes:</span>
              <span class="stat-value">{{ pipelineStats.nodes }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Connections:</span>
              <span class="stat-value">{{ pipelineStats.connections }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Data Sources:</span>
              <span class="stat-value">{{ pipelineStats.dataSources }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Processing:</span>
              <span class="stat-value">{{ pipelineStats.processing }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Outputs:</span>
              <span class="stat-value">{{ pipelineStats.outputs }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Errors:</span>
              <span class="stat-value">{{ getErrorCount() }}</span>
            </div>
          </div>
        </div>
      </div> -->

      <!-- Execution Status -->
      <!-- <div class="toolbar-section">
        <h4>🚀 Execution Status</h4>
        <div class="section-content">
          <div class="execution-status" [class]="getExecutionStatusClass()">
            <div class="status-indicator">
              <span class="status-icon">{{ getExecutionStatusIcon() }}</span>
              <span class="status-text">{{ getExecutionStatusText() }}</span>
            </div>
            <button
              *ngIf="hasExecutionResult()"
              class="toolbar-button view-logs-btn"
              (click)="showLastExecutionLogs()"
              title="View execution logs">
              <span class="button-icon">📋</span>
              View Execution Logs
            </button>
          </div>
        </div>
      </div> -->

      <!-- Server Connection Status -->
      <div class="toolbar-section">
        <h4>🔗 Server Status</h4>
        <div class="section-content">
          <div class="server-status">
            <div class="status-indicator" [class]="serverStatus.type">
              <span class="status-dot"></span>
              <span class="status-text">{{ serverStatus.message }}</span>
            </div>
            <button
              class="toolbar-button test-connection-button"
              (click)="testServerConnection()"
              [disabled]="isTestingConnection">
              <span class="button-icon">🔌</span>
              {{ isTestingConnection ? 'Testing...' : 'Test Connection' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Pipeline Validation Status -->
      <div class="toolbar-section" *ngIf="hasContent()">
        <h4>✓ Validation Status</h4>
        <div class="section-content">
          <div class="validation-status">
            <div class="validation-item" [class]="validationResult.isValid ? 'valid' : 'invalid'">
              <span class="validation-icon">{{ validationResult.isValid ? '✓' : '✗' }}</span>
              <span class="validation-text">
                {{ validationResult.isValid ? 'Pipeline is valid' : 'Pipeline has errors' }}
              </span>
            </div>

            <div class="validation-errors" *ngIf="validationResult.errors.length > 0">
              <h6>Errors:</h6>
              <ul>
                <li *ngFor="let error of validationResult.errors">{{ error }}</li>
              </ul>
            </div>

            <div class="validation-warnings" *ngIf="validationResult.warnings.length > 0">
              <h6>Warnings:</h6>
              <ul>
                <li *ngFor="let warning of validationResult.warnings">{{ warning }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Hidden file inputs -->
      <input
        #datasetInput
        type="file"
        accept=".csv,.json,.xml,.yaml,.yml,.xes"
        (change)="onDatasetSelected($event)"
        style="display: none;">

      <input
        #pipelineInput
        type="file"
        accept=".json"
        (change)="onPipelineSelected($event)"
        style="display: none;">

      <!-- Save Pipeline Dialog -->
      <div class="dialog-overlay" *ngIf="showSaveDialog" (click)="closeSaveDialog()">
        <div class="dialog-content" (click)="$event.stopPropagation()">
          <h4>💾 Save Pipeline Definition</h4>
          <div class="form-group">
            <label for="pipelineName">Pipeline Name *</label>
            <input
              id="pipelineName"
              type="text"
              [(ngModel)]="saveForm.name"
              placeholder="Enter pipeline name"
              class="form-input"
              maxlength="50">
          </div>
          <div class="form-group">
            <label for="pipelineDescription">Description</label>
            <textarea
              id="pipelineDescription"
              [(ngModel)]="saveForm.description"
              placeholder="Optional description"
              class="form-textarea"
              rows="3"
              maxlength="500"></textarea>
          </div>
          <div class="form-group">
            <label for="pipelineVersion">Version</label>
            <input
              id="pipelineVersion"
              type="text"
              [(ngModel)]="saveForm.version"
              placeholder="1.0.0"
              class="form-input"
              maxlength="20">
          </div>

          <!-- Pipeline Summary -->
          <div class="pipeline-summary">
            <h5>📊 Pipeline Summary</h5>
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">Total Nodes:</span>
                <span class="summary-value">{{ pipelineStats.nodes }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Data Sources:</span>
                <span class="summary-value">{{ pipelineStats.dataSources }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Processing Nodes:</span>
                <span class="summary-value">{{ pipelineStats.processing }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Output Nodes:</span>
                <span class="summary-value">{{ pipelineStats.outputs }}</span>
              </div>
            </div>

            <!-- Validation Status in Dialog -->
            <div class="validation-status">
              <div class="validation-item" [class]="validationResult.isValid ? 'valid' : 'invalid'">
                <span class="validation-icon">{{ validationResult.isValid ? '✓' : '✗' }}</span>
                <span class="validation-text">
                  {{ validationResult.isValid ? 'Pipeline is valid' : 'Pipeline has errors' }}
                </span>
              </div>

              <div class="validation-errors" *ngIf="validationResult.errors.length > 0">
                <h6>Errors:</h6>
                <ul>
                  <li *ngFor="let error of validationResult.errors">{{ error }}</li>
                </ul>
              </div>

              <div class="validation-warnings" *ngIf="validationResult.warnings.length > 0">
                <h6>Warnings:</h6>
                <ul>
                  <li *ngFor="let warning of validationResult.warnings">{{ warning }}</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="dialog-buttons">
            <button
              class="dialog-button cancel-button"
              (click)="closeSaveDialog()">
              Cancel
            </button>
            <button
              class="dialog-button save-button"
              (click)="savePipeline()"
              [disabled]="!saveForm.name.trim()">
              Save & Download
            </button>
          </div>
        </div>
      </div>

      <!-- Status Messages -->
      <div class="status-message" *ngIf="statusMessage" [class]="statusType">
        {{ statusMessage }}
      </div>
    </div>
  `,
  styleUrls: ['./mapping-toolbar.component.scss']
})
export class MappingToolbarComponent {
  @ViewChild('datasetInput') datasetInput!: ElementRef<HTMLInputElement>;
  @ViewChild('pipelineInput') pipelineInput!: ElementRef<HTMLInputElement>;

  showSaveDialog = false;
  statusMessage = '';
  statusType = '';
  isTestingConnection = false;

  saveForm = {
    name: '',
    description: '',
    version: '1.0.0'
  };

  pipelineStats = {
    nodes: 0,
    connections: 0,
    dataSources: 0,
    processing: 0,
    outputs: 0
  };

  serverStatus = {
    type: 'disconnected',
    message: 'Not connected to backend server'
  };

  validationResult: ValidationResponse = {
    isValid: false,
    errors: [],
    warnings: [],
    validatedAt: ''
  };

  constructor(
    private mappingService: MappingService,
    private nodeService: NodeService,
    private pipelineService: PipelineService,
    private apiService: ApiService,
    private cairoTemplateService: CAIROTemplateService,
    private cdr: ChangeDetectorRef
  ) {
    this.updateStats();

    // Subscribe to changes to update stats
    this.nodeService.nodes$.subscribe(() => {
      this.updateStats();
    });

    this.mappingService.connectionObserver$.subscribe(() => {
      this.updateStats();
    });

    // Monitor backend connection
    this.apiService.connectionStatus$.subscribe(isConnected => {
      this.serverStatus = {
        type: isConnected ? 'connected' : 'disconnected',
        message: isConnected ? 'Connected to BROOM backend' : 'Not connected to backend server'
      };
    });
  }

  /**
   * Check if pipeline can be executed (has nodes and connections).
   */
  canExecutePipeline(): boolean {
    const nodes = this.nodeService.getAllNodes();
    const connections = this.mappingService.connectionObserver$.getValue();
    return nodes.length > 0 && connections.length > 0;
  }

  /**
   * Execute the current pipeline with OCPM image display support.
   */
  executePipeline(): void {
    try {
      const nodes = this.nodeService.getAllNodes();
      const connections = this.mappingService.connectionObserver$.getValue();
      const pipeline = this.apiService.createPipelineDefinition(nodes, connections);

      console.log('Executing pipeline:', pipeline);

      // Set loading state for OCPM Discovery nodes
      const ocpmNodes = nodes.filter(node => node.type === 'ocpm-discovery');
      console.log('Found OCPM nodes for loading state:', ocpmNodes.length);

      ocpmNodes.forEach(node => {
        console.log(`Setting loading state for OCPM node: ${node.id}`);
        this.nodeService.updateNodeConfig(node.id, {
          imageLoading: true,
          processImageUrl: null,
          imageLoadError: false,
          imageErrorMessage: null
        });
      });

      this.showStatus('Pipeline execution started...', 'info');

      // Execute pipeline through API service
      this.apiService.executePipeline(pipeline).subscribe({
        next: (result) => {
          console.log('Pipeline execution completed:', result);

          if (result.success) {
            this.showStatus('Pipeline executed successfully!', 'success');

            // Handle execution results
            if (result.results) {
              console.log('Pipeline results:', result.results);
              this.handleExecutionResults(result.results);
            } else {
              // Clear loading state if no results
              ocpmNodes.forEach(node => {
                this.nodeService.updateNodeConfig(node.id, {
                  imageLoading: false,
                  imageLoadError: true,
                  imageErrorMessage: 'No results returned from execution'
                });
              });
            }
          } else {
            this.showStatus('Pipeline execution failed: ' + (result.errors?.join(', ') || 'Unknown error'), 'error');

            // Clear loading state for OCPM nodes on failure
            ocpmNodes.forEach(node => {
              this.nodeService.updateNodeConfig(node.id, {
                imageLoading: false,
                imageLoadError: true,
                imageErrorMessage: 'Pipeline execution failed'
              });
            });
          }
        },
        error: (error) => {
          console.error('Pipeline execution failed:', error);
          this.showStatus('Pipeline execution failed: ' + error, 'error');

          // Clear loading state for OCPM nodes on error
          const allNodes = this.nodeService.getAllNodes();
          const ocmpNodes = allNodes.filter(node => node.type === 'ocpm-discovery');

          ocmpNodes.forEach(node => {
            this.nodeService.updateNodeConfig(node.id, {
              imageLoading: false,
              imageLoadError: true,
              imageErrorMessage: 'Pipeline execution failed: ' + error
            });
          });
        }
      });
    } catch (error) {
      this.showStatus('Failed to create pipeline definition: ' + error, 'error');
    }
  }

  /**
   * Handle execution results with OCPM image display support.
   */
  private handleExecutionResults(results: any): void {
    console.log('Handling execution results:', results);

    // Handle process discovery image URL
    if (results.process_discovery) {
      console.log('Process discovery image available:', results.process_discovery);

      // Find the OCPM Discovery nodes
      const ocpmNodes = this.nodeService.getAllNodes().filter(node => node.type === 'ocpm-discovery');
      console.log('Found OCPM nodes for image update:', ocpmNodes.length);

      if (ocpmNodes.length === 0) {
        console.warn('No OCPM Discovery nodes found to display the image!');
        this.showStatus('Process model generated but no OCPM Discovery node found to display it', 'error');
        return;
      }

      ocpmNodes.forEach(node => {
        console.log(`Updating OCPM node ${node.id} with image URL: ${results.process_discovery}`);

        // Update node configuration with image data
        this.nodeService.updateNodeConfig(node.id, {
          processImageUrl: results.process_discovery,
          generatedAt: new Date().toISOString(),
          imageLoading: false,
          imageLoadError: false
        });
      });

      this.showStatus('Process model generated and displayed in OCPM Discovery node', 'success');
    }

    // Handle discovery statistics if available
    if (results.discovery_stats) {
      console.log('Discovery statistics:', results.discovery_stats);

      // Update OCPM nodes with statistics
      const ocpmNodes = this.nodeService.getAllNodes().filter(node => node.type === 'ocpm-discovery');

      ocpmNodes.forEach(node => {
        this.nodeService.updateNodeConfig(node.id, {
          discoveryStats: results.discovery_stats
        });
      });
    }

    // Handle CORE model creation
    if (results.core_model) {
      console.log('CORE Model created:', results.core_model);
      this.showStatus('CORE Model successfully created', 'success');
    }

    // Handle extended table
    if (results.extended_table) {
      console.log('Extended table has', results.extended_table.length, 'rows');
      this.showStatus(`Extended table created with ${results.extended_table.length} rows`, 'success');
    }

    // Force change detection to ensure UI updates
    this.cdr.detectChanges();
  }

  /**
   * Validate the current pipeline for correctness.
   */
  validatePipeline(): void {
    const nodes = this.nodeService.getAllNodes();
    const connections = this.mappingService.connectionObserver$.getValue();
    const pipeline = this.apiService.createPipelineDefinition(nodes, connections);

    this.apiService.validatePipeline(pipeline).subscribe({
      next: (result) => {
        if (result.isValid) {
          this.showStatus('Pipeline is valid and ready for execution!', 'success');
        } else {
          const errorMessage = 'Pipeline validation failed:\n' +
            result.errors.join('\n') +
            (result.warnings.length > 0 ? '\n\nWarnings:\n' + result.warnings.join('\n') : '');
          this.showStatus('Pipeline validation failed - check validation section for details', 'error');
          console.error(errorMessage);
        }

        // Update validation result for display
        this.validationResult = result;
      },
      error: (error) => {
        this.showStatus('Pipeline validation failed: ' + error, 'error');
        this.validationResult = {
          isValid: false,
          errors: [error],
          warnings: [],
          validatedAt: new Date().toISOString()
        };
      }
    });
  }

  /**
   * Check if there's content to save/clear.
   */
  hasContent(): boolean {
    return this.pipelineStats.nodes > 0 || this.pipelineStats.connections > 0;
  }

  /**
   * Get error count from node service.
   */
  getErrorCount(): number {
    try {
      return this.nodeService.getErrorNodes().length;
    } catch {
      return 0;
    }
  }

  /**
   * Get execution status from parent component or node service.
   */
  getExecutionStatusClass(): string {
    // This would typically come from a shared service or parent component
    return 'idle';
  }

  getExecutionStatusIcon(): string {
    return '⚪';
  }

  getExecutionStatusText(): string {
    return 'Ready';
  }

  hasExecutionResult(): boolean {
    // This would check if there are execution results available
    return false;
  }

  showLastExecutionLogs(): void {
    // This would show the execution logs
    console.log('Show execution logs');
  }

  /**
   * Update pipeline statistics.
   */
  private updateStats(): void {
    const nodes = this.nodeService.getAllNodes();
    const connections = this.mappingService.connectionObserver$.getValue();

    this.pipelineStats = {
      nodes: nodes.length,
      connections: connections.length,
      dataSources: nodes.filter(n => ['read-file', 'mqtt-connector'].includes(n.type)).length,
      processing: nodes.filter(n => ['column-selector', 'attribute-selector', 'data-filter', 'data-mapper'].includes(n.type)).length,
      outputs: nodes.filter(n => ['table-output', 'export-ocel', 'ocpm-discovery'].includes(n.type)).length
    };

    // Update validation using API if we have nodes
    if (nodes.length > 0) {
      const pipeline = this.apiService.createPipelineDefinition(nodes, connections);
      this.apiService.validatePipeline(pipeline).subscribe({
        next: (result) => {
          this.validationResult = result;
        },
        error: () => {
          // Fallback validation
          this.validationResult = {
            isValid: connections.length > 0,
            errors: connections.length === 0 ? ['Pipeline must have connections between nodes'] : [],
            warnings: [],
            validatedAt: new Date().toISOString()
          };
        }
      });
    } else {
      this.validationResult = {
        isValid: false,
        errors: ['Pipeline must contain at least one node'],
        warnings: [],
        validatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Trigger dataset file input.
   */
  triggerDatasetInput(): void {
    this.datasetInput.nativeElement.click();
  }

  /**
   * Trigger pipeline file input.
   */
  triggerPipelineInput(): void {
    this.pipelineInput.nativeElement.click();
  }

  /**
   * Handle dataset file selection.
   */
  onDatasetSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.uploadDataset(file);
    input.value = ''; // Reset input
  }

  /**
   * Handle pipeline file selection.
   */
  onPipelineSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      this.showStatus('Please select a JSON file', 'error');
      return;
    }

    this.loadPipeline(file);
    input.value = ''; // Reset input
  }

  /**
   * Upload dataset to server.
   */
  private async uploadDataset(file: File): Promise<void> {
    try {
      this.showStatus('Uploading dataset...', 'info');

      const fileType = this.apiService.getFileTypeFromName(file.name);

      this.apiService.uploadDataset(file, fileType).subscribe({
        next: (result) => {
          console.log('Dataset upload result:', result);
          if (result.success) {
            this.showStatus(`Dataset "${file.name}" uploaded successfully!`, 'success');

            // Update server status
            this.serverStatus = {
              type: 'connected',
              message: `Dataset "${file.name}" available on server`
            };
          } else {
            this.showStatus('Failed to upload dataset', 'error');
          }
        },
        error: (error) => {
          console.error('Dataset upload error:', error);
          this.showStatus('Failed to upload dataset: ' + error, 'error');
        }
      });

    } catch (error) {
      this.showStatus('Failed to upload dataset: ' + error, 'error');
    }
  }

  /**
   * Load pipeline from file.
   */
  private async loadPipeline(file: File): Promise<void> {
    try {
      this.showStatus('Loading pipeline...', 'info');

      await this.mappingService.uploadMapping(file);

      setTimeout(() => {
        this.showStatus('Pipeline loaded successfully!', 'success');
      }, 100);

    } catch (error) {
      this.showStatus('Failed to load pipeline: ' + error, 'error');
    }
  }

  /**
   * Open the save dialog.
   */
  openSaveDialog(): void {
    if (!this.hasContent()) return;

    this.updateStats();
    this.saveForm.name = `BROOM_Pipeline_${new Date().toISOString().split('T')[0]}`;
    this.saveForm.description = '';
    this.saveForm.version = '1.0.0';
    this.showSaveDialog = true;
  }

  /**
   * Close the save dialog.
   */
  closeSaveDialog(): void {
    this.showSaveDialog = false;
    this.clearStatus();
  }

  /**
   * Save the pipeline definition.
   */
  savePipeline(): void {
    try {
      const nodes = this.nodeService.getAllNodes();
      const connections = this.mappingService.connectionObserver$.getValue();
      const pipelineDefinition = this.apiService.createPipelineDefinition(nodes, connections);

      // Update metadata
      pipelineDefinition.name = this.saveForm.name.trim();
      pipelineDefinition.description = this.saveForm.description.trim();
      pipelineDefinition.version = this.saveForm.version.trim();

      // Download the pipeline
      const jsonString = JSON.stringify(pipelineDefinition, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      this.apiService.downloadFile(blob, `${this.saveForm.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`);

      this.showStatus('Pipeline definition saved successfully!', 'success');
      this.closeSaveDialog();

    } catch (error) {
      this.showStatus('Failed to save pipeline: ' + error, 'error');
    }
  }

  /**
   * Clear the entire pipeline.
   */
  clearPipeline(): void {
    if (!this.hasContent()) return;

    if (confirm('Are you sure you want to clear the entire pipeline? This action cannot be undone.')) {
      this.nodeService.clearAllNodes();
      this.mappingService.connectionObserver$.next([]);
      this.showStatus('Pipeline cleared', 'info');

      // Reset server status
      this.serverStatus = {
        type: 'disconnected',
        message: 'Not connected to backend server'
      };
    }
  }

  /**
   * Test connection to backend server.
   */
  async testServerConnection(): Promise<void> {
    this.isTestingConnection = true;

    try {
      this.apiService.healthCheck().subscribe({
        next: (result) => {
          console.log('Health check result:', result);
          this.serverStatus = {
            type: 'connected',
            message: 'Connected to BROOM backend server'
          };

          this.showStatus('Server connection successful!', 'success');
          this.isTestingConnection = false;
        },
        error: (error) => {
          console.error('Health check failed:', error);
          this.serverStatus = {
            type: 'error',
            message: 'Failed to connect to backend server'
          };

          this.showStatus('Server connection failed: ' + error, 'error');
          this.isTestingConnection = false;
        }
      });

    } catch (error) {
      this.serverStatus = {
        type: 'error',
        message: 'Failed to connect to backend server'
      };

      this.showStatus('Server connection failed: ' + error, 'error');
      this.isTestingConnection = false;
    }
  }

  /**
   * Load example pipeline.
   */
  loadExamplePipeline(): void {
    this.cairoTemplateService.loadTemplate('cairo-basic');
    this.showStatus('Loading example pipeline...', 'info');
  }

  /**
   * Show a status message.
   */
  private showStatus(message: string, type: string): void {
    this.statusMessage = message;
    this.statusType = type;

    // Auto-hide after 4 seconds
    setTimeout(() => {
      this.clearStatus();
    }, 4000);
  }

  /**
   * Clear the status message.
   */
  private clearStatus(): void {
    this.statusMessage = '';
    this.statusType = '';
  }
}
