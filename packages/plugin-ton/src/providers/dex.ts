import { IAgentRuntime, elizaLogger } from "@elizaos/core";
import { Address, OpenedContract, Sender, toNano } from "@ton/core";
// Import DeDust SDK modules (adjust the imports according to your SDK version)
import { Asset, PoolType, VaultJetton, JettonRoot, Factory, MAINNET_FACTORY_ADDR,ReadinessStatus } from "@dedust/sdk";
import { WalletProvider } from "..";

/**
 * DexProvider interface defines the supported DEX operations.
 */
export interface DexProvider {
  createPool(params: {
    jetton: string;
  });
  depositLiquidity(params: {
    jettonAddress: string;
    depositAmountTon: string;
    depositAmountJetton: string;
  }): Promise<void>;
  withdrawLiquidity(params: {
    jettonAddress: string;
    withdrawAmount: string;
  }): Promise<void>;
  swapTon(params: {
    targetJetton: string;
    swapAmount: string;
  }): Promise<void>;
  swapJettons(params: {
    sourceJetton: string;
    targetJetton: string;
    swapAmount: string;
    minimalAmountOut: string;
  }): Promise<void>;
  claimFees(params: {
    jettonAddress: string;
    feeClaimAmount: string;
  }): Promise<void>;
  getPoolData(params: {
    jettonAddress: string;
  }): Promise<void>;
}

/**
 * DedustDexProvider implements DexProvider using the DeDust SDK.
 * The following methods simulate actual SDK calls. In production, replace the simulation with the real API calls.
 */
export class DedustDexProvider implements DexProvider {
  private walletProvider: WalletProvider;
  private factory: OpenedContract<Factory>;

  constructor(walletProvider: WalletProvider, testnet: boolean = false) {
    this.walletProvider = walletProvider;

    this.factory = this.walletProvider.getWalletClient().open(Factory.createFromAddress(testnet ? TESTNET_FACTORY_ADDR : MAINNET_FACTORY_ADDR));
    // In a real implementation, initialize the DeDust SDK's TonClient here using runtime settings.

  }

  // creates a pool with TON to jetton
  //@param jetton: string - the address of the jetton to create a pool with
  async createPool(params: {
    jetton: string;
  }): Promise<boolean> {
    elizaLogger.log("DedustDexProvider.createPool called with params:", params);

    const sender = this.walletProvider.wallet as unknown as Sender;
    const jettonAddress = Address.parse(params.jetton);

    const asset = Asset.jetton(jettonAddress);

    console.log(sender)
    // Create a vault
    await this.factory.sendCreateVault(sender, {
        asset
    });

    const client = this.walletProvider.getWalletClient();
    
    const pool = client.open(
        await this.factory.getPool(PoolType.VOLATILE, [Asset.native(), asset]),
      );
      
      const poolReadiness = await pool.getReadinessStatus();
      
      if (poolReadiness === ReadinessStatus.NOT_DEPLOYED) {
        await this.factory.sendCreateVolatilePool(sender, {
          assets: [Asset.native(), asset],
        });
      } else {
        return false;
      }

    elizaLogger.log("DedustDexProvider.createPool completed");
    return true;
  }

  async depositLiquidity(params: {
    jettonAddress: string;
    depositAmountTon: string;
    depositAmountJetton: string;
  }) {
    elizaLogger.log("DedustDexProvider.depositLiquidity called with params:", params);

    const client = this.walletProvider.getWalletClient();
    const sender = this.walletProvider.wallet as unknown as Sender;

    const tonAmount = toNano(params.depositAmountTon); // 5 TON
    const jettonAmount = toNano(params.depositAmountJetton); // 10 SCALE

    const assets: [Asset, Asset] = [Asset.native(), Asset.jetton(Address.parse(params.jettonAddress))];
    const targetBalances: [bigint, bigint] = [tonAmount, jettonAmount];
    const tonVault = client.open(await this.factory.getNativeVault());
    const scaleVault = client.open(await this.factory.getJettonVault(Address.parse(params.jettonAddress)));

    await tonVault.sendDepositLiquidity(sender, {
        poolType: PoolType.VOLATILE,
        assets,
        targetBalances,
        amount: tonAmount,
    });

    const scaleRoot = client.open(JettonRoot.createFromAddress(Address.parse(params.jettonAddress)));
    const scaleWallet = client.open(await scaleRoot.getWallet(sender.address));

    await scaleWallet.sendTransfer(sender, toNano('0.5'), {
        amount: jettonAmount,
        destination: scaleVault.address,
        responseAddress: sender.address,
        forwardAmount: toNano('0.4'),
        forwardPayload: VaultJetton.createDepositLiquidityPayload({
            poolType: PoolType.VOLATILE,
            assets,
            targetBalances,
        }),
    });

    elizaLogger.log("DedustDexProvider.depositLiquidity completed");
  }

  async withdrawLiquidity(params: { jettonAddress: string; withdrawAmount?: string }) {
    elizaLogger.log("DedustDexProvider.withdrawLiquidity called with params:", params);

    const client = this.walletProvider.getWalletClient();
    const sender = this.walletProvider.wallet as unknown as Sender;

    const pool = client.open(await this.factory.getPool(PoolType.VOLATILE, [Asset.native(), Asset.jetton(Address.parse(params.jettonAddress))]));
    const lpWallet = client.open(await pool.getWallet(sender.address));

    const liquidityAvailable = await lpWallet.getBalance();
    const requestedWithdrawalAmount = toNano(params.withdrawAmount || liquidityAvailable);
    if(params.withdrawAmount && liquidityAvailable < requestedWithdrawalAmount) {
      throw new Error("Insufficient liquidity available");
    }

    await lpWallet.sendBurn(sender, toNano('0.5'), {
        amount: requestedWithdrawalAmount,
    });

    elizaLogger.log("DedustDexProvider.withdrawLiquidity completed");
  }

