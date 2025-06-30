# BROOM User Manual - IoT-Enhanced Process Mining Toolbox

## SYSTEM REQUIREMENTS
- Node.js 18+
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Backend server running on http://localhost:5100 or https://iot-pm-suite-backend.onrender.com

## INSTALLATION
```
npm install
npm start
```

Application runs on http://localhost:4200

## FIRST STEPS TO THE EDITOR

### Getting Started - Your First Pipeline
1. Open the application in your browser
2. You will see a left sidebar with node categories and a main canvas area
3. Check the "Server Status" section at bottom of sidebar - should show green "Connected" indicator

### Creating Your First Simple Pipeline
1. Expand "Data Input & Loading" category in left sidebar
2. Drag "Read File" node onto the canvas
3. Click on the Read File node to select it
4. In the node body, click "Choose File" and select a CSV file
5. Set "File Type" dropdown to "CSV"
6. Set "Encoding" to "UTF-8"

7. Expand "Data Processing" category
8. Drag "Column Selector" node onto canvas to the right of Read File node
9. Click Column Selector node
10. In "Column Name" field, enter the name of a column from your CSV file

11. Connect the nodes:
    - Click and drag from blue "Raw Data" output port of Read File node
    - Drag to blue "Raw Data" input port of Column Selector node
    - A connection line appears

12. Expand "Output & Export" category
13. Drag "Table Output" node to the right of Column Selector
14. Connect red "Series" output of Column Selector to cyan "Data" input of Table Output

15. Click "Validate" button in toolbar - should show "Pipeline is valid"
16. Click "Execute Pipeline" button
17. Check Table Output node for results

### Understanding the Interface Elements
- Left sidebar contains all available nodes organized by category
- Main canvas is where you build your pipeline by dragging and connecting nodes
- Each node has colored ports (input on left, output on right)
- Colors represent data types - same colors can connect together
- Node bodies contain configuration options specific to each node type
- Toolbar at top of sidebar contains pipeline operations

### Basic Node Configuration
- Red asterisk (*) indicates required fields
- Red border around fields means required information is missing
- File upload nodes require both file selection and format specification
- Text fields accept direct input
- Dropdowns provide predefined options
- Test buttons verify individual node configuration

## INTERFACE OVERVIEW

### Layout Components
- Left Sidebar: Node library, pipeline controls, server status
- Main Area: Visual pipeline editor with drag-and-drop canvas
- Node Categories: Collapsible sections containing node types
- Toolbar: Pipeline operations (execute, validate, save, load)

### Data Type Color Coding
- Blue: Raw Data (DataFrame)
- Red: Series  
- Yellow: Attribute
- Green: Events
- Purple: Objects
- Orange: Relationships
- Cyan: CORE Model

## PORT CONNECTION RULES
- Output ports (right side) connect to input ports (left side)
- Only same-colored ports can connect
- Multiple connections allowed per port
- No self-connections or cycles permitted
- Invalid connections are automatically rejected

## NODE TYPES AND USAGE

### Data Input & Loading

#### Read File
- Purpose: Load data from files
- Inputs: None
- Outputs: Raw Data (blue)
- Configuration: File upload, file type selection, encoding
- Required: File selection, file type

### Data Processing Nodes

#### Column Selector
- Purpose: Extract specific column from DataFrame
- Inputs: Raw Data (blue)
- Outputs: Series (red)
- Configuration: Column name
- Required: Column name

#### Attribute Selector
- Purpose: Extract attributes from Series data
- Inputs: Series (red)
- Outputs: Attribute (yellow)
- Configuration: Attribute key, default value
- Required: Attribute key

#### Data Filter
- Purpose: Apply filter conditions to Series
- Inputs: Series (red)
- Outputs: Series (red)
- Configuration: Filter condition, operator
- Required: Condition, operator

#### Data Mapper
- Purpose: Transform Series data with expressions
- Inputs: Series (red)
- Outputs: Series (red)
- Configuration: Mapping type, expression
- Required: Mapping type, expression

### CORE Model Creation Nodes

#### IoT Event
- Purpose: Create IoT events for CORE model
- Inputs: ID (yellow), Type (yellow), Timestamp (yellow), Metadata (yellow)
- Outputs: IoT Event (green)
- Configuration: Default event type
- Required: All inputs connected

