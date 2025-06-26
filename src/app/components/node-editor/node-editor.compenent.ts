// src/app/components/node-editor/node-editor.component.ts - Complete Implementation

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './node-editor.component.html',
  styleUrls: ['./node-editor.component.scss']
})
export class NodeEditorComponent implements OnDestroy, OnInit {
  public nodes$!: Observable<FlowNode[]>;
  public currentNodes: FlowNode[] = [];
  public connections: Connection[] = [];
  public selectedNodeId: string | null = null;
  public showStatusPanel = false;
  public pipelineValid = false;

  protected readonly fCanvas = viewChild(FCanvasComponent);
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
    });
  }

  ngOnInit(): void {
    this.mappingService.connectionObserver$.subscribe(connections => {
      this.connections = connections;
      this.validatePipeline();
      this.changeDetectorRef.detectChanges();
    });
  }

  protected onLoaded(): void {
    this.fCanvas()?.fitToScreen(PointExtensions.initialize(100, 100), false);
  }

  protected onCanvasChanged(event: FCanvasChangeEvent): void {
    // Sets a CSS variable to scale Material Design controls within the canvas
    // this._fBrowser.document.documentElement.style.setProperty('--flow-scale', `${ event.scale }`);
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

    // Validate connection compatibility
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
      this.nodeService.updateNodeContent(nodeId, { config: newConfig });
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

      // Store file for backend processing
      this.updateNodeConfig(nodeId, 'file', file);

      // Upload file to backend
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

    // Test node through API service
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

    // Check if all required fields are filled
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
      // Remove connections involving this node
      const nodeConnections = this.connections.filter(conn =>
        this.extractNodeIdFromPortId(conn.from) === nodeId ||
        this.extractNodeIdFromPortId(conn.to) === nodeId
      );

      nodeConnections.forEach(conn => {
        this.mappingService.removeConnection(conn);
      });

      // Remove the node
      this.nodeService.removeNode(nodeId);

      if (this.selectedNodeId === nodeId) {
        this.selectedNodeId = null;
      }
    }
  }

  /**
   * Clone a node.
   */
  public cloneNode(nodeId: string): void {
    const node = this.nodeService.getNodeById(nodeId);
    if (node) {
      const newPosition = {
        x: node.position.x + 50,
        y: node.position.y + 50
      };
      this.nodeService.cloneNode(nodeId, newPosition);
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
          // Fallback to local validation
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

    // Check type compatibility
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
}
