// src/services/bluefinClient.ts
import { BluefinClient, Networks } from '@bluefin-exchange/bluefin-v2-client';
import { Provider } from '@elizaos/core';

export class BluefinExtendedProvider implements Provider {
  public async get(): Promise<any> {
    // Implement the get method logic here
    return Promise.resolve();
  }
  public client: BluefinClient;
  public initPromise: Promise<void>;

  constructor() {
    // Accept terms automatically (true)
    const isTermAccepted = true;

    // Determine network from environment variable
    const network =
      process.env.BLUEFIN_NETWORK === 'PRODUCTION_SUI'
        ? Networks.PRODUCTION_SUI
        : Networks.TESTNET_SUI;

    // Use seed phrase if available; otherwise, use private key.
    const seedPhrase = process.env.BLUEFIN_SEED_PHRASE;
    const key = seedPhrase || process.env.BLUEFIN_PRIVATE_KEY;
    if (!key) {
      throw new Error('Either BLUEFIN_SEED_PHRASE or BLUEFIN_PRIVATE_KEY is required.');
    }
    // For this implementation, we use ED25519 for both cases.
    const keyType = "ED25519";

    // Initialize the BluefinClient using the correct constructor signature.
    this.client = new BluefinClient(isTermAccepted, network, key, keyType);
    // Ensure asynchronous initialization completes.
    this.initPromise = this.client.init().then(() => {
      console.log(`Bluefin Client initialized. Public Address: ${this.client.getPublicAddress()}`);
    });
  }
}

export const bluefinExtendedProvider = new BluefinExtendedProvider();