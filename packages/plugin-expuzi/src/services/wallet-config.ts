export interface WalletConfig {
  getAddress(): Promise<string>;
}

export class SuiWalletConfig implements WalletConfig {
  constructor(private settings: Record<string, string>) {}

  async getAddress(): Promise<string> {
    const address = this.settings['wallet.address'];
    if (!address) {
      throw new Error('Wallet address not configured');
    }
    return address;
  }
}