import { InjectiveGrpcBase } from "../grpc/grpc-base.js";
import {
    MintModuleParamsResponse,
    GetInflationResponse,
    GetAnnualProvisionsResponse,
} from "../types";
export async function getMintModuleParams(
    this: InjectiveGrpcBase
): Promise<MintModuleParamsResponse> {
    return this.request({
        method: this.chainGrpcMintApi.fetchModuleParams,
        params: {},
    });
}

export async function getInflation(
    this: InjectiveGrpcBase
): Promise<GetInflationResponse> {
    return this.request({
        method: this.chainGrpcMintApi.fetchInflation,
        params: {},
    });
}

export async function getAnnualProvisions(
    this: InjectiveGrpcBase
): Promise<GetAnnualProvisionsResponse> {
    return this.request({
        method: this.chainGrpcMintApi.fetchAnnualProvisions,
        params: {},
    });
}
