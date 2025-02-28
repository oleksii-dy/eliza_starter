import { useQueryClient } from "@tanstack/react-query";
import { Plus, Play, Settings } from "lucide-react";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import {
    Card,
} from "@/components/ui/card";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { characterNameToUrl, formatAgentName } from "@/lib/utils";
import { useCharacters, useStartAgent } from "@/hooks/use-query-hooks";
import { NavLink } from "react-router-dom";
import ProfileCard from "@/components/profile-card";

export default function Characters() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    // Use custom hooks for data fetching and mutations
    const { 
      data: charactersData, 
      isLoading: isCharactersLoading, 
      isError: isCharactersError, 
      error: charactersError,
      isRefetching: isCharactersRefetching
    } = useCharacters();
    
    // Use the start agent mutation hook
    const startAgentMutation = useStartAgent();

    const characters = charactersData?.characters || [];

    // Handler to start an agent with a specific character
    const handleStartAgent = async (characterName: string) => {
        try {
            // Use the mutation hook which handles success/error states
            const response = await apiClient.startAgentByName(characterName);

            queryClient.invalidateQueries({ queryKey: ['agents'] });

            // Navigate to the chat with the newly created agent on success
            if (response && response.id) {
                navigate(`/chat/${response.id}`);
            }
        } catch (error) {
            // Error is already handled by the mutation hook
            console.error("Failed to start agent:", error);
        }
    };

    // Function to refresh the characters list
    const refreshCharacters = () => {
        queryClient.invalidateQueries({ queryKey: ["characters"] });
    };

    return (
        <div className="flex flex-col gap-4 h-full p-4">
            <div className="flex items-center justify-between">
                <PageTitle title="Characters" />
                <NavLink to="/characters/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Character
                    </Button>
                </NavLink>
            </div>
            
            {isCharactersLoading && (
                <div className="text-center py-8">Loading characters...</div>
            )}
            
            {isCharactersError && (
                <div className="text-center py-8 text-destructive">
                    Error loading characters: {charactersError instanceof Error ? charactersError.message : "Unknown error"}
                </div>
            )}
            
            {!isCharactersLoading && characters.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                    No characters found on the server.
                </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {characters.map((character: { name: string }) => (
                    <ProfileCard
                        title={character.name}
                        content={formatAgentName(character.name)}
                        buttons={[
                            {
                                label: "Start",
                                icon: <Play className="h-4 w-4" />,
                                action: () => handleStartAgent(character.name),
                                className: "w-full grow",
                                variant: "default",
                                size: "default"
                            },
                            {
                                icon: <Settings className="h-4 w-4" />,
                                className: "p-2",
                                action: () => navigate(`/characters/edit/${characterNameToUrl(character.name)}`),
                                variant: "outline",
                                size: "icon"
                            }
                        ]}
                    />
                ))}

                {/* Card to create a new character */}
                <Card className="flex justify-center items-center">
                    <Button 
                        variant="ghost" 
                        className="h-24 w-24 rounded-full flex items-center justify-center"
                        onClick={() => navigate('/characters/new')}
                    >
                        <Plus className="h-12 w-12" />
                    </Button>
                </Card>
            </div>
        </div>
    );
} 