import ConnectionStatus from '@/components/connection-status';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar';
import {
  useAgentsWithDetails, // New hook
  useChannels,
  useServers, // New hook
} from '@/hooks/use-query-hooks';
import info from '@/lib/info.json';
import { cn, generateGroupName, getAgentAvatar, getEntityId } from '@/lib/utils';
import type {
  MessageChannel as ClientMessageChannel,
  MessageServer as ClientMessageServer,
} from '@/types';
import {
  AgentStatus as CoreAgentStatus,
  ChannelType as CoreChannelType,
  type Agent,
  type UUID,
} from '@elizaos/core';

import clientLogger from '@/lib/logger'; // Added import
import { useQueryClient } from '@tanstack/react-query'; // Import useQueryClient
import { Book, Cog, Hash, Plus, TerminalIcon } from 'lucide-react'; // Added Hash for channels
import { useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom'; // Added useNavigate

/* ---------- helpers ---------- */
const partition = <T,>(src: T[], pred: (v: T) => boolean): [T[], T[]] => {
  const pass: T[] = [];
  const fail: T[] = [];
  src.forEach((v) => (pred(v) ? pass : fail).push(v));
  return [pass, fail];
};

/* ---------- tiny components ---------- */
const SectionHeader = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'px-4 pt-1 pb-0 text-sm font-medium text-muted-foreground sidebar-section-header',
      className
    )}
  >
    {children}
  </div>
);

