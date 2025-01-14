import { useParams } from "react-router";
import Chat from "@/components/chat";
import { UUID } from "@elizaos/core";
import { NavLink } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AgentRoute() {
    const { agentId } = useParams<{ agentId: UUID }>();

    if (!agentId) return <div>No data.</div>;

    return (
        <div className="flex flex-col min-h-screen gradient-bg">
            {/* Header */}
            <div className="border-b border-border/10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/50">
                <div className="flex items-center h-16 px-4 gap-4">
                    <NavLink to="/">
                        <Button variant="ghost" size="icon" className="text-primary">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </NavLink>
                    <h1 className="text-lg font-semibold">Chat with Nayari</h1>
                </div>
            </div>

            {/* Chat Interface */}
            <div className="flex-1 overflow-hidden">
                <Chat agentId={agentId} />
            </div>
        </div>
    );
}
