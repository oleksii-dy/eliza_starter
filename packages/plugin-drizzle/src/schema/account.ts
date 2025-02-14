import { foreignKey, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { numberTimestamp } from "./types";
import { characterTable } from "./character";

export const accountTable = pgTable("accounts", {
    id: uuid("id").primaryKey().notNull(),
    createdAt: numberTimestamp("createdAt")
        .default(sql`now()`)
        .notNull(),
    name: text("name"),
    username: text("username"),
    email: text("email").notNull(),
    avatarUrl: text("avatarUrl"),
    details: jsonb("details").default(sql`'{}'::jsonb`),
    characterId: uuid("character_id").references(() => characterTable.id, { onDelete: "set null" }),
}, (table) => [
    foreignKey({
        name: "fk_character",
        columns: [table.characterId],
        foreignColumns: [characterTable.id],
    }).onDelete("set null"),
]);

export const accountRelations = relations(accountTable, ({ one }) => ({
    character: one(characterTable, {
        fields: [accountTable.characterId],
        references: [characterTable.id],
    }),
}));