#### Process Event
- Purpose: Create process events for CORE model
- Inputs: ID, Type, Timestamp, Metadata, Activity Label (all yellow)
- Outputs: Process Event (green)
- Configuration: Default event type
- Required: All inputs connected

#### Object Creator
- Purpose: Create objects with metadata
- Inputs: ID, Type, Class, Metadata (all yellow)
- Outputs: Object (purple)
- Configuration: Default object class
- Required: All inputs connected

### Utility Nodes

#### Unique ID Generator
- Purpose: Generate unique identifiers
- Inputs: None
- Outputs: ID (yellow)
- Configuration: ID type, prefix
- Required: ID type

#### Object Class Selector
- Purpose: Select predefined object classes
- Inputs: None
- Outputs: Class (yellow)
- Configuration: Object class selection
- Required: Object class

### Relationship Nodes

#### Event-Object Relation
- Purpose: Link events to objects
- Inputs: Event (green), Object (purple)
- Outputs: E-O Relationship (orange)
- Configuration: Relationship type
- Required: Relationship type

#### Event-Event Relation
- Purpose: Create event derivation relationships
- Inputs: Source Event (green), Target Event (green)
- Outputs: E-E Relationship (orange)
- Configuration: Relationship qualifier
- Required: Relationship qualifier

### Output & Export Nodes

#### CORE Metamodel
- Purpose: Construct final metamodel
- Inputs: Process Events, IoT Events, Relationships
- Outputs: CORE Metamodel (cyan)
- Configuration: None (display only)

#### Table Output
- Purpose: Display data in tabular format
- Inputs: Data (cyan)
- Outputs: None
- Configuration: Max rows to display

#### Export to OCEL
- Purpose: Export to OCEL 2.0 format
- Inputs: CORE Metamodel (cyan)
- Outputs: None
- Configuration: Export format, filename
- Required: Export format

#### OCPM Discovery
- Purpose: Object-centric process model discovery
- Inputs: CORE Metamodel (cyan)
- Outputs: None
- Configuration: Discovery algorithm, filter noise
- Required: Discovery algorithm

## PIPELINE OPERATIONS

### Pipeline Validation
- Click "Validate" button in toolbar
- Checks for required configurations
- Verifies connection compatibility
- Identifies disconnected nodes
- Reports errors and warnings
- Must pass validation before execution

### Pipeline Execution
- Click "Execute Pipeline" button
- Requires valid pipeline
- Requires backend server connection
- Processes data through node sequence
- Results appear in output nodes
- Status indicators show progress

### Save Pipeline
- Click "Save Pipeline" in toolbar
- Enter pipeline name and description
- Optionally enter version number
- Downloads JSON file to local machine
- Includes all node configurations and connections

### Load Pipeline
- Click "Load Pipeline" in toolbar
- Select previously saved JSON pipeline file
- Automatically restores all nodes and connections
- Preserves node positions and configurations
- Overwrites current pipeline

### Clear Pipeline
- Click "Clear Pipeline" in toolbar
- Removes all nodes and connections
- Requires confirmation
- Cannot be undone

## FILE MANAGEMENT

### Supported Data Formats
- CSV: Comma-separated values with headers
- JSON: JavaScript Object Notation with structured data
- XML: Extensible Markup Language with defined schema
- YAML: YAML Ain't Markup Language with nested structure
- XES: eXtensible Event Stream for process mining

### Dataset Upload Process
1. Click "Upload Dataset" in toolbar
2. Select file from local system
3. File automatically uploads to backend server
4. Server stores file for pipeline processing
5. File becomes available for Read File nodes

### Pipeline File Format
- Saved as JSON with .json extension
- Contains complete pipeline definition
- Includes node types, positions, configurations
- Includes connection definitions
- Portable between different installations

## SERVER STATUS AND CONNECTION

### Connection Indicators
- Green dot with "Connected": Backend server accessible
- Red dot with "Disconnected": Cannot reach backend server
- Orange dot with "Error": Connection attempt failed

### Test Connection
- Click "Test Connection" button
- Verifies backend server availability
- Required for file upload operations
- Required for pipeline execution
- Updates connection status indicator

### Backend Requirements
- Flask server running on specified port
- API endpoints for file upload, validation, execution
- CORS configured for frontend domain
- Sufficient disk space for uploaded files
