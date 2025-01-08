import { InjectiveGrpcBase } from "../grpc/grpc-base";
import {
    MintModuleParamsResponse,
    GetInflationResponse,
    GetAnnualProvisionsResponse,
} from "../types";
import {
    StandardResponse,
    createSuccessResponse,
    createErrorResponse,
} from "../types/index";

/**
 * Fetches the parameters of the Mint module.
 *
 * @this InjectiveGrpcBase
 * @returns {Promise<StandardResponse>}
 *          - On success: A standard response containing Mint module parameters.
 *          - On failure: A standard response containing an error message.
 */
export async function getMintModuleParams(
    this: InjectiveGrpcBase
): Promise<StandardResponse> {
    try {
        const result = await this.request({
            method: this.chainGrpcMintApi.fetchModuleParams,
            params: {},
        });
        return createSuccessResponse(result as MintModuleParamsResponse);
    } catch (err) {
        return createErrorResponse("getMintModuleParamsError", err);
    }
}

/**
 * Retrieves the current inflation rate.
 *
 * @this InjectiveGrpcBase
 * @returns {Promise<StandardResponse>}
 *          - On success: A standard response containing the current inflation rate.
 *          - On failure: A standard response containing an error message.
 */
export async function getInflation(
    this: InjectiveGrpcBase
): Promise<StandardResponse> {
    try {
        const result = await this.request({
            method: this.chainGrpcMintApi.fetchInflation,
            params: {},
        });
        return createSuccessResponse(result as GetInflationResponse);
    } catch (err) {
        return createErrorResponse("getInflationError", err);
    }
}

/**
 * Obtains the annual provisions.
 *
 * @this InjectiveGrpcBase
 * @returns {Promise<StandardResponse>}
 *          - On success: A standard response containing the annual provisions.
 *          - On failure: A standard response containing an error message.
 */
export async function getAnnualProvisions(
    this: InjectiveGrpcBase
): Promise<StandardResponse> {
    try {
        const result = await this.request({
            method: this.chainGrpcMintApi.fetchAnnualProvisions,
            params: {},
        });
        return createSuccessResponse(result as GetAnnualProvisionsResponse);
    } catch (err) {
        return createErrorResponse("getAnnualProvisionsError", err);
    }
}
