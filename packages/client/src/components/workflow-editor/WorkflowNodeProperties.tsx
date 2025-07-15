import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WorkflowNodePropertiesProps {
  node: any;
  availableActions?: string[];
  availableEvents?: string[];
  onUpdate: (nodeId: string, data: any) => void;
  onClose: () => void;
}

export const WorkflowNodeProperties: React.FC<WorkflowNodePropertiesProps> = ({
  node,
  availableActions = [],
  availableEvents = [],
  onUpdate,
  onClose,
}) => {
  const [formData, setFormData] = useState(node?.data || {});

  useEffect(() => {
    setFormData(node?.data || {});
  }, [node]);

  const handleSubmit = () => {
    onUpdate(node.id, formData);
    onClose();
  };

  if (!node) return null;

  return (
    <Card className="w-80 h-full shadow-xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Node Properties</CardTitle>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Configure the {node.type} node
        </CardDescription>
      </CardHeader>

      <Separator />

      <ScrollArea className="h-[calc(100%-8rem)]">
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.label || ''}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="Enter node name"
            />
          </div>

          {node.type === 'action' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="action">Action</Label>
                <Select
                  value={formData.action || ''}
                  onValueChange={(value) => setFormData({ ...formData, action: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an action" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableActions.map(action => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="input">Input (JSON)</Label>
                <Textarea
                  id="input"
                  value={JSON.stringify(formData.input || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const input = JSON.parse(e.target.value);
                      setFormData({ ...formData, input });
                    } catch (error) {
                      // Invalid JSON, don't update
                    }
                  }}
                  placeholder='{"key": "value"}'
                  className="font-mono text-sm"
                  rows={4}
                />
              </div>
            </>
          )}

          {node.type === 'condition' && (
            <div className="space-y-2">
              <Label htmlFor="condition">Condition Expression</Label>
              <Textarea
                id="condition"
                value={formData.condition?.expression || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  condition: { expression: e.target.value }
                })}
                placeholder="e.g., message.content.includes('spam')"
                className="font-mono text-sm"
                rows={3}
              />
            </div>
          )}

          {node.type === 'wait' && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (milliseconds)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.waitConfig?.duration || 0}
                onChange={(e) => setFormData({
                  ...formData,
                  waitConfig: { duration: parseInt(e.target.value) || 0 }
                })}
                placeholder="5000"
              />
            </div>
          )}

          {node.type === 'loop' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="maxIterations">Max Iterations</Label>
                <Input
                  id="maxIterations"
                  type="number"
                  value={formData.loopConfig?.maxIterations || 10}
                  onChange={(e) => setFormData({
                    ...formData,
                    loopConfig: {
                      ...formData.loopConfig,
                      maxIterations: parseInt(e.target.value) || 10
                    }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemsExpression">Items Expression</Label>
                <Input
                  id="itemsExpression"
                  value={formData.loopConfig?.itemsExpression || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    loopConfig: {
                      ...formData.loopConfig,
                      itemsExpression: e.target.value
                    }
                  })}
                  placeholder="e.g., messages"
                  className="font-mono text-sm"
                />
              </div>
            </>
          )}

          {node.type === 'trigger' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="triggerType">Trigger Type</Label>
                <Select
                  value={formData.trigger?.type || 'MANUAL'}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    trigger: { ...formData.trigger, type: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                    <SelectItem value="EVENT">Event</SelectItem>
                    <SelectItem value="CRON">Scheduled (Cron)</SelectItem>
                    <SelectItem value="WORKFLOW">Workflow</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.trigger?.type === 'EVENT' && (
                <div className="space-y-2">
                  <Label htmlFor="eventName">Event Name</Label>
                  <Select
                    value={formData.trigger?.eventName || ''}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      trigger: { ...formData.trigger, eventName: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEvents.map(event => (
                        <SelectItem key={event} value={event}>
                          {event.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.trigger?.type === 'CRON' && (
                <div className="space-y-2">
                  <Label htmlFor="schedule">Cron Schedule</Label>
                  <Input
                    id="schedule"
                    value={formData.trigger?.schedule || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      trigger: { ...formData.trigger, schedule: e.target.value }
                    })}
                    placeholder="0 9 * * *"
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </ScrollArea>

      <div className="p-4 border-t">
        <Button onClick={handleSubmit} className="w-full">
          Apply Changes
        </Button>
      </div>
    </Card>
  );
}; 