import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Zap, Calendar, MousePointer, Workflow, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TriggerNodeData {
  label?: string;
  trigger?: {
    type: 'EVENT' | 'CRON' | 'MANUAL' | 'WORKFLOW';
    eventName?: string;
    schedule?: string;
    workflowId?: string;
  };
  selected?: boolean;
  onSettingsClick?: () => void;
}

export const TriggerNode = memo(({ data, selected }: NodeProps<TriggerNodeData>) => {
  const trigger = data.trigger || { type: 'MANUAL' };
  
  const getTriggerIcon = () => {
    switch (trigger.type) {
      case 'EVENT':
        return Zap;
      case 'CRON':
        return Calendar;
      case 'WORKFLOW':
        return Workflow;
      case 'MANUAL':
      default:
        return MousePointer;
    }
  };
  
  const getTriggerColor = () => {
    switch (trigger.type) {
      case 'EVENT':
        return 'blue';
      case 'CRON':
        return 'orange';
      case 'WORKFLOW':
        return 'purple';
      case 'MANUAL':
      default:
        return 'gray';
    }
  };

  const Icon = getTriggerIcon();
  const color = getTriggerColor();

  return (
    <Card className={cn(
      "min-w-[200px] shadow-md transition-all bg-gradient-to-b from-white to-gray-50",
      selected && "ring-2 ring-green-500"
    )}>
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded",
              color === 'blue' && "bg-blue-100",
              color === 'orange' && "bg-orange-100",
              color === 'purple' && "bg-purple-100",
              color === 'gray' && "bg-gray-100",
            )}>
              <Icon className={cn(
                "w-4 h-4",
                color === 'blue' && "text-blue-600",
                color === 'orange' && "text-orange-600",
                color === 'purple' && "text-purple-600",
                color === 'gray' && "text-gray-600",
              )} />
            </div>
            <span className="font-medium text-sm text-gray-900">Trigger</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              data.onSettingsClick?.();
            }}
          >
            <Settings className="w-3 h-3" />
          </Button>
        </div>
        
        <Badge variant="outline" className="text-xs text-gray-700">
          {trigger.type}
        </Badge>
        
        {trigger.eventName && (
          <div className="mt-1 text-xs text-gray-600">
            {trigger.eventName}
          </div>
        )}
        
        {trigger.schedule && (
          <div className="mt-1 text-xs text-gray-600 font-mono">
            {trigger.schedule}
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2"
        style={{ background: '#10b981' }}
      />
    </Card>
  );
}); 