import { makeClient, contractAddresses } from "@geekyrocks/alkahest-ts";
import { privateKeyToAccount, nonceManager } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { ICreateListingRequest, TOKEN_DECIMALS } from "./api";

const USDC_ADDRESS = contractAddresses["Base Sepolia"].usdc;

export async function createEscrow(request: ICreateListingRequest): Promise<string> {
    if (!process.env.AGENT_PRIVATE_KEY || !process.env.RPC_URL) {
        throw new Error("Missing environment variables");
    }

    console.log('createEscrow');
    console.log(process.env.AGENT_PRIVATE_KEY);
    console.log(process.env.RPC_URL);

    // Create client for the seller
    const clientSeller = makeClient(
        privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`, {
            nonceManager,
        }),
        baseSepolia,
        process.env.RPC_URL
    );

    try {
        // Convert string amounts to BigInt with proper decimal places
        const amount = BigInt(request.numberOfTokens);
        const price = BigInt(request.pricePerToken);
        const totalPrice = amount * price / BigInt(BigInt(10) ** BigInt(TOKEN_DECIMALS)); // Adjust for decimal difference (18 - 6)
        console.log('totalPrice', totalPrice);
        console.log('USDC_ADDRESS', USDC_ADDRESS);

        const sellingTokenAddress = request.tokenAddress as `0x${string}`;

        // Approve escrow contract to spend USDC
        const escrowApproval = await clientSeller.erc20.approve(
            {
                address: sellingTokenAddress,
                value: amount,
            },
            contractAddresses["Base Sepolia"].erc20EscrowObligation,
        );
        console.log(escrowApproval);

        // Create escrow demanding USDC for the token
        const escrow = await clientSeller.erc20.buyErc20ForErc20(
            {
                address: sellingTokenAddress,
                value: amount,
            },
            {
                address: USDC_ADDRESS,
                value: totalPrice,
            },
            BigInt(0)
            // BigInt(request.offerExpiresAt), // Expiry timestamp
        );
        console.log(escrow);

        // Return the escrow ID
        return escrow.attested.uid;
    } catch (error) {
        console.error('Error creating escrow:', error);
        throw new Error('Failed to create escrow');
    }
}
