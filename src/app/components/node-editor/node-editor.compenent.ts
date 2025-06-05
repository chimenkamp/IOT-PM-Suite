// src/app/components/node-editor/node-editor.component.ts

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FCanvasChangeEvent, FCanvasComponent, FCreateConnectionEvent, FFlowModule } from '@foblex/flow';
import { GenericNodeComponent } from '../generic-node/generic-node.component';
import { NodeService, FlowNode } from '../../services/node.service';
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
export class NodeEditorComponent implements OnDestroy {
  public nodes$!: Observable<FlowNode[]>;
  public currentNodes: FlowNode[] = [];
  public connections: { from: string, to: string }[] = [];

  protected readonly fCanvas = viewChild(FCanvasComponent);

  private readonly _fBrowser = inject(BrowserService);

  constructor(private nodeService: NodeService, private changeDetectorRef: ChangeDetectorRef) {
    this.nodes$ = this.nodeService.nodes$;

    this.nodes$.subscribe(nodes => {
      this.currentNodes = nodes;
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
    this.connections.push({ from: event.fOutputId, to: event.fInputId });
    this.changeDetectorRef.detectChanges();
  }

  public onDeleteConnections(): void {
    this.connections = [];
    this.changeDetectorRef.detectChanges();
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
    return results
  }
}
