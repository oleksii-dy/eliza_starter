import type { AssetsResponse } from "./types";


export const formatPortfolio = (response: AssetsResponse) => {
    const items = response.assets ?? [];
    if (!items?.length) return "No tokens found in portfolio";

    return items
        .map((item) => {
            const cost = item?.total_cost?.toFixed(2);
            const amount = item?.total_amount?.toFixed(4);
            return (
                `• On ${item.platform_name}, ${amount} ${item.asset_name || "Unknown Token"}` +
                `${` (cost: ${cost || "unknown"} ${item.cost_asset || "unknown"})`}`
            );
        })
        .join("\n");
};
