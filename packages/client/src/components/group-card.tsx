import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { Avatar, AvatarGroup } from '@/components/ui/avatar'; // AvatarGroup removed
import type { UUID, Agent } from '@elizaos/core';
import type { MessageChannel as ClientMessageChannel } from '@/types';
import { Users, MessageCircle } from 'lucide-react';
import { generateGroupName, getEntityId } from '@/lib/utils';

// The group prop will be a central channel, enriched with server_id for navigation context
// Assume group.participants might be available or added later.
interface GroupCardProps {
  group: ClientMessageChannel & { server_id: UUID; participants?: Partial<Agent>[] };
  // onEdit?: (group: ClientMessageChannel) => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ group /*, onEdit */ }) => {
  const navigate = useNavigate();
  const currentClientId = getEntityId(); // Get current client/user ID

  if (!group || !group.id) {
    return (
      <Card className="p-4 min-h-[180px] flex items-center justify-center text-muted-foreground">
        Group data not available.
      </Card>
    );
  }

  const groupName = generateGroupName(group, group.participants || [], currentClientId);
  // Assuming participant count might come from metadata or a separate query in the parent component
  const participantCount =
    group.metadata?.participantCount ||
    group.metadata?.member_count ||
    group.participants?.length ||
    0;

  const handleChatClick = () => {
    navigate(`/group/${group.id}?serverId=${group.server_id}`);
  };

  // const handleEditClick = (e: React.MouseEvent) => {
  //   e.stopPropagation();
  //   if (onEdit) onEdit(group);
  // };

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg border bg-card hover:border-primary/20">
      {/* Member count badge */}
      {participantCount > 0 && (
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm border">
            <Users className="h-3 w-3" />
            <span className="text-xs font-medium">{participantCount}</span>
          </div>
        </div>
      )}

      {/* Visual header */}
      <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-4 bg-background/50 backdrop-blur-sm rounded-full">
            <Users className="h-12 w-12 text-primary/60" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg truncate" title={groupName}>
            {groupName}
          </h3>
          {group.topic && (
            <p className="text-sm text-muted-foreground line-clamp-2">{group.topic}</p>
          )}
        </div>

        <Button onClick={handleChatClick} className="w-full" size="sm">
          <MessageCircle className="mr-2 h-4 w-4" />
          Open Group
        </Button>
      </div>
    </Card>
  );
};

export default GroupCard;
