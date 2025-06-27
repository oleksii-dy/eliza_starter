type Scenario = any;

const polymarketBetsScenario: Scenario = {
  name: 'Payment: Get Polymarket Bets',
  description: 'Demonstrates retrieving betting information and odds from Polymarket',
  category: 'payment',
  examples: [
    [
      {
        user: 'alice',
        content: 'What are the current odds on the presidential election market?',
      },
      {
        user: 'agent',
        content:
          'The current Polymarket odds for the presidential election are: Candidate A at 55% ($0.55), Candidate B at 43% ($0.43), with 2% for other outcomes. Total volume: $125M.',
        action: 'GET_POLYMARKET_ODDS',
      },
    ],
    [
      {
        user: 'bob',
        content: 'Show me the top trending prediction markets',
      },
      {
        user: 'agent',
        content:
          'Top trending markets on Polymarket:\n1. "Will BTC reach $100k by EOY?" - Yes: 72%, Volume: $8.5M\n2. "Fed rate cut in March?" - Yes: 35%, Volume: $5.2M\n3. "AI regulation bill passes?" - Yes: 61%, Volume: $3.8M',
        action: 'GET_POLYMARKET_MARKETS',
      },
    ],
    [
      {
        user: 'charlie',
        content: 'Check my active bets on Polymarket',
      },
      {
        user: 'agent',
        content:
          'Your active Polymarket positions:\n1. "BTC $100k" - 500 USDC on YES at $0.68\n2. "ETH merge success" - 200 USDC on YES at $0.92 (winning)\n3. "Tech IPO Q1" - 300 USDC on NO at $0.75\nTotal at risk: 1000 USDC',
        action: 'CHECK_POLYMARKET_POSITIONS',
      },
    ],
  ],
  actions: ['GET_POLYMARKET_ODDS', 'GET_POLYMARKET_MARKETS', 'CHECK_POLYMARKET_POSITIONS'],
  evaluator: (response: string) => {
    const hasMarketInfo =
      response.toLowerCase().includes('polymarket') ||
      response.toLowerCase().includes('odds') ||
      response.toLowerCase().includes('prediction') ||
      response.toLowerCase().includes('market');

    const hasPercentage = /\d+%/.test(response);
    const hasPrice = /\$\d+(\.\d+)?/.test(response);
    const hasVolume = /volume|position|bet/i.test(response);

    return hasMarketInfo && (hasPercentage || hasPrice || hasVolume);
  },
  tags: ['payment', 'polymarket', 'prediction', 'betting', 'odds'],
};

export default polymarketBetsScenario;
