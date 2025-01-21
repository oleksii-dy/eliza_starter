import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useGetAgentsQuery } from "@/api";
import "./App.css";
import { Loader2Icon } from "lucide-react";

function Agents() {
    const navigate = useNavigate();
    const { data: agents, isLoading } = useGetAgentsQuery()

    return (
        <div className="min-h-screen flex flex-col items-center p-4 w-full ">
            <h1 className="text-2xl font-bold mb-8">Your AI agents</h1>

            {isLoading ? (
                <div className="flex items-center gap-4">
                    <span>Fetching your agents...</span>
                    <Loader2Icon className="animate-spin h-5 w-5"/>
                </div>
            ) : (
                <div className="grid gap-4 grid-cols-4 w-full">
                    {agents?.map((agent) => (
                        <div key={agent.id} className="h-52 rounded-md flex flex-col justify-end bg-neutral-300" onClick={() => {
                            navigate(`/${agent.id}`);
                        }}>

                        <Button
                            className="w-full text-lg py-6 rounded-b-lg rounded-t-none"
                        >
                            {agent.name}
                        </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Agents;
