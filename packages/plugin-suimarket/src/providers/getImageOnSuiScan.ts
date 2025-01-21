import axios from "axios";

export async function getImageOnSuiScan(tokenAddress: string) {
    try {
        const response = await axios.get(`https://suiscan.xyz/api/sui-backend/mainnet/api/coins/${tokenAddress}`);
        console.log(response.data)
        return response.data.iconUrl;
    } catch (error) {
        console.log(error);
        return "ADDRESS_NOT_EXIST";
    }
}