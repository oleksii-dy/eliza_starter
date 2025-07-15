import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Clock, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WaitNodeData {
  label: string;
  waitConfig?: {
    duration?: number;
    condition?: string;
    timeout?: number;
  };
  selected?: boolean;
  onSettingsClick?: () => void;
}

export const WaitNode = memo(({ data, selected }: NodeProps<WaitNodeData>) => {
  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <Card className={cn(
      "min-w-[200px] shadow-md transition-all",
      selected && "ring-2 ring-gray-500"
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
            <div className="p-1.5 bg-gray-100 rounded">
              <Clock className="w-4 h-4 text-gray-600" />
            </div>
            <span className="font-medium text-sm">{data.label || 'Wait'}</span>
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
        
        {data.waitConfig?.duration && (
          <Badge variant="outline" className="text-xs">
            {formatDuration(data.waitConfig.duration)}
          </Badge>
        )}
        
        {data.waitConfig?.condition && (
          <div className="mt-1 text-xs text-gray-500">
            Until condition
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