import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Pause, RefreshCw, Plus, Settings, Clock, Calendar, Trash2, Edit, Eye, History, ChevronRight, X, Save, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import WorkflowNodeEditor from '@/components/workflow-editor/WorkflowNodeEditor';

// Mock workflow data - in real implementation, this would come from API
const initialWorkflows: Workflow[] = [
  {
    id: '1',
    name: 'Daily Reminder',
    description: 'Sends a daily reminder message at 9 AM',
    status: 'ACTIVE' as const,
    triggerType: 'CRON' as const,
    schedule: '0 9 * * *',
    lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000),
    nextRun: new Date(Date.now() + 2 * 60 * 60 * 1000),
    steps: [
      { id: '1', name: 'Send Message', type: 'action' as const, actionName: 'SEND_MESSAGE' }
    ],
    executions: [
      { id: 'e1', startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), status: 'COMPLETED' as const, duration: 1234 },
      { id: 'e2', startTime: new Date(Date.now() - 48 * 60 * 60 * 1000), status: 'COMPLETED' as const, duration: 1156 }
    ]
  },
  {
    id: '2',
    name: 'Welcome New Members',
    description: 'Greets new members when they join',
    status: 'ACTIVE' as const,
    triggerType: 'EVENT' as const,
    eventName: 'ENTITY_JOINED',
    lastRun: new Date(Date.now() - 3 * 60 * 60 * 1000),
    steps: [
      { id: '1', name: 'Wait 30 seconds', type: 'wait' as const, duration: 30000 },
      { id: '2', name: 'Send Welcome', type: 'action' as const, actionName: 'SEND_MESSAGE' },
      { id: '3', name: 'Send Resources', type: 'action' as const, actionName: 'SEND_MESSAGE' }
    ],
    executions: [
      { id: 'e3', startTime: new Date(Date.now() - 3 * 60 * 60 * 1000), status: 'COMPLETED' as const, duration: 32567 },
      { id: 'e4', startTime: new Date(Date.now() - 27 * 60 * 60 * 1000), status: 'FAILED' as const, duration: 15234, error: 'Failed to send message' }
    ]
  },
  {
    id: '3',
    name: 'Content Moderation',
    description: 'Analyzes messages for inappropriate content',
    status: 'PAUSED' as const,
    triggerType: 'EVENT' as const,
    eventName: 'MESSAGE_RECEIVED',
    lastRun: new Date(Date.now() - 5 * 60 * 1000),
    steps: [
      { id: '1', name: 'Analyze Content', type: 'action' as const, actionName: 'ANALYZE_CONTENT' },
      { id: '2', name: 'Check Results', type: 'condition' as const, condition: 'result.inappropriate === true' },
      { id: '3', name: 'Delete Message', type: 'action' as const, actionName: 'DELETE_MESSAGE' },
      { id: '4', name: 'Notify Moderators', type: 'action' as const, actionName: 'SEND_MESSAGE' }
    ],
    executions: []
  }
];

interface WorkflowExecution {
  id: string;
  startTime: Date;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  duration?: number;
  error?: string;
}

interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'wait' | 'loop' | 'parallel';
  actionName?: string;
  condition?: string;
  duration?: number;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'PAUSED' | 'ERROR' | 'DRAFT';
  triggerType: 'CRON' | 'EVENT' | 'MANUAL' | 'WORKFLOW';
  schedule?: string;
  eventName?: string;
  lastRun?: Date;
  nextRun?: Date;
  steps: WorkflowStep[];
  executions: WorkflowExecution[];
}

