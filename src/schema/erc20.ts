import { pgTable, integer, text, index, json, varchar, primaryKey } from "drizzle-orm/pg-core";
import { lower } from "./util";

export const erc20Table = pgTable(
  "erc20",
  {
    address: varchar("address", { length: 42 }).notNull(),
    name: text("name").notNull(),
    symbol: text("symbol").notNull(),
    decimals: integer("decimals").notNull(),
    chainId: integer("chain_id").notNull(),
    info: json("info"),
  },
  (table) => [
    primaryKey({ columns: [table.address, table.chainId] }),
    index("addressIndex").on(lower(table.address)),
    index("tokenSymbolIndex").on(lower(table.symbol)),
  ]
);

/** 
default tokens

insert into "erc20"
	("address", "chain_id", "decimals", "info", "name", "symbol") 
values 
	('0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8', 42161, 18, NULL, 'Pendle', 'PENDLE'), 
  ('0x23E60d1488525bf4685f53b3aa8E676c30321066', 1, 18, '{"swap":{"type":"pendle","market":"0x09fa04aac9c6d1c6131352ee950cd67ecc6d4fb9"}}', 'PT Wrapped stUSR 25SEP2025', 'PT-wstUSR-25SEP2025'),
  ('0x912CE59144191C1204E64559FE8253a0e49E6548', 42161, 18, NULL, 'Arbitrum', 'ARB'),
  ('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 1, 6, NULL, 'USD Coin', 'USDC'),
  ('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', 42161, 6, NULL, 'USD₮0', 'USDT'),
  ('0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 42161, 6, NULL, 'USD Coin', 'USDC'),
  ('0xdAC17F958D2ee523a2206206994597C13D831ec7', 1, 6, '{"allowanceSlot":"0x1720703b80d843ccd5aea9c1af1d6573ad7bb7f405cd9ad961aae73c182d0f0a"}', 'Tether USD', 'USDT')
*/
