type Scenario = any;

const paymentSendRealMoneyScenario: Scenario = {
  name: 'Payment: Send Real Money Between Agents',
  description: 'Demonstrates sending actual cryptocurrency between two agents',
  category: 'payment',
  examples: [
    [
      {
        user: 'alice',
        content: 'Send 0.001 ETH to bob.eth',
      },
      {
        user: 'agent',
        content: "I'll send 0.001 ETH to bob.eth. Let me process this transaction for you.",
        action: 'SEND_PAYMENT',
      },
    ],
    [
      {
        user: 'charlie',
        content: 'Transfer 10 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
      },
      {
        user: 'agent',
        content:
          'Processing transfer of 10 USDC to the specified address. This requires confirmation due to the amount.',
        action: 'SEND_PAYMENT',
      },
    ],
    [
      {
        user: 'david',
        content: 'Send 5 SOL to CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq',
      },
      {
        user: 'agent',
        content: "I'll send 5 SOL to the Solana address. Processing the transaction now.",
        action: 'SEND_PAYMENT',
      },
    ],
  ],
  actions: ['SEND_PAYMENT'],
  evaluator: (response: string) => {
    const hasPaymentIntent =
      response.toLowerCase().includes('send') ||
      response.toLowerCase().includes('transfer') ||
      response.toLowerCase().includes('processing');

    const mentionsAmount = /\d+(\.\d+)?\s*(ETH|USDC|SOL|MATIC)/i.test(response);
    const hasAddress =
      /0x[a-fA-F0-9]{40}/.test(response) || // Ethereum address
      /[1-9A-HJ-NP-Za-km-z]{32,44}/.test(response) || // Solana address
      /\w+\.eth/.test(response); // ENS name

    return hasPaymentIntent && (mentionsAmount || hasAddress);
  },
  tags: ['payment', 'crypto', 'transfer', 'blockchain'],
};

export default paymentSendRealMoneyScenario;
