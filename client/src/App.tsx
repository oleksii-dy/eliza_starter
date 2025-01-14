import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/toaster";
import { BrowserRouter, Route, Routes } from "react-router";
import Chat from "./routes/chat";
import Overview from "./routes/overview";
import Home from "./routes/home";
import Docs from "./routes/docs";
import Terminal from "./routes/terminal";
import useVersion from "./hooks/use-version";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: Infinity,
        },
    },
});

function App() {
    useVersion();
    return (
        <QueryClientProvider client={queryClient}>
            <div
                className="dark antialiased"
                style={{
                    colorScheme: "dark",
                }}
            >
                <BrowserRouter>
                    <TooltipProvider delayDuration={0}>
                        <div className="flex flex-1 flex-col size-full">
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/docs" element={<Docs />} />
                                <Route path="/terminal" element={<Terminal />} />
                                <Route path="/chat/:agentId" element={<Chat />} />
                                <Route path="/settings/:agentId" element={<Overview />} />
                            </Routes>
                        </div>
                        <Toaster />
                    </TooltipProvider>
                </BrowserRouter>
            </div>
        </QueryClientProvider>
    );
}

export default App;
