"use client"

import { Account, createPublicClient, http } from 'viem'
import { makeClient, contractAddresses } from "@geekyrocks/alkahest-ts";
import { CHAIN, IListing } from './api';
import { privateKeyToAccount, nonceManager } from 'viem/accounts';

export async function buyTokens(
    listing: IListing, account: Account): Promise<IListing> {
    console.log("buying tokens", listing)

    if (!process.env.NEXT_PUBLIC_RPC_URL) {
        throw new Error("Missing environment variables NEXT_PUBLIC_RPC_URL");
    }

    if (!process.env.NEXT_PUBLIC_INVESTOR_PRIVATE_KEY || !process.env.NEXT_PUBLIC_RPC_URL) {
        throw new Error("Missing environment variables NEXT_PUBLIC_RPC_URL and/or NEXT_PUBLIC_INVESTOR_PRIVATE_KEY");
    }

    const publicClient = createPublicClient({
        chain: CHAIN,
        transport: http(process.env.NEXT_PUBLIC_RPC_URL)
    });

    console.log("account", account);

    // Get the wallet client (signer)
    const clientBuyer = makeClient(
        // account,
        privateKeyToAccount(process.env.NEXT_PUBLIC_INVESTOR_PRIVATE_KEY as `0x${string}`, {
            nonceManager,
        }),
        CHAIN,
        process.env.NEXT_PUBLIC_RPC_URL!
    )
    console.log("clientBuyer", clientBuyer.address);

    try {
        // approve payment contract to spend tokens
        const paymentApprovalHash = await clientBuyer.erc20.approve(
            {
                address: listing.receiveTokenAddress,
                value: BigInt(listing.receiveTokenAmount),
            },
            contractAddresses["Base Sepolia"].erc20PaymentObligation,
        );
        console.log("payment approval", paymentApprovalHash);

        // Wait for approval transaction to be confirmed
        const approvalReceipt = await publicClient.waitForTransactionReceipt({
            hash: paymentApprovalHash as `0x${string}`
        });
        console.log('Approval confirmed in block:', approvalReceipt.blockNumber);

        // pay 10eurc for 10usdc (fulfill the buy order)
        const payment = await clientBuyer.erc20.payErc20ForErc20(
            listing.attestedEscrowId,
        );
        console.log("payment", payment);

        return {
            ...listing,
            purchaseTxHash: payment.hash,
            purchaserAddress: clientBuyer.address,
            purchasedAt: Date.now(),
        }

    } catch (error) {
        console.error('Error buying tokens:', error)
        throw new Error('Failed to buy tokens')
    }
}