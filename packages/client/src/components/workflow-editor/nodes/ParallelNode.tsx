import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Layers, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ParallelNodeData {
  label: string;
  parallelSteps?: any[][];
  selected?: boolean;
  onSettingsClick?: () => void;
}

export const ParallelNode = memo(({ data, selected }: NodeProps<ParallelNodeData>) => {
  const branchCount = data.parallelSteps?.length || 0;

  return (
    <Card className={cn(
      "min-w-[200px] shadow-md transition-all",
      selected && "ring-2 ring-green-500"
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
            <div className="p-1.5 bg-green-100 rounded">
              <Layers className="w-4 h-4 text-green-600" />
            </div>
            <span className="font-medium text-sm">{data.label || 'Parallel'}</span>
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
        
        {branchCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {branchCount} branch{branchCount !== 1 ? 'es' : ''}
          </Badge>
        )}
      </div>
      
      {/* Multiple output handles for parallel branches */}
      {[...Array(Math.max(2, branchCount))].map((_, index) => {
        const position = (index + 1) / (Math.max(2, branchCount) + 1) * 100;
        return (
          <React.Fragment key={index}>
            <Handle
              type="source"
              position={Position.Bottom}
              id={`branch-${index}`}
              className="w-2 h-2"
              style={{ background: '#10b981', left: `${position}%` }}
            />
            <div 
              className="absolute -bottom-5 text-xs text-green-600 font-medium"
              style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
            >
              B{index + 1}
            </div>
          </React.Fragment>
        );
      })}
    </Card>
  );
}); 