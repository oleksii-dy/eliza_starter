import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Repeat, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LoopNodeData {
  label: string;
  loopConfig?: {
    maxIterations?: number;
    itemVariable?: string;
    indexVariable?: string;
    itemsExpression?: string;
  };
  selected?: boolean;
  onSettingsClick?: () => void;
}

export const LoopNode = memo(({ data, selected }: NodeProps<LoopNodeData>) => {
  return (
    <Card className={cn(
      "min-w-[200px] shadow-md transition-all",
      selected && "ring-2 ring-purple-500"
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
            <div className="p-1.5 bg-purple-100 rounded">
              <Repeat className="w-4 h-4 text-purple-600" />
            </div>
            <span className="font-medium text-sm">{data.label || 'Loop'}</span>
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
        
        {data.loopConfig?.maxIterations && (
          <Badge variant="secondary" className="text-xs">
            Max {data.loopConfig.maxIterations} iterations
          </Badge>
        )}
        
        {data.loopConfig?.itemsExpression && (
          <div className="mt-1 text-xs text-gray-600 font-mono bg-gray-50 p-1 rounded truncate">
            {data.loopConfig.itemsExpression}
          </div>
        )}
      </div>
      
      {/* Loop body handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="loop-body"
        className="w-2 h-2"
        style={{ background: '#8b5cf6' }}
      />
      <div className="absolute -right-12 top-1/2 -translate-y-1/2 text-xs text-purple-600 font-medium">
        Body
      </div>
      
      {/* Continue handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="continue"
        className="w-2 h-2"
        style={{ background: '#555' }}
      />
    </Card>
  );
}); 