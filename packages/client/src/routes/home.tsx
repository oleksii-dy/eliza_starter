import PageTitle from "@/components/page-title";
import ProfileCard from "@/components/profile-card";
import { useAgents } from "@/hooks/use-query-hooks";
import { formatAgentName } from "@/lib/utils";
import { useNavigate } from "react-router";
import { Cog } from "lucide-react";

export default function Home() {
    const navigate = useNavigate();
    const { data: agentsData, isLoading, isError, error } = useAgents();

    // Extract agents properly from the response
    const agents = agentsData?.agents || [];

    return (
        <div className="flex flex-col gap-4 h-full p-4">
            <div className="flex items-center justify-between">
                <PageTitle title="Agents" />
                
            </div>
            
            {isLoading && (
                <div className="text-center py-8">Loading agents...</div>
            )}
            
            {isError && (
                <div className="text-center py-8 text-destructive">
                    Error loading agents: {error instanceof Error ? error.message : "Unknown error"}
                </div>
            )}
            
            {agents.length === 0 && !isLoading && (
                <div className="text-center py-8 flex flex-col items-center gap-4">
                    <p className="text-muted-foreground">
                        No agents currently running. Start a character to begin.
                    </p>
                    
                </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {agents?.sort((a, b) => Number(b?.enabled) - Number(a?.enabled)).map((agent) => (
                    <ProfileCard
                        key={agent.id}
                        title={agent.name}
                        content={formatAgentName(agent.name)}
                        buttons={[
                            {
                                label: agent.enabled ? "Chat" : "Start",
                                icon: undefined,
                                action: () => navigate(`/chat/${agent.id}`),
                                className: "w-full grow",
                                variant: "default",
                                size: "default"
                            },
                            {
                                icon: <Cog className="h-4 w-4" />,
                                className: "p-2",
                                action: () => navigate(`/settings/${agent.id}`),
                                variant: "outline",
                                size: "icon"
                            }
                        ]}
                    />
                ))}
            </div>
        </div>
    );
}
