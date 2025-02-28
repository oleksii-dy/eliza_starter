import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { useAgents, useCharacters } from "@/hooks/use-query-hooks";
import type { UUID } from "@elizaos/core";
import { Cog, Users } from "lucide-react";
import { NavLink, useNavigate } from "react-router";
import ProfileCard from "@/components/profile-card";
import { formatAgentName } from "@/lib/utils";

export default function Home() {
    const navigate = useNavigate();
    const { data: agentsData } = useAgents();
    const { data: charactersData } = useCharacters();

    const agents = agentsData?.agents || [];
    const characterCount = charactersData?.characters?.length || 0;

    return (
        <div className="flex flex-col gap-4 h-full p-4">
            <div className="flex items-center justify-between">
                <PageTitle title="Agents" />
                
            </div>
            
            {agentsData?.isLoading && (
                <div className="text-center py-8">Loading agents...</div>
            )}
            
            {agentsData?.isError && (
                <div className="text-center py-8 text-destructive">
                    Error loading agents: {agentsData?.error instanceof Error ? agentsData?.error.message : "Unknown error"}
                </div>
            )}
            
            {agents.length === 0 && !agentsData?.isLoading && (
                <div className="text-center py-8 flex flex-col items-center gap-4">
                    <p className="text-muted-foreground">
                        No agents currently running. Start a character to begin.
                    </p>
                    {characterCount > 0 && (
                        <NavLink to="/characters">
                            <Button>
                                <Users className="h-4 w-4 mr-2" />
                                Go to Characters
                            </Button>
                        </NavLink>
                    )}
                </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {agents?.map((agent: { id: UUID; name: string }) => (
                    <ProfileCard
                        title={agent.name}
                        content={formatAgentName(agent.name)}
                        buttons={[
                            {
                                label: "Chat",
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
