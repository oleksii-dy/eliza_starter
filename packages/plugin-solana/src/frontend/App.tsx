import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletBalanceDisplay } from './WalletBalance';
import { TransactionBuilder } from './TransactionBuilder';
import { DexInterface } from './DexInterface';
import { PortfolioTracker } from './PortfolioTracker';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 3,
            staleTime: 60000, // 1 minute
        },
    },
});

interface SolanaPluginAppProps {
    walletAddress?: string;
    agentId?: string;
    apiBase?: string;
}

type Tab = 'balance' | 'portfolio' | 'swap' | 'transactions';

export const SolanaPluginApp: React.FC<SolanaPluginAppProps> = ({
    walletAddress,
    agentId,
    apiBase = 'http://localhost:3000',
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('portfolio');
    const [txHistory, setTxHistory] = useState<Array<{
        signature: string;
        timestamp: number;
        type: string;
        status: 'success' | 'pending' | 'failed';
    }>>([]);

    // Mock transaction handler (in production, this would send to backend)
    const handleSendTransaction = async (transaction: any): Promise<string> => {
        const mockSignature = `${Math.random().toString(36).substring(2)}...`;
        
        setTxHistory(prev => [{
            signature: mockSignature,
            timestamp: Date.now(),
            type: 'transfer',
            status: 'pending',
        }, ...prev]);

        // Simulate transaction processing
        setTimeout(() => {
            setTxHistory(prev => prev.map(tx => 
                tx.signature === mockSignature 
                    ? { ...tx, status: 'success' }
                    : tx
            ));
        }, 3000);

        return mockSignature;
    };

    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: 'portfolio', label: 'Portfolio', icon: '📊' },
        { id: 'balance', label: 'Balance', icon: '💰' },
        { id: 'swap', label: 'Swap', icon: '🔄' },
        { id: 'transactions', label: 'Transactions', icon: '📝' },
    ];

    return (
        <QueryClientProvider client={queryClient}>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow-sm border-b">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-4">
                            <h1 className="text-2xl font-bold text-gray-900">
                                Solana Plugin Dashboard
                            </h1>
                            <div className="text-sm text-gray-600">
                                {walletAddress ? (
                                    <span>
                                        Wallet: {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                                    </span>
                                ) : agentId ? (
                                    <span>Agent: {agentId}</span>
                                ) : (
                                    <span>No wallet connected</span>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Navigation */}
                <nav className="bg-white shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex space-x-8">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                                        activeTab === tab.id
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="space-y-6">
                        {activeTab === 'portfolio' && (
                            <PortfolioTracker
                                walletAddress={walletAddress || ''}
                                agentId={agentId}
                                apiBase={apiBase}
                            />
                        )}

                        {activeTab === 'balance' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <WalletBalanceDisplay
                                    walletAddress={walletAddress}
                                    agentId={agentId}
                                    apiBase={apiBase}
                                />
                                <div className="bg-card rounded-lg shadow-lg p-6">
                                    <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => setActiveTab('swap')}
                                            className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="font-medium">Swap Tokens</div>
                                            <div className="text-sm text-gray-600">Exchange tokens instantly</div>
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('transactions')}
                                            className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="font-medium">Send Transaction</div>
                                            <div className="text-sm text-gray-600">Transfer SOL or tokens</div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'swap' && (
                            <DexInterface
                                walletAddress={walletAddress || ''}
                                apiBase={apiBase}
                            />
                        )}

                        {activeTab === 'transactions' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <TransactionBuilder
                                    walletAddress={walletAddress || ''}
                                    onSendTransaction={handleSendTransaction}
                                />
                                <div className="bg-card rounded-lg shadow-lg p-6">
                                    <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
                                    {txHistory.length === 0 ? (
                                        <p className="text-gray-500 text-center py-8">No transactions yet</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {txHistory.map((tx) => (
                                                <div
                                                    key={tx.signature}
                                                    className="p-3 bg-gray-50 rounded-lg"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="font-mono text-sm">
                                                                {tx.signature.slice(0, 12)}...
                                                            </div>
                                                            <div className="text-xs text-gray-600">
                                                                {new Date(tx.timestamp).toLocaleTimeString()}
                                                            </div>
                                                        </div>
                                                        <span
                                                            className={`text-xs px-2 py-1 rounded ${
                                                                tx.status === 'success'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : tx.status === 'pending'
                                                                    ? 'bg-yellow-100 text-yellow-800'
                                                                    : 'bg-red-100 text-red-800'
                                                            }`}
                                                        >
                                                            {tx.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Footer */}
                <footer className="bg-white border-t mt-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="text-center text-sm text-gray-600">
                            <p>Solana Plugin • ElizaOS</p>
                            <p className="mt-1">
                                Network: {process.env.SOLANA_NETWORK || 'mainnet-beta'} • 
                                RPC: {process.env.SOLANA_RPC_URL ? 'Custom' : 'Default'}
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </QueryClientProvider>
    );
};

// Export as default for easy importing
export default SolanaPluginApp; 