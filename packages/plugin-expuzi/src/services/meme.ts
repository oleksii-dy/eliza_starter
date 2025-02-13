import { coingeckoPlugin } from '@elizaos/plugin-coingecko';
import { Memory, State } from '@elizaos/core';

export async function generateMeme(symbol: string, runtime: any) {
  // Create basic memory and state objects for plugin interaction
  const message: Memory = {
    userId: '00000000-0000-0000-0000-000000000000',
    agentId: '00000000-0000-0000-0000-000000000000',
    roomId: '00000000-0000-0000-0000-000000000000',
    content: {
      text: `Get sentiment for ${symbol}`,
      coinIds: symbol,
      include_sentiment: true
    }
  };

  const state: State = {
    userId: '00000000-0000-0000-0000-000000000000',
    agentId: '00000000-0000-0000-0000-000000000000',
    roomId: '00000000-0000-0000-0000-000000000000',
    messageId: 'mock-message',
    timestamp: Date.now(),
    bio: '',
    lore: '',
    messageDirections: '',
    postDirections: '',
    actors: '',
    recentMessages: '',
    recentMessagesData: []
  };

  let sentiment = 0;
  
  // Use CoinGecko plugin to get sentiment
  await runtime.processActions(
    message,
    [],
    state,
    async (response: any) => {
      if (response?.content?.sentiment) {
        sentiment = response.content.sentiment;
      }
      return [];
    }
  );

  const template = sentiment > 0 
    ? 'bullish-template.jpg'
    : 'bearish-template.jpg';

  return {
    template,
    text: `${symbol} ${sentiment > 0 ? 'TO THE MOON 🚀' : 'DOWN BAD 📉'}`,
    sentiment
  };
}
