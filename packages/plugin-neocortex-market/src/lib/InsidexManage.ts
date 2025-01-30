import { TrendingTokens } from "./types";

export const GoPlusType = {
    EVMTOKEN_SECURITY_CHECK: "EVMTOKEN_SECURITY_CHECK",
    SOLTOKEN_SECURITY_CHECK: "SOLTOKEN_SECURITY_CHECK",
    SUITOKEN_SECURITY_CHECK: "SUITOKEN_SECURITY_CHECK",
    RUGPULL_SECURITY_CHECK: "RUGPULL_SECURITY_CHECK",
    NFT_SECURITY_CHECK: "NFT_SECURITY_CHECK",
    ADRESS_SECURITY_CHECK: "ADRESS_SECURITY_CHECK",
    APPROVAL_SECURITY_CHECK: "APPROVAL_SECURITY_CHECK",
    ACCOUNT_ERC20_SECURITY_CHECK: "ACCOUNT_ERC20_SECURITY_CHECK",
    ACCOUNT_ERC721_SECURITY_CHECK: "ACCOUNT_ERC721_SECURITY_CHECK",
    ACCOUNT_ERC1155_SECURITY_CHECK: "ACCOUNT_ERC1155_SECURITY_CHECK",
    SIGNATURE_SECURITY_CHECK: "SIGNATURE_SECURITY_CHECK",
    URL_SECURITY_CHECK: "URL_SECURITY_CHECK",
};

export type GoPlusType = (typeof GoPlusType)[keyof typeof GoPlusType];
export type GoPlusParamType = {
    type: GoPlusType;
    network?: string;
    token?: string;
    contract?: string;
    wallet?: string;
    url?: string;
    data?: string;
};

const excludeCoinsFromTrending = [
    "0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT",
    "0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH",
    "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
    "0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD",
    "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
    "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
    "0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN",
    "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN",
    "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK",
    "0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD",
];
export class InsidexManage {
    private apiKey: string;

    constructor(apiKey: string = null) {
        this.apiKey = apiKey;
    }

    async requestGet(api: string) {
        const myHeaders = new Headers();
        if (this.apiKey) {
            myHeaders.append("x-api-key", this.apiKey);
        }
        const url = `https://api-ex.insidex.trade/${api}`;
        const res = await fetch(url, {
            method: "GET",
            headers: myHeaders,
            redirect: "follow",
        });

        return await res.json();
    }

    async trendingToken(): Promise<TrendingTokens | any> {
        const api = `coins/trending`;
        const trendingRes = (await this.requestGet(api)) as TrendingTokens;

        const trending = trendingRes
            .filter((token) => {
                return (
                    token.isCoinHoneyPot == "false" &&
                    token.suspiciousActivities.length < 1 &&
                    token.totalLiquidityUsd !== "NaN" &&
                    !excludeCoinsFromTrending.includes(token.coin)
                );
            })
            .sort((a, b) => parseFloat(b.volume24h) - parseFloat(a.volume24h));
        return trending;
    }

    // async tokenSecurity(
    //     chainId: string,
    //     address: string
    // ): Promise<TrendingTokens> {
    //     const api = `api/v1/token_security/${chainId}?contract_addresses=${address}`;
    //     return await this.requestGet(api);
    // }

    // async rugpullDetection(chainId: string, address: string) {
    //     const api = `api/v1/rugpull_detecting/${chainId}?contract_addresses=${address}`;
    //     return await this.requestGet(api);
    // }

    // async solanaTokenSecurityUsingGET(address: string) {
    //     const api = `api/v1/solana/token_security?contract_addresses=${address}`;
    //     return await this.requestGet(api);
    // }

    // async suiTokenSecurityUsingGET(address: string) {
    //     const api = `api/v1/sui/token_security?contract_addresses=${address}`;
    //     return await this.requestGet(api);
    // }

    // async nftSecurity(chainId: string, address: string) {
    //     const api = `api/v1/nft_security/${chainId}?contract_addresses=${address}`;
    //     return await this.requestGet(api);
    // }

    // async addressSecurity(address: string) {
    //     const api = `api/v1/address_security/${address}`;
    //     return await this.requestGet(api);
    // }

    // async approvalSecurity(chainId: string, contract: string) {
    //     const api = `api/v1/approval_security/${chainId}?contract_addresses=${contract}`;
    //     return await this.requestGet(api);
    // }

    // async erc20ApprovalSecurity(chainId: string, wallet: string) {
    //     const api = `api/v2/token_approval_security/${chainId}?addresses=${wallet}`;
    //     return await this.requestGet(api);
    // }

    // async erc721ApprovalSecurity(chainId: string, wallet: string) {
    //     const api = `api/v2/nft721_approval_security/${chainId}?addresses=${wallet}`;
    //     return await this.requestGet(api);
    // }

    // async erc1155ApprovalSecurity(chainId: string, wallet: string) {
    //     const api = `api/v2/nft1155_approval_security/${chainId}?addresses=${wallet}`;
    //     return await this.requestGet(api);
    // }

    // async inputDecode(chainId: string, data: string) {
    //     const body = JSON.stringify({
    //         chain_id: chainId,
    //         data: data,
    //     });
    //     const res = await fetch(
    //         "https://api.gopluslabs.io/api/v1/abi/input_decode",
    //         {
    //             headers: {
    //                 accept: "*/*",
    //                 "accept-language": "en,zh-CN;q=0.9,zh;q=0.8",
    //                 "content-type": "application/json",
    //             },
    //             body: body,
    //             method: "POST",
    //         }
    //     );
    //     return await res.json();
    // }

    // async dappSecurityAndPhishingSite(url: string) {
    //     const api = `api/v1/dapp_secu
    //     rity?url=${url}`;
    //     const data1 = await this.requestGet(api);

    //     const api2 = `api/v1/phishing_site?url=${url}`;
    //     const data2 = await this.requestGet(api2);
    //     return {
    //         data1,
    //         data2,
    //     };
    // }
}
