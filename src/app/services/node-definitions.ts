// src/app/services/node-definitions.ts

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
  hasFileUpload?: boolean;
  hasMultipleInputs?: boolean;
  inputFields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'number' | 'checkbox';
    options?: string[];
    placeholder?: string;
    required?: boolean;
  }>;
}

export interface FlowNode {
  id: string;
  type: string;
  position: Position;
  inputs: NodeHandle[];
  outputs: NodeHandle[];
  content: NodeContent;
  config?: Record<string, any>;
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
  // ============ DATA INPUT & LOADING NODES ============
  'read-file': {
    inputs: [],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-blue', label: 'Raw Data' }],
    content: {
      title: 'Read File',
      description: 'Load data from CSV, XML, YAML or JSON files',
      hasFileUpload: true,
      inputFields: [
        {
          key: 'fileType',
          label: 'File Type',
          type: 'select',
          options: ['CSV', 'XML', 'YAML', 'JSON', 'XES'],
          required: true
        },
        {
          key: 'encoding',
          label: 'Encoding',
          type: 'select',
          options: ['UTF-8', 'ISO-8859-1', 'ASCII'],
          required: false
        }
      ]
    }
  },

  // ============ DATA PROCESSING NODES ============
  'column-selector': {
    inputs: [{ id: '{nodeId}-input-0', color: 'nord-blue', label: 'Raw Data' }],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-red', label: 'Series' }],
    content: {
      title: 'Column Selector',
      description: 'Takes Raw Data and converts specific column to Series',
      inputFields: [
        {
          key: 'columnName',
          label: 'Column Name',
          type: 'text',
          placeholder: 'Enter column name',
          required: true
        }
      ]
    }
  },

  'attribute-selector': {
    inputs: [{ id: '{nodeId}-input-0', color: 'nord-red', label: 'Series' }],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-yellow', label: 'Attribute' }],
    content: {
      title: 'Attribute Selector',
      description: 'Select attributes from Series data',
      inputFields: [
        {
          key: 'attributeKey',
          label: 'Attribute Key',
          type: 'text',
          placeholder: 'concept:name, time:timestamp, etc.',
          required: true
        },
        {
          key: 'defaultValue',
          label: 'Default Value',
          type: 'text',
          placeholder: 'Value if attribute not found',
          required: false
        }
      ]
    }
  },

  'data-filter': {
    inputs: [{ id: '{nodeId}-input-0', color: 'nord-red', label: 'Series' }],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-red', label: 'Series' }],
    content: {
      title: 'Data Filter',
      description: 'Apply conditions to filter Series data',
      inputFields: [
        {
          key: 'condition',
          label: 'Filter Condition',
          type: 'text',
          placeholder: 'value > 10, contains("text"), etc.',
          required: true
        },
        {
          key: 'operator',
          label: 'Operator',
          type: 'select',
          options: ['>', '<', '>=', '<=', '==', '!=', 'contains', 'startswith', 'endswith'],
          required: true
        }
      ]
    }
  },

  'data-mapper': {
    inputs: [{ id: '{nodeId}-input-0', color: 'nord-red', label: 'Series' }],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-red', label: 'Series' }],
    content: {
      title: 'Data Mapper',
      description: 'Apply mapping transformations to Series data',
      inputFields: [
        {
          key: 'mappingType',
          label: 'Mapping Type',
          type: 'select',
          options: ['Value Mapping', 'Expression', 'Format Conversion'],
          required: true
        },
        {
          key: 'expression',
          label: 'Mapping Expression',
          type: 'text',
          placeholder: 'lambda x: x.upper(), {old: new}, etc.',
          required: true
        }
      ]
    }
  },

  // ============ CORE MODEL CREATION NODES ============
  'iot-event': {
    inputs: [
      { id: '{nodeId}-input-0', color: 'nord-yellow', label: 'ID' },
      { id: '{nodeId}-input-1', color: 'nord-yellow', label: 'Type' },
      { id: '{nodeId}-input-2', color: 'nord-yellow', label: 'Timestamp' },
      { id: '{nodeId}-input-3', color: 'nord-yellow', label: 'Metadata' }
    ],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-green', label: 'IoT Event' }],
    content: {
      title: 'IoT Event',
      description: 'Create IoT events for CORE model from sensor data',
      inputFields: [
        {
          key: 'eventType',
          label: 'Default Event Type',
          type: 'text',
          placeholder: 'sensor_reading, measurement, etc.',
          required: false
        }
      ]
    }
  },

  'process-event': {
    inputs: [
      { id: '{nodeId}-input-0', color: 'nord-yellow', label: 'ID' },
      { id: '{nodeId}-input-1', color: 'nord-yellow', label: 'Type' },
      { id: '{nodeId}-input-2', color: 'nord-yellow', label: 'Timestamp' },
      { id: '{nodeId}-input-3', color: 'nord-yellow', label: 'Metadata' },
      { id: '{nodeId}-input-4', color: 'nord-yellow', label: 'Activity Label' }
    ],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-green', label: 'Process Event' }],
    content: {
      title: 'Process Event',
      description: 'Create process events for CORE model',
      inputFields: [
        {
          key: 'eventType',
          label: 'Default Event Type',
          type: 'text',
          placeholder: 'activity_start, activity_complete, etc.',
          required: false
        }
      ]
    }
  },

