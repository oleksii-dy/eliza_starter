import type { Plugin } from "@elizaos/core";
import { getOnChainActions } from "./actions";
import { getZilliqaWalletClient, getWalletProviders, getZilliqaViemWalletClient } from "./wallet";

export async function zilliqaPlugin(
    getSetting: (key: string) => string | undefined
): Promise<Plugin> {
    const zilliqaWalletClient = await getZilliqaWalletClient(getSetting);
    const zilliqaViemWalletClient = await getZilliqaViemWalletClient(getSetting);
    if (!(zilliqaWalletClient && zilliqaViemWalletClient)) {
      throw new Error("Zilliqa wallet client initialization failed. Ensure that ZILLIQA_PRIVATE_KEY and ZILLIQA_PROVIDER_URL are configured.");
    }
    const walletClient = zilliqaWalletClient!.getEVM();
    const actions = await getOnChainActions(walletClient, zilliqaWalletClient, zilliqaViemWalletClient);

    return {
        name: "[ZILLIQA] Onchain Actions",
        description: "Zilliqa integration plugin",
        providers: getWalletProviders(walletClient, zilliqaWalletClient),
        evaluators: [],
        services: [],
        actions: actions,
    };
}

export default zilliqaPlugin;
