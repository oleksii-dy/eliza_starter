import { describe, it, expect } from "vitest";
import { generateIbcTransferMessage } from "../shared/helpers/cosmos-messages";
import { MsgTransfer } from "interchain/dist/codegen/ibc/applications/transfer/v1/tx";
import { MsgTransferEncodeObject } from "@cosmjs/stargate";

describe("generateIbcTransferMessage", () => {
    it("should return a correctly formatted MsgTransferEncodeObject", () => {
        const ibcTransferParams: MsgTransfer = {
            sourcePort: "transfer",
            sourceChannel: "channel-0",
            token: {
                denom: "uatom",
                amount: "1000",
            },
            sender: "cosmos1...",
            receiver: "cosmos2...",
            timeoutHeight: {
                revisionHeight: BigInt(1000),
                revisionNumber: BigInt(1),
            },
            timeoutTimestamp: BigInt(1625140800),
            memo: "",
        };

        const result: MsgTransferEncodeObject =
            generateIbcTransferMessage(ibcTransferParams);

        expect(result).toEqual({
            typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
            value: ibcTransferParams,
        });
    });
});
