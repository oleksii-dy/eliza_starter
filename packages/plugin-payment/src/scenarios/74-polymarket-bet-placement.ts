type Scenario = any;

const polymarketBetPlacementScenario: Scenario = {
  name: 'Payment: Place Bets on Polymarket',
  description: 'Demonstrates placing prediction market bets on Polymarket',
  category: 'payment',
  examples: [
    [
      {
        user: 'alice',
        content: 'Bet 100 USDC on YES for "Will BTC reach $100k by end of year?"',
      },
      {
        user: 'agent',
        content: 'Placing bet on Polymarket: 100 USDC on YES for "BTC $100k by EOY" at current odds of $0.72. You\'ll receive 138.89 shares. Confirming transaction...',
        action: 'PLACE_POLYMARKET_BET',
      },
    ],
    [
      {
        user: 'bob',
        content: 'I want to bet 500 USDC that the Fed won\'t cut rates in March',
      },
      {
        user: 'agent',
        content: 'Processing Polymarket bet: 500 USDC on NO for "Fed rate cut in March" at $0.65 odds. This will give you 769.23 shares. Transaction requires approval due to amount.',
        action: 'PLACE_POLYMARKET_BET',
      },
    ],
    [
      {
        user: 'charlie',
        content: 'Place a $50 bet on the election market, candidate A to win',
      },
      {
        user: 'agent',
        content: 'Executing Polymarket order: 50 USDC on "Candidate A wins election" at current price $0.55. You\'ll receive 90.91 shares. Estimated profit if correct: $40.91.',
        action: 'PLACE_POLYMARKET_BET',
      },
    ],
  ],
  actions: ['PLACE_POLYMARKET_BET'],
  evaluator: (response: string) => {
    const hasBetIntent =
      response.toLowerCase().includes('bet') ||
      response.toLowerCase().includes('placing') ||
      response.toLowerCase().includes('order');

    const hasPolymarket = response.toLowerCase().includes('polymarket');
    const hasAmount = /\d+\s*(USDC|USD|\$)/i.test(response);
    const hasOdds = /\$0\.\d+|odds|shares|price/i.test(response);

    return hasBetIntent && hasPolymarket && hasAmount && hasOdds;
  },
  tags: ['payment', 'polymarket', 'bet', 'prediction', 'trading'],
};

export default polymarketBetPlacementScenario;
