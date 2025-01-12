import axios, { AxiosInstance } from "axios";

export class CoingeckoProvider {
  private axiosInstance: AxiosInstance;

  constructor() {
    // Tạo một instance của axios với base URL
    this.axiosInstance = axios.create({
      baseURL: "https://api.coingecko.com/api/v3", // Base URL của CoinGecko
      timeout: 5000, // Timeout request sau 5 giây
    });
  }

  /**
   * Lấy thông tin thị trường của các đồng coin
   * @param currency Tiền tệ để tính giá (VD: "usd")
   * @param limit Số lượng coin cần lấy
   * @returns Dữ liệu thị trường của các đồng coin
   */
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

  /**
   * Lấy danh sách các đồng coin
   * @returns Danh sách các đồng coin
   */
  async listCoins() {
    try {
      const response = await this.axiosInstance.get("/coins/list");
      return response.data;
    } catch (error) {
      console.error("Error fetching coins list:", error);
      throw new Error("Failed to fetch coins list");
    }
  }

  /**
   * Lấy thông tin chi tiết của một đồng coin
   * @param coinId ID của đồng coin
   * @returns Chi tiết của đồng coin
   */
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

  /**
   * Lấy danh sách NFT thịnh hành
   * @returns Danh sách NFT thịnh hành
   */
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

  /**
   * Lấy thông tin chi tiết của một NFT
   * @param nftId ID của NFT
   * @returns Thông tin chi tiết của NFT
   */
  async getNFTDetails(nftId: string) {
    try {
      const response = await this.axiosInstance.get(`/nfts/${nftId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching details for NFT ${nftId}:`, error);
      throw new Error("Failed to fetch NFT details");
    }
  }

  /**
   * Lấy danh mục thịnh hành
   * @returns Danh sách danh mục thịnh hành
   */
  async getTrendingCategories() {
    try {
      const response = await this.axiosInstance.get("/coins/categories");
      return response.data;
    } catch (error) {
      console.error("Error fetching trending categories:", error);
      throw new Error("Failed to fetch trending categories");
    }
  }


  /**
   * Get trending meme coins on the Sui network
   * @param limit Maximum number of results to return
   * @returns Array of meme coins on Sui network
   */
  async getTrendingMemeCoinsOnSui(limit: number = 10) {
    try {
      // Fetch all coins in the meme category
      const categoriesResponse = await this.axiosInstance.get(`/coins/categories`);
      const memeCategory = categoriesResponse.data.find(
        (category: any) => category.name.toLowerCase() === "meme"
      );

      if (!memeCategory) {
        throw new Error("Meme category not found");
      }

      // Fetch coins in the meme category
      const coinsResponse = await this.axiosInstance.get(`/coins/markets`, {
        params: {
          vs_currency: "usd", // Return prices in USD
          category: "meme",
          order: "market_cap_desc",
          per_page: 100, // Adjust the number based on your needs
          page: 1,
        },
      });

      // Filter coins by the Sui network
      const suiMemeCoins = coinsResponse.data.filter(
        (coin: any) => coin.asset_platform_id === "sui"
      );

      // Return the top results based on the limit
      return suiMemeCoins.slice(0, limit);
    } catch (error) {
      console.error("Error fetching trending meme coins on Sui:", error);
      throw new Error("Failed to fetch trending meme coins on Sui network");
    }
  }
}

export default CoingeckoProvider;