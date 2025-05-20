import { useQuery } from "@tanstack/react-query";
import PageTitle from "@/components/page-title";
import { apiClient } from "@/lib/api";
import { useParams } from "react-router";
import type { UUID } from "@elizaos/core";

export default function Entities() {
    const { agentId } = useParams<{ agentId: UUID }>();
    // for now use agentId as roomId as well
    const roomId = agentId as string;

    const entitiesQuery = useQuery({
        queryKey: ["entities", agentId],
        queryFn: () => apiClient.getEntities(agentId!, roomId),
        enabled: !!agentId,
    });

    const factsQuery = useQuery({
        queryKey: ["facts", agentId],
        queryFn: () => apiClient.getFacts(agentId!, roomId),
        enabled: !!agentId,
    });

    const entities = entitiesQuery.data?.entities ?? [];
    const facts = factsQuery.data?.facts ?? [];

    return (
        <div className="p-4 space-y-4">
            <PageTitle
                title="Entities"
                subtitle="Known entities and their components"
            />
            <div className="space-y-2">
                {entities.map((entity: any, idx: number) => (
                    <div
                        key={entity.id}
                        className={
                            idx === 0
                                ? "border p-2 rounded-md bg-muted"
                                : "border p-2 rounded-md"
                        }
                    >
                        <div className="font-semibold">{entity.name}</div>
                        <pre className="text-xs overflow-x-auto">
                            {JSON.stringify(entity.components, null, 2)}
                        </pre>
                    </div>
                ))}
            </div>
            {facts.length > 0 ? (
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Facts</h3>
                    <ul className="list-disc pl-5 text-sm space-y-0.5">
                        {facts.map((f) => (
                            <li key={f}>{f}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}
