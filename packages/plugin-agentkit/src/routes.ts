import type { Route } from "./types/core";
import type { AgentKitService } from "./services/AgentKitService";
import { custodialWalletRoutes } from "./api/walletRoutes";

export const agentKitRoutes: Route[] = [
    ...custodialWalletRoutes,
    {
        path: "/api/agentkit/wallet",
        type: "GET",
        handler: async (req, res, runtime) => {
            try {
                const service = runtime.getService<AgentKitService>("agentkit");
                if (!service || !service.isReady()) {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "AgentKit service not available" }));
                    return;
                }

                const agentKit = service.getAgentKit();
                if (!agentKit) {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "AgentKit not initialized" }));
                    return;
                }

                // Access wallet through agentKit's wallet property
                let address = "Unknown";
                try {
                    if ((agentKit as any).wallet) {
                        address = await (agentKit as any).wallet.getDefaultAddress();
                    } else if ((agentKit as any).getAddress) {
                        address = await (agentKit as any).getAddress();
                    }
                } catch (err) {
                    console.error("[AgentKit API] Error getting address:", err);
                }
                let balance = {};
                
                try {
                    // Check if getBalance method exists
                    if (typeof (agentKit as any).getBalance === 'function') {
                        balance = await (agentKit as any).getBalance();
                    } else {
                        // Fallback to empty balance
                        balance = { ETH: "0" };
                    }
                } catch (err) {
                    console.error("[AgentKit API] Error getting balance:", err);
                    balance = { ETH: "0" };
                }

                const network = runtime.getSetting("CDP_NETWORK_ID") || "base-mainnet";

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    address,
                    balance,
                    network,
                }));
            } catch (error: any) {
                console.error("[AgentKit API] Wallet info error:", error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        },
    },
    {
        path: "/api/agentkit/actions",
        type: "GET",
        handler: async (req, res, runtime) => {
            try {
                // Get all AgentKit-related actions from runtime
                const actions = runtime.actions
                    .filter(action => 
                        action.name.includes("BALANCE") ||
                        action.name.includes("TRANSFER") ||
                        action.name.includes("SWAP") ||
                        action.name.includes("DEPLOY") ||
                        action.name.includes("MINT") ||
                        action.name.includes("STAKE") ||
                        action.name.includes("WRAP") ||
                        action.name.includes("ERC20") ||
                        action.name.includes("ERC721") ||
                        action.name.includes("COMPOUND") ||
                        action.name.includes("MORPHO") ||
                        action.name.includes("MOONWELL") ||
                        action.name.includes("ACROSS") ||
                        action.name.includes("PYTH") ||
                        action.name.includes("MESSARI") ||
                        action.name.includes("DEFILLAMA")
                    )
                    .map(action => ({
                        name: action.name,
                        description: action.description,
                    }));

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(actions));
            } catch (error: any) {
                console.error("[AgentKit API] Actions list error:", error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        },
    },
    {
        path: "/api/agentkit/execute",
        type: "POST",
        handler: async (req, res, runtime) => {
            try {
                // Parse request body
                let body = '';
                for await (const chunk of req) {
                    body += chunk;
                }
                
                const { action: actionName, params } = JSON.parse(body);

                if (!actionName) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Action name required" }));
                    return;
                }

                // Find the action
                const action = runtime.actions.find(a => a.name === actionName);
                if (!action) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: `Action ${actionName} not found` }));
                    return;
                }

                // Create a synthetic message for the action
                const message = {
                    id: `00000000-0000-0000-0000-${Date.now().toString().padStart(12, '0')}`,
                    entityId: `00000000-0000-0000-0000-${runtime.agentId.slice(0, 12)}`,
                    roomId: `00000000-0000-0000-0000-adminpanel000`,
                    agentId: runtime.agentId,
                    content: {
                        text: `Execute ${actionName} with params: ${JSON.stringify(params)}`,
                        actions: [actionName],
                        ...params,
                    },
                    createdAt: Date.now(),
                };

                // Validate the action
                const isValid = await action.validate(runtime, message as any, {} as any);
                if (!isValid) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        error: "Action validation failed",
                        message: "The action cannot be executed with the provided parameters",
                    }));
                    return;
                }

                // Execute the action
                let result = null;
                const callback = async (response: any) => {
                    result = response;
                    return [];
                };

                const actionResult = await action.handler(
                    runtime,
                    message as any,
                    {} as any,
                    params,
                    callback
                );

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    result: actionResult || result,
                    action: actionName,
                    timestamp: new Date().toISOString(),
                }));
            } catch (error: any) {
                console.error("[AgentKit API] Action execution error:", error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: "Action execution failed",
                    message: error.message,
                }));
            }
        },
    },
    {
        path: "/api/agentkit/transaction/:hash",
        type: "GET",
        handler: async (req, res, runtime) => {
            try {
                // Extract hash from URL path
                const urlParts = req.url?.split('/') || [];
                const hash = urlParts[urlParts.length - 1];
                
                const service = runtime.getService<AgentKitService>("agentkit");
                
                if (!service || !service.isReady()) {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "AgentKit service not available" }));
                    return;
                }

                const agentKit = service.getAgentKit();
                if (!agentKit) {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "AgentKit not initialized" }));
                    return;
                }

                // Get transaction details (this would need implementation in AgentKit)
                // For now, return a placeholder
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    hash,
                    status: "pending",
                    message: "Transaction tracking not yet implemented",
                }));
            } catch (error: any) {
                console.error("[AgentKit API] Transaction lookup error:", error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        },
    },
    {
        path: "/api/agentkit/config",
        type: "GET",
        handler: async (req, res, runtime) => {
            try {
                const service = runtime.getService<AgentKitService>("agentkit");
                const isServiceReady = service && service.isReady();

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    serviceReady: isServiceReady,
                    network: runtime.getSetting("CDP_NETWORK_ID") || "base-mainnet",
                    hasApiKey: !!runtime.getSetting("CDP_API_KEY_NAME"),
                    hasPrivateKey: !!runtime.getSetting("CDP_API_KEY_PRIVATE_KEY"),
                }));
            } catch (error: any) {
                console.error("[AgentKit API] Config error:", error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        },
    },
    {
        path: "/admin",
        type: "GET",
        handler: async (req, res, runtime) => {
            try {
                // Serve the admin panel HTML
                const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AgentKit Admin Panel</title>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        ${await getAdminPanelScript()}
    </script>
</body>
</html>
                `;
                
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
            } catch (error: any) {
                console.error("[AgentKit Admin] Error serving admin panel:", error);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end("Error loading admin panel");
            }
        },
        name: "AgentKit Admin",
    },
];

// Helper function to get the admin panel React component as a string
async function getAdminPanelScript(): Promise<string> {
    // For production, this would be bundled properly
    // For now, return the component as a string
    return `
        const { useState, useEffect } = React;

        const AgentKitAdmin = () => {
            const [walletInfo, setWalletInfo] = useState(null);
            const [actions, setActions] = useState([]);
            const [isLoading, setIsLoading] = useState(true);
            const [error, setError] = useState(null);
            const [selectedAction, setSelectedAction] = useState(null);
            const [actionParams, setActionParams] = useState({});

            useEffect(() => {
                loadWalletInfo();
                loadActions();
            }, []);

            const loadWalletInfo = async () => {
                try {
                    const response = await fetch('/api/agentkit/wallet');
                    if (!response.ok) throw new Error('Failed to load wallet info');
                    const data = await response.json();
                    setWalletInfo(data);
                } catch (err) {
                    setError('Failed to load wallet information');
                    console.error(err);
                }
            };

            const loadActions = async () => {
                try {
                    const response = await fetch('/api/agentkit/actions');
                    if (!response.ok) throw new Error('Failed to load actions');
                    const data = await response.json();
                    setActions(data);
                } catch (err) {
                    setError('Failed to load actions');
                    console.error(err);
                } finally {
                    setIsLoading(false);
                }
            };

            const executeAction = async (actionName) => {
                try {
                    setError(null);
                    const response = await fetch('/api/agentkit/execute', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: actionName,
                            params: actionParams[actionName] || {},
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Action execution failed');
                    }

                    const result = await response.json();
                    console.log('Action result:', result);
                    
                    // Refresh wallet info after action
                    await loadWalletInfo();
                    
                    // Update action status
                    setActions(prev => prev.map(a => 
                        a.name === actionName 
                            ? { ...a, lastExecuted: new Date(), status: 'success' }
                            : a
                    ));
                } catch (err) {
                    setError(err.message);
                    setActions(prev => prev.map(a => 
                        a.name === actionName 
                            ? { ...a, status: 'error' }
                            : a
                    ));
                }
            };

            if (isLoading) {
                return React.createElement('div', { className: 'flex items-center justify-center h-64' },
                    React.createElement('div', { className: 'text-gray-500' }, 'Loading AgentKit admin panel...')
                );
            }

            return React.createElement('div', { className: 'max-w-4xl mx-auto p-6' },
                React.createElement('h1', { className: 'text-2xl font-bold mb-6' }, 'AgentKit Admin Panel'),
                
                error && React.createElement('div', { 
                    className: 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6' 
                }, error),

                // Wallet Section
                React.createElement('div', { className: 'bg-white rounded-lg shadow p-6 mb-6' },
                    React.createElement('h2', { className: 'text-xl font-bold mb-4' }, 'Wallet Information'),
                    walletInfo ? React.createElement('div', { className: 'space-y-2' },
                        React.createElement('div', { className: 'flex items-center justify-between' },
                            React.createElement('span', { className: 'text-gray-600' }, 'Address:'),
                            React.createElement('code', { className: 'text-sm bg-gray-100 px-2 py-1 rounded' }, 
                                walletInfo.address
                            )
                        ),
                        React.createElement('div', { className: 'flex items-center justify-between' },
                            React.createElement('span', { className: 'text-gray-600' }, 'Network:'),
                            React.createElement('span', { className: 'font-medium' }, walletInfo.network)
                        ),
                        React.createElement('div', { className: 'mt-4' },
                            React.createElement('h3', { className: 'font-medium mb-2' }, 'Balances:'),
                            React.createElement('div', { className: 'space-y-1' },
                                Object.entries(walletInfo.balance || {}).map(([token, amount]) =>
                                    React.createElement('div', { 
                                        key: token, 
                                        className: 'flex justify-between text-sm' 
                                    },
                                        React.createElement('span', null, token + ':'),
                                        React.createElement('span', { className: 'font-mono' }, amount)
                                    )
                                )
                            )
                        )
                    ) : React.createElement('p', { className: 'text-gray-500' }, 'Loading wallet information...')
                ),

                // Actions Section
                React.createElement('div', { className: 'bg-white rounded-lg shadow p-6' },
                    React.createElement('h2', { className: 'text-xl font-bold mb-4' }, 'Available Actions'),
                    actions.length > 0 ? React.createElement('div', { className: 'space-y-3' },
                        actions.map((action) =>
                            React.createElement('div', {
                                key: action.name,
                                className: 'border rounded-lg p-4 hover:bg-gray-50'
                            },
                                React.createElement('div', { className: 'flex items-center justify-between' },
                                    React.createElement('div', { className: 'flex-1' },
                                        React.createElement('h3', { className: 'font-medium' }, action.name),
                                        React.createElement('p', { className: 'text-sm text-gray-600 mt-1' }, 
                                            action.description
                                        )
                                    ),
                                    React.createElement('button', {
                                        onClick: () => executeAction(action.name),
                                        className: 'ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600',
                                        disabled: action.status === 'pending'
                                    }, action.status === 'pending' ? 'Executing...' : 'Execute')
                                )
                            )
                        )
                    ) : React.createElement('p', { className: 'text-gray-500' }, 'No actions available')
                )
            );
        };

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(AgentKitAdmin));
    `;
} 