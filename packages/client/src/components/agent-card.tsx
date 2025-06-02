import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatAgentName, cn } from '@/lib/utils';
import type { Agent } from '@elizaos/core';
import { AgentStatus as CoreAgentStatus } from '@elizaos/core';
import { MessageSquare, Play, Loader2, PowerOff } from 'lucide-react';
import { useAgentManagement } from '@/hooks/use-agent-management';
import type { AgentWithStatus } from '@/types';
import clientLogger from '@/lib/logger';

interface AgentCardProps {
  agent: Partial<AgentWithStatus>;
  onChat: (agent: Partial<AgentWithStatus>) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onChat }) => {
  const navigate = useNavigate();
  const { startAgent, stopAgent, isAgentStarting, isAgentStopping } = useAgentManagement();

  if (!agent || !agent.id) {
    clientLogger.error('[AgentCard] Agent data or ID is missing', { agent });
    return (
      <Card className="p-4 min-h-[220px] flex items-center justify-center text-muted-foreground">
        Agent data not available.
      </Card>
    );
  }
  const agentIdForNav = agent.id;
  const agentName = agent.name || 'Unnamed Agent';
  const avatarUrl = agent.settings?.avatar;
  const isActive = agent.status === CoreAgentStatus.ACTIVE;
  const isStarting = isAgentStarting(agent.id);
  const isStopping = isAgentStopping(agent.id);

  const agentForMutation: Agent = {
    id: agent.id!,
    name: agentName,
    username: agent.username || agentName,
    bio: agent.bio || '',
    messageExamples: agent.messageExamples || [],
    postExamples: agent.postExamples || [],
    topics: agent.topics || [],
    adjectives: agent.adjectives || [],
    knowledge: agent.knowledge || [],
    plugins: agent.plugins || [],
    settings: agent.settings || {},
    secrets: agent.secrets || {},
    style: agent.style || {},
    system: agent.system || undefined,
    templates: agent.templates || {},
    enabled: typeof agent.enabled === 'boolean' ? agent.enabled : true,
    status: agent.status || CoreAgentStatus.INACTIVE,
    createdAt: typeof agent.createdAt === 'number' ? agent.createdAt : Date.now(),
    updatedAt: typeof agent.updatedAt === 'number' ? agent.updatedAt : Date.now(),
  };

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    startAgent(agentForMutation);
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopAgent(agentForMutation);
  };

  const handleCardClick = () => {
    clientLogger.info('[AgentCard] handleCardClick triggered', {
      agentId: agentIdForNav,
      currentStatus: agent.status,
      isActive,
    });
    if (!isActive) {
      clientLogger.info(`[AgentCard] Agent is not active. Navigating to /chat/${agentIdForNav}`);
      navigate(`/chat/${agentIdForNav}`);
    } else {
      clientLogger.info(
        '[AgentCard] Agent is active. Click intended for chat button or other actions.'
      );
    }
  };

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChat(agent);
  };

  return (
    <Card
      className={cn(
        'group relative transition-all duration-200 hover:shadow-md cursor-pointer',
        'border bg-card hover:border-primary/30',
        isActive ? 'border-green-200' : ''
      )}
      onClick={handleCardClick}
    >
      {/* Status indicator */}
      <div className="absolute top-3 right-3">
        <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full mr-1.5',
              isActive ? 'bg-green-500' : 'bg-gray-400'
            )}
          />
          {isStarting ? 'Starting' : isStopping ? 'Stopping' : isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Avatar section */}
      <div className="aspect-square relative overflow-hidden bg-muted/50">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={agentName}
            className={cn('w-full h-full object-cover', !isActive && 'grayscale opacity-60')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-4xl font-semibold text-muted-foreground">
              {formatAgentName(agentName)}
            </div>
          </div>
        )}
      </div>

      {/* Content section */}
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="font-medium text-base truncate" title={agentName}>
            {agentName}
          </h3>
          {agent.bio && <p className="text-sm text-muted-foreground line-clamp-2">{agent.bio}</p>}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {isActive ? (
            <>
              <Button
                onClick={handleChatClick}
                className="flex-1"
                size="sm"
                disabled={isStopping || isStarting}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Chat
              </Button>
              <Button
                onClick={handleStop}
                variant="outline"
                size="sm"
                disabled={isStopping}
                className="px-3"
              >
                {isStopping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PowerOff className="h-4 w-4" />
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleStart}
              disabled={isStarting || isStopping}
              className="w-full"
              size="sm"
            >
              {isStarting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Agent
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AgentCard;
