// src/app/services/api.service.ts

import { Injectable, Optional, ViewChild } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { NodeEditorComponent } from '../components/node-editor/node-editor.compenent';

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
  metadata?: {
    isCAIRO?: boolean;
    xmlStructure?: any;
    traceCount?: number;
  };
}



export interface ExecutionResponse {
  success: boolean;
  executionId: string;
  results: { process_discovery?: string };
  logs: string[];
  errors?: string[];
  completedAt?: string;
  cairoAnalysis?: {
    tracesProcessed: number;
    eventsCreated: number;
    objectsCreated: number;
    relationshipsCreated: number;
  };
}

export interface ValidationResponse {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedAt: string;
  cairoSpecific?: {
    hasCAIRONodes: boolean;
    xmlValidation?: any;
    recommendedFlow?: string[];
  };
}

export interface CAIROAnalysisResponse {
  isCAIROFormat: boolean;
  traceCount: number;
  streamPointCount: number;
  detectedStructure: {
    hasTraces: boolean;
    hasStreamPoints: boolean;
    hasLifecycleData: boolean;
  };
  recommendedNodes: string[];
  suggestedConfiguration: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = 'http://localhost:5100/api';
  // private readonly baseUrl = 'https://iot-pm-suite-backend.onrender.com/api';
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
   * Upload a dataset file to the backend with CAIRO analysis.
   */
  uploadDataset(file: File, fileType: string): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('dataset', file);
    formData.append('fileName', file.name);
    formData.append('fileType', fileType);
    formData.append('analyzeCAIRO', 'true'); // Request CAIRO analysis

