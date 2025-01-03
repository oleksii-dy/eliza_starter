import { useQuery } from "@tanstack/react-query";
import "./App.css";
import Chat from "./Chat";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Search, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type Agent = {
    id: string;
    name: string;
};

function Agents() {
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

    const { data: agents, isLoading } = useQuery({
        queryKey: ["agents"],
        queryFn: async () => {
            const res = await fetch("/api/agents");
            const data = await res.json();
            return data.agents as Agent[];
        },
    });

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <div className={`${isSidebarExpanded ? 'w-64' : 'w-16'} border-r bg-sidebar-background flex flex-col py-4 relative transition-all duration-300`}>
                <button
                    onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                    className="absolute -right-3 top-6 bg-background border rounded-full p-1 hover:bg-secondary"
                >
                    {isSidebarExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>

                {/* Main sidebar content */}
                <div className="flex-1">
                    {isLoading ? (
                        <div className="text-center">Loading...</div>
                    ) : (
                        <div className={`flex flex-col ${isSidebarExpanded ? 'px-4' : 'px-2'} space-y-4`}>
                            {agents?.map((agent) => (
                                <button
                                    key={agent.id}
                                    onClick={() => setSelectedAgent(agent.id)}
                                    className={`flex items-center ${isSidebarExpanded ? 'w-full p-2 rounded-lg justify-start space-x-3' : 'w-full p-2 rounded-lg justify-center'} 
                                        hover:bg-secondary transition-all ${selectedAgent === agent.id ? 'ring-2 ring-primary' : ''}`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                                        <span className="text-lg font-semibold text-secondary-foreground">
                                            {agent.name.charAt(0)}
                                        </span>
                                    </div>
                                    {isSidebarExpanded && (
                                        <span className="text-sm font-medium truncate">
                                            {agent.name}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Theme toggle at bottom */}
                <div className={`mt-auto pt-4 border-t ${isSidebarExpanded ? 'px-4' : 'px-2'}`}>
                    <div className="flex items-center justify-center">
                        <ThemeToggle />
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1">
                {selectedAgent ? (
                    <div className="flex flex-col h-full">
                        <div className="border-b p-4 flex items-center justify-between bg-background">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                                    <img
                                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${agents?.find(a => a.id === selectedAgent)?.name}`}
                                        alt="Agent avatar"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <h2 className="font-semibold">
                                        {agents?.find(a => a.id === selectedAgent)?.name}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">Online</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button className="p-2 hover:bg-secondary rounded-full">
                                    <Search size={20} />
                                </button>
                                <button className="p-2 hover:bg-secondary rounded-full">
                                    <Settings size={20} />
                                </button>
                            </div>
                        </div>
                        <Chat key={selectedAgent} agentId={selectedAgent} />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="text-center text-muted-foreground">
                            <h1 className="text-2xl font-bold mb-4">Welcome to Eliza</h1>
                            <p>Select an agent from the sidebar to start chatting</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Agents;