  //@ param targetJetton: string - the address of the jetton to swap to
  //@ param swapAmount: string - the amount of TON to swap
  async swapTon(params: { targetJetton: string; swapAmount: string; }) {
    elizaLogger.log("DedustDexProvider.swap called with params:", params);

    const targetJettonAddress = Address.parse(params.targetJetton);
    const targetJetton = Asset.jetton(targetJettonAddress);

    const client = this.walletProvider.getWalletClient();

    const pool = client.open(await this.factory.getPool(PoolType.VOLATILE, [Asset.native(), targetJetton]));
    if ((await pool.getReadinessStatus()) !== ReadinessStatus.READY) {
        throw new Error('Pool (TON, SCALE) does not exist.');
    }
    
    const tonVault = client.open(await this.factory.getNativeVault());
    // Check if vault exits:
    if ((await tonVault.getReadinessStatus()) !== ReadinessStatus.READY) {
        throw new Error('Vault (TON) does not exist.');
    }

    const amountIn = toNano(params.swapAmount);

    await tonVault.sendSwap(this.walletProvider.wallet as unknown as Sender, {
        poolAddress: pool.address,
        amount: amountIn,
        gasAmount: toNano("0.25"),
    });

    elizaLogger.log("DedustDexProvider.swapTon completed");
  }

  //@param sourceJetton: string - the address of the jetton to swap from
  //@param targetJetton: string - the address of the jetton to swap to
  //@param swapAmount: string - the amount of TON to swap
  async swapJettons(params: { sourceJetton: string; targetJetton: string; swapAmount: string; minimalAmountOut: string }) {
    elizaLogger.log("DedustDexProvider.swapJetton called with params:", params);

    const sourceJettonAddress = Address.parse(params.sourceJetton);
    const targetJettonAddress = Address.parse(params.targetJetton);

    const sourceJetton = Asset.jetton(sourceJettonAddress);
    const targetJetton = Asset.jetton(targetJettonAddress);

    const client = this.walletProvider.getWalletClient();

    const poolTonSource =  client.open(await this.factory.getPool(PoolType.VOLATILE, [Asset.native(), sourceJetton]));
    const poolTonTarget =  client.open(await this.factory.getPool(PoolType.VOLATILE, [Asset.native(), targetJetton]));
    
    const scaleVault = client.open(await this.factory.getJettonVault(targetJettonAddress));

    const scaleRoot = client.open(JettonRoot.createFromAddress(targetJettonAddress));
    const scaleWallet = client.open(await scaleRoot.getWallet(this.walletProvider.wallet.address));

    const amountIn = toNano(params.swapAmount);
    const minimalAmountOut = toNano(params.minimalAmountOut);
    await scaleWallet.sendTransfer(
        this.walletProvider.wallet as unknown as Sender,
        toNano("0.3"), // 0.3 TON
        {
          amount: amountIn,
          destination: scaleVault.address,
          responseAddress: this.walletProvider.wallet.address, // return gas to user
          forwardAmount: toNano("0.25"),
          forwardPayload: VaultJetton.createSwapPayload({
            poolAddress: poolTonSource.address, // first step: SCALE -> TON
            limit: minimalAmountOut,
            next: {
              poolAddress: poolTonTarget.address, // next step: TON -> BOLT
            },
          }),
        },
      );
  }

  async claimFees(params: { jettonAddress: string; feeClaimAmount: string }): Promise<void> {
    elizaLogger.log("DedustDexProvider.claimFees called with params:", params);
   
    await this.withdrawLiquidity({
      jettonAddress: params.jettonAddress,
      withdrawAmount: params.feeClaimAmount,
    });
  }

  // gets pool data based on the jetton address. Fetches the TON/JETTON pool data
  //@param jettonAddress: string - the address of the jetton to get pool data for
  async getPoolData(params: { jettonAddress: string }): Promise<any> {
    elizaLogger.log("DedustDexProvider.getPoolData called with params:", params);

    const client = this.walletProvider.getWalletClient();
    const pool = client.open(await this.factory.getPool(PoolType.VOLATILE, [Asset.native(), Asset.jetton(Address.parse(params.jettonAddress))]));
    
    const poolReserves = await pool.getReserves();
    const poolType = await pool.getPoolType();
    const poolAssets = await pool.getAssets();
    const poolTradeFee = await pool.getTradeFee();
    const poolReadiness = await pool.getReadinessStatus();
    const poolData = {
      poolReserves,
      poolType,
      poolAssets,
      poolTradeFee,
      poolReadiness,
    };
    elizaLogger.log("DedustDexProvider.getPoolData completed");
    return poolData;
  }
}

/**
 * Initialize and return an instance of DexProvider.
 * This function checks the runtime setting "DEX_PROVIDER_TYPE" and, if set to "dedust",
 * returns an instance of DedustDexProvider.
 */
export const initDEXProvider = async (runtime: IAgentRuntime, walletProvider: WalletProvider, dexProviderType?: string): Promise<DexProvider> => {
  const providerType = dexProviderType || runtime.getSetting("TON_DEX_PROVIDER_TYPE") || "dedust";
  if (providerType.toLowerCase() === "dedust") {
    return new DedustDexProvider(walletProvider);
  }
  throw new Error(`Unsupported DEX provider type: ${providerType}`);
};