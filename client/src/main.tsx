import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "./router.tsx";
import '@mysten/dapp-kit/dist/index.css';
// Config options for the networks you want to connect to
const { networkConfig } = createNetworkConfig({
	localnet: { url: getFullnodeUrl('localnet') },
	mainnet: { url: getFullnodeUrl('mainnet') },
    testnet: { url: getFullnodeUrl('testnet') },
    devnet: { url: getFullnodeUrl('devnet') },

});

// Initialize theme
const theme = localStorage.getItem("theme") || "system";
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
document.documentElement.classList.add(theme === "system" ? systemTheme : theme);

// Create a client
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
                <WalletProvider>
                    <RouterProvider router={router} />
                </WalletProvider>
			</SuiClientProvider>
        </QueryClientProvider>
    </StrictMode>
);
