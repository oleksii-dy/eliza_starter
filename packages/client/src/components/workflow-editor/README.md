# Workflow Node Editor

A visual node-based editor for creating and editing ElizaOS workflows using React Flow.

## Features

- **Visual Node Graph**: Workflows are displayed as connected nodes in a visual graph
- **Drag & Drop**: Nodes can be repositioned by dragging
- **Connection Creation**: Create connections between nodes by dragging from output to input handles
- **Multiple Node Types**:
  - **Trigger Node**: Define how the workflow starts (Manual, Event, Cron, or Workflow trigger)
  - **Action Node**: Execute ElizaOS actions
  - **Condition Node**: Branch based on conditions with true/false paths
  - **Wait Node**: Pause execution for a duration or until a condition
  - **Loop Node**: Iterate over items or repeat steps
  - **Parallel Node**: Execute multiple branches in parallel

## Node Types

### Trigger Node (Green)
- Defines how the workflow is initiated
- Types: Manual, Event-based, Cron scheduled, or triggered by another workflow
- Event triggers show real ElizaOS events (MESSAGE_RECEIVED, ENTITY_JOINED, etc.)
- Settings button opens properties panel for configuration
- Always the starting point of a workflow

### Action Node (Blue)
- Executes a registered ElizaOS action
- Selects from real actions fetched from the runtime via `/api/actions`
- Can specify input parameters as JSON
- Settings button opens properties panel with action dropdown

### Condition Node (Yellow)
- Evaluates an expression to determine flow direction
- Has two output handles: True (green) and False (red)
- Supports JavaScript expressions with access to context variables

### Wait Node (Gray)
- Pauses workflow execution
- Can wait for a specific duration (milliseconds)
- Or wait until a condition is met

### Loop Node (Purple)
- Iterates over a collection or repeats steps
- Has a "Body" output for steps to repeat
- And a "Continue" output for when loop completes

### Parallel Node (Green)
- Executes multiple branches simultaneously
- Dynamic number of output branches based on configuration

## Usage

The workflow editor replaces the previous dialog-based editing with a more intuitive visual approach:

1. **Creating a Workflow**: Click "Create Workflow" to open an empty editor with just a trigger node
2. **Adding Nodes**: Use the toolbar buttons to add different types of nodes
3. **Connecting Nodes**: Drag from an output handle to an input handle to create connections
4. **Editing Properties**: Click the settings icon on any node to open the properties panel:
   - For Action nodes: Select from available actions fetched from the runtime
   - For Trigger nodes: Choose event types from actual system events
   - For all nodes: Configure node-specific parameters
5. **Saving**: Click "Save Workflow" to save your changes

## Controls

- **Pan**: Click and drag on empty space
- **Zoom**: Use mouse wheel or zoom controls
- **Select**: Click on a node to select it
- **Multi-select**: Hold Shift and click multiple nodes
- **Delete**: Select a node/edge and press Delete key

## Integration

The editor automatically:
- Fetches available actions from the runtime via `/api/actions`
- Displays real action names in the properties panel dropdown
- Provides available system events for trigger configuration
- Validates that actions exist in the runtime
- Converts the visual graph to workflow JSON format
- Preserves all workflow metadata and configuration

### API Integration

The workflow editor integrates with the ElizaOS runtime:
- **GET /api/actions**: Fetches all available actions across agents
- Actions are aggregated from all running agents
- Each action includes name, description, and examples
- The properties panel dynamically populates dropdowns with these actions

## Future Enhancements

- Node property panel integrated into the editor
- Real-time validation feedback
- Execution visualization showing current step
- Template library for common workflow patterns
- Auto-layout algorithms for better organization 