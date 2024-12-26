import { Plugin } from '@ai16z/eliza';
import { privyWalletProvider } from './providers/privyWallet';
import { createPrivyWalletAction } from './actions/createWallet';
import { sendPrivyTransactionAction } from './actions/sendTransaction';
import { signPrivyMessageAction } from './actions/signMessage';

export * from './providers/privyWallet';
export * from './types';
export { createPrivyWalletAction } from './actions/createWallet';
export { sendPrivyTransactionAction } from './actions/sendTransaction';
export { signPrivyMessageAction } from './actions/signMessage';

export const privyPlugin: Plugin = {
  name: "privy",
  description: "Privy server wallet integration for secure blockchain transactions",
  version: "0.1.0",
  providers: [privyWalletProvider],
  actions: [
    createPrivyWalletAction,
    sendPrivyTransactionAction,
    signPrivyMessageAction
  ],
  evaluators: [],
  settings: {
    required: ["PRIVY_APP_ID", "PRIVY_APP_SECRET"],
    optional: []
  }
};

export default privyPlugin;
