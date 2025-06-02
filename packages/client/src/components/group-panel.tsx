import { Separator } from '@/components/ui/separator';
import { GROUP_CHAT_SOURCE } from '@/constants';
import { useAgentsWithDetails, useChannels, useServers } from '@/hooks/use-query-hooks';
import { apiClient } from '@/lib/api';
import { type Agent, AgentStatus, type UUID } from '@elizaos/core';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Loader2, Trash, X, Users, Settings, Plus, Bot } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import MultiSelectCombobox from './combobox';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const DEFAULT_SERVER_ID = '00000000-0000-0000-0000-000000000000' as UUID; // Single default server

// Define the Option type to match what MultiSelectCombobox expects
interface ComboboxOption {
  icon: string;
  label: string;
  id?: string;
}

interface GroupPanelProps {
  onClose: () => void;
  channelId?: UUID;
}

/**
 * Displays a modal panel for creating or editing a group chat channel, allowing users to set a group name and select agents to include.
 *
 * If a {@link channelId} is provided, the panel loads the existing channel's details for editing; otherwise, it initializes for channel creation. Users can invite agents, update the channel name, create a new channel, update an existing channel, or delete a channel. Upon successful operations, the component navigates to the relevant channel, closes the panel, and refreshes the channel list.
 *
 * @param onClose - Callback invoked to close the panel.
 * @param channelId - Optional ID of the channel to edit.
 */
