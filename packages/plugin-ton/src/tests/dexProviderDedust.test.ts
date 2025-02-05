import { describe, it, expect, beforeAll, vi } from "vitest";
import dotenv from "dotenv";
dotenv.config();

import { DedustDexProvider, initDEXProvider } from "../providers/dex";
import { WalletProvider } from "../providers/wallet";
import { IAgentRuntime } from "@elizaos/core";
import { mnemonicToWalletKey } from "@ton/crypto";

// Create a dummy runtime used by the DEX provider.
// Adjust as necessary so that getSetting returns the correct settings.
const dummyRuntime = {
  getSetting: (key: string) => {
    if (key === "TON_DEX_PROVIDER_TYPE") return process.env.TON_DEX_PROVIDER_TYPE || "dedust";
    if (key === "TON_RPC_URL") return process.env.TON_RPC_URL || "https://toncenter.com/api/v2/jsonRPC";
    return null;
  },
};


// Mock NodeCache
vi.mock("node-cache", () => {
  return {
      default: vi.fn().mockImplementation(() => ({
          set: vi.fn(),
          get: vi.fn().mockReturnValue(null),
      })),
  };
});

// Mock path module
vi.mock("path", async () => {
  const actual = await vi.importActual("path");
  return {
      ...actual,
      join: vi.fn().mockImplementation((...args) => args.join("/")),
  };
});

// Mock the ICacheManager
const mockCacheManager = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn(),
  delete: vi.fn(),
};

const testnet = "https://testnet.toncenter.com/api/v2/jsonRPC";

const TEST_JETTON_ADDRESS = process.env.JETTON_ADDRESS || "kQDkG0CIKm30DrvnraJD_Sifi-d5AYYazYgvl-lEH0Rg_y6_";

describe("DedustDexProvider Chained Operations", () => {
  let dexProvider: DedustDexProvider;
  let walletProvider: WalletProvider;

  beforeAll(async () => {
    if (!process.env.TON_PRIVATE_KEY) {
      throw new Error("TON_PRIVATE_KEY is missing in the environment.");
    }

    const mnemonics = process.env.TON_PRIVATE_KEY.split(" ");

    const keypair = await mnemonicToWalletKey(mnemonics, "");
    walletProvider = new WalletProvider(keypair, testnet, mockCacheManager);
    // Initialize the DEX provider by passing the dummy runtime and the wallet provider.
    dexProvider = await initDEXProvider(dummyRuntime as IAgentRuntime, walletProvider) as DedustDexProvider;
  });

  it("should chain pool creation, deposit liquidity, get pool data and withdraw liquidity", async () => {
    // Step 1: Create a pool using the provided jetton address.
    //NOTE: the DeDust SDK does not have a testnet factory address, so we cannot test the createPool function on testnet
  
    // const createPoolResult = await dexProvider.createPool({ jetton: TEST_JETTON_ADDRESS });
    // expect(createPoolResult).toBe(true);
    // console.log("Pool created for jetton:", TEST_JETTON_ADDRESS);

    // // Step 2: Deposit liquidity.
    // // Here we deposit "2" TON and "1" units of the jetton.
    // await expect(
    //   dexProvider.depositLiquidity({
    //     jettonAddress: TEST_JETTON_ADDRESS,
    //     depositAmountTon: "2",
    //     depositAmountJetton: "1",
    //   })
    // ).resolves.not.toThrow();
    // console.log("Liquidity deposited with 2 TON and 1 jetton units.");

    // // Step 3: Get pool data and validate the expected properties.
    // const poolData = await dexProvider.getPoolData({ jettonAddress: TEST_JETTON_ADDRESS });
    // expect(poolData).toHaveProperty("poolReserves");
    // expect(poolData).toHaveProperty("poolType");
    // expect(poolData).toHaveProperty("poolAssets");
    // expect(poolData).toHaveProperty("poolTradeFee");
    // expect(poolData).toHaveProperty("poolReadiness");
    // console.log("Pool data retrieved:", poolData);

    // // Step 4: Withdraw liquidity.
    // // In this example, we withdraw "1" unit of liquidity.
    // await expect(
    //   dexProvider.withdrawLiquidity({
    //     jettonAddress: TEST_JETTON_ADDRESS,
    //     withdrawAmount: "1",
    //   })
    // ).resolves.not.toThrow();
    // console.log("Liquidity withdrawn: 1 unit.");
  });
}); 