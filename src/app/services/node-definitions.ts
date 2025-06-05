export interface NodeHandle {
  id: string;
  color: string;
  label: string;
}

export interface NodeContent {
  title: string;
  description: string;
  hasInput?: boolean;
  inputPlaceholder?: string;
  hasSelect?: boolean;
  selectOptions?: string[];
  selectLabel?: string;
  configOptions?: string[];
  displayOnly?: boolean;
  status?: string;
}

export interface FlowNode {
  id: string;
  type: string;
  position: Position;
  inputs: NodeHandle[];
  outputs: NodeHandle[];
  content: NodeContent;
}

export interface Position {
  x: number;
  y: number;
}

export interface NodeTemplate {
  inputs: NodeHandle[];
  outputs: NodeHandle[];
  content: NodeContent;
}

export const nodeDefinitions: Record<string, NodeTemplate> = {
  // ============ INPUT/LOADING NODES ============
  'file-loader': {
      inputs: [],
      outputs: [{ id: '', color: 'nord-blue', label: 'Raw Data' }],
      content: {
          title: 'File Loader',
          description: 'Load XES/XML event logs',
          hasInput: true,
          inputPlaceholder: 'File path or URL',
          hasSelect: true,
          selectOptions: ['XES', 'CSV', 'YAML', 'JSON'],
      }
  },
  'MQTT-connector': {
      inputs: [],
      outputs: [{ id: '', color: 'nord-blue', label: 'Raw Events' }],
      content: {
          title: 'Data Source',
          description: 'Connect to MQTT broker for real-time data',
          hasInput: true,
          inputPlaceholder: 'MQTT Broker URL',
      }
  },

  // ============ PROCESSING NODES ============
  'event-parser-process': {
      inputs: [
        { id: '', color: 'nord-yellow', label: 'ID' },
        { id: '', color: 'nord-yellow', label: 'Type' },
        { id: '', color: 'nord-yellow', label: 'Timestamp' },
        { id: '', color: 'nord-yellow', label: 'Meta-Data' },
        { id: '', color: 'nord-yellow', label: 'Activity' }
      ],
      outputs: [{ id: '', color: 'nord-green', label: 'Event' }],
      content: {
          title: 'Event Parser',
          description: 'Parse raw XML events to structured data',
      }
  },
  'event-parser-iot': {
      inputs: [
        { id: '', color: 'nord-yellow', label: 'ID' },
        { id: '', color: 'nord-yellow', label: 'Type' },
        { id: '', color: 'nord-yellow', label: 'Timestamp' },
        { id: '', color: 'nord-yellow', label: 'Meta-Data' }
      ],
      outputs: [{ id: '', color: 'nord-green', label: 'Event' }],
      content: {
          title: 'Event Parser',
          description: 'Parse raw XML events to structured data',
      }
  },
  'attribute-selector': {
      inputs: [{ id: '', color: 'nord-red', label: 'Series' }],
      outputs: [{ id: '', color: 'nord-yellow', label: 'Attributes' }],
      content: {
          title: 'Attribute Selector',
          description: 'Extract specific attributes from Series',
          hasInput: true,
          inputPlaceholder: 'Attribute key (e.g., concept:name)',
      }
  },
  'column-selector': {
      inputs: [{ id: '', color: 'nord-blue', label: 'Raw Data' }],
      outputs: [{ id: '', color: 'nord-red', label: 'Series' }],
      content: {
          title: 'Column Selector',
          description: 'Select a specific column from Raw Data',
          hasInput: true,
          inputPlaceholder: 'Column name: ',
      }
  },
  'data-mapper': {
      inputs: [
          { id: '', color: 'nord-yellow', label: 'Source Data' },
          { id: '', color: 'nord-orange', label: 'Mapping Rules' }
      ],
      outputs: [{ id: '', color: 'nord-yellow', label: 'Mapped Data' }],
      content: {
          title: 'Data Mapper',
          description: 'Apply mapping transformations',
          hasInput: true,
          inputPlaceholder: 'Mapping expression'
      }
  },
  'data-filter': {
      inputs: [{ id: '', color: 'nord-red', label: 'Series' }],
      outputs: [{ id: '', color: 'nord-red', label: 'Series' }],
      content: {
          title: 'Data Filter',
          description: 'Filter data based on conditions',
          hasInput: true,
          inputPlaceholder: 'Filter condition'
      }
  },

  // ============ CORE MODEL CREATION NODES ============
  'object-creator': {
      inputs: [
          { id: '', color: 'nord-yellow', label: 'ID' },
          { id: '', color: 'nord-yellow', label: 'Object Type' },
          { id: '', color: 'nord-yellow', label: 'Meta Data' }
      ],
      outputs: [{ id: '', color: 'nord-purple', label: 'Object' }],
      content: {
          title: 'Object Creator',
          description: 'Create CORE model objects',
      }
  },
  'event-object-relation': {
      inputs: [
          { id: '', color: 'nord-green', label: 'Event' },
          { id: '', color: 'nord-purple', label: 'Object' }
      ],
      outputs: [{ id: '', color: 'nord-orange', label: 'E-O Relationship' }],
      content: {
          title: 'Event-Object Relation',
          description: 'Create event-object relationships',
          hasSelect: true,
          selectOptions: ['executes', 'involves', 'uses', 'creates'],
          selectLabel: 'Relationship Type'
      }
  },
  'event-event-relation': {
      inputs: [
          { id: '', color: 'nord-green', label: 'Source Event' },
          { id: '', color: 'nord-green', label: 'Target Event' }
      ],
      outputs: [{ id: '', color: 'nord-orange', label: 'E-E Relationship' }],
      content: {
          title: 'Event-Event Relation',
          description: 'Create event-event relationships',
          hasSelect: true,
          selectOptions: ['derived_from', 'correlates', 'precedes', 'triggers'],
          selectLabel: 'Qualifier'
      }
  },

  // ============ COLLECTION NODES ============
  'objects-collection': {
      inputs: [{ id: '', color: 'nord-purple', label: 'Objects' }],
      outputs: [{ id: '', color: 'nord-purple', label: 'Objects Collection' }],
      content: {
          title: 'Objects Collection',
          description: 'Collect and manage object instances',
          displayOnly: true
      }
  },
  'events-collection': {
      inputs: [{ id: '', color: 'nord-green', label: 'Process Events' }],
      outputs: [{ id: '', color: 'nord-green', label: 'Events Collection' }],
      content: {
          title: 'Process Events Collection',
          description: 'Collect and manage process events',
          displayOnly: true
      }
  },
  'eo-relations-collection': {
      inputs: [{ id: '', color: 'nord-orange', label: 'E-O Relations' }],
      outputs: [{ id: '', color: 'nord-orange', label: 'E-O Collection' }],
      content: {
          title: 'Event-Object Relations',
          description: 'Collect event-object relationships',
          displayOnly: true
      }
  },
  'ee-relations-collection': {
      inputs: [{ id: '', color: 'nord-orange', label: 'E-E Relations' }],
      outputs: [{ id: '', color: 'nord-orange', label: 'E-E Collection' }],
      content: {
          title: 'Event-Event Relations',
          description: 'Collect event-event relationships',
          displayOnly: true
      }
  },

  // ============ OUTPUT NODES ============
  'core-metamodel': {
      inputs: [
          { id: '', color: 'nord-purple', label: 'Objects' },
          { id: '', color: 'nord-green', label: 'Process Events' },
          { id: '', color: 'nord-red', label: 'Observations' },
          { id: '', color: 'nord-orange', label: 'E-O Relations' },
          { id: '', color: 'nord-orange', label: 'E-E Relations' }
      ],
      outputs: [{ id: '', color: 'core-model', label: 'CORE Metamodel' }],
      content: {
          title: 'CORE Metamodel',
          description: 'Final CORE metamodel output',
          displayOnly: true,
          status: 'ready'
      }
  },
  'summary-output': {
      inputs: [{ id: '', color: 'core-model', label: 'CORE Metamodel' }],
      outputs: [],
      content: {
          title: 'Summary Output',
          description: 'Display metamodel summary statistics',
          displayOnly: true
      }
  },
  'table-output': {
      inputs: [{ id: '', color: 'core-model', label: 'Table Data' }],
      outputs: [],
      content: {
          title: 'Table Output',
          description: 'Display data in tabular format',
          displayOnly: true
      }
  },
  'export-output': {
      inputs: [{ id: '', color: 'core-model', label: 'CORE Metamodel' }],
      outputs: [],
      content: {
          title: 'Export Output',
          description: 'Export metamodel to file formats',
          hasSelect: true,
          selectOptions: ['JSON', 'XML', 'OCEL', 'PM4PY'],
          selectLabel: 'Export Format'
      }
  },
  'discover-OCEL-model': {
    inputs: [{ id: '', color: 'core-model', label: 'OCEL Data' }],
    outputs: [],
    content: {
        title: 'OCEL Model Discoverer',
        description: 'Discover OCEL model from data',
        hasInput: true,
        inputPlaceholder: 'OCEL file path or URL'
    }
},

  // ============ UTILITY NODES ============
  'value-extractor': {
      inputs: [{ id: '', color: 'nord-yellow', label: 'Data' }],
      outputs: [{ id: '', color: 'nord-yellow', label: 'Extracted Value' }],
      content: {
          title: 'Value Extractor',
          description: 'Extract specific values from data',
          hasInput: true,
          inputPlaceholder: 'XPath or JSONPath expression'
      }
  },
  'timestamp-parser': {
      inputs: [{ id: '', color: 'nord-yellow', label: 'Timestamp String' }],
      outputs: [{ id: '', color: 'nord-yellow', label: 'DateTime' }],
      content: {
          title: 'Timestamp Parser',
          description: 'Parse timestamp strings to datetime objects',
          hasInput: true,
          inputPlaceholder: 'Date format (e.g., %Y-%m-%d %H:%M:%S)'
      }
  },
  'uuid-generator': {
      inputs: [],
      outputs: [{ id: '', color: 'nord-yellow', label: 'UUID' }],
      content: {
          title: 'UUID Generator',
          description: 'Generate unique identifiers',
          hasSelect: true,
          selectOptions: ['uuid4', 'uuid1', 'incremental'],
          selectLabel: 'ID Type'
      }
  },
  'object-type-provider': {
      inputs: [],
      outputs: [{ id: '', color: 'nord-yellow', label: 'Object Type' }],
      content: {
          title: 'Object Type Provider',
          description: 'Provide object type definitions',
          hasSelect: true,
          selectOptions: [
            'SENSOR',
            'ACTUATOR',
            'INFORMATION_SYSTEM',
            'LINK',
            'CASE_OBJECT',
            'MACHINE',
            'BUSINESS_OBJECT',
            'PROCESS',
            'ACTIVITY',
            'SUBPROCESS',
            'RESOURCE',
          ],
          selectLabel: 'Object Class'
      }
  },
};
