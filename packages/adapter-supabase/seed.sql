-- Default test data for Supabase adapter

-- Default Agent Account
INSERT INTO accounts (
    id,
    name,
    username,
    email,
    details
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Default Test Agent',
    'test_agent',
    'test@agent.com',
    '{"bio": "Test agent for development", "role": "test", "preferences": {}, "avatar": "https://example.com/avatar.jpg"}'::jsonb
);

-- Default Room
INSERT INTO rooms (
    id,
    "createdAt"
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    CURRENT_TIMESTAMP
);

-- Default Participant (linking agent to room)
INSERT INTO participants (
    id,
    "userId",
    "roomId",
    "userState",
    "last_message_read",
    "createdAt"
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'FOLLOWED',
    NULL,
    CURRENT_TIMESTAMP
);

-- Default Memory with test embedding (384 dimensions for BGE/default)
INSERT INTO memories (
    id,
    type,
    "createdAt",
    content,
    embedding,
    "userId",
    "agentId",
    "roomId",
    "unique"
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'message',
    CURRENT_TIMESTAMP,
    '{"text": "This is a test memory", "type": "text", "metadata": {}}'::jsonb,
    array_fill(0.1, ARRAY[384])::vector,
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    true
);

-- Default Goal
INSERT INTO goals (
    id,
    "userId",
    name,
    status,
    description,
    "roomId",
    objectives,
    "createdAt"
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'Test Goal',
    'ACTIVE',
    'A test goal for development',
    '00000000-0000-0000-0000-000000000000',
    '[{"id": "1", "status": "pending", "description": "Test objective"}]'::jsonb,
    CURRENT_TIMESTAMP
);

-- Default Cache Entry
INSERT INTO cache (
    key,
    "agentId",
    value,
    "createdAt",
    "expiresAt"
) VALUES (
    'test_cache_key',
    '00000000-0000-0000-0000-000000000000',
    '{"test": "data"}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 day'
); 