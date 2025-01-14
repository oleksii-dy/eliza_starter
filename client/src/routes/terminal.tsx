import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useEffect, useState } from "react";

export default function Terminal() {
    const [logs, setLogs] = useState<string[]>([
        "Initializing Nayari AI system...",
        "Loading configuration...",
        "Establishing connection..."
    ]);

    const query = useQuery({
        queryKey: ["agents"],
        queryFn: () => apiClient.getAgents(),
        refetchInterval: 5_000
    });

    useEffect(() => {
        if (query.data?.agents) {
            setLogs(prev => [
                ...prev,
                `Connected to ${query.data.agents.length} AI agent(s)`,
                "System ready for interaction",
                "Type 'help' for available commands"
            ]);
        }
    }, [query.data?.agents]);

    return (
        <div className="flex flex-col min-h-screen gradient-bg p-4">
            <div className="flex-1 max-w-4xl mx-auto w-full">
                <div className="bg-card rounded-lg p-4 font-mono text-sm h-[600px] overflow-y-auto">
                    <div className="mb-4 text-primary font-semibold">
                        Nayari AI Terminal v1.0.0
                    </div>
                    {logs.map((log, index) => (
                        <div key={index} className="mb-2">
                            <span className="text-primary mr-2">{">"}</span>
                            <span className="text-muted-foreground">{log}</span>
                        </div>
                    ))}
                    <div className="flex items-center mt-4">
                        <span className="text-primary mr-2">{">"}</span>
                        <div className="w-2 h-4 bg-primary animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}