export default function WorkflowsRoute() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>(initialWorkflows);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [executingWorkflows, setExecutingWorkflows] = useState<Set<string>>(new Set());
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [newWorkflow, setNewWorkflow] = useState<Partial<Workflow>>({
    name: '',
    description: '',
    triggerType: 'MANUAL',
    status: 'DRAFT',
    steps: []
  });

  const handleManualTrigger = async (workflowId: string) => {
    setExecutingWorkflows(prev => new Set(prev).add(workflowId));
    
    // Simulate workflow execution
    setTimeout(() => {
      setWorkflows(prev => prev.map(w => {
        if (w.id === workflowId) {
          const newExecution: WorkflowExecution = {
            id: `e${Date.now()}`,
            startTime: new Date(),
            status: 'COMPLETED',
            duration: Math.floor(Math.random() * 5000) + 1000
          };
          return {
            ...w,
            lastRun: new Date(),
            executions: [newExecution, ...w.executions].slice(0, 10) // Keep last 10
          };
        }
        return w;
      }));
      setExecutingWorkflows(prev => {
        const next = new Set(prev);
        next.delete(workflowId);
        return next;
      });
    }, 2000);
  };

  const handleToggleStatus = (workflowId: string) => {
    setWorkflows(prev => prev.map(w => {
      if (w.id === workflowId) {
        return {
          ...w,
          status: w.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
        };
      }
      return w;
    }));
  };

  const handleDelete = (workflowId: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    if (selectedWorkflow?.id === workflowId) {
      setSelectedWorkflow(null);
    }
  };

  const handleCreateWorkflow = () => {
    const workflow: Workflow = {
      ...newWorkflow as Workflow,
      id: Date.now().toString(),
      steps: newWorkflow.steps || [],
      executions: []
    };
    setWorkflows(prev => [...prev, workflow]);
    setIsCreateDialogOpen(false);
    setNewWorkflow({
      name: '',
      description: '',
      triggerType: 'MANUAL',
      status: 'DRAFT',
      steps: []
    });
  };

  const handleUpdateWorkflow = () => {
    if (!selectedWorkflow) return;
    
    setWorkflows(prev => prev.map(w => 
      w.id === selectedWorkflow.id ? selectedWorkflow : w
    ));
    setIsEditDialogOpen(false);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'COMPLETED':
        return 'default';
      case 'PAUSED':
        return 'secondary';
      case 'ERROR':
      case 'FAILED':
        return 'destructive';
      case 'RUNNING':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'CRON':
        return Clock;
      case 'EVENT':
        return RefreshCw;
      case 'MANUAL':
        return Play;
      default:
        return Calendar;
    }
  };

  const handleSaveWorkflowFromNodeEditor = (workflowData: any) => {
    if (editingWorkflow) {
      // Update existing workflow
      setWorkflows(prev => prev.map(w => 
        w.id === editingWorkflow.id 
          ? { ...w, ...workflowData }
          : w
      ));
      setSelectedWorkflow({ ...editingWorkflow, ...workflowData });
      setShowNodeEditor(false);
      setEditingWorkflow(null);
    } else {
      // Create new workflow
      const newWorkflow: Workflow = {
        id: Date.now().toString(),
        status: 'ACTIVE',
        lastRun: null,
        nextRun: null,
        executions: [],
        ...workflowData,
      };
      setWorkflows(prev => [...prev, newWorkflow]);
      setShowNodeEditor(false);
      setEditingWorkflow(null);
    }
  };

  return (
    <div className="flex h-full">
      {/* Workflow List */}
      <div className={cn(
        "border-r",
        selectedWorkflow ? "w-1/3" : "w-full"
      )}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Workflows</h1>
              <p className="text-muted-foreground mt-1">
                Automate tasks with event-driven and scheduled workflows
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingWorkflow(null);
                setShowNodeEditor(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Workflow
            </Button>
            
            {/* Keep the old dialog hidden for now */}
            <Dialog open={false} onOpenChange={setIsCreateDialogOpen}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New Workflow</DialogTitle>
                  <DialogDescription>
                    Set up a new automated workflow for your agent
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newWorkflow.name}
                      onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="My Workflow"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newWorkflow.description}
                      onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="What does this workflow do?"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="triggerType">Trigger Type</Label>
                    <Select
                      value={newWorkflow.triggerType}
                      onValueChange={(value) => setNewWorkflow(prev => ({ ...prev, triggerType: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MANUAL">Manual</SelectItem>
                        <SelectItem value="EVENT">Event</SelectItem>
                        <SelectItem value="CRON">Schedule (Cron)</SelectItem>
                        <SelectItem value="WORKFLOW">Workflow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newWorkflow.triggerType === 'CRON' && (
                    <div className="grid gap-2">
                      <Label htmlFor="schedule">Cron Schedule</Label>
                      <Input
                        id="schedule"
                        value={newWorkflow.schedule || ''}
                        onChange={(e) => setNewWorkflow(prev => ({ ...prev, schedule: e.target.value }))}
                        placeholder="0 9 * * *"
                      />
                    </div>
                  )}
                  {newWorkflow.triggerType === 'EVENT' && (
                    <div className="grid gap-2">
                      <Label htmlFor="eventName">Event Name</Label>
                      <Select
                        value={newWorkflow.eventName}
                        onValueChange={(value) => setNewWorkflow(prev => ({ ...prev, eventName: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MESSAGE_RECEIVED">Message Received</SelectItem>
                          <SelectItem value="ENTITY_JOINED">Entity Joined</SelectItem>
                          <SelectItem value="ENTITY_LEFT">Entity Left</SelectItem>
                          <SelectItem value="CHANNEL_CREATED">Channel Created</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateWorkflow} disabled={!newWorkflow.name}>
                    Create Workflow
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-4">
              {workflows.map((workflow) => {
                const TriggerIcon = getTriggerIcon(workflow.triggerType);
                const isExecuting = executingWorkflows.has(workflow.id);
                
                return (
                  <Card 
                    key={workflow.id} 
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-accent",
                      selectedWorkflow?.id === workflow.id && "border-primary"
                    )}
                    onClick={() => setSelectedWorkflow(workflow)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {workflow.name}
                            <Badge variant={getStatusBadgeVariant(workflow.status)}>
                              {workflow.status}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {workflow.description}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {workflow.triggerType === 'MANUAL' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleManualTrigger(workflow.id);
                              }}
                              disabled={isExecuting || workflow.status !== 'ACTIVE'}
                            >
                              {isExecuting ? (
                                <>
                                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                                  Running
                                </>
                              ) : (
                                <>
                                  <Play className="mr-1 h-3 w-3" />
                                  Run
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(workflow.id);
                            }}
                          >
                            {workflow.status === 'ACTIVE' ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <TriggerIcon className="h-4 w-4" />
                          {workflow.triggerType === 'CRON' && workflow.schedule}
                          {workflow.triggerType === 'EVENT' && workflow.eventName}
                          {workflow.triggerType === 'MANUAL' && 'Manual trigger'}
                        </div>
                        {workflow.lastRun && (
                          <div className="flex items-center gap-1">
                            <History className="h-4 w-4" />
                            Last run: {workflow.lastRun.toLocaleTimeString()}
                          </div>
                        )}
                        {workflow.nextRun && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Next: {workflow.nextRun.toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {workflow.steps.length} steps
                        </span>
                        {workflow.executions.length > 0 && (
                          <>
                            <Separator orientation="vertical" className="h-4" />
                            <span className="text-sm text-muted-foreground">
                              {workflow.executions.filter(e => e.status === 'COMPLETED').length}/{workflow.executions.length} successful
                            </span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Workflow Details */}
      {selectedWorkflow && (
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    {selectedWorkflow.name}
                    <Badge variant={getStatusBadgeVariant(selectedWorkflow.status)}>
                      {selectedWorkflow.status}
                    </Badge>
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {selectedWorkflow.description}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingWorkflow(selectedWorkflow);
                      setShowNodeEditor(true);
                    }}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this workflow?')) {
                        handleDelete(selectedWorkflow.id);
                      }
                    }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedWorkflow(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Tabs defaultValue="steps" className="flex-1">
              <TabsList className="px-6">
                <TabsTrigger value="steps">Steps</TabsTrigger>
                <TabsTrigger value="executions">Execution History</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="steps" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Workflow Steps</h3>
                  {selectedWorkflow.steps.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No steps defined. Edit this workflow to add steps.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2">
                      {selectedWorkflow.steps.map((step, index) => (
                        <Card key={step.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{step.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  Type: {step.type}
                                  {step.actionName && ` • Action: ${step.actionName}`}
                                  {step.duration && ` • Duration: ${formatDuration(step.duration)}`}
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="executions" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Execution History</h3>
                  {selectedWorkflow.executions.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No executions yet. Run this workflow to see execution history.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2">
                      {selectedWorkflow.executions.map((execution) => (
                        <Card key={execution.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge variant={getStatusBadgeVariant(execution.status)}>
                                  {execution.status}
                                </Badge>
                                <div>
                                  <div className="text-sm">
                                    Started: {execution.startTime.toLocaleString()}
                                  </div>
                                  {execution.duration && (
                                    <div className="text-sm text-muted-foreground">
                                      Duration: {formatDuration(execution.duration)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {execution.error && (
                                <div className="text-sm text-destructive">
                                  {execution.error}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="settings" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Workflow Settings</h3>
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div>
                        <Label>Trigger Type</Label>
                        <div className="flex items-center gap-2 mt-1">
                          {(() => {
                            const Icon = getTriggerIcon(selectedWorkflow.triggerType);
                            return <Icon className="h-4 w-4" />;
                          })()}
                          <span>{selectedWorkflow.triggerType}</span>
                        </div>
                      </div>
                      {selectedWorkflow.schedule && (
                        <div>
                          <Label>Schedule</Label>
                          <div className="mt-1 font-mono text-sm">{selectedWorkflow.schedule}</div>
                        </div>
                      )}
                      {selectedWorkflow.eventName && (
                        <div>
                          <Label>Event</Label>
                          <div className="mt-1">{selectedWorkflow.eventName}</div>
                        </div>
                      )}
                      <div>
                        <Label>Workflow ID</Label>
                        <div className="mt-1 font-mono text-sm text-muted-foreground">{selectedWorkflow.id}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Edit Workflow</DialogTitle>
                <DialogDescription>
                  Update workflow settings and configuration
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={selectedWorkflow.name}
                    onChange={(e) => setSelectedWorkflow(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={selectedWorkflow.description}
                    onChange={(e) => setSelectedWorkflow(prev => prev ? { ...prev, description: e.target.value } : null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={selectedWorkflow.status}
                    onValueChange={(value) => setSelectedWorkflow(prev => prev ? { ...prev, status: value as any } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PAUSED">Paused</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateWorkflow}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Workflow Node Editor Modal */}
      {showNodeEditor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] overflow-hidden">
            <WorkflowNodeEditor
              workflow={editingWorkflow}
              onSave={handleSaveWorkflowFromNodeEditor}
              onClose={() => {
                setShowNodeEditor(false);
                setEditingWorkflow(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
} 