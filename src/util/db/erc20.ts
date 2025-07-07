import { and, eq } from "drizzle-orm";
import { getAddress } from "viem";
import type { IAgentRuntime } from "@elizaos/core";
import { getDb } from "./client";
import { erc20Table } from "../../schema/erc20";
import { lower } from "../../schema/util";
import type { TokenData, TokenInfo } from "../../types/token";

interface GetTokenParams {
  chainId: number;
  address?: `0x${string}`;
  symbol?: string;
}

export const getToken = async (
  runtime: IAgentRuntime,
  params: GetTokenParams
) => {
  const db = getDb(runtime);

  if (params.address) {
    const address = getAddress(params.address);
    return await db
      .select()
      .from(erc20Table)
      .where(
        and(
          eq(erc20Table.chainId, params.chainId),
          eq(erc20Table.address, address)
        )
      );
  } else if (params.symbol) {
    return await db
      .select()
      .from(erc20Table)
      .where(
        and(
          eq(erc20Table.chainId, params.chainId),
          eq(lower(erc20Table.symbol), params.symbol.toLowerCase())
        )
      );
  } else {
    return await db
      .select()
      .from(erc20Table)
      .where(and(eq(erc20Table.chainId, params.chainId)));
  }

  throw new Error("No address or symbol provided");
};

export const upsertToken = async (
  runtime: IAgentRuntime,
  params: Required<TokenData> & { chainId: number; info?: TokenInfo }
) => {
  const db = getDb(runtime);
  const { address: _address, info, ...rest } = params;
  const address = getAddress(_address);

  const action = db
    .insert(erc20Table)
    .values({ ...rest, address, info: info ?? {} });

  if (!params.info) {
    return (await action.onConflictDoNothing().returning())?.[0];
  }

  return (
    await action
      .onConflictDoUpdate({
        target: [erc20Table.chainId, erc20Table.address],
        set: {
          info: params.info,
        },
      })
      .returning()
  )?.[0];
};
