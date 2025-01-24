import axios, { AxiosInstance } from "axios";

const axiosInstance: AxiosInstance = axios.create({
    baseURL: "https://app.geckoterminal.com/api/p1",
    timeout: 5000,
  });

export async function fetchTopDexByNetwork(network="sui-network") {
    try {
      return axiosInstance.get(`/dexes?network=${network}&include=network%2Cdex_metric`, {

      });
    } catch (error) {
      console.error("Error fetching market data:", error);
      throw new Error("Failed to fetch market data");
    }
}