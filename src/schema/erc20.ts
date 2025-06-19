import { pgTable, integer, text, uuid, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { lower } from "./util";

export const erc20Table = pgTable(
  "erc20",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    address: text("address").notNull(),
    name: text("name").notNull(),
    symbol: text("symbol").notNull(),
    decimals: integer("decimals").notNull(),
    chainId: integer("chain_id").notNull(),
  },
  (table) => [
    index("addressIndex").on(lower(table.address)),
    index("tokenSymbolIndex").on(lower(table.symbol)),
  ]
);

/** 
default tokens
INSERT INTO "erc20" ("address", "chain_id", "decimals", "id", "name", "symbol") VALUES ('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 1, 6, '2eb7b733-c440-42ad-ad95-4c3a56a0a069', 'USD Coin', 'USDC');
INSERT INTO "erc20" ("address", "chain_id", "decimals", "id", "name", "symbol") VALUES ('0xdAC17F958D2ee523a2206206994597C13D831ec7', 1, 6, 'f2bab4cd-a556-447f-ad36-706acfa15592', 'Tether USD', 'USDT');
INSERT INTO "erc20" ("address", "chain_id", "decimals", "id", "name", "symbol") values ('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', 42161, 6, '89abb746-e0fd-41b0-bd40-3ff5fef25474', 'USD₮0', 'USDT');
insert into "erc20" ("address", "chain_id", "decimals", "id", "name", "symbol") values ('0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8', 42161, 18, '570d6f26-ecd7-4179-858d-c33071e0eb59', 'Pendle', 'PENDLE')
*/
