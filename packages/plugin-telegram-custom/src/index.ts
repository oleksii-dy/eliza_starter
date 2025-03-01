// index.ts

import { Plugin, AgentRuntime, Service } from "@elizaos/core";

// A simple service class that polls an API endpoint every second
class ApiPollingService {
    private intervalId: NodeJS.Timeout | null = null;

    constructor(private endpoint: string) {}

    // Start polling the API endpoint
    start() {
        this.intervalId = setInterval(async () => {
            try {
                const response = await fetch(this.endpoint);
                const data = await response.json();
                console.log("[ApiPollingService] Response:", data);
            } catch (error) {
                console.error("[ApiPollingService] Error:", error);
            }
        }, 1000); // 1000 ms = 1 second
    }

    // Stop polling
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

// Define the service in the plugin framework
const pollingService: Service = {
    name: "apiPollingService",
    // This function is called when the agent initializes
    initialize: async (runtime: AgentRuntime) => {
        // Retrieve the API endpoint from runtime settings; fallback to a default URL
        const endpoint =
            runtime.getSetting("API_ENDPOINT") || "http://127.0.0.1:5000";
        const serviceInstance = new ApiPollingService(endpoint);
        serviceInstance.start();

        // Register the service instance with the runtime for later reference
        runtime.registerService("apiPollingService", serviceInstance);
    },
    // This function is called when the agent shuts down
    shutdown: async (runtime: AgentRuntime) => {
        const serviceInstance: ApiPollingService =
            runtime.getService("apiPollingService");
        if (serviceInstance) {
            serviceInstance.stop();
        }
    },
};

// Export the plugin object
export const apiPollingPlugin: Plugin = {
    name: "apiPollingPlugin",
    description: "A custom plugin that polls an API endpoint every second.",
    services: [pollingService],
};

export default apiPollingPlugin;
