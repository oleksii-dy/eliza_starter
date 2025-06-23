import type { Scenario } from '../types';

export const secretsManagementScenario: Scenario = {
  name: 'Secrets Management with Admin',
  description: 'Admin provides API keys to agents which then use them to perform authenticated actions',
  
  messages: [
    {
      role: 'user',
      content: 'Admin: I need to give you some API keys for the weather and news services. Store these securely: WEATHER_API_KEY=wk_123456789 and NEWS_API_KEY=nk_987654321',
    },
    {
      role: 'assistant',
      expectedActions: ['STORE_SECRET'],
      expectedContent: ['stored', 'securely', 'API keys'],
    },
    {
      role: 'user',
      content: 'Can you check the weather in San Francisco using the weather API?',
    },
    {
      role: 'assistant',
      expectedActions: ['CHECK_WEATHER'],
      expectedContent: ['weather', 'San Francisco', 'temperature'],
    },
    {
      role: 'user',
      content: 'Now get me the latest tech news headlines.',
    },
    {
      role: 'assistant',
      expectedActions: ['GET_NEWS'],
      expectedContent: ['news', 'headlines', 'technology'],
    },
    {
      role: 'user',
      content: 'Try to access the finance API (which I haven\'t given you keys for).',
    },
    {
      role: 'assistant',
      expectedActions: [],
      expectedContent: ['API key', 'not available', 'finance', 'cannot access'],
    },
    {
      role: 'user',
      content: 'Admin: Here\'s the finance API key: FINANCE_API_KEY=fk_555666777',
    },
    {
      role: 'assistant',
      expectedActions: ['STORE_SECRET'],
      expectedContent: ['stored', 'finance API key'],
    },
    {
      role: 'user',
      content: 'Now try to get stock prices for AAPL.',
    },
    {
      role: 'assistant',
      expectedActions: ['GET_STOCK_PRICE'],
      expectedContent: ['AAPL', 'stock', 'price', '$'],
    },
  ],

  validate: async (runtime: any) => {
    // Validate secrets were stored and used
    const storedSecrets = {
      weather: runtime.getSetting('WEATHER_API_KEY') === 'wk_123456789',
      news: runtime.getSetting('NEWS_API_KEY') === 'nk_987654321',
      finance: runtime.getSetting('FINANCE_API_KEY') === 'fk_555666777',
    };

    console.log('Secrets validation:', storedSecrets);

    // Check if mock services were called with correct keys
    const weatherService = runtime.getService('weather');
    const newsService = runtime.getService('news');
    const financeService = runtime.getService('finance');

    return {
      success: Object.values(storedSecrets).every(v => v),
      secretsStored: Object.keys(storedSecrets).filter(k => storedSecrets[k]).length,
      servicesAvailable: {
        weather: !!weatherService,
        news: !!newsService,
        finance: !!financeService,
      },
    };
  },
}; 