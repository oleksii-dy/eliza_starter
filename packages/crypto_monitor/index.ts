import { Plugin } from "@eliza/core";
import { getCryptoPrice } from "./actions/getCryptoPrice";
import { binanceProvider } from "./providers/binanceProvider";
import { alphaVantageProvider } from "./providers/alphaVantageProvider";

const cryptoMonitor: Plugin = {
    name: "crypto-monitor",
    description: "Monitors real-time cryptocurrency prices.",
    actions: [getCryptoPrice],
    evaluators: [],
    providers: [binanceProvider, alphaVantageProvider],
};

export default cryptoMonitor;
