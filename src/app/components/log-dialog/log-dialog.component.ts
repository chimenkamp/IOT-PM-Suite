// src/app/components/log-dialog/log-dialog.component.ts

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

export interface LogDialogData {
  executionId: string;
  logs: string[];
  errors: string[];
  success: boolean;
  completedAt?: string;
  failedNodes: string[];
}

@Component({
  selector: 'app-log-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
    <div class="log-dialog">
      <div class="dialog-header">
        <h2 mat-dialog-title>Pipeline Execution Logs</h2>
        <div class="execution-status">
          <mat-chip-set>
            <mat-chip [class]="success ? 'success-chip' : 'error-chip'">
              <mat-icon>{{ success ? 'check_circle' : 'error' }}</mat-icon>
              {{ success ? 'Completed' : 'Failed' }}
            </mat-chip>
          </mat-chip-set>
        </div>
      </div>

      <div mat-dialog-content class="dialog-content">
        <div class="execution-info">
          <div class="info-item">
            <strong>Execution ID:</strong> {{ data.executionId }}
          </div>
          <div class="info-item" *ngIf="data.completedAt">
            <strong>Completed:</strong> {{ formatTimestamp(data.completedAt) }}
          </div>
          <div class="info-item" *ngIf="data.failedNodes.length > 0">
            <strong>Failed Nodes:</strong>
            <mat-chip-set>
              <mat-chip *ngFor="let nodeId of data.failedNodes" class="failed-node-chip">
                {{ nodeId }}
              </mat-chip>
            </mat-chip-set>
          </div>
        </div>

        <div class="logs-container">
          <div class="logs-header">
            <h3>Execution Logs</h3>
            <div class="logs-stats">
              {{ data.logs.length }} log entries
              <span *ngIf="errorLogs.length > 0" class="error-count">
                ({{ errorLogs.length }} errors)
              </span>
            </div>
          </div>

          <div class="logs-content">
            <div *ngFor="let log of data.logs; let i = index"
                 class="log-entry"
                 [class.error-log]="isErrorLog(log)"
                 [class.success-log]="isSuccessLog(log)"
                 [class.info-log]="isInfoLog(log)">

              <div class="log-line-number">{{ i + 1 }}</div>

              <div class="log-icon">
                <mat-icon *ngIf="isErrorLog(log)" class="error-icon">error</mat-icon>
                <mat-icon *ngIf="isSuccessLog(log)" class="success-icon">check_circle</mat-icon>
                <mat-icon *ngIf="isInfoLog(log)" class="info-icon">info</mat-icon>
              </div>

              <div class="log-message">
                <span [innerHTML]="highlightNodeIds(log)"></span>
              </div>

              <div class="log-timestamp" *ngIf="extractTimestamp(log)">
                {{ formatLogTimestamp(extractTimestamp(log)) }}
              </div>
            </div>
          </div>
        </div>

        <div class="error-summary" *ngIf="data.errors.length > 0">
          <h3>Error Summary</h3>
          <div *ngFor="let error of data.errors" class="error-item">
            <mat-icon>warning</mat-icon>
            {{ error }}
          </div>
        </div>
      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="downloadLogs()">
          <mat-icon>download</mat-icon>
          Download Logs
        </button>
        <button mat-button (click)="copyToClipboard()">
          <mat-icon>content_copy</mat-icon>
          Copy Logs
        </button>
        <button mat-raised-button color="primary" (click)="close()">
          Close
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./log-dialog.component.scss']
})
export class LogDialogComponent {
  errorLogs: string[] = [];
  success: boolean;
  constructor(
    public dialogRef: MatDialogRef<LogDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LogDialogData
  ) {
    this.errorLogs = this.data.logs.filter(log => this.isErrorLog(log));
    this.success = this.data.success;
  }

  close(): void {
    this.dialogRef.close();
  }

  isErrorLog(log: string): boolean {
    return log.toLowerCase().includes('failed') ||
           log.toLowerCase().includes('error') ||
           log.toLowerCase().includes('invalid');
  }

  isSuccessLog(log: string): boolean {
    return log.toLowerCase().includes('completed successfully') ||
           log.toLowerCase().includes('validation passed');
  }

  isInfoLog(log: string): boolean {
    return !this.isErrorLog(log) && !this.isSuccessLog(log);
  }

  extractTimestamp(log: string): string | null {
    // Extract timestamp from logs like "2025-08-26T05:20:12.643284"
    const timestampMatch = log.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+/);
    return timestampMatch ? timestampMatch[0] : null;
  }

  formatTimestamp(timestamp: string): string {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  }

  formatLogTimestamp(timestamp: string): string {
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch {
      return timestamp;
    }
  }

  highlightNodeIds(log: string): string {
    // Highlight node IDs in logs
    return log.replace(/node-\d+/g, '<span class="node-id-highlight">$&</span>');
  }

  downloadLogs(): void {
    const content = this.generateLogContent();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pipeline_logs_${this.data.executionId.substring(0, 8)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  copyToClipboard(): void {
    const content = this.generateLogContent();
    navigator.clipboard.writeText(content).then(() => {
      // You might want to show a toast notification here
      console.log('Logs copied to clipboard');
    });
  }

  private generateLogContent(): string {
    const lines = [
      `Pipeline Execution Logs`,
      `Execution ID: ${this.data.executionId}`,
      `Status: ${this.data.success ? 'Success' : 'Failed'}`,
      `Completed: ${this.data.completedAt ? this.formatTimestamp(this.data.completedAt) : 'N/A'}`,
      `Failed Nodes: ${this.data.failedNodes.join(', ') || 'None'}`,
      ``,
      `Logs:`,
      ...this.data.logs.map((log, i) => `${i + 1}. ${log}`),
      ``
    ];

    if (this.data.errors.length > 0) {
      lines.push('Errors:', ...this.data.errors.map(error => `- ${error}`));
    }

    return lines.join('\n');
  }
}
