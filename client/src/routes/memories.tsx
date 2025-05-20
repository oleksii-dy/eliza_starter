import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useParams } from "react-router";
import MemoryTab from "@/components/memory/memory-tab";
import type { UUID } from "@elizaos/core";

export default function MemoriesRoute() {
    const { agentId } = useParams<{ agentId: UUID }>();
    const roomId = agentId ?? "";

    const query = useQuery({
        queryKey: ["memories", agentId, roomId],
        queryFn: () => apiClient.getMemories(agentId ?? "", roomId),
        enabled: Boolean(agentId),
    });

    const memories = query.data?.memories || [];

    if (!agentId) return <div>No agent selected.</div>;

    return (
        <div className="h-full p-4">
            <MemoryTab memories={memories} />
        </div>
    );
}
