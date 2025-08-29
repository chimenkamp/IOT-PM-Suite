// src/app/services/cairo-template.service.ts

import { Injectable } from '@angular/core';
import { NodeService } from './node.service';
import { MappingService } from './mapping.service';
import { ApiService } from './api.service';
import { Observable, BehaviorSubject } from 'rxjs';

export interface CAIROTemplate {
  id: string;
  name: string;
  description: string;
  type: 'basic' | 'advanced' | 'minimal' | 'custom';
  nodes: any[];
  connections: any[];
  configuration: Record<string, any>;
  instructions: string[];
  complexity: 'low' | 'medium' | 'high';
}

export interface CAIROAnalysis {
  isCAIROFormat: boolean;
  traceCount: number;
  streamPointCount: number;
  recommendedTemplate: string;
  suggestedConfiguration: Record<string, any>;
  processingHints: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CAIROTemplateService {
  private availableTemplates: CAIROTemplate[] = [];
  private currentAnalysis = new BehaviorSubject<CAIROAnalysis | null>(null);

  public currentAnalysis$ = this.currentAnalysis.asObservable();

  constructor(
    private nodeService: NodeService,
    private mappingService: MappingService,
    private apiService: ApiService
  ) {
    this.initializeTemplates();
  }

  /**
   * Initialize available CAIRO templates.
   */
  private initializeTemplates(): void {
    this.availableTemplates = [
      this.createBasicCAIROTemplate(),
      this.createAdvancedCAIROTemplate(),
      this.createMinimalCAIROTemplate(),
      this.createTestingCAIROTemplate()
    ];
  }

  /**
   * Get all available CAIRO templates.
   */
  getAvailableTemplates(): CAIROTemplate[] {
    return this.availableTemplates;
  }

  /**
   * Get template by ID.
   */
  getTemplate(templateId: string): CAIROTemplate | undefined {
    return this.availableTemplates.find(t => t.id === templateId);
  }

  /**
   * Analyze file for CAIRO format and get recommendations.
   */
  analyzeFileForCAIRO(fileId: string): Observable<CAIROAnalysis> {
    return new Observable(observer => {
      this.apiService.analyzeCAIROFormat(fileId).subscribe({
        next: (analysis) => {
          const cairoAnalysis: CAIROAnalysis = {
            isCAIROFormat: analysis.isCAIROFormat,
            traceCount: analysis.traceCount || 0,
            streamPointCount: analysis.streamPointCount || 0,
            recommendedTemplate: this.getRecommendedTemplate(analysis),
            suggestedConfiguration: analysis.suggestedConfiguration || {},
            processingHints: analysis["processingHints"] || []
          };

          this.currentAnalysis.next(cairoAnalysis);
          observer.next(cairoAnalysis);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Load CAIRO template into current pipeline.
   */
  loadTemplate(templateId: string, customConfig?: Record<string, any>): void {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    console.log('Loading CAIRO template:', template.name);

    // Clear current pipeline
    this.nodeService.clearAllNodes();
    this.mappingService.connectionObserver$.next([]);

    // Create nodes with proper positions and configurations
    const nodeIdMapping: Record<string, string> = {};

    template.nodes.forEach((templateNode, index) => {
      const nodeId = this.nodeService.addNode(templateNode.type, templateNode.position);
      nodeIdMapping[templateNode.id] = nodeId.id;

      // Apply template configuration
      let nodeConfig = { ...templateNode.config };

      // Override with custom configuration if provided
      if (customConfig && customConfig[templateNode.type]) {
        nodeConfig = { ...nodeConfig, ...customConfig[templateNode.type] };
      }

      // Update node configuration
      this.nodeService.updateNodeConfig(nodeId.id, { config: nodeConfig });
    });

    // Create connections with updated node IDs
    const connections = template.connections.map(conn => ({
      from: conn.fromPortId.replace(conn.fromNodeId, nodeIdMapping[conn.fromNodeId]),
      to: conn.toPortId.replace(conn.toNodeId, nodeIdMapping[conn.toNodeId])
    }));

    // Add connections
    connections.forEach(conn => {
      this.mappingService.addConnection(conn);
    });

    console.log('CAIRO template loaded successfully');
  }

  /**
   * Generate custom template based on file analysis.
   */
  generateCustomTemplate(analysis: CAIROAnalysis): CAIROTemplate {
    const templateNodes = [];
    const templateConnections = [];
    let nodeCounter = 0;

    // Start with file input
    const fileNode = this.createTemplateNode(++nodeCounter, 'read-file', { x: 100, y: 100 }, {
      fileType: 'XML',
      encoding: 'UTF-8'
    });
    templateNodes.push(fileNode);

    // Add trace extractor
    const traceNode = this.createTemplateNode(++nodeCounter, 'xml-trace-extractor', { x: 400, y: 100 },
      analysis.suggestedConfiguration['xml-trace-extractor'] || {
        traceXPath: 'log/trace',
        traceIdentifier: 'concept:name'
      });
    templateNodes.push(traceNode);
    templateConnections.push(this.createTemplateConnection(fileNode.id, traceNode.id, 0, 0));

    // Add case object extractor
    const caseNode = this.createTemplateNode(++nodeCounter, 'case-object-extractor', { x: 100, y: 300 },
      analysis.suggestedConfiguration['case-object-extractor'] || {
        caseIdAttribute: 'concept:name',
        objectType: 'case_object',
        extractLifecycle: true
      });
    templateNodes.push(caseNode);
    templateConnections.push(this.createTemplateConnection(traceNode.id, caseNode.id, 0, 0));

    // Add stream processing if stream points detected
    if (analysis.streamPointCount > 0) {
      const streamNode = this.createTemplateNode(++nodeCounter, 'stream-point-extractor', { x: 700, y: 100 },
        analysis.suggestedConfiguration['stream-point-extractor'] || {
          streamPointsPath: 'list/list/list',
          timestampField: 'date',
          eventDataPath: 'string'
        });
      templateNodes.push(streamNode);
      templateConnections.push(this.createTemplateConnection(traceNode.id, streamNode.id, 0, 0));

      // Add IoT event creation
      const iotEventNode = this.createTemplateNode(++nodeCounter, 'iot-event-from-stream', { x: 700, y: 300 },
        analysis.suggestedConfiguration['iot-event-from-stream'] || {
          streamIdField: 'stream:id',
          streamSourceField: 'stream:source',
          streamValueField: 'stream:value',
          eventClass: 'iot_event'
        });
      templateNodes.push(iotEventNode);
      templateConnections.push(this.createTemplateConnection(streamNode.id, iotEventNode.id, 0, 0));

      // Add event-object linker
      const linkerNode = this.createTemplateNode(++nodeCounter, 'trace-event-linker', { x: 1000, y: 200 }, {
        linkingAttribute: 'concept:name',
        relationshipType: 'belongs_to'
      });
      templateNodes.push(linkerNode);
      templateConnections.push(this.createTemplateConnection(iotEventNode.id, linkerNode.id, 0, 0));
      templateConnections.push(this.createTemplateConnection(caseNode.id, linkerNode.id, 0, 1));

      // Add aggregation for large datasets
      if (analysis.streamPointCount > 1000) {
        const aggregatorNode = this.createTemplateNode(++nodeCounter, 'stream-aggregator', { x: 700, y: 500 }, {
          aggregationField: 'stream:value',
          aggregationFunction: 'mean',
          timeWindow: 60
        });
        templateNodes.push(aggregatorNode);
        templateConnections.push(this.createTemplateConnection(streamNode.id, aggregatorNode.id, 0, 0));
      }
    }

    // Add CORE metamodel construction
    const coreNode = this.createTemplateNode(++nodeCounter, 'core-metamodel', { x: 1300, y: 200 }, {});
    templateNodes.push(coreNode);

    // Connect to CORE model (simplified - in practice would need proper port mapping)
    if (analysis.streamPointCount > 0) {
      // Connect IoT events and relationships
      templateConnections.push(this.createTemplateConnection('node-5', coreNode.id, 0, 1)); // IoT events
      templateConnections.push(this.createTemplateConnection('node-6', coreNode.id, 0, 2)); // Relationships
    }
    templateConnections.push(this.createTemplateConnection(caseNode.id, coreNode.id, 0, 3)); // Objects

    // Add export
    const exportNode = this.createTemplateNode(++nodeCounter, 'export-ocel', { x: 1600, y: 200 }, {
      format: 'OCEL 2.0 JSON',
      filename: 'cairo_export.ocel'
    });
    templateNodes.push(exportNode);
    templateConnections.push(this.createTemplateConnection(coreNode.id, exportNode.id, 0, 0));

    return {
      id: `custom-cairo-${Date.now()}`,
      name: 'Custom CAIRO Pipeline',
      description: `Custom pipeline for processing ${analysis.traceCount} traces and ${analysis.streamPointCount} stream points`,
      type: 'custom',
      nodes: templateNodes,
      connections: templateConnections,
      configuration: analysis.suggestedConfiguration,
      instructions: this.generateCustomInstructions(analysis),
      complexity: analysis.streamPointCount > 5000 ? 'high' : analysis.streamPointCount > 1000 ? 'medium' : 'low'
    };
  }

  /**
   * Get recommended template based on analysis.
   */
  private getRecommendedTemplate(analysis: any): string {
    if (!analysis.isCAIROFormat) {
      return 'none';
    }

    const streamCount = analysis.streamPointCount || 0;
    const traceCount = analysis.traceCount || 0;

    if (streamCount > 5000 || traceCount > 500) {
      return 'advanced';
    } else if (streamCount > 0 && traceCount > 0) {
      return 'basic';
    } else {
      return 'minimal';
    }
  }

  /**
   * Create basic CAIRO template.
   */
  private createBasicCAIROTemplate(): CAIROTemplate {
    return {
      id: 'cairo-basic',
      name: 'Basic CAIRO Processing',
      description: 'Standard pipeline for CAIRO XML sensor stream processing',
      type: 'basic',
      complexity: 'medium',
      nodes: [
        this.createTemplateNode(1, 'read-file', { x: 100, y: 100 }, { fileType: 'XML' }),
        this.createTemplateNode(2, 'xml-trace-extractor', { x: 400, y: 100 }, { traceXPath: 'log/trace', traceIdentifier: 'concept:name' }),
        this.createTemplateNode(3, 'case-object-extractor', { x: 100, y: 300 }, { caseIdAttribute: 'concept:name', objectType: 'case_object', extractLifecycle: true }),
        this.createTemplateNode(4, 'stream-point-extractor', { x: 700, y: 100 }, { streamPointsPath: 'list/list/list', timestampField: 'date', eventDataPath: 'string' }),
        this.createTemplateNode(5, 'iot-event-from-stream', { x: 700, y: 300 }, { streamIdField: 'stream:id', eventClass: 'iot_event' }),
        this.createTemplateNode(6, 'trace-event-linker', { x: 1000, y: 200 }, { linkingAttribute: 'concept:name', relationshipType: 'belongs_to' }),
        this.createTemplateNode(7, 'core-metamodel', { x: 1300, y: 200 }, {}),
        this.createTemplateNode(8, 'export-ocel', { x: 1600, y: 200 }, { format: 'OCEL 2.0 JSON' })
      ],
      connections: [
        this.createTemplateConnection('node-1', 'node-2', 0, 0),
        this.createTemplateConnection('node-2', 'node-3', 0, 0),
        this.createTemplateConnection('node-2', 'node-4', 0, 0),
        this.createTemplateConnection('node-4', 'node-5', 0, 0),
        this.createTemplateConnection('node-5', 'node-6', 0, 0),
        this.createTemplateConnection('node-3', 'node-6', 0, 1),
        this.createTemplateConnection('node-5', 'node-7', 0, 1),
        this.createTemplateConnection('node-3', 'node-7', 0, 3),
        this.createTemplateConnection('node-6', 'node-7', 0, 2),
        this.createTemplateConnection('node-7', 'node-8', 0, 0)
      ],
      configuration: {
        'xml-trace-extractor': { traceXPath: 'log/trace', traceIdentifier: 'concept:name' },
        'case-object-extractor': { caseIdAttribute: 'concept:name', objectType: 'case_object', extractLifecycle: true },
        'stream-point-extractor': { streamPointsPath: 'list/list/list', timestampField: 'date', eventDataPath: 'string' },
        'iot-event-from-stream': { streamIdField: 'stream:id', streamSourceField: 'stream:source', streamValueField: 'stream:value', eventClass: 'iot_event' },
        'trace-event-linker': { linkingAttribute: 'concept:name', relationshipType: 'belongs_to' }
      },
      instructions: [
        '1. Upload your CAIRO XML file using Read File node',
        '2. XML Trace Extractor will parse log/trace structure',
        '3. Case Object Extractor creates objects from trace concept names',
        '4. Stream Point Extractor navigates nested list structure',
        '5. IoT Event From Stream transforms measurements into events',
        '6. Trace Event Linker connects events to case objects',
        '7. CORE Metamodel combines all components',
        '8. Export to OCEL for process mining analysis'
      ]
    };
  }

  /**
   * Create advanced CAIRO template with aggregation.
   */
  private createAdvancedCAIROTemplate(): CAIROTemplate {
    const basicTemplate = this.createBasicCAIROTemplate();

    return {
      ...basicTemplate,
      id: 'cairo-advanced',
      name: 'Advanced CAIRO Processing',
      description: 'Advanced pipeline with stream aggregation and lifecycle analysis',
      type: 'advanced',
      complexity: 'high',
      nodes: [
        ...basicTemplate.nodes,
        this.createTemplateNode(9, 'stream-aggregator', { x: 700, y: 500 }, {
          aggregationField: 'stream:value',
          aggregationFunction: 'mean',
          timeWindow: 60
        }),
        this.createTemplateNode(10, 'lifecycle-calculator', { x: 400, y: 500 }, {
          calculationMode: 'First-Last',
          outputFormat: 'ISO String'
        }),
        this.createTemplateNode(11, 'context-based-linker', { x: 1000, y: 400 }, {
          contextAttribute: 'concept:name',
          relationshipType: 'monitors',
          matchingStrategy: 'exact_match'
        })
      ],
      connections: [
        ...basicTemplate.connections,
        this.createTemplateConnection('node-4', 'node-9', 0, 0), // Stream points to aggregator
        this.createTemplateConnection('node-4', 'node-10', 0, 0), // Stream points to lifecycle
        this.createTemplateConnection('node-5', 'node-11', 0, 0), // Events to context linker
        this.createTemplateConnection('node-3', 'node-11', 0, 1)  // Objects to context linker
      ],
      instructions: [
        ...basicTemplate.instructions.slice(0, -2), // Remove last 2 instructions
        '6a. Stream Aggregator reduces data volume for performance',
        '6b. Lifecycle Calculator determines object temporal boundaries',
        '7. Both Trace Event Linker and Context-Based Linker create relationships',
        '8. CORE Metamodel combines all enriched components',
        '9. Export to OCEL with enhanced temporal and contextual information'
      ]
    };
  }

  /**
   * Create minimal CAIRO template for testing.
   */
  private createMinimalCAIROTemplate(): CAIROTemplate {
    return {
      id: 'cairo-minimal',
      name: 'Minimal CAIRO Testing',
      description: 'Minimal pipeline for testing CAIRO file structure',
      type: 'minimal',
      complexity: 'low',
      nodes: [
        this.createTemplateNode(1, 'read-file', { x: 100, y: 100 }, { fileType: 'XML' }),
        this.createTemplateNode(2, 'xml-trace-extractor', { x: 400, y: 100 }, { traceXPath: 'log/trace', traceIdentifier: 'concept:name' }),
        this.createTemplateNode(3, 'table-output', { x: 700, y: 100 }, { maxRows: 50 })
      ],
      connections: [
        this.createTemplateConnection('node-1', 'node-2', 0, 0),
        this.createTemplateConnection('node-2', 'node-3', 0, 0)
      ],
      configuration: {
        'xml-trace-extractor': { traceXPath: 'log/trace', traceIdentifier: 'concept:name' }
      },
      instructions: [
        '1. Upload CAIRO XML file',
        '2. Extract traces to verify structure',
        '3. View results in table to validate parsing',
        '4. If successful, switch to Basic or Advanced template'
      ]
    };
  }

  /**
   * Create testing template for CAIRO debugging.
   */
  private createTestingCAIROTemplate(): CAIROTemplate {
    return {
      id: 'cairo-testing',
      name: 'CAIRO Structure Testing',
      description: 'Pipeline for testing and debugging CAIRO XML structure',
      type: 'minimal',
      complexity: 'low',
      nodes: [
        this.createTemplateNode(1, 'read-file', { x: 100, y: 100 }, { fileType: 'XML' }),
        this.createTemplateNode(2, 'xml-element-selector', { x: 400, y: 100 }, { xpath: 'log/trace', outputFormat: 'Element List' }),
        this.createTemplateNode(3, 'xml-element-selector', { x: 400, y: 250 }, { xpath: './/string[@key="concept:name"]', outputFormat: 'Attribute Values' }),
        this.createTemplateNode(4, 'xml-element-selector', { x: 400, y: 400 }, { xpath: './/list', outputFormat: 'Element List' }),
        this.createTemplateNode(5, 'table-output', { x: 700, y: 100 }, { maxRows: 20 }),
        this.createTemplateNode(6, 'table-output', { x: 700, y: 250 }, { maxRows: 20 }),
        this.createTemplateNode(7, 'table-output', { x: 700, y: 400 }, { maxRows: 20 })
      ],
      connections: [
        this.createTemplateConnection('node-1', 'node-2', 0, 0),
        this.createTemplateConnection('node-1', 'node-3', 0, 0),
        this.createTemplateConnection('node-1', 'node-4', 0, 0),
        this.createTemplateConnection('node-2', 'node-5', 0, 0),
        this.createTemplateConnection('node-3', 'node-6', 0, 0),
        this.createTemplateConnection('node-4', 'node-7', 0, 0)
      ],
      configuration: {},
      instructions: [
        '1. Upload CAIRO XML file',
        '2. Test different XPath expressions to understand structure',
        '3. View trace elements, concept names, and list structures separately',
        '4. Use results to configure proper CAIRO processing pipeline',
        '5. Switch to Basic template once structure is understood'
      ]
    };
  }

  /**
   * Create template node.
   */
  private createTemplateNode(nodeNumber: number, type: string, position: {x: number, y: number}, config: any): any {
    return {
      id: `node-${nodeNumber}`,
      type: type,
      position: position,
      config: config
    };
  }

  /**
   * Create template connection.
   */
  private createTemplateConnection(fromNodeId: string, toNodeId: string, fromPortIndex: number, toPortIndex: number): any {
    return {
      id: `connection-${fromNodeId}-${toNodeId}`,
      fromNodeId: fromNodeId,
      fromPortId: `${fromNodeId}-output-${fromPortIndex}`,
      toNodeId: toNodeId,
      toPortId: `${toNodeId}-input-${toPortIndex}`,
      dataType: 'auto'
    };
  }

  /**
   * Generate custom instructions based on analysis.
   */
  private generateCustomInstructions(analysis: CAIROAnalysis): string[] {
    const instructions = [
      '1. Upload your CAIRO XML file',
      '2. Extract traces from the log structure'
    ];

    if (analysis.traceCount > 0) {
      instructions.push(`3. Process ${analysis.traceCount} traces into case objects`);
    }

    if (analysis.streamPointCount > 0) {
      instructions.push(`4. Extract ${analysis.streamPointCount} stream measurement points`);
      instructions.push('5. Transform stream points into IoT events');
      instructions.push('6. Link events to case objects');
    }

    if (analysis.streamPointCount > 1000) {
      instructions.push('7. Consider using Stream Aggregator for better performance');
    }

    instructions.push('8. Build CORE metamodel from all components');
    instructions.push('9. Export to OCEL format for analysis');

    return instructions;
  }

  /**
   * Apply template with file-specific configuration.
   */
  applyTemplateWithAnalysis(templateId: string, analysis: CAIROAnalysis): void {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Generate file-specific configuration
    const customConfig = this.generateFileSpecificConfig(analysis);

    // Load template with custom configuration
    this.loadTemplate(templateId, customConfig);

    console.log('Applied CAIRO template with file-specific configuration:', customConfig);
  }

  /**
   * Generate file-specific configuration.
   */
  private generateFileSpecificConfig(analysis: CAIROAnalysis): Record<string, any> {
    const config: Record<string, any> = {};

    // Configure based on analysis results
    if (analysis.suggestedConfiguration) {
      Object.assign(config, analysis.suggestedConfiguration);
    }

    // Add performance optimizations based on data size
    if (analysis.streamPointCount > 1000) {
      config['stream-aggregator'] = {
        aggregationField: 'stream:value',
        aggregationFunction: 'mean',
        timeWindow: Math.min(300, Math.max(60, analysis.streamPointCount / 100))
      };
    }

    // Configure event ID pattern based on data characteristics
    if (analysis.traceCount > 100) {
      config['iot-event-from-stream'] = {
        ...config['iot-event-from-stream'],
        eventIdPattern: '{uuid8}-{stream_id}-{trace_id}'
      };
    }

    return config;
  }

  /**
   * Get template loading status.
   */
  getTemplateLoadingStatus(): Observable<any> {
    return new Observable(observer => {
      // Monitor node and connection creation
      this.nodeService.nodes$.subscribe(nodes => {
        this.mappingService.connectionObserver$.subscribe(connections => {
          observer.next({
            nodesLoaded: nodes.length,
            connectionsLoaded: connections.length,
            isComplete: nodes.length > 0 && connections.length > 0
          });
        });
      });
    });
  }

  /**
   * Validate loaded template.
   */
  validateLoadedTemplate(): Observable<any> {
    const nodes = this.nodeService.getAllNodes();
    const connections = this.mappingService.connectionObserver$.getValue();
    const pipeline = this.apiService.createPipelineDefinition(nodes, connections);

    return this.apiService.validatePipeline(pipeline);
  }

  /**
   * Get template usage statistics.
   */
  getTemplateStats(): any {
    return {
      totalTemplates: this.availableTemplates.length,
      cairoTemplates: this.availableTemplates.filter(t => t.id.includes('cairo')).length,
      complexityDistribution: {
        low: this.availableTemplates.filter(t => t.complexity === 'low').length,
        medium: this.availableTemplates.filter(t => t.complexity === 'medium').length,
        high: this.availableTemplates.filter(t => t.complexity === 'high').length
      }
    };
  }

  /**
   * Export current pipeline as custom CAIRO template.
   */
  exportAsTemplate(name: string, description: string): CAIROTemplate {
    const nodes = this.nodeService.getAllNodes();
    const connections = this.mappingService.connectionObserver$.getValue();

    return {
      id: `custom-${Date.now()}`,
      name: name,
      description: description,
      type: 'custom',
      complexity: this.estimateComplexity(nodes),
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        config: node.config || {}
      })),
      connections: connections.map((conn, index) => ({
        id: `connection-${index}`,
        fromNodeId: this.apiService['extractNodeIdFromPortId'](conn.from),
        fromPortId: conn.from,
        toNodeId: this.apiService['extractNodeIdFromPortId'](conn.to),
        toPortId: conn.to,
        dataType: 'auto'
      })),
      configuration: this.extractCurrentConfiguration(nodes),
      instructions: [
        'This is a custom template exported from your current pipeline',
        'Review and adjust configurations as needed',
        'Test with your specific CAIRO data format'
      ]
    };
  }

  /**
   * Estimate pipeline complexity.
   */
  private estimateComplexity(nodes: any[]): 'low' | 'medium' | 'high' {
    const nodeCount = nodes.length;
    const cairoNodes = nodes.filter(node => this.isCAIRONode(node.type)).length;

    if (nodeCount > 10 || cairoNodes > 6) {
      return 'high';
    } else if (nodeCount > 5 || cairoNodes > 3) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Check if node type is CAIRO-specific.
   */
  private isCAIRONode(nodeType: string): boolean {
    const cairoNodes = [
      'xml-trace-extractor', 'case-object-extractor', 'stream-point-extractor',
      'iot-event-from-stream', 'trace-event-linker', 'stream-aggregator',
      'lifecycle-calculator', 'context-based-linker'
    ];
    return cairoNodes.includes(nodeType);
  }

  /**
   * Extract current configuration from nodes.
   */
  private extractCurrentConfiguration(nodes: any[]): Record<string, any> {
    const config: Record<string, any> = {};

    nodes.forEach(node => {
      if (node.config && Object.keys(node.config).length > 0) {
        config[node.type] = node.config;
      }
    });

    return config;
  }

  /**
   * Reset analysis state.
   */
  resetAnalysis(): void {
    this.currentAnalysis.next(null);
  }

  /**
   * Get processing recommendations for current analysis.
   */
  getProcessingRecommendations(): string[] {
    const analysis = this.currentAnalysis.getValue();
    if (!analysis || !analysis.isCAIROFormat) {
      return ['Upload a CAIRO XML file to get specific recommendations'];
    }

    const recommendations = [...analysis.processingHints];

    // Add context-specific recommendations
    if (analysis.traceCount > 100) {
      recommendations.push('Consider using advanced template with performance optimizations');
    }

    if (analysis.streamPointCount > 5000) {
      recommendations.push('Use Stream Aggregator to reduce processing time');
      recommendations.push('Enable intermediate result caching');
    }

    if (analysis.traceCount === 0) {
      recommendations.push('Check XML structure - no traces found with current configuration');
    }

    return recommendations;
  }
}
