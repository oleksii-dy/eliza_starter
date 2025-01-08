import { IAgentRuntime, elizaLogger } from "@elizaos/core";
import {
    Hash,
    Address,
    parseUnits,
} from "viem";
import { b2Network } from "./chains";
import { WalletProvider } from "../providers";

export const getTxReceipt = async (walletProvider: WalletProvider, tx: Hash) => {
    const publicClient = walletProvider.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx,
    });
    return receipt;
};

export const sendNativeAsset = async (
    walletProvider: WalletProvider,
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
    walletProvider: WalletProvider,
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
        const walletClient = walletProvider.getWalletClient();
        const tx = await walletClient.writeContract(request);
        elizaLogger.log("Transaction:", tx);
        return tx as Hash;
    } catch (error) {
        elizaLogger.error("Error simulating contract:", error);
        return;
    }
};

export const approve = async (
    walletProvider: WalletProvider,
    tokenAddress: Address,
    spender: Address,
    amount: number
) => {
    try {
        const decimals = await walletProvider.getDecimals(tokenAddress);
        const publicClient = walletProvider.getPublicClient();
        const { result, request } = await publicClient.simulateContract({
            account: walletProvider.getAccount(),
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

        const walletClient = walletProvider.getWalletClient();
        const tx = await walletClient.writeContract(request);
        elizaLogger.log("Transaction:", tx);
        return tx;
    } catch (error) {
        elizaLogger.error("Error approving:", error);
        return;
    }
};

export const deposit = async (
    walletProvider: WalletProvider,
    depositTokenAddress: Address,
    strategyAddress: Address,
    amount: number
) => {
    try {
        const decimals = await walletProvider.getDecimals(depositTokenAddress);
        const publicClient = walletProvider.getPublicClient();
        const { _result, request } = await publicClient.simulateContract({
            account: walletProvider.getAccount(),
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

        const walletClient = walletProvider.getWalletClient();
        const tx = await walletClient.writeContract(request);
        elizaLogger.log("Transaction:", tx);
        return tx;
    } catch (error) {
        elizaLogger.error("Error depositing:", error);
        return;
    }
};
