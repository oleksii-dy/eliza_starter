import React, { useState, useEffect } from 'react';

interface WalletInfo {
    address: string;
    balance: Record<string, string>;
    network: string;
}

interface AgentKitAction {
    name: string;
    description: string;
    lastExecuted?: Date;
    status?: 'success' | 'error' | 'pending';
}

export const AgentKitAdmin: React.FC = () => {
    const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
    const [actions, setActions] = useState<AgentKitAction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [actionParams, setActionParams] = useState<Record<string, any>>({});

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

    const executeAction = async (actionName: string) => {
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
                    ? { ...a, lastExecuted: new Date(), status: 'success' as const }
                    : a
            ));
        } catch (err: any) {
            setError(err.message);
            setActions(prev => prev.map(a => 
                a.name === actionName 
                    ? { ...a, status: 'error' as const }
                    : a
            ));
        }
    };

    const renderWalletSection = () => (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Wallet Information</h2>
            {walletInfo ? (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600">Address:</span>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {walletInfo.address}
                        </code>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600">Network:</span>
                        <span className="font-medium">{walletInfo.network}</span>
                    </div>
                    <div className="mt-4">
                        <h3 className="font-medium mb-2">Balances:</h3>
                        <div className="space-y-1">
                            {Object.entries(walletInfo.balance).map(([token, amount]) => (
                                <div key={token} className="flex justify-between text-sm">
                                    <span>{token}:</span>
                                    <span className="font-mono">{amount}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <p className="text-gray-500">Loading wallet information...</p>
            )}
        </div>
    );

    const renderActionsSection = () => (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Available Actions</h2>
            {actions.length > 0 ? (
                <div className="space-y-3">
                    {actions.map((action) => (
                        <div
                            key={action.name}
                            className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                            onClick={() => setSelectedAction(action.name)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h3 className="font-medium">{action.name}</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {action.description}
                                    </p>
                                    {action.lastExecuted && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            Last executed: {action.lastExecuted.toLocaleString()}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        executeAction(action.name);
                                    }}
                                    className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                                    disabled={action.status === 'pending'}
                                >
                                    {action.status === 'pending' ? 'Executing...' : 'Execute'}
                                </button>
                            </div>
                            {action.status === 'error' && (
                                <p className="text-red-500 text-sm mt-2">
                                    Last execution failed
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500">No actions available</p>
            )}
        </div>
    );

    const renderActionModal = () => {
        if (!selectedAction) return null;

        const action = actions.find(a => a.name === selectedAction);
        if (!action) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-bold mb-4">Configure {action.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{action.description}</p>
                    
                    {/* Dynamic form fields based on action */}
                    {action.name === 'TRANSFER' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Recipient Address
                                </label>
                                <input
                                    type="text"
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="0x..."
                                    onChange={(e) => setActionParams({
                                        ...actionParams,
                                        [action.name]: {
                                            ...actionParams[action.name],
                                            to: e.target.value,
                                        },
                                    })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Amount
                                </label>
                                <input
                                    type="text"
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="0.0"
                                    onChange={(e) => setActionParams({
                                        ...actionParams,
                                        [action.name]: {
                                            ...actionParams[action.name],
                                            amount: e.target.value,
                                        },
                                    })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Token
                                </label>
                                <select
                                    className="w-full border rounded px-3 py-2"
                                    onChange={(e) => setActionParams({
                                        ...actionParams,
                                        [action.name]: {
                                            ...actionParams[action.name],
                                            token: e.target.value,
                                        },
                                    })}
                                >
                                    <option value="ETH">ETH</option>
                                    <option value="USDC">USDC</option>
                                    <option value="USDT">USDT</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={() => setSelectedAction(null)}
                            className="px-4 py-2 border rounded hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                executeAction(action.name);
                                setSelectedAction(null);
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Execute
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading AgentKit admin panel...</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">AgentKit Admin Panel</h1>
            
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            )}

            {renderWalletSection()}
            {renderActionsSection()}
            {renderActionModal()}
        </div>
    );
}; 