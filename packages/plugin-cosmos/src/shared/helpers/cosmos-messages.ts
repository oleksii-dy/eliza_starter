import { MsgTransferEncodeObject } from "@cosmjs/stargate";
import { MsgTransfer } from "interchain/dist/codegen/ibc/applications/transfer/v1/tx";

export const generateIbcTransferMessage = (
    ibcTransferParams: MsgTransfer
): MsgTransferEncodeObject => {
    return {
        typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
        value: ibcTransferParams,
    };
};
