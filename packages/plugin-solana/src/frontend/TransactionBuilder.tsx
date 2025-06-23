import React, { useState, useEffect } from 'react';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

interface TransactionBuilderProps {
    walletAddress: string;
    onSendTransaction: (transaction: any) => Promise<string>;
}

type TransactionType = 'transfer-sol' | 'transfer-token' | 'custom';

interface TransferData {
    recipient: string;
    amount: string;
    tokenMint?: string;
    memo?: string;
}

export const TransactionBuilder: React.FC<TransactionBuilderProps> = ({
    walletAddress,
    onSendTransaction,
}) => {
    const [transactionType, setTransactionType] = useState<TransactionType>('transfer-sol');
    const [transferData, setTransferData] = useState<TransferData>({
        recipient: '',
        amount: '',
        tokenMint: '',
        memo: '',
    });
    const [customInstructions, setCustomInstructions] = useState('');
    const [isBuilding, setIsBuilding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const validateAddress = (address: string): boolean => {
        try {
            new PublicKey(address);
            return true;
        } catch {
            return false;
        }
    };

    const handleTransferSol = async () => {
        setError(null);
        setSuccess(null);

        if (!validateAddress(transferData.recipient)) {
            setError('Invalid recipient address');
            return;
        }

        const amount = parseFloat(transferData.amount);
        if (isNaN(amount) || amount <= 0) {
            setError('Invalid amount');
            return;
        }

        try {
            setIsBuilding(true);
            
            const fromPubkey = new PublicKey(walletAddress);
            const toPubkey = new PublicKey(transferData.recipient);
            const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

            const instruction = SystemProgram.transfer({
                fromPubkey,
                toPubkey,
                lamports,
            });

            const transaction = {
                instructions: [instruction],
                feePayer: fromPubkey,
            };

            const signature = await onSendTransaction(transaction);
            setSuccess(`Transaction sent: ${signature}`);
            
            // Reset form
            setTransferData({
                recipient: '',
                amount: '',
                tokenMint: '',
                memo: '',
            });
        } catch (err: any) {
            setError(err.message || 'Transaction failed');
        } finally {
            setIsBuilding(false);
        }
    };

    const handleTransferToken = async () => {
        setError(null);
        setSuccess(null);

        if (!validateAddress(transferData.recipient)) {
            setError('Invalid recipient address');
            return;
        }

        if (!validateAddress(transferData.tokenMint || '')) {
            setError('Invalid token mint address');
            return;
        }

        const amount = parseFloat(transferData.amount);
        if (isNaN(amount) || amount <= 0) {
            setError('Invalid amount');
            return;
        }

        try {
            setIsBuilding(true);
            
            // In a real implementation, you would:
            // 1. Get or create associated token accounts
            // 2. Create transfer instruction
            // 3. Send transaction
            
            setError('Token transfers require additional implementation');
        } catch (err: any) {
            setError(err.message || 'Transaction failed');
        } finally {
            setIsBuilding(false);
        }
    };

    const handleCustomTransaction = async () => {
        setError(null);
        setSuccess(null);

        try {
            setIsBuilding(true);
            const instructions = JSON.parse(customInstructions);
            
            const transaction = {
                instructions,
                feePayer: new PublicKey(walletAddress),
            };

            const signature = await onSendTransaction(transaction);
            setSuccess(`Transaction sent: ${signature}`);
            setCustomInstructions('');
        } catch (err: any) {
            setError(err.message || 'Invalid transaction data');
        } finally {
            setIsBuilding(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        switch (transactionType) {
            case 'transfer-sol':
                await handleTransferSol();
                break;
            case 'transfer-token':
                await handleTransferToken();
                break;
            case 'custom':
                await handleCustomTransaction();
                break;
        }
    };

    return (
        <div className="bg-card rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Transaction Builder</h2>

            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Transaction Type</label>
                <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    <option value="transfer-sol">Transfer SOL</option>
                    <option value="transfer-token">Transfer Token</option>
                    <option value="custom">Custom Transaction</option>
                </select>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {transactionType === 'transfer-sol' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium mb-1">Recipient Address</label>
                            <input
                                type="text"
                                value={transferData.recipient}
                                onChange={(e) => setTransferData({ ...transferData, recipient: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Enter Solana address"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Amount (SOL)</label>
                            <input
                                type="number"
                                step="0.000001"
                                value={transferData.amount}
                                onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="0.0"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Memo (Optional)</label>
                            <input
                                type="text"
                                value={transferData.memo}
                                onChange={(e) => setTransferData({ ...transferData, memo: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Optional memo"
                            />
                        </div>
                    </>
                )}

                {transactionType === 'transfer-token' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium mb-1">Token Mint Address</label>
                            <input
                                type="text"
                                value={transferData.tokenMint}
                                onChange={(e) => setTransferData({ ...transferData, tokenMint: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Token mint address"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Recipient Address</label>
                            <input
                                type="text"
                                value={transferData.recipient}
                                onChange={(e) => setTransferData({ ...transferData, recipient: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Enter Solana address"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Amount</label>
                            <input
                                type="number"
                                step="0.000001"
                                value={transferData.amount}
                                onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="0.0"
                                required
                            />
                        </div>
                    </>
                )}

                {transactionType === 'custom' && (
                    <div>
                        <label className="block text-sm font-medium mb-1">Custom Instructions (JSON)</label>
                        <textarea
                            value={customInstructions}
                            onChange={(e) => setCustomInstructions(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                            placeholder='[{"programId": "...", "keys": [...], "data": "..."}]'
                            rows={6}
                            required
                        />
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                        {success}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isBuilding}
                    className="w-full bg-primary text-white py-2 px-4 rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                    {isBuilding ? 'Building Transaction...' : 'Send Transaction'}
                </button>
            </form>

            <div className="mt-6 text-sm text-gray-600">
                <p className="font-medium mb-2">Tips:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>Always double-check recipient addresses</li>
                    <li>Test with small amounts first</li>
                    <li>Transaction fees will be added automatically</li>
                    <li>Custom transactions require JSON-formatted instructions</li>
                </ul>
            </div>
        </div>
    );
}; 