const SidebarSection = ({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <>
    <SectionHeader className={className}>{title}</SectionHeader>
    <SidebarGroup>
      <SidebarGroupContent className="px-1 mt-0">
        <SidebarMenu>{children}</SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  </>
);

const AgentRow = ({
  agent,
  isOnline,
  active,
}: {
  agent: Agent;
  isOnline: boolean;
  active: boolean;
}) => (
  <SidebarMenuItem className="h-16">
    <NavLink to={`/chat/${agent.id}`}>
      <SidebarMenuButton isActive={active} className="px-4 py-2 my-2 h-full rounded-md">
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8 rounded-full bg-gray-600">
            <img
              src={getAgentAvatar(agent)}
              alt={agent.name || 'avatar'}
              className="object-cover w-full h-full rounded-full"
            />
            <span
              className={cn(
                'absolute bottom-0 right-0 w-[10px] h-[10px] rounded-full border border-white',
                isOnline ? 'bg-green-500' : 'bg-muted-foreground'
              )}
            />
          </div>
          <span className="text-base truncate max-w-24">{agent.name}</span>
        </div>
      </SidebarMenuButton>
    </NavLink>
  </SidebarMenuItem>
);

const GroupRow = ({
  channel,
  serverId,
  active,
}: {
  channel: ClientMessageChannel;
  serverId: UUID;
  active: boolean;
}) => {
  const currentClientId = getEntityId();

  return (
    <SidebarMenuItem className="h-12">
      <NavLink to={`/group/${channel.id}?serverId=${serverId}`}>
        <SidebarMenuButton isActive={active} className="px-4 py-2 my-1 h-full rounded-md">
          <div className="flex items-center gap-3">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate max-w-32">
              {channel.name || generateGroupName(channel, [], currentClientId)}
            </span>
          </div>
        </SidebarMenuButton>
      </NavLink>
    </SidebarMenuItem>
  );
};

const AgentListSection = ({
  title,
  agents,
  activePath,
  className,
}: {
  title: string;
  agents: Partial<Agent>[];
  activePath: string;
  className?: string;
}) => (
  <SidebarSection title={title} className={className}>
    {agents.map((a) => (
      <AgentRow
        key={a?.id}
        agent={a as Agent}
        isOnline={a.status === CoreAgentStatus.ACTIVE}
        active={activePath.includes(`/chat/${String(a?.id)}`)}
      />
    ))}
  </SidebarSection>
);

const GroupListSection = ({
  servers,
  isLoadingServers,
  activePath,
}: {
  servers: ClientMessageServer[] | undefined;
  isLoadingServers: boolean;
  activePath: string;
}) => {
  const navigate = useNavigate();

  const handleCreateGroup = () => {
    navigate('/group/new');
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-1 pb-0">
        <SectionHeader className="px-0 py-0">Groups</SectionHeader>
        <Button variant="ghost" size="icon" onClick={handleCreateGroup} aria-label="Create Group">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <SidebarGroup>
        <SidebarGroupContent className="px-1 mt-0">
          <SidebarMenu>
            {isLoadingServers &&
              Array.from({ length: 3 }).map((_, i) => (
                <SidebarMenuItem key={`skel-group-${i}`}>
                  <SidebarMenuSkeleton />
                </SidebarMenuItem>
              ))}
            {servers?.map((server) => (
              <GroupChannelsForServer
                key={server.id}
                serverId={server.id}
                activePath={activePath}
              />
            ))}
            {(!servers || servers.length === 0) && !isLoadingServers && (
              <SidebarMenuItem>
                <div className="p-4 text-xs text-muted-foreground">No groups found.</div>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
};

const GroupChannelsForServer = ({
  serverId,
  activePath,
}: {
  serverId: UUID;
  activePath: string;
}) => {
  const { data: channelsData, isLoading: isLoadingChannels } = useChannels(serverId);

  const groupChannels = useMemo(
    () => channelsData?.data?.channels?.filter((ch) => ch.type === CoreChannelType.GROUP) || [],
    [channelsData]
  );

  if (isLoadingChannels) {
    return (
      <SidebarMenuItem>
        <SidebarMenuSkeleton />
      </SidebarMenuItem>
    );
  }

  if (!groupChannels.length) {
    return null; // Don't render if no group channels for this server
  }

  return (
    <>
      {groupChannels.map((channel) => (
        <GroupRow
          key={channel.id}
          channel={channel}
          serverId={serverId}
          active={activePath.includes(`/group/${channel.id}`)}
        />
      ))}
    </>
  );
};

// Updated CreateButton: Removed DropdownMenu, simplified to a single action (Create Agent)
// For "Create Group", users will use the button in the "Groups" section header.
const _CreateAgentButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="w-full">
      <Plus className="h-4 w-4 mr-2" />
      Create Agent
    </Button>
  );
};

interface AppSidebarProps {
  refreshHomePage: () => void;
}

/**
 * Renders the main application sidebar, displaying navigation, agent lists, group rooms, and utility links.
 *
 * The sidebar includes sections for online and offline agents, group rooms, a create button for agents and groups, and footer links to documentation, logs, and settings. It handles loading and error states for agent and room data, and conditionally displays a group creation panel.
 */
export function AppSidebar({
  refreshHomePage,
  isMobile = false,
}: AppSidebarProps & { isMobile?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient(); // Get query client instance

  const {
    data: agentsData,
    error: agentsError,
    isLoading: isLoadingAgents,
  } = useAgentsWithDetails();
  const { data: serversData, isLoading: isLoadingServers } = useServers();

  const agents = useMemo(() => agentsData?.agents || [], [agentsData]);
  const servers = useMemo(() => serversData?.data?.servers || [], [serversData]);

  const [onlineAgents, offlineAgents] = useMemo(
    () => partition(agents, (a) => a.status === CoreAgentStatus.ACTIVE),
    [agents]
  );

  // const [isGroupPanelOpen, setGroupPanelOpen] = useState(false); // GroupPanel logic needs rethink
  const handleCreateAgent = () => {
    navigate('/create'); // Navigate to agent creation route
  };

  const agentLoadError = agentsError
    ? 'Error loading agents: NetworkError: Unable to connect to the server. Please check if the server is running.'
    : undefined;

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    clientLogger.info('[AppSidebar] handleLogoClick triggered', { currentPath: location.pathname });

    // Invalidate queries that should be fresh on home page
    queryClient.invalidateQueries({ queryKey: ['agents'] });
    queryClient.invalidateQueries({ queryKey: ['agentsWithDetails'] }); // if this is a separate key
    queryClient.invalidateQueries({ queryKey: ['servers'] });
    queryClient.invalidateQueries({ queryKey: ['channels'] }); // This is broad, consider more specific invalidations if performance is an issue
    // Example: if you know active server IDs, invalidate ['channels', serverId]

    if (location.pathname === '/') {
      clientLogger.info('[AppSidebar] Already on home page. Calling refreshHomePage().');
      // refreshHomePage should ideally trigger a re-render/refetch in Home.tsx
      // This can be done by changing a key prop on Home.tsx or further query invalidations if needed.
      refreshHomePage();
    } else {
      clientLogger.info('[AppSidebar] Not on home page. Navigating to "/".');
      navigate('/');
    }
  };

  return (
    <>
      <Sidebar
        className={cn(
          'bg-background border-r overflow-hidden',
          isMobile ? 'p-3 pt-12 w-full h-full' : 'p-4 w-72 fixed left-0 top-0 z-40 h-screen',
          !isMobile && 'hidden md:flex md:flex-col'
        )}
        collapsible="none"
        data-testid="app-sidebar"
      >
        {/* ---------- header ---------- */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a
                  href="/"
                  onClick={handleLogoClick}
                  className="px-6 py-2 h-full sidebar-logo no-underline"
                >
                  <div className="flex flex-col pt-2 gap-1 items-start justify-center">
                    <img
                      alt="elizaos-logo"
                      src="/elizaos-logo-light.png"
                      className="w-32 max-w-full"
                    />
                    <span className="text-xs font-mono text-muted-foreground">v{info.version}</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* ---------- content ---------- */}
        <SidebarContent className="flex-1 overflow-y-auto">
          {/* create agent button - moved from old CreateButton dropdown */}
          {/* This section is for the "Agents" list.
              The "Create Agent" button should ideally be next to the "Agents" title.
              Let's adjust the structure slightly if needed or place it prominently.
          */}

          {isLoadingAgents && !agentLoadError && (
            <SidebarSection title="Agents">
              <SidebarMenuSkeleton />
            </SidebarSection>
          )}
          {agentLoadError && <div className="px-4 py-2 text-xs text-red-500">{agentLoadError}</div>}

          {!isLoadingAgents && !agentLoadError && (
            <>
              <div className="flex items-center justify-between px-4 pt-1 pb-0">
                <SectionHeader className="px-0 py-0">Agents</SectionHeader>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCreateAgent}
                  aria-label="Create Agent"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <AgentListSection
                title="" // Title is now handled by the SectionHeader above
                agents={[...onlineAgents, ...offlineAgents]}
                activePath={location.pathname}
              />
            </>
          )}
          {/* Original CreateButton placement - to be removed or repurposed if "Create Group" is elsewhere */}
          {/* The old CreateButton had "Create Agent" and "Create Group".
               "Create Agent" is now a + button next to "Agents" title.
               "Create Group" is a + button in the GroupChannelListSection.
               So the old CreateButton component and its direct usage here can be removed.
            */}
          {/*
            <div className="px-4 py-2 mb-2">
              <CreateButton onCreateGroupChannel={handleCreateGroupChannel} />
            </div>
          */}
          <GroupListSection
            servers={servers}
            isLoadingServers={isLoadingServers}
            activePath={location.pathname}
            className="mt-2"
          />
        </SidebarContent>

        {/* ---------- footer ---------- */}
        <SidebarFooter className="px-4 py-4">
          <SidebarMenu>
            <FooterLink to="https://eliza.how/" Icon={Book} label="Documentation" />
            <FooterLink to="/logs" Icon={TerminalIcon} label="Logs" />
            <FooterLink to="/settings" Icon={Cog} label="Settings" />
            <ConnectionStatus />
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Server management hidden - using single default server */}
    </>
  );
}

/* ---------- footer link ---------- */
const FooterLink = ({ to, Icon, label }: { to: string; Icon: typeof Book; label: string }) => {
  const isExternal = to.startsWith('http://') || to.startsWith('https://');

  if (isExternal) {
    return (
      <SidebarMenuItem>
        <a href={to} target="_blank" rel="noopener noreferrer">
          <SidebarMenuButton>
            <Icon className="h-4 w-4 mr-3" />
            {label}
          </SidebarMenuButton>
        </a>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <NavLink to={to}>
        <SidebarMenuButton>
          <Icon className="h-4 w-4 mr-3" />
          {label}
        </SidebarMenuButton>
      </NavLink>
    </SidebarMenuItem>
  );
};