  'object-creator': {
    inputs: [
      { id: '{nodeId}-input-0', color: 'nord-yellow', label: 'ID' },
      { id: '{nodeId}-input-1', color: 'nord-yellow', label: 'Type' },
      { id: '{nodeId}-input-2', color: 'nord-yellow', label: 'Class' },
      { id: '{nodeId}-input-3', color: 'nord-yellow', label: 'Metadata' }
    ],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-purple', label: 'Object' }],
    content: {
      title: 'Object Creator',
      description: 'Create objects with ID, Type, Class, and Metadata',
      inputFields: [
        {
          key: 'defaultObjectClass',
          label: 'Default Object Class',
          type: 'select',
          options: ['SENSOR', 'ACTUATOR', 'INFORMATION_SYSTEM', 'CASE_OBJECT', 'BUSINESS_OBJECT', 'RESOURCE'],
          required: false
        }
      ]
    }
  },

  // ============ UTILITY NODES ============
  'unique-id-generator': {
    inputs: [],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-yellow', label: 'ID' }],
    content: {
      title: 'Unique ID Generator',
      description: 'Generate unique identifiers for events and objects',
      inputFields: [
        {
          key: 'idType',
          label: 'ID Type',
          type: 'select',
          options: ['UUID4', 'UUID1', 'Incremental', 'Timestamp-based'],
          required: true
        },
        {
          key: 'prefix',
          label: 'ID Prefix',
          type: 'text',
          placeholder: 'Optional prefix for IDs',
          required: false
        }
      ]
    }
  },

  'object-class-selector': {
    inputs: [],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-yellow', label: 'Class' }],
    content: {
      title: 'Object Class Selector',
      description: 'Select object class for CORE model objects',
      inputFields: [
        {
          key: 'objectClass',
          label: 'Object Class',
          type: 'select',
          options: [
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
            'RESOURCE'
          ],
          required: true
        }
      ]
    }
  },

  // ============ RELATIONSHIP NODES ============
  'event-object-relation': {
    inputs: [
      { id: '{nodeId}-input-0', color: 'nord-green', label: 'Event' },
      { id: '{nodeId}-input-1', color: 'nord-purple', label: 'Object' }
    ],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-orange', label: 'E-O Relationship' }],
    content: {
      title: 'Event-Object Relationship',
      description: 'Create relationships between events and objects',
      inputFields: [
        {
          key: 'relationshipType',
          label: 'Relationship Type',
          type: 'select',
          options: ['executes', 'involves', 'uses', 'creates', 'modifies', 'reads'],
          required: true
        }
      ]
    }
  },

  'event-event-relation': {
    inputs: [
      { id: '{nodeId}-input-0', color: 'nord-green', label: 'Source Event' },
      { id: '{nodeId}-input-1', color: 'nord-green', label: 'Target Event' }
    ],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-orange', label: 'E-E Relationship' }],
    content: {
      title: 'Event-Event Relationship',
      description: 'Create derivation relationships between events',
      inputFields: [
        {
          key: 'qualifier',
          label: 'Relationship Qualifier',
          type: 'select',
          options: ['derived_from', 'correlates', 'precedes', 'triggers', 'aggregates'],
          required: true
        }
      ]
    }
  },

  // ============ CORE MODEL CONSTRUCTION ============
  'core-metamodel': {
    inputs: [
      { id: '{nodeId}-input-0', color: 'nord-green', label: 'Process Events' },
      { id: '{nodeId}-input-1', color: 'nord-green', label: 'IoT Events' },
      { id: '{nodeId}-input-2', color: 'nord-orange', label: 'Relationships' }
    ],
    outputs: [{ id: '{nodeId}-output-0', color: 'core-model', label: 'CORE Metamodel' }],
    content: {
      title: 'CORE Metamodel',
      description: 'Construct the final CORE metamodel from events and relationships',
      displayOnly: true,
      status: 'Ready to construct'
    }
  },

  // ============ OUTPUT & EXPORT NODES ============
  'table-output': {
    inputs: [{ id: '{nodeId}-input-0', color: 'core-model', label: 'Data' }],
    outputs: [],
    content: {
      title: 'Table Output',
      description: 'Display data in tabular format',
      displayOnly: true,
      inputFields: [
        {
          key: 'maxRows',
          label: 'Max Rows to Display',
          type: 'number',
          placeholder: '100',
          required: false
        }
      ]
    }
  },

  'export-ocel': {
    inputs: [{ id: '{nodeId}-input-0', color: 'core-model', label: 'CORE Metamodel' }],
    outputs: [],
    content: {
      title: 'Export to OCEL',
      description: 'Export CORE metamodel to OCEL format',
      inputFields: [
        {
          key: 'format',
          label: 'Export Format',
          type: 'select',
          options: ['OCEL 2.0 JSON', 'OCEL 2.0 XML'],
          required: true
        },
        {
          key: 'filename',
          label: 'Filename',
          type: 'text',
          placeholder: 'export.ocel',
          required: false
        }
      ]
    }
  },

  'ocpm-discovery': {
    inputs: [{ id: '{nodeId}-input-0', color: 'core-model', label: 'CORE Metamodel' }],
    outputs: [],
    content: {
      title: 'OCPM Model Discovery',
      description: 'Discover object-centric process model in browser',
      inputFields: [
        {
          key: 'algorithm',
          label: 'Discovery Algorithm',
          type: 'select',
          options: ['Directly-Follows Graph', 'Petri Net', 'BPMN'],
          required: true
        },
        {
          key: 'filterNoise',
          label: 'Filter Noise',
          type: 'checkbox',
          required: false
        }
      ]
    }
  }
};
