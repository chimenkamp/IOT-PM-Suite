// src/app/components/mapping-toolbar/mapping-toolbar.component.ts

import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MappingService } from '../../services/mapping.service';
import { NodeService } from '../../services/node.service';

@Component({
  selector: 'app-mapping-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mapping-toolbar">
      <div class="toolbar-section">
        <h3>Mapping Operations</h3>
        <div class="button-group">
          <button
            class="toolbar-button save-button"
            (click)="openSaveDialog()"
            [disabled]="!hasContent()"
            title="Save current mapping">
            <span class="button-icon">💾</span>
            Save Mapping
          </button>

          <button
            class="toolbar-button load-button"
            (click)="triggerFileInput()"
            title="Load mapping from file">
            <span class="button-icon">📁</span>
            Load Mapping
          </button>

          <button
            class="toolbar-button clear-button"
            (click)="clearMapping()"
            [disabled]="!hasContent()"
            title="Clear all nodes and connections">
            <span class="button-icon">🗑️</span>
            Clear All
          </button>
        </div>
      </div>

      <!-- Hidden file input -->
      <input
        #fileInput
        type="file"
        accept=".json"
        (change)="onFileSelected($event)"
        style="display: none;">

      <!-- Save Dialog -->
      <div class="dialog-overlay" *ngIf="showSaveDialog" (click)="closeSaveDialog()">
        <div class="dialog-content" (click)="$event.stopPropagation()">
          <h4>Save Mapping</h4>
          <div class="form-group">
            <label for="mappingName">Mapping Name *</label>
            <input
              id="mappingName"
              type="text"
              [(ngModel)]="saveForm.name"
              placeholder="Enter mapping name"
              class="form-input"
              maxlength="50">
          </div>
          <div class="form-group">
            <label for="mappingDescription">Description</label>
            <textarea
              id="mappingDescription"
              [(ngModel)]="saveForm.description"
              placeholder="Optional description"
              class="form-textarea"
              rows="3"
              maxlength="200"></textarea>
          </div>
          <div class="mapping-stats">
            <div class="stat-item">
              <span class="stat-label">Nodes:</span>
              <span class="stat-value">{{ mappingStats.nodes }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Connections:</span>
              <span class="stat-value">{{ mappingStats.connections }}</span>
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
              (click)="saveMapping()"
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
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  showSaveDialog = false;
  statusMessage = '';
  statusType = '';

  saveForm = {
    name: '',
    description: ''
  };

  mappingStats = {
    nodes: 0,
    connections: 0
  };

  constructor(
    private mappingService: MappingService,
    private nodeService: NodeService
  ) {}

  /**
   * Check if there's content to save/clear.
   *
   * :return: boolean
   */
  hasContent(): boolean {
    const nodeCount = this.nodeService.getAllNodes().length;
    const connectionCount = this.mappingService.connectionObserver$.getValue().length;
    return nodeCount > 0 || connectionCount > 0;
  }

  /**
   * Get current counts for display.
   *
   * :return: Object with counts
   */
  private getCounts(): { nodes: number, connections: number } {
    return {
      nodes: this.nodeService.getAllNodes().length,
      connections: this.mappingService.connectionObserver$.getValue().length
    };
  }

  /**
   * Open the save dialog and update stats.
   *
   * :return: void
   */
  openSaveDialog(): void {
    if (!this.hasContent()) return;

    this.mappingStats = this.getCounts();
    this.saveForm.name = `mapping_${new Date().toISOString().split('T')[0]}`;
    this.saveForm.description = '';
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
   * Save and download the mapping.
   *
   * :return: void
   */
  saveMapping(): void {
    if (!this.saveForm.name.trim()) return;

    try {
      this.mappingService.downloadMapping(
        this.saveForm.name.trim(),
        this.saveForm.description.trim()
      );

      this.showStatus('Mapping saved successfully!', 'success');
      this.closeSaveDialog();
    } catch (error) {
      this.showStatus('Failed to save mapping: ' + error, 'error');
    }
  }

  /**
   * Trigger the hidden file input.
   *
   * :return: void
   */
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  /**
   * Handle file selection for loading.
   *
   * :param event: File input change event
   * :return: void
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      this.showStatus('Please select a JSON file', 'error');
      return;
    }

    this.loadMapping(file);

    // Reset the input
    input.value = '';
  }

  /**
   * Load a mapping from file.
   *
   * :param file: File to load
   * :return: void
   */
  private async loadMapping(file: File): Promise<void> {
    try {
      this.showStatus('Loading mapping...', 'info');

      await this.mappingService.uploadMapping(file);

      // Force a brief delay to ensure the UI updates properly
      setTimeout(() => {
        this.showStatus('Mapping loaded successfully!', 'success');
      }, 100);

    } catch (error) {
      this.showStatus('Failed to load mapping: ' + error, 'error');
    }
  }

  /**
   * Clear all nodes and connections.
   *
   * :return: void
   */
  clearMapping(): void {
    if (!this.hasContent()) return;

    if (confirm('Are you sure you want to clear all nodes and connections? This action cannot be undone.')) {
      this.nodeService.clearAllNodes();
      this.mappingService.connectionObserver$.next([]);
      this.showStatus('Mapping cleared', 'info');
    }
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

    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.clearStatus();
    }, 3000);
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
