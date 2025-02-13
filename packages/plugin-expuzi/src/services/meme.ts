import { getSocialSentiment } from '../utils/api';

export async function generateMeme(symbol: string) {
  const sentiment = await getSocialSentiment(symbol);
  
  const template = sentiment > 0 
    ? 'bullish-template.jpg'
    : 'bearish-template.jpg';

  return {
    template,
    text: `${symbol} ${sentiment > 0 ? 'TO THE MOON 🚀' : 'DOWN BAD 📉'}`,
    sentiment
  };
}
