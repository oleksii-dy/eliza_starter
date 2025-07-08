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