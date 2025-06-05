// src/app/components/generic-node/generic-node.component.ts

import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FFlowModule } from '@foblex/flow';

export interface NodePort {
  id: string;
  color: string;
  label: string;
}

export interface Position {
  x: number;
  y: number;
}

@Component({
  selector: 'app-generic-node',
  standalone: true,
  imports: [CommonModule, FFlowModule],
  template: `

  `,
  styleUrls: ['./generic-node.component.scss']
})
export class GenericNodeComponent implements OnInit {
  @Input() nodeId!: string;
  @Input() position: Position = { x: 0, y: 0 };
  @Input() inputs: NodePort[] = [];
  @Input() outputs: NodePort[] = [];

  constructor() {}

  /**
   * OnInit lifecycle hook.
   *
   * :return: void
   */
  ngOnInit(): void {
    // Nothing extra needed here.
    console.log(`GenericNodeComponent initialized with ID: ${this.nodeId}`);
    console.log(`Position: (${this.position.x}, ${this.position.y})`);
    console.log(`Inputs:`, this.inputs);
    console.log(`Outputs:`, this.outputs);
  }
}
