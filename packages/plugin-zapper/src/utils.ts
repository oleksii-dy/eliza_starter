import { ZapperPortfolioResponse, ZapperFarcasterResponse } from "./types";

export const formatPortfolioData = (data: ZapperPortfolioResponse) => {
    const portfolio = data.data.portfolio;
        // Format top five token holdings
        const tokenSection = portfolio.tokenBalances
            .sort((a, b) => b.token.balanceUSD - a.token.balanceUSD)
            .slice(0, 5)
            .map(balance => {
                const formattedBalance = Number(balance.token.balance).toLocaleString(undefined, {
                    maximumFractionDigits: 4
                });
                const formattedUSD = balance.token.balanceUSD.toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD'
                });
                return `${balance.token.baseToken.name} (${balance.token.baseToken.symbol})
Network: ${balance.network}
Balance: ${formattedBalance}
Value: ${formattedUSD}`;
            }).join("\n");
        // Format NFT holdings
        const nftSection = portfolio.nftBalances
            .map(nft => {
                const formattedUSD = nft.balanceUSD.toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD'
                });
                return `${nft.network}
NFT Value: ${formattedUSD}`;
            }).join("\n");
        // Calculate totals
        const totalUSD = portfolio.totals.total.toLocaleString(undefined, {
            style: 'currency',
            currency: 'USD'
        });
        const totalWithNFTUSD = portfolio.totals.totalWithNFT.toLocaleString(undefined, {
            style: 'currency',
            currency: 'USD'
        });
        // Format network totals breakdown
        const networkTotals = portfolio.totals.totalByNetwork
            .filter(net => net.total > 0)
            .sort((a, b) => b.total - a.total)
            .map(net => {
                const formattedUSD = net.total.toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD'
                });
                return `${net.network}: ${formattedUSD}`;
            }).join("\n");

            return `💰 Portfolio Summary:
Total Value (excluding NFTs): ${totalUSD}
Total Value (including NFTs): ${totalWithNFTUSD}
            
🌐 Network Breakdown:
${networkTotals}
            
🪙 Top Token Holdings:
${tokenSection}
            
🎨 NFT Holdings:
${nftSection}`;
        }

export const formatFarcasterData = (data: ZapperFarcasterResponse) => {
    const accounts = data.data.accounts || [];
    // Get profiles
    const profiles = accounts
        .map(account => account.farcasterProfile)
        .filter(Boolean);
    if (profiles.length === 0) {
        throw new Error("No Farcaster accounts found for the provided usernames");
    }
    // Get all addresses from profiles
    const allAddresses = profiles.flatMap(profile => [
        ...(profile.connectedAddresses || []),
        profile.custodyAddress
    ]).filter(Boolean);

    return { addresses: allAddresses };
}