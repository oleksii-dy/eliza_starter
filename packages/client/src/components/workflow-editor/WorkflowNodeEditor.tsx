import React, { useCallback, useState, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ConnectionMode,
  MarkerType,
  NodeTypes,
  Panel,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Play, Settings2, GitBranch, Clock, Repeat, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

import { ActionNode } from './nodes/ActionNode';
import { ConditionNode } from './nodes/ConditionNode';
import { WaitNode } from './nodes/WaitNode';
import { LoopNode } from './nodes/LoopNode';
import { ParallelNode } from './nodes/ParallelNode';
import { TriggerNode } from './nodes/TriggerNode';
import { WorkflowNodeProperties } from './WorkflowNodeProperties';

// Define custom node types
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  wait: WaitNode,
  loop: LoopNode,
  parallel: ParallelNode,
};

interface WorkflowNodeEditorProps {
  workflow?: any;
  onSave?: (workflow: any) => void;
  onClose?: () => void;
}

const WorkflowNodeEditor: React.FC<WorkflowNodeEditorProps> = ({ workflow, onSave, onClose }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showProperties, setShowProperties] = useState(false);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);

  // Fetch available actions and events
  React.useEffect(() => {
    const fetchActionsAndEvents = async () => {
      try {
        // Fetch available actions from API
        const response = await fetch('/api/actions');
        if (response.ok) {
          const actions = await response.json();
          setAvailableActions(actions.map((a: any) => a.name));
        }
        
        // Available events (could also be fetched from API)
        setAvailableEvents([
          'MESSAGE_RECEIVED',
          'ENTITY_JOINED',
          'ENTITY_LEFT',
          'CHANNEL_CREATED',
          'REACTION_ADDED',
          'VOICE_STATE_UPDATED',
          'ROOM_CREATED',
          'MEMBER_UPDATED'
        ]);
      } catch (error) {
        console.error('Failed to fetch actions:', error);
      }
    };
    
    fetchActionsAndEvents();
  }, []);



  // Initialize nodes and edges from workflow
  React.useEffect(() => {
    if (workflow) {
      const initialNodes: Node[] = [];
      const initialEdges: Edge[] = [];

      // Add trigger node
      initialNodes.push({
        id: 'trigger',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: {
          trigger: workflow.triggers?.[0] || { type: 'MANUAL' },
        },
      });

      // Add step nodes
      let yPosition = 200;
      workflow.steps?.forEach((step: any, index: number) => {
        initialNodes.push({
          id: step.id,
          type: step.type,
          position: { x: 250, y: yPosition },
                  data: {
          ...step,
          label: step.name,
        },
        });

        // Connect to previous node
        if (index === 0) {
          initialEdges.push({
            id: `e-trigger-${step.id}`,
            source: 'trigger',
            target: step.id,
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          });
        } else {
          initialEdges.push({
            id: `e-${workflow.steps[index - 1].id}-${step.id}`,
            source: workflow.steps[index - 1].id,
            target: step.id,
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          });
        }

        yPosition += 150;
      });

      setNodes(initialNodes);
      setEdges(initialEdges);
    } else {
      // New workflow - just add trigger node
      setNodes([
        {
          id: 'trigger',
          type: 'trigger',
          position: { x: 250, y: 50 },
                  data: {
          trigger: { type: 'MANUAL' },
        },
        },
      ]);
    }
  }, [workflow, setNodes, setEdges]);

  // Handle connection creation
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Add new node
  const addNode = useCallback(
    (type: string) => {
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position: {
          x: Math.random() * 500 + 100,
          y: Math.random() * 400 + 100,
        },
        data: {
          label: `New ${type}`,
          type,
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeType(null);
    },
    [setNodes]
  );

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowProperties(true);
    
    // Update node to show selected state
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          selected: n.id === node.id,
        },
      }))
    );
  }, [setNodes]);

  // Handle clicking on background
  const onPaneClick = useCallback(() => {
    setShowProperties(false);
    setSelectedNode(null);
    
    // Clear selected state from all nodes
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          selected: false,
        },
      }))
    );
  }, [setNodes]);

  // Handle node update from properties panel
  const handleNodeUpdate = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...data,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Save workflow
  const handleSave = useCallback(() => {
    // Convert nodes and edges back to workflow format
    const triggerNode = nodes.find((n) => n.type === 'trigger');
    const stepNodes = nodes.filter((n) => n.type !== 'trigger');

    const workflowData = {
      ...workflow,
      triggers: triggerNode ? [triggerNode.data.trigger] : [],
      steps: stepNodes.map((node) => ({
        id: node.id,
        name: node.data.label || node.data.name,
        type: node.type,
        ...node.data,
      })),
    };

    onSave?.(workflowData);
  }, [nodes, workflow, onSave]);

  // Node type buttons
  const nodeTypeButtons = [
    { type: 'action', label: 'Action', icon: Play, color: 'blue' },
    { type: 'condition', label: 'Condition', icon: GitBranch, color: 'yellow' },
    { type: 'wait', label: 'Wait', icon: Clock, color: 'gray' },
    { type: 'loop', label: 'Loop', icon: Repeat, color: 'purple' },
    { type: 'parallel', label: 'Parallel', icon: Layers, color: 'green' },
  ];

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">Workflow Editor</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Workflow
          </Button>
        </div>
      </div>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          className="bg-gray-50"
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case 'trigger':
                  return '#10b981';
                case 'action':
                  return '#3b82f6';
                case 'condition':
                  return '#eab308';
                case 'wait':
                  return '#6b7280';
                case 'loop':
                  return '#8b5cf6';
                case 'parallel':
                  return '#10b981';
                default:
                  return '#6b7280';
              }
            }}
            className="bg-white border rounded shadow-md"
          />

          <Panel position="top-left" className="flex gap-2 p-2 bg-white rounded-lg shadow-md">
            {nodeTypeButtons.map((btn) => (
              <Button
                key={btn.type}
                size="sm"
                variant="outline"
                onClick={() => addNode(btn.type)}
                className="flex items-center gap-2"
              >
                <btn.icon className="w-4 h-4" />
                {btn.label}
              </Button>
            ))}
          </Panel>

          <Panel position="bottom-left" className="bg-white p-2 rounded-lg shadow-md">
            <div className="text-xs text-gray-500">
              <div>• Drag nodes to reposition</div>
              <div>• Connect nodes by dragging from handles</div>
              <div>• <strong>Click any node to edit its properties</strong></div>
              <div>• Click background to close properties panel</div>
            </div>
          </Panel>

          {showProperties && selectedNode && (
            <div className="absolute top-0 right-0 h-full z-10">
              <WorkflowNodeProperties
                node={selectedNode}
                availableActions={availableActions}
                availableEvents={availableEvents}
                onUpdate={handleNodeUpdate}
                onClose={() => {
                  setShowProperties(false);
                  setSelectedNode(null);
                }}
              />
            </div>
          )}
        </ReactFlow>
      </div>
    </div>
  );
};

// Export wrapped in provider
export default function WorkflowNodeEditorWrapper(props: WorkflowNodeEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowNodeEditor {...props} />
    </ReactFlowProvider>
  );
} 