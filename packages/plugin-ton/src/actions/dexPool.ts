import {
    elizaLogger,
    generateObject,
    type IAgentRuntime,
    type Memory,
    type State,
    type HandlerCallback,
    type Content,
    ModelClass,
  } from "@elizaos/core";
  import { z } from "zod";
import { initWalletProvider } from "../providers/wallet";
import { initDEXProvider } from "../providers/dex";
  

  export interface DexContent extends Content {
    operation: "createPool" | "depositLiquidity" | "withdrawLiquidity" | "claimFees";
    poolId?: string;
    sourceJetton?: string;
    targetJetton?: string;
    initialLiquidity?: string;
    feeRate?: number;
    depositAmount?: string;
    withdrawAmount?: string;
    feeClaimAmount?: string;
  }


  /**
   * Define separate schemas for each supported operation.
   */
  const createPoolSchema = z.object({
    operation: z.literal("createPool"),
    jettonAddress: z.string().nonempty({ message: "jettonAddress is required" }),
  });
  
  const depositLiquiditySchema = z.object({
    operation: z.literal("depositLiquidity"),
    jettonAddress: z.string().nonempty({ message: "jettonAddress is required" }),
    depositAmountTon: z.string().nonempty({ message: "depositAmountTon is required" }),
    depositAmountJetton: z.string().nonempty({ message: "depositAmountJetton is required" }),
  });
  
  const withdrawLiquiditySchema = z.object({
    operation: z.literal("withdrawLiquidity"),
    jettonAddress: z.string().nonempty({ message: "jettonAddress is required" }),
    withdrawAmount: z.string().nonempty({ message: "withdrawAmount is required" }),
  });
  
  const claimFeesSchema = z.object({
    operation: z.literal("claimFees"),
    jettonAddress: z.string().nonempty({ message: "jettonAddress is required" }),
    feeClaimAmount: z.string().nonempty({ message: "feeClaimAmount is required" }),
  });

  const getPoolDataSchema = z.object({
    operation: z.literal("getPoolData"),
    jettonAddress: z.string().nonempty({ message: "jettonAddress is required" }),
  });
  
  /**
   * Union schema for all supported DEX pool operations.
   */
  const dexPoolSchema = z.union([
    createPoolSchema,
    depositLiquiditySchema,
    withdrawLiquiditySchema,
    claimFeesSchema,
    getPoolDataSchema,
  ]);
  
  export type DexPoolContent = z.infer<typeof dexPoolSchema>;
  
  /**
   * Template to instruct the parsing of user intent.
   */
  const dexPoolTemplate = `Respond with a JSON markdown block containing only the extracted values.
  Use null for any value that cannot be determined.
  
  For pool creation, provide:
  \`\`\`json
  {
    "operation": "createPool",
    "tokenA": "Address of token A",
    "tokenB": "Address of token B",
    "initialLiquidityA": "Initial liquidity for token A",
    "initialLiquidityB": "Initial liquidity for token B",
    "feeRate": 0.003
  }
  \`\`\`
  
  For depositing liquidity, provide:
  \`\`\`json
  {
    "operation": "depositLiquidity",
    "poolId": "ID of the pool",
    "depositAmountA": "Amount to deposit for token A",
    "depositAmountB": "Amount to deposit for token B"
  }
  \`\`\`
  
  For withdrawing liquidity, provide:
  \`\`\`json
  {
    "operation": "withdrawLiquidity",
    "poolId": "ID of the pool",
    "withdrawLpTokens": "Amount of LP tokens to burn"
  }
  \`\`\`
  
  For claiming fees, provide:
  \`\`\`json
  {
    "operation": "claimFees",
    "poolId": "ID of the pool",
    "feeClaimAddress": "Address to receive fees"
  }
  \`\`\`
  
  For getting pool data, provide:
  \`\`\`json
  {
    "operation": "getPoolData",
    "jettonAddress": "Address of the jetton"
  }
  \`\`\`
  
  {{recentMessages}}`;
  
  /**
   * DexPoolAction handles DEX operations for:
   * - Pool Creation & Configuration
   * - Liquidity Management (depositing/withdrawing liquidity)
   * - Fee Distribution (claiming accrued fees)
   */
  class DexPoolAction {
  
    async handle(
      runtime: IAgentRuntime,
      message: Memory,
      state: State,
      _options: Record<string, unknown>,
      callback?: HandlerCallback,
    ): Promise<boolean> {
      elizaLogger.log("Starting DEX Pool action...");
  
      try {
        // Generate DEX pool parameters using the template and schema.
        const contentResult = await generateObject({
          runtime,
          context: dexPoolTemplate,
          schema: dexPoolSchema,
          modelClass: ModelClass.SMALL,
        });
  
        const dexContent: DexPoolContent = contentResult.object as DexPoolContent;
        elizaLogger.log("Extracted DEX pool command:", JSON.stringify(dexContent));
  
        // Initialize the DEX provider.
        const walletProvider = await initWalletProvider(runtime);
        const dexProvider = await initDEXProvider(runtime, walletProvider);
  
        let result: any;
        // Execute the operation based on the provided 'operation' field.
        switch (dexContent.operation) {
          case "createPool":
            await dexProvider.createPool({
              jetton: dexContent.jettonAddress,
            });
            result = {
              status: "success",
              operation: dexContent.operation,
              message: `DEX operation ${dexContent.operation} executed successfully.`,
            };
            break;
          case "depositLiquidity": {
            await dexProvider.depositLiquidity({
              jettonAddress: dexContent.jettonAddress,
              depositAmountTon: dexContent.depositAmountTon,
              depositAmountJetton: dexContent.depositAmountJetton,
            });
            result = {
              status: "success",
              operation: dexContent.operation,
              message: `DEX operation ${dexContent.operation} executed successfully.`,
            };
            break;
            }
          case "withdrawLiquidity": {
            await dexProvider.withdrawLiquidity({
              jettonAddress: dexContent.jettonAddress,
              withdrawAmount: dexContent.withdrawAmount,
            });
            result = {
              status: "success",
              operation: dexContent.operation,
              message: `DEX operation ${dexContent.operation} executed successfully.`,
            };
            break;
          }
          case "claimFees": {
            await dexProvider.claimFees({
              jettonAddress: dexContent.jettonAddress,
              feeClaimAmount: dexContent.feeClaimAmount,
            });
            result = {
              status: "success",
              operation: dexContent.operation,
              message: `DEX operation ${dexContent.operation} executed successfully.`,
            };
            break;
          }
          case "getPoolData": {
            const poolData = await dexProvider.getPoolData({
              jettonAddress: dexContent.jettonAddress,
            });
            result = {
              status: "success",
              operation: dexContent.operation,
              message: `DEX operation ${dexContent.operation} executed successfully.`,
              poolData,
            };
            break;
          }
          default:
            throw new Error("Unsupported operation");
        }
  
  
        if (callback) {
          callback({
            text: result.message,
            content: result,
          });
        }
  
        return true;
      } catch (error: any) {
        elizaLogger.error("Error processing DEX Pool action:", error);
        if (callback) {
          callback({
            text: `Error processing DEX operation: ${error.message}`,
            content: { error: error.message },
          });
        }
        return false;
      }
    }
  }
  
  export default {
    name: "DEX_POOL",
    description:
      "Integrates with DEX SDKs to create liquidity pools, manage liquidity deposits/withdrawals, and distribute fees to liquidity providers.",
    handler: async (
      runtime: IAgentRuntime,
      message: Memory,
      state: State,
      options: Record<string, unknown>,
      callback?: HandlerCallback,
    ) => {
      const action = new DexPoolAction();
      return await action.handle(runtime, message, state, options, callback);
    },
    validate: async (_runtime: IAgentRuntime) => true,
    examples: [
      [
        {
          user: "{{user1}}",
          content: {
            operation: "createPool",
            jettonAddress: "EQTokenAAddress",
            action: "DEX_POOL",
          },
        },
        {
          user: "{{user1}}",
          content: {
            text: "Pool created successfully.",
            operation: "createPool",
            jettonAddress: "EQTokenAAddress",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            operation: "depositLiquidity",
            jettonAddress: "EQTokenAAddress",
            depositAmountTon: "1000",
            depositAmountJetton: "2000",
            action: "DEX_POOL",
          },
        },
        {
          user: "{{user1}}",
          content: {
            text: "Liquidity deposited successfully.",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            operation: "withdrawLiquidity",
            jettonAddress: "EQTokenAAddress",
            withdrawAmount: "1000",
            action: "DEX_POOL",
          },
        },
        {
          user: "{{user1}}",
          content: {
            text: "Liquidity withdrawn successfully.",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            operation: "claimFees",
            jettonAddress: "EQTokenAAddress",
            feeClaimAmount: "1000",
            action: "DEX_POOL",
          },
        },
        {
          user: "{{user1}}",
          content: {
            text: "Fees claimed successfully.",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            operation: "getPoolData",
            jettonAddress: "EQTokenAAddress",
            action: "DEX_POOL",
          },
        },
        {
          user: "{{user1}}",
          content: {
            text: "Pool data retrieved successfully.",
            operation: "getPoolData",
            jettonAddress: "EQTokenAAddress",
            poolData: {
              poolReserves: [1000, 2000],
              poolType: "VOLATILE",
              poolAssets: ["EQTokenAAddress", "EQTokenBAddress"],
              poolTradeFee: 0.003,
              poolReadiness: "READY",
            },
          },
        },
      ],
    ],
    template: dexPoolTemplate,
  };