// src/app/services/api.service.ts - Complete Backend Communication Service

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  warnings?: string[];
  timestamp?: string;
}

export interface FileUploadResponse {
  success: boolean;
  fileId: string;
  filename: string;
  originalName: string;
  fileType: string;
  size: number;
  uploadedAt: string;
}

export interface ExecutionResponse {
  success: boolean;
  executionId: string;
  results: any;
  logs: string[];
  errors?: string[];
  completedAt?: string;
}

export interface ValidationResponse {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // private readonly baseUrl = 'http://localhost:5100/api';
  private readonly baseUrl = 'https://iot-pm-suite-backend.onrender.com/api';
  private connectionStatus = new BehaviorSubject<boolean>(false);

  public connectionStatus$ = this.connectionStatus.asObservable();

  constructor(private http: HttpClient) {
    this.checkConnection();
  }

  /**
   * Check backend connection status.
   */
  checkConnection(): void {
    this.healthCheck().subscribe({
      next: () => {
        this.connectionStatus.next(true);
        console.log('✅ Backend connection established');
      },
      error: () => {
        this.connectionStatus.next(false);
        console.log('❌ Backend connection failed');
      }
    });
  }

  /**
   * Health check endpoint.
   */
  healthCheck(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Upload a dataset file to the backend.
   */
  uploadDataset(file: File, fileType: string): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('dataset', file);
    formData.append('fileName', file.name);
    formData.append('fileType', fileType);

    return this.http.post<FileUploadResponse>(`${this.baseUrl}/dataset/upload`, formData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get information about an uploaded dataset.
   */
  getDatasetInfo(fileId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/dataset/${fileId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Validate a pipeline definition.
   */
  validatePipeline(pipeline: any): Observable<ValidationResponse> {
    return this.http.post<ValidationResponse>(`${this.baseUrl}/pipeline/validate`, pipeline).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Execute a pipeline.
   */
  executePipeline(pipeline: any): Observable<ExecutionResponse> {
    return this.http.post<ExecutionResponse>(`${this.baseUrl}/pipeline/execute`, pipeline).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get execution status and results.
   */
  getExecutionStatus(executionId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/pipeline/execution/${executionId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Test a single node configuration.
   */
  testNode(nodeData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/node/test`, nodeData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Export execution results to OCEL format.
   */
  exportToOCEL(executionId: string, options: any = {}): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/export/ocel/${executionId}`, options, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * List all uploaded files.
   */
  listFiles(): Observable<any> {
    return this.http.get(`${this.baseUrl}/files/list`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * List all pipeline executions.
   */
  listExecutions(): Observable<any> {
    return this.http.get(`${this.baseUrl}/executions/list`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get file type from filename extension.
   */
  getFileTypeFromName(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop();
    const typeMap: Record<string, string> = {
      'csv': 'CSV',
      'json': 'JSON',
      'xml': 'XML',
      'xes': 'XES',
      'yaml': 'YAML',
      'yml': 'YAML'
    };
    return typeMap[extension || ''] || 'CSV';
  }

  /**
   * Download a file from URL (for exports).
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Handle HTTP errors.
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.status === 0) {
        errorMessage = 'Cannot connect to backend server. Please check if the server is running.';
      } else if (error.error && error.error.error) {
        errorMessage = error.error.error;
      } else {
        errorMessage = `Server Error: ${error.status} - ${error.message}`;
      }
    }

    console.error('API Error:', error);
    return throwError(() => errorMessage);
  }

  /**
   * Create a pipeline definition from current state.
   */
  createPipelineDefinition(nodes: any[], connections: any[]): any {
    return {
      id: `pipeline-${Date.now()}`,
      name: `Pipeline-${new Date().toISOString().split('T')[0]}`,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        config: node.config || {},
        inputs: node.inputs.map((input: any) => ({
          id: input.id,
          name: input.label,
          dataType: this.mapColorToDataType(input.color)
        })),
        outputs: node.outputs.map((output: any) => ({
          id: output.id,
          name: output.label,
          dataType: this.mapColorToDataType(output.color)
        }))
      })),
      connections: connections.map((conn, index) => ({
        id: `connection-${index}`,
        fromNodeId: this.extractNodeIdFromPortId(conn.from),
        fromPortId: conn.from,
        toNodeId: this.extractNodeIdFromPortId(conn.to),
        toPortId: conn.to,
        dataType: this.getConnectionDataType(conn, nodes)
      }))
    };
  }

  /**
   * Map color codes to data types.
   */
  private mapColorToDataType(color: string): string {
    const colorMap: Record<string, string> = {
      'nord-blue': 'DataFrame',
      'nord-red': 'Series',
      'nord-yellow': 'Attribute',
      'nord-green': 'Event',
      'nord-purple': 'Object',
      'nord-orange': 'Relationship',
      'core-model': 'COREModel'
    };
    return colorMap[color] || 'Unknown';
  }

  /**
   * Extract node ID from port ID.
   */
  private extractNodeIdFromPortId(portId: string): string {
    const parts = portId.split('-');
    return parts.slice(0, 2).join('-'); // "node-X"
  }

  /**
   * Get data type for a connection.
   */
  private getConnectionDataType(connection: any, nodes: any[]): string {
    const fromNode = nodes.find(n => n.outputs.some((o: any) => o.id === connection.from));
    if (fromNode) {
      const fromPort = fromNode.outputs.find((o: any) => o.id === connection.from);
      if (fromPort) {
        return this.mapColorToDataType(fromPort.color);
      }
    }
    return 'Unknown';
  }

  /**
   * Show connection status notification.
   */
  showConnectionStatus(): void {
    this.connectionStatus$.subscribe(isConnected => {
      if (isConnected) {
        this.showNotification('✅ Connected to BROOM backend', 'success');
      } else {
        this.showNotification('❌ Backend connection failed', 'error');
      }
    });
  }

  /**
   * Show notification (implement based on your notification system).
   */
  private showNotification(message: string, type: string): void {
    // This would integrate with your notification system
    console.log(`${type.toUpperCase()}: ${message}`);
  }
}
