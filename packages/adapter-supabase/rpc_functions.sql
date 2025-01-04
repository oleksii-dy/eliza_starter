-- First drop existing functions
DROP FUNCTION IF EXISTS create_room(UUID);
DROP FUNCTION IF EXISTS remove_memories(UUID, TEXT);
DROP FUNCTION IF EXISTS search_memories(TEXT, UUID, vector, float, integer, boolean);
DROP FUNCTION IF EXISTS get_embedding_list(TEXT, float, TEXT, TEXT, TEXT, integer);
DROP FUNCTION IF EXISTS get_goals(boolean, UUID, UUID, integer);
DROP FUNCTION IF EXISTS check_vector_extension();

-- RPC Functions for Supabase Adapter

-- Room Creation
CREATE OR REPLACE FUNCTION create_room(room_id UUID)
RETURNS UUID AS $$
BEGIN
    INSERT INTO rooms (id) VALUES (room_id);
    RETURN room_id;
END;
$$ LANGUAGE plpgsql;

-- Memory Management
CREATE OR REPLACE FUNCTION remove_memories(query_roomId UUID, query_table_name TEXT)
RETURNS void AS $$
BEGIN
    EXECUTE format('DELETE FROM %I WHERE "roomId" = $1', query_table_name)
    USING query_roomId;
END;
$$ LANGUAGE plpgsql;

-- Memory Search with Vector Similarity
CREATE OR REPLACE FUNCTION search_memories(
    query_table_name TEXT,
    query_room_id UUID,
    query_embedding vector,
    query_match_threshold FLOAT,
    query_match_count INTEGER,
    query_unique BOOLEAN
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
    RETURN QUERY EXECUTE format('
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
        1 - (m.embedding <-> $1) as similarity
    FROM %I m
    WHERE m."roomId" = $2
    AND 1 - (m.embedding <-> $1) >= $3
    AND (NOT $4 OR m."unique" = true)
    ORDER BY m.embedding <-> $1
    LIMIT $5',
    query_table_name)
    USING query_embedding, query_room_id, query_match_threshold, query_unique, query_match_count;
END;
$$ LANGUAGE plpgsql;

-- Get Cached Embeddings with Levenshtein Distance
CREATE OR REPLACE FUNCTION get_embedding_list(
    query_table_name TEXT,
    query_threshold FLOAT,
    query_input TEXT,
    query_field_name TEXT,
    query_field_sub_name TEXT,
    query_match_count INT DEFAULT 5
)
RETURNS TABLE (
    embedding vector,
    levenshtein_score INTEGER
) AS $$
BEGIN
    RETURN QUERY EXECUTE format('
        WITH content_text AS (
            SELECT 
                id,
                embedding,
                content->>%L as field_text
            FROM %I
            WHERE content ? %L
        )
        SELECT 
            embedding,
            levenshtein(field_text, %L) as levenshtein_score
        FROM content_text
        WHERE levenshtein(field_text, %L) <= %s
        ORDER BY levenshtein_score ASC
        LIMIT %s
    ', 
    query_field_sub_name,
    query_table_name,
    query_field_name,
    query_input,
    query_input,
    query_threshold::text,
    query_match_count::text);
END;
$$ LANGUAGE plpgsql;

-- Get Goals
CREATE OR REPLACE FUNCTION get_goals(
    query_roomId UUID,
    query_userId UUID DEFAULT NULL,
    only_in_progress BOOLEAN DEFAULT true,
    row_count INTEGER DEFAULT 5
)
RETURNS SETOF goals AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM goals
    WHERE
        (query_userId IS NULL OR "userId" = query_userId)
        AND ("roomId" = query_roomId)
        AND (NOT only_in_progress OR status = 'IN_PROGRESS')
    LIMIT row_count;
END;
$$ LANGUAGE plpgsql;

-- Vector Extension Check
CREATE OR REPLACE FUNCTION check_vector_extension()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM pg_extension 
        WHERE extname = 'vector'
    );
END;
$$ LANGUAGE plpgsql; 