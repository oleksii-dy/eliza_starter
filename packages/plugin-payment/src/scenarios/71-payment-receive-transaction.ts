type Scenario = any;

const paymentReceiveTransactionScenario: Scenario = {
  name: 'Payment: Receive and Track Transactions',
  description: 'Demonstrates receiving cryptocurrency and tracking incoming transactions',
  category: 'payment',
  examples: [
    [
      {
        user: 'alice',
        content: 'Show me my wallet address to receive ETH',
      },
      {
        user: 'agent',
        content: 'Your ETH wallet address is 0x742d35Cc6634C0532925a3b844Bc9e7595f7E123. You can share this to receive Ethereum or ERC-20 tokens.',
        action: 'GET_WALLET_ADDRESS',
      },
    ],
    [
      {
        user: 'bob',
        content: 'Check if I received the 50 USDC payment from Charlie',
      },
      {
        user: 'agent',
        content: 'Let me check your recent transactions. I found an incoming payment of 50 USDC from 0x123...abc received 10 minutes ago.',
        action: 'CHECK_TRANSACTION',
      },
    ],
    [
      {
        user: 'carol',
        content: 'What\'s my Solana wallet balance?',
      },
      {
        user: 'agent',
        content: 'Your Solana wallet balance is 125.5 SOL. You have 3 recent incoming transactions totaling 25 SOL in the last 24 hours.',
        action: 'CHECK_BALANCE',
      },
    ],
  ],
  actions: ['GET_WALLET_ADDRESS', 'CHECK_TRANSACTION', 'CHECK_BALANCE'],
  evaluator: (response: string) => {
    const hasWalletInfo = 
      response.toLowerCase().includes('wallet') ||
      response.toLowerCase().includes('address') ||
      response.toLowerCase().includes('balance');
    
    const hasTransactionInfo = 
      response.toLowerCase().includes('transaction') ||
      response.toLowerCase().includes('received') ||
      response.toLowerCase().includes('incoming');
    
    const hasAmount = /\d+(\.\d+)?\s*(ETH|USDC|SOL|MATIC)/i.test(response);
    
    return hasWalletInfo || hasTransactionInfo || hasAmount;
  },
  tags: ['payment', 'receive', 'wallet', 'balance', 'transaction'],
};

export default paymentReceiveTransactionScenario; 