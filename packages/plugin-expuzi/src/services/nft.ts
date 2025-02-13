
import { SuiClient } from '@mysten/sui.js';

export async function mintNFT(address: string, level: number) {
  const client = new SuiClient();
  
  return await client.mintNFT({
    recipient: address,
    name: 'Degen Detective Badge',
    description: `Level ${level} Degen Detective`,
    image: `badge-${level}.png`
  });
}