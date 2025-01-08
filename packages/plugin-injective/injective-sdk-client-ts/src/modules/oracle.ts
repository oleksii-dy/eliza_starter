import { InjectiveGrpcBase } from "../grpc/grpc-base.js";
import { OracleModuleParams } from "@injectivelabs/sdk-ts";
import {
    StandardResponse,
    createSuccessResponse,
    createErrorResponse,
} from "../types/index.js";

/**
 * Fetches the parameters of the Oracle module.
 *
 * @this InjectiveGrpcBase
 * @returns {Promise<StandardResponse>}
 *          - On success: A standard response containing Oracle module parameters.
 *          - On failure: A standard response containing an error message.
 */
export async function getOracleModuleParams(
    this: InjectiveGrpcBase
): Promise<StandardResponse> {
    try {
        const result: OracleModuleParams = await this.request({
            method: this.chainGrpcOracleApi.fetchModuleParams,
            params: {},
        });
        return createSuccessResponse(result);
    } catch (err) {
        return createErrorResponse("getOracleModuleParamsError", err);
    }
}
