// src/app/components/mapping-toolbar/mapping-toolbar.component.ts

import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MappingService } from '../../services/mapping.service';
import { NodeService } from '../../services/node.service';
import { PipelineService } from '../../services/pipeline.service';

@Component({
  selector: 'app-mapping-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mapping-toolbar">
      <div class="toolbar-section">
        <div
          class="section-header"
          (click)="togglePipelineOperations()"
          [class.collapsed]="pipelineOperationsCollapsed">
          <span class="section-icon">{{ pipelineOperationsCollapsed ? '▶' : '▼' }}</span>
          <h3>Pipeline Operations</h3>
        </div>

        <div class="section-content" *ngIf="!pipelineOperationsCollapsed">
          <!-- Execute and Validate buttons - priority actions -->
          <div class="priority-actions">
            <button
              class="toolbar-button execute-button"
              (click)="executePipeline()"
              [disabled]="!canExecutePipeline()"
              title="Execute the current pipeline">
              <span class="button-icon">▶️</span>
              Execute Pipeline
            </button>
            <button
              class="toolbar-button validate-button"
              (click)="validatePipeline()"
              title="Validate pipeline connections">
              <span class="button-icon">✓</span>
              Validate
            </button>
          </div>

          <!-- File operations -->
          <div class="button-group">
            <!-- Dataset Upload -->
            <button
              class="toolbar-button upload-button"
              (click)="triggerDatasetInput()"
              title="Upload dataset to server">
              <span class="button-icon">📂</span>
              Upload Dataset
            </button>

            <!-- Save Pipeline -->
            <button
              class="toolbar-button save-button"
              (click)="openSaveDialog()"
              [disabled]="!hasContent()"
              title="Save current pipeline definition">
              <span class="button-icon">💾</span>
              Save Pipeline
            </button>

            <!-- Load Pipeline -->
            <button
              class="toolbar-button load-button"
              (click)="triggerPipelineInput()"
              title="Load pipeline from file">
              <span class="button-icon">📁</span>
              Load Pipeline
            </button>

            <!-- Clear Pipeline -->
            <button
              class="toolbar-button clear-button"
              (click)="clearPipeline()"
              [disabled]="!hasContent()"
              title="Clear all nodes and connections">
              <span class="button-icon">🗑️</span>
              Clear Pipeline
            </button>
          </div>


      <!-- Pipeline Statistics -->
      <div class="toolbar-section" *ngIf="hasContent()">
        <h3>Pipeline Statistics</h3>
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
            <span class="stat-label">Outputs:</span>
            <span class="stat-value">{{ pipelineStats.outputs }}</span>
          </div>
        </div>
      </div>

      <!-- Server Connection Status -->
      <div class="toolbar-section">
        <h3>Server Status</h3>
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
      </div>
      <!-- END OF COLLAPSABLE CONTENT -->
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
          <h4>Save Pipeline Definition</h4>
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
            <h5>Pipeline Summary</h5>
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

            <!-- Validation Status -->
            <div class="validation-status">
              <div class="validation-item" [class]="validationResult.isValid ? 'valid' : 'invalid'">
                <span class="validation-icon">{{ validationResult.isValid ? '✓' : '✗' }}</span>
                <span class="validation-text">
                  {{ validationResult.isValid ? 'Pipeline is valid' : 'Pipeline has errors' }}
                </span>
              </div>

              <!-- Show errors if any -->
              <div class="validation-errors" *ngIf="validationResult.errors.length > 0">
                <h6>Errors:</h6>
                <ul>
                  <li *ngFor="let error of validationResult.errors">{{ error }}</li>
                </ul>
              </div>

              <!-- Show warnings if any -->
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
              [disabled]="!saveForm.name.trim() || !validationResult.isValid">
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
  pipelineOperationsCollapsed = false;

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

  validationResult = {
    isValid: false,
    errors: [] as string[],
    warnings: [] as string[]
  };

  constructor(
    private mappingService: MappingService,
    private nodeService: NodeService,
    private pipelineService: PipelineService
  ) {
    this.updateStats();

    // Subscribe to changes to update stats
    this.nodeService.nodes$.subscribe(() => {
      this.updateStats();
    });

    this.mappingService.connectionObserver$.subscribe(() => {
      this.updateStats();
    });
  }

  /**
   * Toggle the Pipeline Operations section.
   *
   * :return: void
   */
  togglePipelineOperations(): void {
    this.pipelineOperationsCollapsed = !this.pipelineOperationsCollapsed;
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
      this.showStatus('Pipeline cannot be executed. Please add nodes and connections.', 'error');
      return;
    }

    try {
      const pipeline = this.pipelineService.createPipelineDefinition();
      console.log('Executing pipeline:', pipeline);

      this.showStatus('Pipeline execution started...', 'info');

      // Here you would send the pipeline to the backend for execution
      this.pipelineService.executePipeline(pipeline)
        .then(result => {
          console.log('Pipeline execution completed:', result);
          this.showStatus('Pipeline executed successfully!', 'success');
          // Handle execution results
        })
        .catch(error => {
          console.error('Pipeline execution failed:', error);
          this.showStatus('Pipeline execution failed: ' + error.message, 'error');
        });
    } catch (error) {
      this.showStatus('Failed to create pipeline definition: ' + error, 'error');
    }
  }

  /**
   * Validate the current pipeline for correctness.
   *
   * :return: void
   */
  validatePipeline(): void {
    const validationResult = this.pipelineService.validatePipeline();

    if (validationResult.isValid) {
      this.showStatus('Pipeline is valid and ready for execution!', 'success');
    } else {
      const errorMessage = 'Pipeline validation failed:\n' +
        validationResult.errors.join('\n') +
        (validationResult.warnings.length > 0 ? '\n\nWarnings:\n' + validationResult.warnings.join('\n') : '');
      this.showStatus(errorMessage, 'error');
    }

    // Update validation result for use in save dialog
    this.validationResult = validationResult;
  }

  /**
   * Check if there's content to save/clear.
   *
   * :return: boolean
   */
  hasContent(): boolean {
    return this.pipelineStats.nodes > 0 || this.pipelineStats.connections > 0;
  }

  /**
   * Update pipeline statistics.
   *
   * :return: void
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

    // Update validation
    this.validationResult = this.pipelineService.validatePipeline();
  }

  /**
   * Trigger dataset file input.
   *
   * :return: void
   */
  triggerDatasetInput(): void {
    this.datasetInput.nativeElement.click();
  }

  /**
   * Trigger pipeline file input.
   *
   * :return: void
   */
  triggerPipelineInput(): void {
    this.pipelineInput.nativeElement.click();
  }

  /**
   * Handle dataset file selection.
   *
   * :param event: File input change event
   * :return: void
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
   *
   * :param event: File input change event
   * :return: void
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
   *
   * :param file: File to upload
   * :return: void
   */
  private async uploadDataset(file: File): Promise<void> {
    try {
      this.showStatus('Uploading dataset...', 'info');

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('dataset', file);
      formData.append('fileName', file.name);
      formData.append('fileType', this.getFileType(file.name));

      // TODO: Implement actual upload to backend
      // await this.pipelineService.uploadDataset(formData);

      // Simulate upload for now
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.showStatus(`Dataset "${file.name}" uploaded successfully!`, 'success');

      // Update server status
      this.serverStatus = {
        type: 'connected',
        message: `Dataset "${file.name}" available on server`
      };

    } catch (error) {
      this.showStatus('Failed to upload dataset: ' + error, 'error');
    }
  }

  /**
   * Load pipeline from file.
   *
   * :param file: Pipeline file to load
   * :return: void
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
   *
   * :return: void
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
   *
   * :return: void
   */
  closeSaveDialog(): void {
    this.showSaveDialog = false;
    this.clearStatus();
  }

  /**
   * Save the pipeline definition.
   *
   * :return: void
   */
  savePipeline(): void {
    if (!this.saveForm.name.trim() || !this.validationResult.isValid) return;

    try {
      const pipelineDefinition = this.pipelineService.createPipelineDefinition();

      // Update metadata
      pipelineDefinition.name = this.saveForm.name.trim();
      pipelineDefinition.description = this.saveForm.description.trim();
      pipelineDefinition.version = this.saveForm.version.trim();

      // Download the pipeline
      const jsonString = JSON.stringify(pipelineDefinition, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.saveForm.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.showStatus('Pipeline definition saved successfully!', 'success');
      this.closeSaveDialog();

    } catch (error) {
      this.showStatus('Failed to save pipeline: ' + error, 'error');
    }
  }

  /**
   * Clear the entire pipeline.
   *
   * :return: void
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
   *
   * :return: void
   */
  async testServerConnection(): Promise<void> {
    this.isTestingConnection = true;

    try {
      // TODO: Implement actual server connection test
      // await this.pipelineService.testConnection();

      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1500));

      this.serverStatus = {
        type: 'connected',
        message: 'Connected to BROOM backend server'
      };

      this.showStatus('Server connection successful!', 'success');

    } catch (error) {
      this.serverStatus = {
        type: 'error',
        message: 'Failed to connect to backend server'
      };

      this.showStatus('Server connection failed: ' + error, 'error');
    } finally {
      this.isTestingConnection = false;
    }
  }

  /**
   * Get file type from filename.
   *
   * :param filename: Name of the file
   * :return: string file type
   */
  private getFileType(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop();
    const typeMap: Record<string, string> = {
      'csv': 'CSV',
      'json': 'JSON',
      'xml': 'XML',
      'xes': 'XES',
      'yaml': 'YAML',
      'yml': 'YAML'
    };
    return typeMap[extension || ''] || 'UNKNOWN';
  }

  /**
   * Show a status message.
   *
   * :param message: Message to show
   * :param type: Type of message (success, error, info)
   * :return: void
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
   *
   * :return: void
   */
  private clearStatus(): void {
    this.statusMessage = '';
    this.statusType = '';
  }
}