    return this.http.post<FileUploadResponse>(`${this.baseUrl}/dataset/upload`, formData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Analyze file for CAIRO format detection.
   */
  analyzeCAIROFormat(fileId: string): Observable<CAIROAnalysisResponse> {
    return this.http.post<CAIROAnalysisResponse>(`${this.baseUrl}/dataset/analyze-cairo/${fileId}`, {}).pipe(
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
   * Validate a pipeline definition with CAIRO-specific checks.
   */
  validatePipeline(pipeline: any): Observable<ValidationResponse> {
    return this.http.post<ValidationResponse>(`${this.baseUrl}/pipeline/validate`, pipeline).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Execute a pipeline with CAIRO support.
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
   * Test a single node configuration (enhanced for CAIRO nodes).
   */
  testNode(nodeData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/node/test`, nodeData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Test CAIRO XML parsing for a specific file.
   */
  testCAIROParsing(fileId: string, config: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/cairo/test-parsing/${fileId}`, config).pipe(
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
   * Get CAIRO pipeline template.
   */
  getCAIROTemplate(): Observable<any> {
    return this.http.get(`${this.baseUrl}/templates/cairo`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * List all uploaded files with CAIRO detection.
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
   * Get file type from filename extension (enhanced for CAIRO).
   */
  getFileTypeFromName(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop();
    const typeMap: Record<string, string> = {
      'csv': 'CSV',
      'json': 'JSON',
      'xml': 'XML',
      'xes': 'XES',
      'yaml': 'YAML',
      'yml': 'YAML',
      'cairo': 'XML' // CAIRO files are XML format
    };
    return typeMap[extension || ''] || 'CSV';
  }

  /**
   * Detect if file is likely CAIRO format.
   */
  isLikelyCAIROFormat(filename: string): boolean {
    const lowerName = filename.toLowerCase();
    return lowerName.includes('cairo') ||
           lowerName.includes('sensor') ||
           lowerName.includes('stream') ||
           (lowerName.endsWith('.xml') && (lowerName.includes('log') || lowerName.includes('trace')));
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
   * Create a pipeline definition from current state (enhanced for CAIRO).
   */
  createPipelineDefinition(nodes: any[], connections: any[]): any {
    const pipeline = {
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
      })),
      metadata: {
        hasCAIRONodes: this.hasCAIRONodes(nodes),
        formatType: this.detectPipelineFormat(nodes)
      }
    };

    return pipeline;
  }

  /**
   * Check if pipeline contains CAIRO-specific nodes.
   */
  private hasCAIRONodes(nodes: any[]): boolean {
    const cairoNodeTypes = [
      'xml-trace-extractor', 'case-object-extractor', 'stream-point-extractor',
      'iot-event-from-stream', 'trace-event-linker', 'xml-element-selector',
      'xml-attribute-extractor', 'nested-list-processor', 'lifecycle-calculator',
      'stream-aggregator', 'stream-event-creator', 'stream-metadata-extractor'
    ];

    return nodes.some(node => cairoNodeTypes.includes(node.type));
  }

  /**
   * Detect pipeline format based on nodes.
   */
  private detectPipelineFormat(nodes: any[]): string {
    if (this.hasCAIRONodes(nodes)) {
      return 'CAIRO';
    }

    const hasXMLNodes = nodes.some(node =>
      node.type.includes('xml') ||
      (node.type === 'read-file' && node.config?.fileType === 'XML')
    );

    if (hasXMLNodes) {
      return 'XML';
    }

    return 'Generic';
  }

  /**
   * Map color codes to data types (enhanced for CAIRO).
   */
  private mapColorToDataType(color: string): string {
    const colorMap: Record<string, string> = {
      'nord-blue': 'DataFrame',
      'nord-red': 'Series',
      'nord-yellow': 'Attribute',
      'nord-green': 'Event',
      'nord-purple': 'Object',
      'nord-orange': 'Relationship',
      'core-model': 'COREModel',
      // CAIRO-specific data types
      'traces': 'Traces',
      'stream-points': 'StreamPoints',
      'stream-events': 'StreamEvents',
      'stream-metadata': 'StreamMetadata',
      'lifecycle-data': 'LifecycleData',
      'elements': 'Elements',
      'flattened-data': 'FlattenedData',
      'context-relationships': 'ContextRelationships',
      'mapped-attributes': 'MappedAttributes'
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
   * Generate CAIRO pipeline template.
   */
  generateCAIROPipelineTemplate(): any {
    return {
      id: `cairo-template-${Date.now()}`,
      name: 'CAIRO XML Processing Template',
      description: 'Template for processing CAIRO XML sensor stream logs',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      nodes: [
        {
          id: 'node-1',
          type: 'read-file',
          position: { x: 100, y: 100 },
          config: {
            fileType: 'XML',
            encoding: 'UTF-8'
          },
          inputs: [],
          outputs: [{ id: 'node-1-output-0', name: 'Raw Data', dataType: 'DataFrame' }]
        },
        {
          id: 'node-2',
          type: 'xml-trace-extractor',
          position: { x: 400, y: 100 },
          config: {
            traceXPath: 'log/trace',
            traceIdentifier: 'concept:name'
          },
          inputs: [{ id: 'node-2-input-0', name: 'XML Data', dataType: 'DataFrame' }],
          outputs: [{ id: 'node-2-output-0', name: 'Traces', dataType: 'Series' }]
        },
        {
          id: 'node-3',
          type: 'case-object-extractor',
          position: { x: 100, y: 300 },
          config: {
            caseIdAttribute: 'concept:name',
            objectType: 'case_object',
            extractLifecycle: true
          },
          inputs: [{ id: 'node-3-input-0', name: 'Traces', dataType: 'Series' }],
          outputs: [{ id: 'node-3-output-0', name: 'Case Objects', dataType: 'Object' }]
        },
        {
          id: 'node-4',
          type: 'stream-point-extractor',
          position: { x: 700, y: 100 },
          config: {
            streamPointsPath: 'list/list/list',
            timestampField: 'date',
            eventDataPath: 'string'
          },
          inputs: [{ id: 'node-4-input-0', name: 'Traces', dataType: 'Series' }],
          outputs: [{ id: 'node-4-output-0', name: 'Stream Points', dataType: 'Series' }]
        },
        {
          id: 'node-5',
          type: 'iot-event-from-stream',
          position: { x: 700, y: 300 },
          config: {
            streamIdField: 'stream:id',
            streamSourceField: 'stream:source',
            streamValueField: 'stream:value',
            eventClass: 'iot_event'
          },
          inputs: [
            { id: 'node-5-input-0', name: 'Stream Points', dataType: 'Series' },
            { id: 'node-5-input-1', name: 'Case ID', dataType: 'Attribute' }
          ],
          outputs: [{ id: 'node-5-output-0', name: 'IoT Events', dataType: 'Event' }]
        },
        {
          id: 'node-6',
          type: 'trace-event-linker',
          position: { x: 1000, y: 200 },
          config: {
            linkingAttribute: 'concept:name',
            relationshipType: 'belongs_to'
          },
          inputs: [
            { id: 'node-6-input-0', name: 'IoT Events', dataType: 'Event' },
            { id: 'node-6-input-1', name: 'Case Objects', dataType: 'Object' }
          ],
          outputs: [{ id: 'node-6-output-0', name: 'E-O Relationships', dataType: 'Relationship' }]
        },
        {
          id: 'node-7',
          type: 'core-metamodel',
          position: { x: 1300, y: 200 },
          config: {},
          inputs: [
            { id: 'node-7-input-0', name: 'Process Events', dataType: 'Event' },
            { id: 'node-7-input-1', name: 'IoT Events', dataType: 'Event' },
            { id: 'node-7-input-2', name: 'Relationships', dataType: 'Relationship' },
            { id: 'node-7-input-3', name: 'Objects', dataType: 'Object' }
          ],
          outputs: [{ id: 'node-7-output-0', name: 'CORE Metamodel', dataType: 'COREModel' }]
        },
        {
          id: 'node-8',
          type: 'export-ocel',
          position: { x: 1600, y: 200 },
          config: {
            format: 'OCEL 2.0 JSON',
            filename: 'cairo_export.ocel'
          },
          inputs: [{ id: 'node-8-input-0', name: 'CORE Metamodel', dataType: 'COREModel' }],
          outputs: []
        }
      ],
      connections: [
        {
          id: 'connection-1',
          fromNodeId: 'node-1',
          fromPortId: 'node-1-output-0',
          toNodeId: 'node-2',
          toPortId: 'node-2-input-0',
          dataType: 'DataFrame'
        },
        {
          id: 'connection-2',
          fromNodeId: 'node-2',
          fromPortId: 'node-2-output-0',
          toNodeId: 'node-3',
          toPortId: 'node-3-input-0',
          dataType: 'Series'
        },
        {
          id: 'connection-3',
          fromNodeId: 'node-2',
          fromPortId: 'node-2-output-0',
          toNodeId: 'node-4',
          toPortId: 'node-4-input-0',
          dataType: 'Series'
        },
        {
          id: 'connection-4',
          fromNodeId: 'node-4',
          fromPortId: 'node-4-output-0',
          toNodeId: 'node-5',
          toPortId: 'node-5-input-0',
          dataType: 'Series'
        },
        {
          id: 'connection-5',
          fromNodeId: 'node-5',
          fromPortId: 'node-5-output-0',
          toNodeId: 'node-6',
          toPortId: 'node-6-input-0',
          dataType: 'Event'
        },
        {
          id: 'connection-6',
          fromNodeId: 'node-3',
          fromPortId: 'node-3-output-0',
          toNodeId: 'node-6',
          toPortId: 'node-6-input-1',
          dataType: 'Object'
        },
        {
          id: 'connection-7',
          fromNodeId: 'node-5',
          fromPortId: 'node-5-output-0',
          toNodeId: 'node-7',
          toPortId: 'node-7-input-1',
          dataType: 'Event'
        },
        {
          id: 'connection-8',
          fromNodeId: 'node-3',
          fromPortId: 'node-3-output-0',
          toNodeId: 'node-7',
          toPortId: 'node-7-input-3',
          dataType: 'Object'
        },
        {
          id: 'connection-9',
          fromNodeId: 'node-6',
          fromPortId: 'node-6-output-0',
          toNodeId: 'node-7',
          toPortId: 'node-7-input-2',
          dataType: 'Relationship'
        },
        {
          id: 'connection-10',
          fromNodeId: 'node-7',
          fromPortId: 'node-7-output-0',
          toNodeId: 'node-8',
          toPortId: 'node-8-input-0',
          dataType: 'COREModel'
        }
      ],
      metadata: {
        formatType: 'CAIRO',
        hasCAIRONodes: true,
        templateType: 'cairo-xml-processing'
      }
    };
  }

  /**
   * Load CAIRO template into current pipeline.
   */
  loadCAIROTemplate(): void {
    const template = this.generateCAIROPipelineTemplate();

    // This would integrate with your mapping service to load the template
    console.log('CAIRO template generated:', template);

    // Notify user
    this.showNotification('🔧 CAIRO pipeline template loaded', 'info');
  }

  /**
   * Validate CAIRO-specific pipeline structure.
   */
  validateCAIROPipeline(pipeline: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/pipeline/validate-cairo`, pipeline).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get CAIRO processing recommendations based on uploaded file.
   */
  getCAIRORecommendations(fileId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/cairo/recommendations/${fileId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Show notification (implement based on your notification system).
   */
  private showNotification(message: string, type: string): void {
    // This would integrate with your notification system
    console.log(`${type.toUpperCase()}: ${message}`);
  }
}
