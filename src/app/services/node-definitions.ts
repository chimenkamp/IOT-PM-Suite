
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
  hasImageDisplay?: boolean;
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

  // ============ CAIRO XML PARSING NODES ============
  'xml-trace-extractor': {
    inputs: [{ id: '{nodeId}-input-0', color: 'nord-blue', label: 'XML Data' }],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-red', label: 'Traces' }],
    content: {
      title: 'XML Trace Extractor',
      description: 'Extract traces from XML log structure (CAIRO format)',
      inputFields: [
        {
          key: 'traceXPath',
          label: 'Trace XPath',
          type: 'text',
          placeholder: 'log/trace',
          required: true
        },
        {
          key: 'traceIdentifier',
          label: 'Trace ID Attribute',
          type: 'text',
          placeholder: 'concept:name',
          required: true
        }
      ]
    }
  },

  'case-object-extractor': {
    inputs: [{ id: '{nodeId}-input-0', color: 'nord-red', label: 'Traces' }],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-purple', label: 'Case Objects' }],
    content: {
      title: 'Case Object Extractor',
      description: 'Extract case objects from trace data with lifecycle information',
      inputFields: [
        {
          key: 'caseIdAttribute',
          label: 'Case ID Attribute',
          type: 'text',
          placeholder: 'concept:name',
          required: true
        },
        {
          key: 'objectType',
          label: 'Object Type',
          type: 'text',
          placeholder: 'case_object',
          required: true
        },
        {
          key: 'extractLifecycle',
          label: 'Extract Lifecycle',
          type: 'checkbox',
          required: false
        }
      ]
    }
  },

  'stream-point-extractor': {
    inputs: [{ id: '{nodeId}-input-0', color: 'nord-red', label: 'Traces' }],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-red', label: 'Stream Points' }],
    content: {
      title: 'Stream Point Extractor',
      description: 'Extract stream points from trace data structure',
      inputFields: [
        {
          key: 'streamPointsPath',
          label: 'Stream Points Path',
          type: 'text',
          placeholder: 'list/list/list',
          required: true
        },
        {
          key: 'timestampField',
          label: 'Timestamp Field',
          type: 'text',
          placeholder: 'date',
          required: true
        },
        {
          key: 'eventDataPath',
          label: 'Event Data Path',
          type: 'text',
          placeholder: 'string',
          required: true
        }
      ]
    }
  },

  'iot-event-from-stream': {
    inputs: [
      { id: '{nodeId}-input-0', color: 'nord-red', label: 'Stream Points' },
      { id: '{nodeId}-input-1', color: 'nord-yellow', label: 'Case ID' }
    ],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-green', label: 'IoT Events' }],
    content: {
      title: 'IoT Event From Stream',
      description: 'Create IoT events from stream point data with case context',
      inputFields: [
        {
          key: 'streamIdField',
          label: 'Stream ID Field',
          type: 'text',
          placeholder: 'stream:id',
          required: true
        },
        {
          key: 'streamSourceField',
          label: 'Stream Source Field',
          type: 'text',
          placeholder: 'stream:source',
          required: true
        },
        {
          key: 'streamValueField',
          label: 'Stream Value Field',
          type: 'text',
          placeholder: 'stream:value',
          required: true
        },
        {
          key: 'eventClass',
          label: 'Event Class',
          type: 'select',
          options: ['iot_event', 'sensor_event', 'measurement_event'],
          required: true
        }
      ]
    }
  },

  'trace-event-linker': {
    inputs: [
      { id: '{nodeId}-input-0', color: 'nord-green', label: 'IoT Events' },
      { id: '{nodeId}-input-1', color: 'nord-purple', label: 'Case Objects' }
    ],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-orange', label: 'E-O Relationships' }],
    content: {
      title: 'Trace Event Linker',
      description: 'Link IoT events to their corresponding case objects',
      inputFields: [
        {
          key: 'linkingAttribute',
          label: 'Linking Attribute',
          type: 'text',
          placeholder: 'concept:name',
          required: true
        },
        {
          key: 'relationshipType',
          label: 'Relationship Type',
          type: 'select',
          options: ['belongs_to', 'involves', 'executes', 'monitors'],
          required: true
        }
      ]
    }
  },

  // ============ GENERIC XML PROCESSING NODES ============
  'xml-element-selector': {
    inputs: [{ id: '{nodeId}-input-0', color: 'nord-blue', label: 'XML Data' }],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-red', label: 'Elements' }],
    content: {
      title: 'XML Element Selector',
      description: 'Select specific elements from XML structure using XPath',
      inputFields: [
        {
          key: 'xpath',
          label: 'XPath Expression',
          type: 'text',
          placeholder: '//trace | //event | //string[@key="concept:name"]',
          required: true
        },
        {
          key: 'outputFormat',
          label: 'Output Format',
          type: 'select',
          options: ['Element List', 'Text Values', 'Attribute Values'],
          required: true
        }
      ]
    }
  },

  'xml-attribute-extractor': {
    inputs: [{ id: '{nodeId}-input-0', color: 'nord-red', label: 'XML Elements' }],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-yellow', label: 'Attributes' }],
    content: {
      title: 'XML Attribute Extractor',
      description: 'Extract attributes from XML elements',
      inputFields: [
        {
          key: 'attributeName',
          label: 'Attribute Name',
          type: 'text',
          placeholder: 'key | value | concept:name',
          required: true
        },
        {
          key: 'defaultValue',
          label: 'Default Value',
          type: 'text',
          placeholder: 'Value if attribute not found',
          required: false
        },
        {
          key: 'dataType',
          label: 'Expected Data Type',
          type: 'select',
          options: ['string', 'number', 'date', 'boolean'],
          required: false
        }
      ]
    }
  },

  'nested-list-processor': {
    inputs: [{ id: '{nodeId}-input-0', color: 'nord-red', label: 'Nested Data' }],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-red', label: 'Flattened Data' }],
    content: {
      title: 'Nested List Processor',
      description: 'Process nested list structures from XML (list/list/list)',
      inputFields: [
        {
          key: 'nestingDepth',
          label: 'Nesting Depth',
          type: 'number',
          placeholder: '3',
          required: true
        },
        {
          key: 'processingMode',
          label: 'Processing Mode',
          type: 'select',
          options: ['Flatten All', 'Extract Level', 'Preserve Structure'],
          required: true
        },
        {
          key: 'targetLevel',
          label: 'Target Level (if Extract Level)',
          type: 'number',
          placeholder: '2',
          required: false
        }
      ]
    }
  },

  // ============ TEMPORAL DATA PROCESSING NODES ============
  'lifecycle-calculator': {
    inputs: [{ id: '{nodeId}-input-0', color: 'nord-red', label: 'Stream Points' }],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-yellow', label: 'Lifecycle Data' }],
    content: {
      title: 'Lifecycle Calculator',
      description: 'Calculate lifecycle start/end times from stream data',
      inputFields: [
        {
          key: 'timestampField',
          label: 'Timestamp Field',
          type: 'text',
          placeholder: 'date/@value',
          required: true
        },
        {
          key: 'calculationMode',
          label: 'Calculation Mode',
          type: 'select',
          options: ['First-Last', 'Min-Max', 'Custom Range'],
          required: true
        },
        {
          key: 'outputFormat',
          label: 'Output Format',
          type: 'select',
          options: ['ISO String', 'Timestamp', 'Duration'],
          required: true
        }
      ]
    }
  },

  'stream-aggregator': {
    inputs: [{ id: '{nodeId}-input-0', color: 'nord-red', label: 'Stream Points' }],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-red', label: 'Aggregated Data' }],
    content: {
      title: 'Stream Aggregator',
      description: 'Aggregate stream data by time windows or event groups',
      inputFields: [
        {
          key: 'aggregationField',
          label: 'Aggregation Field',
          type: 'text',
          placeholder: 'stream:value',
          required: true
        },
        {
          key: 'aggregationFunction',
          label: 'Aggregation Function',
          type: 'select',
          options: ['mean', 'sum', 'count', 'min', 'max', 'std'],
          required: true
        },
        {
          key: 'groupByField',
          label: 'Group By Field',
          type: 'text',
          placeholder: 'stream:source',
          required: false
        },
        {
          key: 'timeWindow',
          label: 'Time Window (seconds)',
          type: 'number',
          placeholder: '60',
          required: false
        }
      ]
    }
  },

  // ============ GENERIC OBJECT CREATION NODES ============
  'dynamic-object-creator': {
    inputs: [
      { id: '{nodeId}-input-0', color: 'nord-yellow', label: 'Object ID' },
      { id: '{nodeId}-input-1', color: 'nord-yellow', label: 'Object Type' },
      { id: '{nodeId}-input-2', color: 'nord-red', label: 'Attributes Data' }
    ],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-purple', label: 'Objects' }],
    content: {
      title: 'Dynamic Object Creator',
      description: 'Create objects dynamically from attribute data',
      inputFields: [
        {
          key: 'objectClass',
          label: 'Object Class',
          type: 'select',
          options: ['CASE_OBJECT', 'SENSOR', 'INFORMATION_SYSTEM', 'BUSINESS_OBJECT', 'RESOURCE'],
          required: true
        },
        {
          key: 'attributeMapping',
          label: 'Attribute Mapping (JSON)',
          type: 'text',
          placeholder: '{"concept:name": "id_field", "lifecycle:start": "start_field"}',
          required: false
        }
      ]
    }
  },

  'attribute-mapper': {
    inputs: [{ id: '{nodeId}-input-0', color: 'nord-red', label: 'Source Data' }],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-yellow', label: 'Mapped Attributes' }],
    content: {
      title: 'Attribute Mapper',
      description: 'Map and transform attributes from source data',
      inputFields: [
        {
          key: 'sourceField',
          label: 'Source Field',
          type: 'text',
          placeholder: 'string/@value',
          required: true
        },
        {
          key: 'targetAttribute',
          label: 'Target Attribute',
          type: 'text',
          placeholder: 'concept:name',
          required: true
        },
        {
          key: 'transformation',
          label: 'Transformation',
          type: 'select',
          options: ['none', 'to_string', 'to_number', 'to_date', 'extract_uuid'],
          required: false
        },
        {
          key: 'prefix',
          label: 'Value Prefix',
          type: 'text',
          placeholder: 'event_',
          required: false
        }
      ]
    }
  },

  // ============ STREAM PROCESSING NODES ============
  'stream-event-creator': {
    inputs: [
      { id: '{nodeId}-input-0', color: 'nord-red', label: 'Stream Points' },
      { id: '{nodeId}-input-1', color: 'nord-yellow', label: 'Case Context' }
    ],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-green', label: 'Stream Events' }],
    content: {
      title: 'Stream Event Creator',
      description: 'Create events from individual stream measurement points',
      inputFields: [
        {
          key: 'eventIdPattern',
          label: 'Event ID Pattern',
          type: 'text',
          placeholder: '{uuid8}-{stream_id}',
          required: true
        },
        {
          key: 'eventClass',
          label: 'Event Class',
          type: 'select',
          options: ['iot_event', 'sensor_event', 'measurement_event', 'observation_event'],
          required: true
        },
        {
          key: 'timestampMapping',
          label: 'Timestamp Field Mapping',
          type: 'text',
          placeholder: 'date/@value',
          required: true
        }
      ]
    }
  },

  'stream-metadata-extractor': {
    inputs: [{ id: '{nodeId}-input-0', color: 'nord-red', label: 'Stream Points' }],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-yellow', label: 'Stream Metadata' }],
    content: {
      title: 'Stream Metadata Extractor',
      description: 'Extract metadata from stream measurement points',
      inputFields: [
        {
          key: 'metadataFields',
          label: 'Metadata Fields (JSON)',
          type: 'text',
          placeholder: '["stream:source", "stream:value", "stream:id"]',
          required: true
        },
        {
          key: 'keyAttribute',
          label: 'Key Attribute',
          type: 'text',
          placeholder: '@key',
          required: true
        },
        {
          key: 'valueAttribute',
          label: 'Value Attribute',
          type: 'text',
          placeholder: '@value',
          required: true
        }
      ]
    }
  },

  // ============ RELATIONSHIP CREATION NODES ============
  'context-based-linker': {
    inputs: [
      { id: '{nodeId}-input-0', color: 'nord-green', label: 'Events' },
      { id: '{nodeId}-input-1', color: 'nord-purple', label: 'Objects' }
    ],
    outputs: [{ id: '{nodeId}-output-0', color: 'nord-orange', label: 'Context Relationships' }],
    content: {
      title: 'Context-Based Linker',
      description: 'Create relationships based on shared context attributes',
      inputFields: [
        {
          key: 'contextAttribute',
          label: 'Context Attribute',
          type: 'text',
          placeholder: 'concept:name',
          required: true
        },
        {
          key: 'relationshipType',
          label: 'Relationship Type',
          type: 'select',
          options: ['belongs_to', 'monitors', 'observes', 'measures', 'tracks'],
          required: true
        },
        {
          key: 'matchingStrategy',
          label: 'Matching Strategy',
          type: 'select',
          options: ['exact_match', 'contains', 'starts_with', 'regex'],
          required: true
        }
      ]
    }
  },

  // ============ EXISTING DATA PROCESSING NODES ============
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
      { id: '{nodeId}-input-2', color: 'nord-orange', label: 'Relationships' },
      { id: '{nodeId}-input-3', color: 'nord-purple', label: 'Objects' }
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
      displayOnly: true, // This makes it a display node
      hasImageDisplay: true, // New property for image display capability
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
        },
        {
          key: 'showStatistics',
          label: 'Show Discovery Statistics',
          type: 'checkbox',
          required: false
        }
      ]
    }
  }
};
