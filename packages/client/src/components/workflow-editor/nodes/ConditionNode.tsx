import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConditionNodeData {
  label: string;
  condition?: string;
  selected?: boolean;
  onSettingsClick?: () => void;
}

export const ConditionNode = memo(({ data, selected }: NodeProps<ConditionNodeData>) => {
  return (
    <Card className={cn(
      "min-w-[200px] shadow-md transition-all",
      selected && "ring-2 ring-yellow-500"
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
            <div className="p-1.5 bg-yellow-100 rounded">
              <GitBranch className="w-4 h-4 text-yellow-600" />
            </div>
            <span className="font-medium text-sm">{data.label || 'Condition'}</span>
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
        
        {data.condition && (
          <div className="text-xs text-gray-600 font-mono bg-gray-50 p-1 rounded truncate">
            {data.condition}
          </div>
        )}
      </div>
      
      {/* True branch handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="w-2 h-2"
        style={{ background: '#22c55e', left: '30%' }}
      />
      <div className="absolute -bottom-5 left-[30%] -translate-x-1/2 text-xs text-green-600 font-medium">
        True
      </div>
      
      {/* False branch handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="w-2 h-2"
        style={{ background: '#ef4444', left: '70%' }}
      />
      <div className="absolute -bottom-5 left-[70%] -translate-x-1/2 text-xs text-red-600 font-medium">
        False
      </div>
    </Card>
  );
}); 