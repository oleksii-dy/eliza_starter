import axios, { AxiosInstance } from "axios";

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

  async listCoins() {
    try {
      const response = await this.axiosInstance.get("/coins/list");
      return response.data;
    } catch (error) {
      console.error("Error fetching coins list:", error);
      throw new Error("Failed to fetch coins list");
    }
  }


  async getCoinDetails(coinId: string) {
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

  async getTrendingCategories() {
    try {
      const response = await this.axiosInstance.get("/coins/categories");
      return response.data;
    } catch (error) {
      console.error("Error fetching trending categories:", error);
      throw new Error("Failed to fetch trending categories");
    }
  }

  async getTrendingMemeCoinsOnSui(limit: number = 10) {
    try {
      const categoriesResponse = await this.axiosInstance.get(`/coins/categories`);
      const memeCategory = categoriesResponse.data.find(
        (category: any) => category.name.toLowerCase() === "meme"
      );

      if (!memeCategory) {
        throw new Error("Meme category not found");
      }

      const coinsResponse = await this.axiosInstance.get(`/coins/markets`, {
        params: {
          vs_currency: "usd",
          category: "meme",
          order: "market_cap_desc",
          per_page: 100,
          page: 1,
        },
      });

      const suiMemeCoins = coinsResponse.data.filter(
        (coin: any) => coin.asset_platform_id === "sui"
      );

      return suiMemeCoins.slice(0, limit);
    } catch (error) {
      console.error("Error fetching trending meme coins on Sui:", error);
      throw new Error("Failed to fetch trending meme coins on Sui network");
    }
  }
}

export default CoingeckoProvider;