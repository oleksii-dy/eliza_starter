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

    if (query.isPending) {
        return (
            <div className="flex justify-center items-center h-full">
                <p>Loading memories...</p>
            </div>
        );
    }

    if (query.isError) {
        return (
            <div className="flex justify-center items-center h-full text-red-500">
                <p>Failed to load memories. Error: {query.error?.message || 'Unknown error'}</p>
            </div>
        );
    }

    if (!agentId) return <div>No agent selected.</div>;

    return (
        <div className="h-full p-4">
            <MemoryTab memories={memories} />
        </div>
    );
}
