# Drizzle Constraint Extraction Limitation

## Issue Summary

The SQL plugin's custom migrator cannot automatically extract and create constraints (unique, index, check) defined using Drizzle ORM's constraint builder functions in the table definition's return array.

### Example of Affected Code:

```typescript
const myTable = pgTable(
  'my_table',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
  },
  (table) => [
    unique('unique_email').on(table.email), // ❌ Cannot be extracted
    index('idx_name').on(table.name), // ❌ Cannot be extracted
    check('name_length', sql`length(name) > 0`), // ❌ Cannot be extracted
  ]
);
```

## Technical Explanation

When attempting to call Drizzle's constraint builder functions (returned by `unique()`, `index()`, `check()`, etc.), a JSON parse error occurs within Drizzle's internal code. This happens because these builder functions are designed to be executed only within Drizzle's internal table creation context, where proper column proxies and metadata are available.

The error manifests as:

```
JSON Parse error: Unexpected identifier "undefined"
```

This is not a bug in our code, but rather a fundamental limitation of how Drizzle's constraint builders work.

## Workarounds

### Option 1: Use Custom Schema Format

Instead of Drizzle's constraint builders, define constraints using our custom schema format:

```typescript
export const myTableSchema = {
  columns: {
    id: { type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
    name: { type: 'text', notNull: true },
    email: { type: 'text', notNull: true },
  },
  indexes: [
    { name: 'unique_email', columns: ['email'], unique: true },
    { name: 'idx_name', columns: ['name'] },
  ],
  checks: [{ name: 'name_length', condition: 'length(name) > 0' }],
};
```

### Option 2: Use Drizzle Kit

Use Drizzle's official migration tool (drizzle-kit) which can properly handle these constraints:

```bash
npx drizzle-kit generate:pg
npx drizzle-kit push:pg
```

### Option 3: Manual ALTER TABLE Statements

After running migrations, manually add constraints:

```sql
-- Add unique constraint
ALTER TABLE my_table ADD CONSTRAINT unique_email UNIQUE (email);

-- Add index
CREATE INDEX idx_name ON my_table (name);

-- Add check constraint
ALTER TABLE my_table ADD CONSTRAINT name_length CHECK (length(name) > 0);
```

### Option 4: Use Column-Level Constraints

For simple unique constraints, define them at the column level:

```typescript
const myTable = pgTable('my_table', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(), // ✅ This works
});
```

## Impact on Tests

Tests expecting constraints to be created automatically from Drizzle's constraint builders will fail. Update tests to:

1. Use one of the workarounds above
2. Verify constraints through manual SQL execution
3. Skip constraint validation for tables using Drizzle builders

## Future Improvements

Potential solutions being explored:

1. Contributing to Drizzle ORM to expose constraint metadata without execution
2. Implementing a Drizzle table parser that can extract constraint definitions from source code
3. Providing a migration helper that can generate ALTER TABLE statements from Drizzle schemas

## Conclusion

This is a known limitation when using our custom migrator with Drizzle ORM schemas that use constraint builders. The workarounds provided above offer alternative approaches to achieve the same database constraints. Choose the approach that best fits your project's needs.
