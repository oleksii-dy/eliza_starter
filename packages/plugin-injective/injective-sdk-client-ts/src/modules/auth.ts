import { Account, AuthModuleParams, Pagination } from "@injectivelabs/sdk-ts";
import { InjectiveGrpcBase } from "../grpc/grpc-base";
//include chain grpc async functions here
export async function getAuthModuleParams(
    this: InjectiveGrpcBase
): Promise<AuthModuleParams> {
    return this.request({
        method: this.chainGrpcAuthApi.fetchModuleParams,
        params: {},
    });
}
export async function getAccountDetails(
    this: InjectiveGrpcBase
): Promise<Account> {
    return this.request({
        method: this.chainGrpcAuthApi.fetchAccount,
        params: this.injAddress,
    });
}
export async function getAccounts(this: InjectiveGrpcBase): Promise<{
    pagination: Pagination;
    accounts: Account[];
}> {
    return this.request({
        method: this.chainGrpcAuthApi.fetchAccounts,
        params: {},
    });
}
