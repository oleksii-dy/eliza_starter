import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

export const baseProvider = ethers.getDefaultProvider(process.env.BASE_MAINNET_URL!);
export const baseSigner = new ethers.Wallet(process.env.EVM_PRIVATE_KEY!).connect(baseProvider);

export const arbitrumProvider = ethers.getDefaultProvider(process.env.ARBITRUM_MAINNET!);
export const arbitrumSigner = new ethers.Wallet(process.env.EVM_PRIVATE_KEY!).connect(arbitrumProvider);

