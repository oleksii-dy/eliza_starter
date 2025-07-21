# PGLite Array Type Compatibility Issue Report - RESOLVED

## Issue Summary

The `plugin-sql` package was experiencing query failures when using PostgreSQL JSONB operators with certain database configurations. The issue manifested with both array containment operators (`@>`) and overlap operators (`?|`) for JSONB columns.

## Resolution

Changed the query approach to use text-based pattern matching on JSONB columns, which is universally compatible across all PostgreSQL-compatible databases including PGLite.

### Schema Changes

The schema was updated to use JSONB columns instead of PostgreSQL arrays:

```typescript
// Old schema (caused issues)
tags: text('tags').array().default(sql`'{}'::text[]`)

// New schema (works everywhere)  
tags: jsonb('tags').default(sql`'[]'::jsonb`)
```

### Query Changes

Instead of using PostgreSQL-specific JSONB operators, we now use LIKE pattern matching on the text representation:

```typescript
// Old approach (failed with certain databases)
sql`${taskTable.tags} @> ${JSON.stringify(params.tags)}::jsonb`
sql`${taskTable.tags} ?| array[${sql.raw(tags.map(t => `'${t}'`).join(','))}]`

// New approach (universally compatible)
const tagConditions = params.tags.map(tag => 
  sql`${taskTable.tags}::text LIKE ${`%"${tag}"%`}`
);
if (tagConditions.length > 0) {
  conditions.push(or(...tagConditions)!);
}
```

## Technical Details

The solution works by:
1. Converting JSONB to text using the `::text` cast
2. Using LIKE pattern matching to find tags within the JSON array
3. Using OR conditions to match any of the requested tags

This approach is less efficient than native JSONB operators but ensures compatibility across all PostgreSQL-compatible databases.

## Migration

For existing databases with array columns, use the migration script:
```sql
ALTER TABLE tasks ALTER COLUMN tags TYPE jsonb USING array_to_json(tags)::jsonb;
ALTER TABLE relationships ALTER COLUMN tags TYPE jsonb USING array_to_json(tags)::jsonb;
```

## Status

✅ RESOLVED - The issue has been fixed and tests are passing. 