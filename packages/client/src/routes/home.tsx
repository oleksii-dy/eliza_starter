import AddAgentCard from '@/components/add-agent-card';
import AgentCard from '@/components/agent-card';
import GroupCard from '@/components/group-card';
import GroupPanel from '@/components/group-panel';
import ProfileOverlay from '@/components/profile-overlay';
import { useAgentsWithDetails, useChannels, useServers } from '@/hooks/use-query-hooks';
import clientLogger from '@/lib/logger';
import { type Agent, type UUID, ChannelType as CoreChannelType } from '@elizaos/core';
import { Bot, Plus, Sparkles, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';

/**
 * Renders the main dashboard for managing agents and groups, providing interactive controls for viewing, starting, messaging, and configuring agents, as well as creating and editing groups.
 *
 * Displays lists of agents and groups with status indicators, action buttons, and overlays for detailed views and settings. Handles loading and error states, and supports navigation to chat and settings pages.
 */
export default function Home() {
  const { data: agentsData, isLoading, isError, error } = useAgentsWithDetails();
  const navigate = useNavigate();

  // Extract agents properly from the response
  const agents = agentsData?.agents || [];

  const { data: serversData, isLoading: isLoadingServers } = useServers();
  const servers = serversData?.data?.servers || [];

  const [isOverlayOpen, setOverlayOpen] = useState(false);
  const [isGroupPanelOpen, setIsGroupPanelOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Partial<Agent> | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<UUID | null>(null);

  const closeOverlay = () => {
    setSelectedAgent(null);
    setOverlayOpen(false);
  };

  const handleNavigateToDm = async (agent: Agent) => {
    if (!agent.id) return;
    // Navigate directly to agent chat - DM channel will be created automatically with default server
    navigate(`/chat/${agent.id}`);
  };

  const handleCreateGroup = () => {
    navigate('/group/new');
  };

  useEffect(() => {
    clientLogger.info('[Home] Component mounted/re-rendered. Key might have changed.');
  }, []);

  const activeAgents = agents.filter((agent) => agent.enabled);

  return (
    <>
      <div className="flex-1 w-full h-full bg-background">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/3 to-background border-b">
          <div className="absolute inset-0 bg-grid-white/10 bg-grid-8 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
          <div className="relative max-w-7xl mx-auto px-6 py-16">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4" />
                ElizaOS Platform
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Welcome to Your ElizaOS Workspace
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Create, manage, and interact with intelligent AI agents. Build collaborative agent
                groups!
              </p>
              <div className="flex items-center justify-center gap-4 pt-6">
                <Button size="lg" onClick={() => navigate('/create')} className="gap-2">
                  <Plus className="w-5 h-5" />
                  Create Agent
                </Button>
                <Button size="lg" variant="outline" onClick={handleCreateGroup} className="gap-2">
                  <Users className="w-5 h-5" />
                  New Group
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground">Loading your workspace...</p>
              </div>
            </div>
          )}

          {isError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
              <p className="text-destructive">
                Error loading agents: {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          )}

          {!isLoading && !isError && (
            <>
              {/* Agents Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                      <Bot className="w-6 h-6 text-primary" />
                      AI Agents
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {agents.length} {agents.length === 1 ? 'agent' : 'agents'} •{' '}
                      {activeAgents.length} active
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => navigate('/create')} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Agent
                  </Button>
                </div>

                {agents.length === 0 ? (
                  <div className="bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20 p-12">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Bot className="w-8 h-8 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">No agents yet</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                          Create your first AI agent to start building intelligent conversations and
                          automations.
                        </p>
                      </div>
                      <Button onClick={() => navigate('/create')} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Create Your First Agent
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <AddAgentCard />
                    {agents
                      .sort((a, b) => Number(b?.enabled) - Number(a?.enabled))
                      .map((agent) => (
                        <AgentCard
                          key={agent.id}
                          agent={agent}
                          onChat={() => handleNavigateToDm(agent)}
                        />
                      ))}
                  </div>
                )}
              </div>

              {/* Groups Section */}
              <div className="space-y-6 mt-12">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                      <Users className="w-6 h-6 text-primary" />
                      Groups
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Collaborative spaces for multiple agents
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleCreateGroup} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Group
                  </Button>
                </div>

                {isLoadingServers ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-4">
                      <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-sm text-muted-foreground">Loading groups...</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {servers.length === 0 ? (
                      <div className="col-span-full bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20 p-12">
                        <div className="text-center space-y-4">
                          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                            <Users className="w-8 h-8 text-primary" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-lg font-medium">No groups yet</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                              Create a group to enable collaboration between multiple agents.
                            </p>
                          </div>
                          <Button onClick={handleCreateGroup} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Create Your First Group
                          </Button>
                        </div>
                      </div>
                    ) : (
                      servers.map((server) => (
                        <ServerChannels key={server.id} serverId={server.id} />
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {selectedAgent?.id && (
        <ProfileOverlay isOpen={isOverlayOpen} onClose={closeOverlay} agentId={selectedAgent.id} />
      )}

      {isGroupPanelOpen && (
        <GroupPanel
          onClose={() => {
            setSelectedGroupId(null);
            setIsGroupPanelOpen(false);
          }}
          channelId={selectedGroupId ?? undefined}
        />
      )}
    </>
  );
}

// Sub-component to fetch and display channels for a given server
const ServerChannels = ({ serverId }: { serverId: UUID }) => {
  const { data: channelsData, isLoading: isLoadingChannels } = useChannels(serverId);
  const groupChannels = useMemo(
    () => channelsData?.data?.channels?.filter((ch) => ch.type === CoreChannelType.GROUP) || [],
    [channelsData]
  );

  if (isLoadingChannels) {
    return (
      <div className="bg-card rounded-lg border p-6 flex items-center justify-center min-h-[180px]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!groupChannels || groupChannels.length === 0) {
    return null;
  }

  return (
    <>
      {groupChannels.map((channel) => (
        <GroupCard key={channel.id} group={{ ...channel, server_id: serverId }} />
      ))}
    </>
  );
};
