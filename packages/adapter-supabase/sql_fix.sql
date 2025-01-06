-- Drop existing objects if they exist
DROP TRIGGER IF EXISTS update_cache_updated_at ON cache;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS cleanup_expired_cache();

-- Create the base table with all columns
CREATE TABLE IF NOT EXISTS cache (
    "key" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "value" JSONB DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP,
    PRIMARY KEY ("key", "agentId")
);

-- Create index for expiration lookups
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache("expiresAt");

-- Create the cleanup function for expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM cache WHERE "expiresAt" < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;



-- Drop the existing function first
DROP FUNCTION IF EXISTS search_memories(TEXT, UUID, vector, float, integer, boolean);

-- Create the updated function with type parameter
CREATE OR REPLACE FUNCTION search_memories(
    query_table_name TEXT,
    query_room_id UUID,
    query_embedding vector,
    query_match_threshold FLOAT,
    query_match_count INTEGER,
    query_unique BOOLEAN,
    query_type TEXT DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    type TEXT,
    "createdAt" TIMESTAMPTZ,
    content JSONB,
    embedding vector,
    "userId" UUID,
    "agentId" UUID,
    "roomId" UUID,
    "unique" BOOLEAN,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.type,
        m."createdAt",
        m.content,
        m.embedding,
        m."userId",
        m."agentId",
        m."roomId",
        m."unique",
        1 - (m.embedding <-> query_embedding) as similarity
    FROM memories m
    WHERE m."roomId" = query_room_id
    AND (query_type IS NULL OR m.type = query_type)
    AND 1 - (m.embedding <-> query_embedding) >= query_match_threshold
    AND (NOT query_unique OR m."unique" = true)
    ORDER BY m.embedding <-> query_embedding
    LIMIT query_match_count;
END;
$$ LANGUAGE plpgsql;