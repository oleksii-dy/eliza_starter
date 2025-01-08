import { IAgentRuntime, elizaLogger } from "@elizaos/core";
import {
    createPublicClient,
    createWalletClient,
    Hash,
    http,
    Address,
    parseUnits,
    WalletClient,
} from "viem";
import { b2Network } from "./chains";
import { B2WalletProvider } from "../providers";

// export const getAccount = (runtime: IAgentRuntime) => {
//     const privateKey =
//         runtime.getSetting("B2_PRIVATE_KEY") ||
//         process.env.B2_PRIVATE_KEY;
//     return privateKeyToAccount(`0x${privateKey.replace("0x", "")}`);
// };

// export const getPublicClient = (_runtime: IAgentRuntime) => {
//     return createPublicClient({
//         chain: b2Network,
//         transport: http(),
//     });
// };

// export const getWalletClient = (runtime: IAgentRuntime) => {
//     return createWalletClient({
//         account: getAccount(runtime),
//         chain: b2Network,
//         transport: http(),
//     });
// };

export const getTxReceipt = async (walletProvider: B2WalletProvider, tx: Hash) => {
    const publicClient = walletProvider.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx,
    });
    return receipt;
};

// export const getDecimals = async (
//     runtime: IAgentRuntime,
//     tokenAddress: Address
// ) => {
//     if (tokenAddress === "0x0000000000000000000000000000000000000000") {
//         return b2Network.nativeCurrency.decimals;
//     }
//     const publicClient = getPublicClient(runtime);
//     const decimals = await publicClient.readContract({
//         address: tokenAddress,
//         abi: [
//             {
//                 inputs: [],
//                 name: "decimals",
//                 outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
//                 stateMutability: "view",
//                 type: "function",
//             },
//         ],
//         functionName: "decimals",
//     });
//     return decimals;
// };

export const getNativeBalance = async (
    runtime: IAgentRuntime,
    owner: Address
) => {
    const publicClient = getPublicClient(runtime);
    const balance = await publicClient.getBalance({
        address: owner,
    });
    return balance;
};

export const getTokenBalance = async (
    runtime: IAgentRuntime,
    tokenAddress: Address,
    owner: Address
) => {
    if (tokenAddress === "0x0000000000000000000000000000000000000000") {
        return getNativeBalance(runtime, owner);
    }
    const publicClient = getPublicClient(runtime);
    const balance = await publicClient.readContract({
        address: tokenAddress,
        abi: [
            {
                inputs: [
                    {
                        internalType: "address",
                        name: "account",
                        type: "address",
                    },
                ],
                name: "balanceOf",
                outputs: [
                    { internalType: "uint256", name: "", type: "uint256" },
                ],
                stateMutability: "view",
                type: "function",
            },
        ],
        functionName: "balanceOf",
        args: [owner],
    });
    return balance;
};

export const sendNativeAsset = async (
    walletProvider: B2WalletProvider,
    recipient: Address,
    amount: number
) => {
    const decimals = await walletProvider.getDecimals("0x0000000000000000000000000000000000000000");
    const walletClient = walletProvider.getWalletClient();
    const tx = await walletClient.sendTransaction({
        to: recipient,
        value: parseUnits(amount.toString(), decimals),
    });
    return tx as Hash;
};

export const sendToken = async (
    walletProvider: B2WalletProvider,
    tokenAddress: Address,
    recipient: Address,
    amount: number
) => {
    const decimals = await walletProvider.getDecimals(tokenAddress);
    const publicClient = walletProvider.getPublicClient();
    try {
        const { result, request } = await publicClient.simulateContract({
            account: walletProvider.getAccount(),
            address: tokenAddress,
            abi: [
                {
                    inputs: [
                        {
                            internalType: "address",
                            name: "dst",
                            type: "address",
                        },
                        {
                            internalType: "uint256",
                            name: "amount",
                            type: "uint256",
                        },
                    ],
                    name: "transfer",
                    outputs: [
                        {
                            internalType: "bool",
                            name: "",
                            type: "bool",
                        },
                    ],
                    stateMutability: "nonpayable",
                    type: "function",
                },
            ],
            functionName: "transfer",
            args: [recipient, parseUnits(amount.toString(), decimals)],
        });

        if (!result) {
            throw new Error("Transfer failed");
        }

        elizaLogger.debug("Request:", request);

        const walletClient = getWalletClient(runtime);
        const tx = await walletClient.writeContract(request);
        elizaLogger.log("Transaction:", tx);
        return tx as Hash;
    } catch (error) {
        elizaLogger.error("Error simulating contract:", error);
        return;
    }
};

export const approve = async (
    runtime: IAgentRuntime,
    tokenAddress: Address,
    spender: Address,
    amount: number
) => {
    try {
        const decimals = await getDecimals(runtime, tokenAddress);
        const publicClient = getPublicClient(runtime);
        const { result, request } = await publicClient.simulateContract({
            account: getAccount(runtime),
            address: tokenAddress,
            abi: [
                {
                    inputs: [
                        {
                            internalType: "address",
                            name: "_spender",
                            type: "address",
                        },
                        {
                            internalType: "uint256",
                            name: "_value",
                            type: "uint256",
                        },
                    ],
                    name: "approve",
                    outputs: [
                        {
                            internalType: "bool",
                            name: "",
                            type: "bool",
                        },
                    ],
                    stateMutability: "nonpayable",
                    type: "function",
                },
            ],
            functionName: "approve",
            args: [spender, parseUnits(amount.toString(), decimals)],
        });

        if (!result) {
            throw new Error("Approve failed");
        }

        elizaLogger.debug("Request:", request);

        const walletClient = getWalletClient(runtime);
        const tx = await walletClient.writeContract(request);
        elizaLogger.log("Transaction:", tx);
        return tx;
    } catch (error) {
        elizaLogger.error("Error approving:", error);
        return;
    }
};

export const deposit = async (
    runtime: IAgentRuntime,
    depositTokenAddress: Address,
    strategyAddress: Address,
    amount: number
) => {
    try {
        const decimals = await getDecimals(runtime, depositTokenAddress);
        const publicClient = getPublicClient(runtime);
        const { _result, request } = await publicClient.simulateContract({
            account: getAccount(runtime),
            address: strategyAddress,
            abi: [
                {
                    inputs: [
                        {
                            internalType: "uint256",
                            name: "_amount",
                            type: "uint256",
                        },
                    ],
                    name: "deposit",
                    outputs: [],
                    stateMutability: "nonpayable",
                    type: "function",
                },
            ],
            functionName: "deposit",
            args: [parseUnits(amount.toString(), decimals)],
        });

        // if (!result) {
        //     throw new Error('Deposit failed')
        // }

        elizaLogger.debug("Request:", request);

        const walletClient = getWalletClient(runtime);
        const tx = await walletClient.writeContract(request);
        elizaLogger.log("Transaction:", tx);
        return tx;
    } catch (error) {
        elizaLogger.error("Error depositing:", error);
        return;
    }
};
