// src/app/components/node-editor/node-editor.component.ts

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, inject, OnDestroy, OnInit, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FCanvasChangeEvent, FCanvasComponent, FCreateConnectionEvent, FFlowModule } from '@foblex/flow';
import { GenericNodeComponent } from '../generic-node/generic-node.component';
import { NodeService, FlowNode } from '../../services/node.service';
import { MappingService, Connection } from '../../services/mapping.service';
import { Observable } from 'rxjs';
import { BrowserService } from '@foblex/platform';
import { PointExtensions } from '@foblex/2d';

@Component({
  selector: 'app-node-editor',
  standalone: true,
  imports: [CommonModule, FFlowModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './node-editor.component.html',
  styleUrls: ['./node-editor.component.scss']
})
export class NodeEditorComponent implements OnDestroy, OnInit {
  public nodes$!: Observable<FlowNode[]>;

  public currentNodes: FlowNode[] = [];
  public connections: Connection[] = [];

  protected readonly fCanvas = viewChild(FCanvasComponent);

  private readonly _fBrowser = inject(BrowserService);

  constructor(
    private nodeService: NodeService,
    private mappingService: MappingService,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.nodes$ = this.nodeService.nodes$;

    this.nodes$.subscribe(nodes => {
      this.currentNodes = nodes;
      // this.changeDetectorRef.detectChanges();
    });
  }

  ngOnInit(): void {
    // Initialize connections from mapping service

    this.mappingService.connectionObserver$.subscribe(connections => {
      this.connections = connections;
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
    // Removes the CSS variable to prevent scaling effects outside the canvas context
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

    this.connections.push(newConnection);
    this.mappingService.addConnection(newConnection);
    this.changeDetectorRef.detectChanges();
  }

  public onDeleteConnections(): void {
    this.connections = [];
    this.mappingService.connectionObserver$.next([]);
    this.changeDetectorRef.detectChanges();
  }

  /**
   * Remove a specific connection.
   *
   * :param connection: Connection to remove
   * :return: void
   */
  public removeConnection(connection: Connection): void {
    this.connections = this.connections.filter(
      conn => !(conn.from === connection.from && conn.to === connection.to)
    );
    this.mappingService.removeConnection(connection);
    this.changeDetectorRef.detectChanges();
  }

  /**
   * Refresh connections from the mapping service (used after import).
   *
   * :return: void
   */
  public refreshConnections(): void {
    this.connections = this.mappingService.connectionObserver$.getValue();
    this.changeDetectorRef.detectChanges();
  }

  /**
   * Clear all nodes and connections.
   *
   * :return: void
   */
  public clearAll(): void {
    this.nodeService.clearAllNodes();
    this.onDeleteConnections();
  }

  public canConnectTo(id: string): string[] {
    // Return a list of input IDS in the same color as the output port
    const outputNode = this.currentNodes.find(node => node.outputs.some(output => output.id === id));
    if (!outputNode) {
      return [];
    }
    const outputPort = outputNode.outputs.find(output => output.id === id);
    if (!outputPort) {
      return [];
    }

    const results: string[] = this.currentNodes
    .flatMap(node => node.inputs)
    .filter(input => input.color === outputPort.color)
    .map(input => input.id);
    return results;
  }

  /**
   * Check if nodes exist in the editor.
   *
   * :return: boolean
   */
  public hasNodes(): boolean {
    return this.currentNodes.length > 0;
  }

  /**
   * Check if connections exist in the editor.
   *
   * :return: boolean
   */
  public hasConnections(): boolean {
    return this.connections.length > 0;
  }

  /**
   * Get the total count of nodes and connections.
   *
   * :return: Object with counts
   */
  public getCounts(): { nodes: number, connections: number } {
    return {
      nodes: this.currentNodes.length,
      connections: this.connections.length
    };
  }
}
