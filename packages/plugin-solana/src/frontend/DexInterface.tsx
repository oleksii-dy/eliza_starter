import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  balance?: string;
  price?: number;
}

interface DexInterfaceProps {
  walletAddress: string;
  apiBase?: string;
}

interface SwapQuote {
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  rate: number;
  route: string[];
}

export const DexInterface: React.FC<DexInterfaceProps> = ({
  walletAddress,
  apiBase = 'http://localhost:3000',
}) => {
  const [inputToken, setInputToken] = useState<Token | null>(null);
  const [outputToken, setOutputToken] = useState<Token | null>(null);
  const [inputAmount, setInputAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [showTokenSelect, setShowTokenSelect] = useState<'input' | 'output' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch available tokens
  const { data: availableTokens, isLoading: tokensLoading } = useQuery<Token[]>({
    queryKey: ['tokens'],
    queryFn: async () => {
      // In production, this would fetch from Jupiter token list
      return [
        {
          address: 'So11111111111111111111111111111111111111112',
          symbol: 'SOL',
          name: 'Solana',
          decimals: 9,
        },
        {
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
        },
        {
          address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
          symbol: 'USDT',
          name: 'Tether',
          decimals: 6,
        },
        {
          address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
          symbol: 'RAY',
          name: 'Raydium',
          decimals: 6,
        },
        {
          address: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
          symbol: 'BONK',
          name: 'Bonk',
          decimals: 5,
        },
      ];
    },
  });

  // Get swap quote
  const {
    data: swapQuote,
    isLoading: quoteLoading,
    refetch: refetchQuote,
  } = useQuery<SwapQuote | null>({
    queryKey: ['swapQuote', inputToken?.address, outputToken?.address, inputAmount],
    queryFn: async () => {
      if (!inputToken || !outputToken || !inputAmount || parseFloat(inputAmount) <= 0) {
        return null;
      }

      // In production, this would call the Jupiter API
      const mockQuote: SwapQuote = {
        inputAmount,
        outputAmount: (parseFloat(inputAmount) * 0.98).toFixed(6),
        priceImpact: 0.5,
        rate: 0.98,
        route: [inputToken.symbol, outputToken.symbol],
      };

      return mockQuote;
    },
    enabled: !!inputToken && !!outputToken && !!inputAmount && parseFloat(inputAmount) > 0,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Execute swap
  const swapMutation = useMutation({
    mutationFn: async () => {
      if (!inputToken || !outputToken || !inputAmount || !swapQuote) {
        throw new Error('Missing swap parameters');
      }

      const response = await fetch(`${apiBase}/api/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputToken: inputToken.address,
          outputToken: outputToken.address,
          amount: inputAmount,
          slippage: parseFloat(slippage),
          walletAddress,
        }),
      });

      if (!response.ok) {
        throw new Error('Swap failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Reset form
      setInputAmount('');
      refetchQuote();
    },
  });

  const handleSwapTokens = () => {
    const temp = inputToken;
    setInputToken(outputToken);
    setOutputToken(temp);
    setInputAmount('');
  };

  const handleSelectToken = (token: Token, type: 'input' | 'output') => {
    if (type === 'input') {
      setInputToken(token);
    } else {
      setOutputToken(token);
    }
    setShowTokenSelect(null);
    setSearchQuery('');
  };

  const filteredTokens = availableTokens?.filter(
    (token) =>
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const outputAmount = swapQuote?.outputAmount || '0';

  return (
    <div className="bg-card rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Swap</h2>
        <button className="p-2 hover:bg-gray-100 rounded-full" title="Settings">
          ⚙️
        </button>
      </div>

      {/* Slippage Settings */}
      <div className="mb-4">
        <label className="text-sm text-gray-600">Slippage Tolerance</label>
        <div className="flex gap-2 mt-1">
          {['0.1', '0.5', '1.0'].map((value) => (
            <button
              key={value}
              onClick={() => setSlippage(value)}
              className={`px-3 py-1 rounded ${
                slippage === value ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {value}%
            </button>
          ))}
          <input
            type="number"
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            className="w-20 px-2 py-1 border rounded"
            placeholder="Custom"
            step="0.1"
            min="0"
            max="50"
          />
        </div>
      </div>

      {/* Input Token */}
      <div className="bg-gray-50 rounded-lg p-4 mb-2">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600">From</span>
          <span className="text-sm text-gray-600">Balance: {inputToken?.balance || '0'}</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTokenSelect('input')}
            className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            {inputToken ? (
              <>
                <span className="font-medium">{inputToken.symbol}</span>
                <span>▼</span>
              </>
            ) : (
              <span>Select Token</span>
            )}
          </button>
          <input
            type="number"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg text-right text-lg font-medium"
            placeholder="0.0"
            step="0.000001"
          />
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center my-2">
        <button
          onClick={handleSwapTokens}
          className="p-2 hover:bg-gray-100 rounded-full transition-transform hover:rotate-180"
        >
          ⇅
        </button>
      </div>

      {/* Output Token */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600">To</span>
          <span className="text-sm text-gray-600">Balance: {outputToken?.balance || '0'}</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTokenSelect('output')}
            className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            {outputToken ? (
              <>
                <span className="font-medium">{outputToken.symbol}</span>
                <span>▼</span>
              </>
            ) : (
              <span>Select Token</span>
            )}
          </button>
          <div className="flex-1 px-3 py-2 border rounded-lg text-right text-lg font-medium bg-gray-100">
            {quoteLoading ? '...' : outputAmount}
          </div>
        </div>
      </div>

      {/* Quote Details */}
      {swapQuote && (
        <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm">
          <div className="flex justify-between mb-1">
            <span>Rate</span>
            <span>
              1 {inputToken?.symbol} = {swapQuote.rate} {outputToken?.symbol}
            </span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Price Impact</span>
            <span className={swapQuote.priceImpact > 3 ? 'text-red-600' : ''}>
              {swapQuote.priceImpact}%
            </span>
          </div>
          <div className="flex justify-between">
            <span>Route</span>
            <span>{swapQuote.route.join(' → ')}</span>
          </div>
        </div>
      )}

      {/* Swap Button */}
      <button
        onClick={() => swapMutation.mutate()}
        disabled={
          !inputToken ||
          !outputToken ||
          !inputAmount ||
          parseFloat(inputAmount) <= 0 ||
          swapMutation.isPending
        }
        className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {swapMutation.isPending ? 'Swapping...' : 'Swap'}
      </button>

      {/* Error Message */}
      {swapMutation.isError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {swapMutation.error?.message || 'Swap failed'}
        </div>
      )}

      {/* Success Message */}
      {swapMutation.isSuccess && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 text-green-700 rounded">
          Swap completed successfully!
        </div>
      )}

      {/* Token Select Modal */}
      {showTokenSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Select Token</h3>
              <button
                onClick={() => {
                  setShowTokenSelect(null);
                  setSearchQuery('');
                }}
                className="text-2xl hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or symbol"
              className="w-full px-3 py-2 border rounded-lg mb-4"
              autoFocus
            />

            <div className="overflow-y-auto max-h-[50vh]">
              {filteredTokens?.map((token) => (
                <button
                  key={token.address}
                  onClick={() => handleSelectToken(token, showTokenSelect)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    {token.symbol[0]}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{token.symbol}</div>
                    <div className="text-sm text-gray-600">{token.name}</div>
                  </div>
                  {token.balance && (
                    <div className="text-right">
                      <div className="font-medium">{token.balance}</div>
                      {token.price && (
                        <div className="text-sm text-gray-600">
                          ${(parseFloat(token.balance) * token.price).toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
