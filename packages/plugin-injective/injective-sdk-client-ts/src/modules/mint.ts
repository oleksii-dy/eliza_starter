import { InjectiveGrpcBase } from "../grpc/grpc-base.js";
import { MinModuleParams } from "@injectivelabs/sdk-ts";

export async function getMintModuleParams(
    this: InjectiveGrpcBase
): Promise<MinModuleParams> {
    return this.request({
        method: this.chainGrpcMintApi.fetchModuleParams,
        params: {},
    });
}

export async function getInflation(
    this: InjectiveGrpcBase
): Promise<{ inflation: string }> {
    return this.request({
        method: this.chainGrpcMintApi.fetchInflation,
        params: {},
    });
}

export async function getAnnualProvisions(
    this: InjectiveGrpcBase
): Promise<{ annualProvisions: string }> {
    return this.request({
        method: this.chainGrpcMintApi.fetchAnnualProvisions,
        params: {},
    });
}
