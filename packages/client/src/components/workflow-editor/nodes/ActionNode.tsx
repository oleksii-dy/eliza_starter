import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Play, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ActionNodeData {
  label: string;
  action?: string;
  input?: Record<string, any>;
  selected?: boolean;
  onSettingsClick?: () => void;
}

export const ActionNode = memo(({ data, selected }: NodeProps<ActionNodeData>) => {
  return (
    <Card className={cn(
      "min-w-[200px] shadow-md transition-all",
      selected && "ring-2 ring-blue-500"
    )}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2"
        style={{ background: '#555' }}
      />
      
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded">
              <Play className="w-4 h-4 text-blue-600" />
            </div>
            <span className="font-medium text-sm">{data.label || 'Action'}</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            title="Click anywhere on the node to edit properties"
            onClick={(e) => {
              e.stopPropagation();
              // Settings click handled by node click
            }}
          >
            <Settings className="w-3 h-3" />
          </Button>
        </div>
        
        {data.action && (
          <Badge variant="secondary" className="text-xs">
            {data.action}
          </Badge>
        )}
        
        {data.input && Object.keys(data.input).length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            {Object.keys(data.input).length} input(s)
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2"
        style={{ background: '#555' }}
      />
    </Card>
  );
}); 