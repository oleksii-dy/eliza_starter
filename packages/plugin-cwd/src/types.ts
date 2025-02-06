export interface AssetsResponse {
    assets: Asset[];
}

interface Asset {
    asset_name: string;
    cost_asset: string;
    platform_name: string;
    total_amount: number;
    total_cost: number;
}