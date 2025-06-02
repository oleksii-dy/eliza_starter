import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatAgentName, cn } from '@/lib/utils';
import type { Agent } from '@elizaos/core';
import { AgentStatus as CoreAgentStatus } from '@elizaos/core';
import { MessageSquare, Play, Loader2, PowerOff, Bot, Sparkles } from 'lucide-react';
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
        'group relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer',
        'border bg-card hover:border-primary/20 hover:shadow-primary/5',
        isActive ? 'ring-2 ring-emerald-500/20 shadow-emerald-500/5' : '',
        'transform hover:scale-[1.02] active:scale-[0.98]'
      )}
      onClick={handleCardClick}
    >
      {/* Enhanced status indicator */}
      <div className="absolute top-4 right-4 z-10">
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className={cn(
            'transition-all duration-300 shadow-sm backdrop-blur-sm',
            isActive
              ? 'bg-emerald-500/90 text-white border-emerald-400/50 shadow-emerald-500/20'
              : 'bg-slate-500/90 text-white border-slate-400/50'
          )}
        >
          <div
            className={cn(
              'w-2 h-2 rounded-full mr-2',
              isActive ? 'bg-white animate-pulse' : 'bg-slate-300'
            )}
          />
          {isStarting ? 'Starting' : isStopping ? 'Stopping' : isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Enhanced avatar section */}
      <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/3 to-primary/10">
        {/* Subtle animated background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-primary/10 group-hover:via-primary/10 transition-all duration-500" />
        </div>

        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={agentName}
            className={cn(
              'w-full h-full object-cover transition-all duration-500',
              isActive ? 'brightness-100' : 'grayscale brightness-75',
              'group-hover:scale-110 group-hover:brightness-110'
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center relative">
            {/* Background icon */}
            <Bot className="absolute inset-0 w-16 h-16 m-auto text-primary/10 group-hover:text-primary/20 transition-colors duration-300" />

            {/* Main text */}
            <div className="relative z-10 text-5xl font-bold text-primary/60 group-hover:text-primary/80 transition-colors duration-300">
              {formatAgentName(agentName)}
            </div>

            {/* Sparkle effect for active agents */}
            {isActive && (
              <Sparkles className="absolute top-4 right-4 w-4 h-4 text-emerald-400 animate-pulse" />
            )}
          </div>
        )}
      </div>

      {/* Enhanced content section */}
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg leading-tight truncate" title={agentName}>
              {agentName}
            </h3>
            {isActive && (
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              </div>
            )}
          </div>
          {agent.bio && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {agent.bio}
            </p>
          )}
        </div>

        {/* Enhanced action buttons */}
        <div className="flex gap-3">
          {isActive ? (
            <>
              <Button
                onClick={handleChatClick}
                className="flex-1 shadow-sm hover:shadow-md transition-shadow"
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
                className="px-4 hover:bg-destructive hover:text-destructive-foreground transition-colors"
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
              className="w-full shadow-sm hover:shadow-md transition-shadow"
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
