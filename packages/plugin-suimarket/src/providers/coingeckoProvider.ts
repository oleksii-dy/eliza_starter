import { elizaLogger, IAgentRuntime, Memory, State } from "@elizaos/core";
import axios, { AxiosInstance } from "axios";
import { match } from "../utils/matching";

export class CoingeckoProvider {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: "https://api.coingecko.com/api/v3",
      timeout: 5000,
    });
  }

  async fetchMarketData(currency: string = "usd", limit: number = 10) {
    try {
      const response = await this.axiosInstance.get("/coins/markets", {
        params: {
          vs_currency: currency,
          order: "market_cap_desc",
          per_page: limit,
          page: 1,
          sparkline: false,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching market data:", error);
      throw new Error("Failed to fetch market data");
    }
  }

  async getTrendingTokens() {
    try {
      const response = await this.axiosInstance.get("/search/trending");
      return response.data.coins.map((coin: any) => ({
          id: coin.item.id, 
          name: coin.item.name, 
          symbol: coin.item.symbol.toUpperCase(), 
          market_cap_rank: coin.item.market_cap_rank,
          price: coin.item.data.price,
          total_volume: coin.item.data.total_volume,
          market_cap: coin.item.data.market_cap,
      }));
    } catch (error) {
      console.error("Error fetching trending tokens:", error);
      throw new Error("Failed to fetch trending tokens");
    }
  }

  async getToken(coinId: string) {
    try {
      const response = await this.axiosInstance.get(`/simple/price`, {
        params: {
          ids: coinId,
          vs_currencies: 'usd',
          include_market_cap: true,
          include_24hr_vol: true,
          include_24hr_change: true,
          include_last_updated_at: true,
        },
      });

      return response.data[coinId]; // Return data for the specific coin
    } catch (error) {
      console.error(`Error fetching details for coin ${coinId}:`, error);
      throw new Error("Failed to fetch coin details");
    }
  }

  async getTrendingNFTs() {
    try {
      const response = await this.axiosInstance.get("/nfts/list", {
        params: {
          // order: "market_cap_desc",
          per_page: 10,
          page: 1,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching trending NFTs:", error);
      throw new Error("Failed to fetch trending NFTs");
    }
  }

  async getNFTDetails(nftId: string) {
    try {
      const response = await this.axiosInstance.get(`/nfts/${nftId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching details for NFT ${nftId}:`, error);
      throw new Error("Failed to fetch NFT details");
    }
  }

  async getTrendingCategories(limit: number = 5) {
    try {
      const response = await this.axiosInstance.get("/coins/categories");
      return response.data.slice(0, limit);
    } catch (error) {
      console.error("Error fetching trending categories:", error);
      throw new Error("Failed to fetch trending categories");
    }
  }

  async getTopMarketInfo(currency: string = "usd", limit: number = 10) {
    try {
      const response = await this.axiosInstance.get("/coins/markets", {
        params: {
          vs_currency: currency,
          order: "market_cap_desc",
          per_page: limit,
          page: 1,
          sparkline: false,
        },
      });

      return response.data.map((coin: any) => ({
          name: coin.name,
          symbol: coin.symbol.toUpperCase(),
          current_price: coin.current_price,
          market_cap: coin.market_cap,
          price_change_percentage_24h: coin.price_change_percentage_24h,
      }));
    } catch (error) {
      console.error("Error fetching top market info:", error);
      throw new Error("Failed to fetch top market info");
    }
  }

  //@fixme exactly evaluate content to decide AI tokens
  async topAiTokens(runtime: IAgentRuntime, message: Memory, state: State, currency: string = "usd", limit: number = 10) {
    try {
        const categoriesResponse = await this.axiosInstance.get("/coins/categories");        
        const aiCategory = categoriesResponse.data.find((category: any) =>
           category.name.toLowerCase().includes(" ai ")
        );

        if (!aiCategory) {
          throw new Error("AI category not found");
        }

        const marketsResponse = await this.axiosInstance.get("/coins/markets", {
          params: {
            vs_currency: currency,
            category: aiCategory.id,
            order: "market_cap_desc",
            per_page: limit,
            page: 1,
          },
        });

        return marketsResponse.data.map((token: any) => ({
            name: token.name,
            symbol: token.symbol.toUpperCase(),
            price: token.current_price,
            market_cap: token.market_cap,
            price_change_24h: token.price_change_percentage_24h,
        }));

    } catch (error) {
      console.error("Error fetching AI tokens:", error);
      throw new Error("Failed to fetch AI tokens");
    }
  }

  //@fixme exactly evaluate content to decide AI tokens
  async topMemeTokens(runtime: IAgentRuntime, message: Memory, state: State, currency: string = "usd", limit: number = 10) {
    try {
        const categoriesResponse = await this.axiosInstance.get("/coins/categories");        
        
        //@fixme
        const aiCategory = categoriesResponse.data.find((category: any) =>
          true
            // category.name.toLowerCase().includes(" meme ")
        );

        if (!aiCategory) {
          throw new Error("AI category not found");
        }

        const marketsResponse = await this.axiosInstance.get("/coins/markets", {
          params: {
            vs_currency: currency,
            category: aiCategory.id,
            order: "market_cap_desc",
            per_page: limit,
            page: 1,
          },
        });

        return marketsResponse.data.filter(
          (coin: any) => coin.asset_platform_id === "sui"
        ).
        map((token: any) => ({
            name: token.name,
            symbol: token.symbol.toUpperCase(),
            price: token.current_price,
            market_cap: token.market_cap,
            price_change_24h: token.price_change_percentage_24h,
        }));
    } catch (error) {
      console.error("Error fetching AI tokens:", error);
      throw new Error("Failed to fetch AI tokens");
    }
  }
}

export default CoingeckoProvider;