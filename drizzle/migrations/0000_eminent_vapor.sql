CREATE TABLE "erc20" (
	"address" varchar(42) NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"decimals" integer NOT NULL,
	"chain_id" integer NOT NULL,
	"info" json,
	CONSTRAINT "erc20_address_chain_id_pk" PRIMARY KEY("address","chain_id")
);
--> statement-breakpoint
CREATE TABLE "levva_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" text NOT NULL,
	CONSTRAINT "levva_user_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE INDEX "addressIndex" ON "erc20" USING btree (lower("address"));--> statement-breakpoint
CREATE INDEX "tokenSymbolIndex" ON "erc20" USING btree (lower("symbol"));--> statement-breakpoint
CREATE UNIQUE INDEX "userAddressIndex" ON "levva_user" USING btree (lower("address"));


INSERT INTO "erc20" 
  ("address", "chain_id", "decimals", "name", "symbol") 
VALUES 
  ('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 1, 6, 'USD Coin', 'USDC'),
  ('0xdAC17F958D2ee523a2206206994597C13D831ec7', 1, 6, 'Tether USD', 'USDT'),
  ('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', 42161, 6, 'USD₮0', 'USDT'),
  ('0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8', 42161, 18, 'Pendle', 'PENDLE'),
  ('0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 42161, 6, 'USD Coin', 'USDC'),
  ('0x912CE59144191C1204E64559FE8253a0e49E6548', 42161, 18, 'Arbitrum', 'ARB');
