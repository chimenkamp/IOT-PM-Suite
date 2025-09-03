# BROOM: Toolbox for IoT-Enhanced Process Mining

This is the frontend implementation of BROOM (as described in the research paper), a Python-based toolbox for IoT-enhanced process mining that enables bidirectional conversion of event logs between XES-based formats and the OCEL-based CORE metamodel.

Link to the live version: https://broom-iot-toolbox.onrender.com/

## 📋 Overview

BROOM provides a **node-based user interface** for creating data processing pipelines that transform IoT-enriched event logs into the CORE metamodel format. This frontend application implements all the functionality described in Section 3.1 of the research paper.

## 🎯 Features Implemented (Per Paper Section 3.1)

### Data Input & Loading
- **Read File Node**: Load data from CSV, XML, YAML, JSON, and XES files
- **MQTT Connector Node**: Connect to MQTT sensor streams for real-time data ingestion
- Internal mapping to DataFrame structure for all data types

### Data Processing Pipeline
- **Column Selector**: Convert Raw Data columns to Series
- **Attribute Selector**: Extract specific attributes from Series data
- **Data Filter**: Apply conditions to filter Series data  
- **Data Mapper**: Apply mapping transformations to Series data

### CORE Model Construction
- **IoT Event Node**: Create IoT events with ID, Type, Timestamp, and Metadata
- **Process Event Node**: Create process events with additional Activity Label
- **Object Creator**: Create objects with ID, Type, Class, and Metadata
- **Utility Nodes**: Unique ID Generator and Object Class Selector

### Relationships
- **Event-Object Relationship**: Create relationships between events and objects
- **Event-Event Relationship**: Create derivation relationships between events

### Output & Export
- **CORE Metamodel Node**: Final metamodel construction combining all inputs
- **Table Output**: Display data in tabular format
- **Export to OCEL**: Export CORE metamodel to OCEL 2.0 format
- **OCPM Discovery**: Discover object-centric process models in browser

## 🏗️ Architecture (Per Paper Section 3.2)

### Frontend Layer
- **Sidebar**: Node library with drag-and-drop functionality
- **Editor**: Visual pipeline editor with node-based interface
- **Pipeline Controls**: Execute, validate, save, and load pipelines

### Component Structure
```
├── Node Library (Sidebar)
│   ├── Data Input & Loading
│   ├── Data Processing  
│   ├── CORE Model Creation
│   ├── Utilities
│   ├── Relationships
│   └── Output & Export
├── Visual Editor (Canvas)
│   ├── Node Configuration
│   ├── Connection Management
│   └── Pipeline Validation
└── Pipeline Operations
    ├── Save/Load Pipeline
    ├── Dataset Upload
    └── Server Communication
```

### Backend Integration
- **Pipeline Service**: Creates executable pipeline definitions for backend
- **RESTful API**: Communication with Python backend (Flask)
- **File Upload**: Dataset and pipeline file management
- **Execution Monitoring**: Real-time pipeline execution status

## 🔧 Node Types & Data Flow

### Data Types (Port Colors)
- **Blue (nord-blue)**: Raw Data (DataFrame)
- **Red (nord-red)**: Series  
- **Yellow (nord-yellow)**: Attribute
- **Green (nord-green)**: Events (IoT/Process)
- **Purple (nord-purple)**: Objects
- **Orange (nord-orange)**: Relationships  
- **Cyan (core-model)**: CORE Metamodel

### Processing Pipeline Flow
```
Raw Data → Column Selector → Series → Attribute Selector → Attributes
                                ↓
Series → Data Filter/Mapper → Series → Event/Object Creators
                                ↓
Events + Objects → Relationship Creators → Relationships
                                ↓
Events + Objects + Relationships → CORE Metamodel → Export/Visualization
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Angular 20+
- Python 3.12+ (for backend)
- Flask (for backend REST API)

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

### Backend Requirements
The frontend expects a Flask backend running on `http://localhost:5000` with the following endpoints:

```
POST /api/pipeline/execute     # Execute pipeline
GET  /api/pipeline/execution/:id # Get execution status
POST /api/dataset/upload       # Upload dataset
GET  /api/server/status        # Server health check
```

## 📊 Pipeline Validation

The system implements comprehensive pipeline validation:

### Required Components
- At least one **input node** (Read File or MQTT Connector)
- Proper **type compatibility** between connected ports
- **Required configuration** fields completed for all nodes
- **No cycles** in the pipeline graph

### Validation Features
- Real-time connection type checking
- Configuration completeness validation
- Topological sort for execution order
- Error and warning reporting

## 🎨 User Interface Features

### Node Configuration
- **Interactive forms** for each node type
- **File upload** support for data sources
- **Dropdown selections** for predefined options
- **Real-time validation** feedback

### Pipeline Management
- **Save/Load** pipeline definitions as JSON
- **Export** pipeline execution results
- **Statistics** display (nodes, connections, validation status)
- **Server status** monitoring

### Visual Design
- **Nord color scheme** for professional appearance
- **Responsive design** for various screen sizes  
- **Drag-and-drop** interface for node placement
- **Visual feedback** for validation states

## 🔄 Backend Communication

### Pipeline Execution
```typescript
// Pipeline definition sent to backend
interface PipelineDefinition {
  id: string;
  name: string;
  nodes: PipelineNode[];
  connections: PipelineConnection[];
  executionOrder: string[];
}
```

### Data Processing Flow
1. **Frontend**: Create visual pipeline
2. **Validation**: Check pipeline completeness  
3. **Serialization**: Convert to backend format
4. **Execution**: Send to Python backend
5. **Monitoring**: Real-time status updates
6. **Results**: Display execution results

## 📁 File Structure

```
src/app/
├── components/
│   ├── mapping-toolbar/          # Pipeline operations toolbar
│   ├── node-editor/              # Main visual editor
│   └── generic-node/             # Reusable node component
├── services/
│   ├── node.service.ts           # Node management
│   ├── mapping.service.ts        # Connection management  
│   ├── pipeline.service.ts       # Backend integration
│   └── node-definitions.ts       # Node type definitions
└── app.component.ts              # Main application
```

## 🧪 Testing & Development

### Pipeline Testing
- **Individual node testing** before full pipeline execution
- **Connection validation** during pipeline construction
- **Configuration validation** for each node type
- **Mock backend** support for development

### Development Features
- **Hot reload** for rapid development
- **Debug logging** for pipeline construction
- **Error boundaries** for graceful error handling
- **TypeScript** for type safety

## 📚 Mapping to Research Paper

This implementation directly corresponds to the paper's architecture:

| Paper Section | Implementation |
|---------------|----------------|
| 3.1 Functionality | Complete node-based pipeline creation |
| 3.2 Architecture | Frontend/Backend separation with REST API |
| Data Reading | Read File & MQTT Connector nodes |
| Data Processing | Column Selector, Data Filter, Data Mapper |
| CORE Model | IoT Event, Process Event, Object Creator |
| Relationships | Event-Object, Event-Event relationship nodes |
| Export | OCEL export and process discovery |

## 🔧 Configuration

### Environment Setup
```typescript
// Backend URL configuration
const backendUrl = 'http://localhost:5000/api';

// Node definitions can be extended in:
// src/app/services/node-definitions.ts
```

### Extending Node Types
To add new node types:
1. Add definition to `node-definitions.ts`
2. Update node categories in `app.component.ts`  
3. Implement backend processing logic
4. Add validation rules in `pipeline.service.ts`

---

This implementation provides a complete frontend for the BROOM system as described in the research paper, enabling users to create sophisticated IoT-enhanced process mining pipelines through an intuitive visual interface.