export default function GroupPanel({ onClose, channelId }: GroupPanelProps) {
  const [chatName, setChatName] = useState('');
  const [selectedAgentObjects, setSelectedAgentObjects] = useState<Partial<Agent>[]>([]);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [serverId, setServerId] = useState<UUID>(DEFAULT_SERVER_ID);

  const { data: channelsData, refetch: refetchChannels } = useChannels(serverId || undefined, {
    enabled: !!serverId && !!channelId,
  });
  const { data: agentsData } = useAgentsWithDetails();
  const allAvailableAgents = useMemo(() => agentsData?.agents || [], [agentsData]);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: channelParticipantsData, isLoading: isLoadingChannelParticipants } = useQuery({
    queryKey: ['channelParticipants', channelId, serverId],
    queryFn: async () => {
      if (!channelId || !serverId) return { data: { participants: [] } };
      console.log(`[GroupPanel] Fetching participants for channel: ${channelId}`);
      try {
        const response = await apiClient.getChannelParticipants(channelId);
        console.log('[GroupPanel] Fetched participant IDs:', response.data);
        return { data: { participants: response.data } };
      } catch (error) {
        console.error('[GroupPanel] Error fetching participants:', error);
        return { data: { participants: [] } };
      }
    },
    enabled: !!channelId && !!serverId,
  });

  useEffect(() => {
    console.log('[GroupPanel] Edit/Create Effect Triggered. channelId:', channelId);
    if (!channelId) {
      if (chatName || selectedAgentObjects.length > 0) {
        console.log('[GroupPanel] Create mode: Resetting form.');
        setChatName('');
        setSelectedAgentObjects([]);
      }
    } else {
      // Edit mode: Load channel name if available
      const currentChannel = channelsData?.data?.channels.find(ch => ch.id === channelId);
      if (currentChannel?.name) {
        setChatName(currentChannel.name);
      }
    }
  }, [channelId, channelsData]);

  useEffect(() => {
    if (channelId && channelParticipantsData?.data?.participants && allAvailableAgents.length > 0 && !isLoadingChannelParticipants) {
      const participantIds = channelParticipantsData.data.participants as UUID[];
      console.log('[GroupPanel] Edit mode: Fetched participant IDs for initial selection:', participantIds);
      const currentChannelParticipants = allAvailableAgents.filter((agent) =>
        participantIds.includes(agent.id as UUID)
      );
      setSelectedAgentObjects(currentChannelParticipants);
      console.log(
        '[GroupPanel] Edit mode: Populated selectedAgentObjects from fetched participants:',
        currentChannelParticipants
      );
    }
  }, [channelId, channelParticipantsData, allAvailableAgents, isLoadingChannelParticipants]);

  useEffect(() => {
    console.log('[GroupPanel] chatName:', chatName, 'Trimmed length:', chatName.trim().length);
    const buttonDisabled = !chatName.trim().length || !serverId || deleting || creating;
    console.log('[GroupPanel] Create/Update button disabled state:', buttonDisabled, {
      chatNameEmpty: !chatName.trim().length,
      serverIdMissing: !serverId,
      isDeleting: deleting,
      isCreating: creating,
    });
  }, [chatName, serverId, deleting, creating]);

  // Diagnostic logging for selectedAgentObjects (for chip rendering)
  useEffect(() => {
    console.log('[GroupPanel] selectedAgentObjects updated (raw):', selectedAgentObjects);
    if (selectedAgentObjects.length > 0) {
      console.log(
        '[GroupPanel] Data for agent chips. Count:',
        selectedAgentObjects.length,
        'Data:',
        JSON.stringify(selectedAgentObjects.map(a => ({ id: a?.id, name: a?.name })))
      );
      selectedAgentObjects.forEach((agent, index) => {
        const key = agent?.id ? agent.id : `agent-chip-${index}`;
        const agentName = agent?.name || 'Unnamed Agent';
        console.log(`[GroupPanel] Chip to render: ${agentName} (id: ${key})`);
      });
    } else {
      console.log('[GroupPanel] No selected agents to render chips for.');
    }
  }, [selectedAgentObjects]);

  const allAgentOptionsForCombobox: ComboboxOption[] = useMemo(() => {
    return (
      allAvailableAgents
        ?.filter((agent) => agent.status === AgentStatus.ACTIVE && agent.name && agent.id)
        .map((agent) => ({
          icon: agent.settings?.avatar || '',
          label: agent.name || 'Unknown Agent',
          id: agent.id as string,
        })) || []
    );
  }, [allAvailableAgents]);

  const selectedOptionsForCombobox: ComboboxOption[] = useMemo(() => {
    return selectedAgentObjects.map(agent => ({
      icon: agent.settings?.avatar || '',
      label: agent.name || 'Unknown Agent',
      id: agent.id as string,
    }));
  }, [selectedAgentObjects]);

  const handleComboboxSelect = useCallback((newlySelectedOptions: ComboboxOption[]) => {
    console.log('[GroupPanel] MultiSelectCombobox onSelect called with options:', newlySelectedOptions);
    // Convert these options back to full Agent objects
    const newSelectedAgentObjects = allAvailableAgents.filter(agent =>
      newlySelectedOptions.some(option => option.id === agent.id)
    );
    console.log('[GroupPanel] Updating selectedAgentObjects to:', newSelectedAgentObjects);
    setSelectedAgentObjects(newSelectedAgentObjects);
  }, [allAvailableAgents]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-2xl shadow-2xl border-0 bg-background/95 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              {channelId ? (
                <Settings className="h-5 w-5 text-primary" />
              ) : (
                <Users className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">
                {channelId ? 'Edit Group Chat' : 'Create Group Chat'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {channelId
                  ? 'Modify your group settings and members'
                  : 'Set up a new group chat with AI agents'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <Separator className="mb-6" />

        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="chat-name" className="text-sm font-medium flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                Group Name
              </Label>
            </div>
            <Input
              id="chat-name"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              className="w-full transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              placeholder="Enter group name (e.g., AI Research Team)"
              disabled={creating || deleting}
              autoFocus={!channelId}
            />
            {chatName.trim().length > 0 && (
              <p className="text-xs text-muted-foreground">✓ Group name looks good</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="invite-agents"
                className="text-sm font-medium flex items-center gap-2"
              >
                <Users className="h-4 w-4 text-primary" />
                Invite Agents
              </Label>
              <span className="text-xs text-muted-foreground">
                ({selectedAgentObjects.length} selected)
              </span>
            </div>
            <div className="border rounded-lg p-3 bg-muted/20">
              <MultiSelectCombobox
                options={allAgentOptionsForCombobox}
                value={selectedOptionsForCombobox}
                onSelect={handleComboboxSelect}
                className="w-full"
              />
            </div>
            {selectedAgentObjects.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {selectedAgentObjects.map((agent, index) => {
                  const key = agent?.id ? agent.id : `agent-chip-${index}`;
                  const agentName = agent?.name || 'Unnamed Agent';
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-xs"
                    >
                      <Bot className="h-3 w-3" />
                      <span>{agentName}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview section */}
          {chatName.trim().length > 0 && (
            <div className="border rounded-lg p-4 bg-muted/10">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Preview
              </h4>
              <div className="text-sm text-muted-foreground">
                <p>
                  Group: <span className="font-medium text-foreground">{chatName}</span>
                </p>
                <p>
                  Members:{' '}
                  <span className="font-medium text-foreground">
                    {selectedAgentObjects.length} agent(s)
                  </span>
                </p>
                {selectedAgentObjects.length === 0 && (
                  <p className="text-amber-600 text-xs mt-2">
                    ⚠️ Consider adding at least one agent to start conversations
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between pt-6 gap-4">
          {channelId && (
            <Button
              variant="destructive"
              onClick={async () => {
                const channel = channelsData?.data?.channels.find((ch) => ch.id === channelId);
                const confirmDelete = window.confirm(
                  `Are you sure you want to permanently delete the group chat "${channel?.name || chatName || 'this group'}"? This action cannot be undone.`
                );
                if (!confirmDelete) {
                  return;
                }
                setDeleting(true);
                try {
                  console.warn('apiClient.deleteCentralChannel is not implemented.');
                  toast({ title: 'Success (Simulated)', description: 'Group deletion simulated.' });
                  queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
                  queryClient.invalidateQueries({ queryKey: ['channels'] });
                  navigate(`/`);
                  onClose();
                } catch (error) {
                  console.error('Failed to delete channel', error);
                  toast({
                    title: 'Error',
                    description: 'Failed to delete group.',
                    variant: 'destructive',
                  });
                } finally {
                  setDeleting(false);
                }
              }}
              disabled={deleting || creating}
              className="hover:bg-destructive hover:text-destructive-foreground"
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash className="mr-2 h-4 w-4" />
              )}
              Delete Group
            </Button>
          )}

          <Button
            variant="default"
            className={cn('shadow-sm hover:shadow-md transition-all', channelId ? '' : 'flex-1')}
            onClick={async () => {
              if (!chatName.trim().length || !serverId) {
                toast({
                  title: 'Validation Error',
                  description: 'Chat name cannot be empty.',
                  variant: 'destructive',
                });
                return;
              }
              setCreating(true);
              const participantIds = selectedAgentObjects.map((agent) => agent.id as UUID);
              console.log(
                '[GroupPanel] Attempting to create/update group with participant IDs:',
                participantIds
              );
              try {
                if (!channelId) {
                  console.log('[GroupPanel] Calling createCentralGroupChat...');
                  const response = await apiClient.createCentralGroupChat({
                    name: chatName,
                    participantCentralUserIds: participantIds,
                    type: 'group',
                    server_id: serverId,
                    metadata: {
                      source: GROUP_CHAT_SOURCE,
                    },
                  });
                  console.log('[GroupPanel] createCentralGroupChat response:', response);

                  if (response.data && response.data.id) {
                    toast({ title: 'Success', description: `Group "${chatName}" created.` });
                    console.log('[GroupPanel] Invalidating channel queries...');
                    await queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
                    await queryClient.invalidateQueries({ queryKey: ['channels'] });

                    const targetPath = `/group/${response.data.id}?serverId=${serverId}`;
                    console.log(`[GroupPanel] Navigating to: ${targetPath}`);
                    navigate(targetPath);
                    console.log('[GroupPanel] Navigation completed for create - not calling onClose to avoid going back.');
                  } else {
                    console.error('[GroupPanel] Group creation API call did not return expected data (response.data or response.data.id missing).', response);
                    toast({ title: 'Error', description: 'Group created, but failed to get ID for navigation.', variant: 'destructive' });
                  }
                } else {
                  console.log(`[GroupPanel] Calling updateCentralGroupChat for channel ${channelId}...`);
                  await apiClient.updateCentralGroupChat(channelId, {
                    name: chatName,
                    participantCentralUserIds: participantIds,
                  });
                  console.log('[GroupPanel] updateCentralGroupChat finished.');
                  toast({
                    title: 'Success',
                    description: `Group "${chatName}" updated.`,
                  });
                  console.log('[GroupPanel] Invalidating channel and participant queries...');
                  await queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
                  await queryClient.invalidateQueries({ queryKey: ['channels'] });
                  await queryClient.invalidateQueries({ queryKey: ['channelParticipants', channelId, serverId] });

                  const targetPath = `/group/${channelId}?serverId=${serverId}`;
                  console.log(`[GroupPanel] Navigating to: ${targetPath}`);
                  navigate(targetPath);
                  console.log('[GroupPanel] Navigation completed for update - not calling onClose to avoid going back.');
                }
              } catch (error) {
                console.error('[GroupPanel] Failed to create/update group', error);
                const action = channelId ? 'update' : 'create';
                toast({
                  title: 'Error',
                  description: `Failed to ${action} group. Please check logs.`,
                  variant: 'destructive',
                });
              } finally {
                setCreating(false);
              }
            }}
            disabled={!chatName.trim().length || !serverId || deleting || creating}
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {channelId ? (
              <>
                <Settings className="mr-2 h-4 w-4" />
                Update Group
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
