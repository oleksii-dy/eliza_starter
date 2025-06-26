-- Migration: Add tenant support to ElizaOS database
-- This migration adds tenant_id columns to all relevant tables for multi-tenant isolation

-- Add tenant_id to agents table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agents' AND column_name = 'tenant_id') THEN
        ALTER TABLE agents ADD COLUMN tenant_id VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_agents_tenant_id ON agents(tenant_id);
    END IF;
END $$;

-- Add tenant_id to memories table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'memories' AND column_name = 'tenant_id') THEN
        ALTER TABLE memories ADD COLUMN tenant_id VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_memories_tenant_id ON memories(tenant_id);
    END IF;
END $$;

-- Add tenant_id to rooms table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'rooms' AND column_name = 'tenant_id') THEN
        ALTER TABLE rooms ADD COLUMN tenant_id VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_rooms_tenant_id ON rooms(tenant_id);
    END IF;
END $$;

-- Add tenant_id to message_servers table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'message_servers' AND column_name = 'tenant_id') THEN
        ALTER TABLE message_servers ADD COLUMN tenant_id VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_message_servers_tenant_id ON message_servers(tenant_id);
    END IF;
END $$;

-- Add tenant_id to message_channels table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'message_channels' AND column_name = 'tenant_id') THEN
        ALTER TABLE message_channels ADD COLUMN tenant_id VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_message_channels_tenant_id ON message_channels(tenant_id);
    END IF;
END $$;

-- Add tenant_id to central_root_messages table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'central_root_messages' AND column_name = 'tenant_id') THEN
        ALTER TABLE central_root_messages ADD COLUMN tenant_id VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_central_root_messages_tenant_id ON central_root_messages(tenant_id);
    END IF;
END $$;

-- Migrate existing data to a default tenant (for backward compatibility)
-- Only update records that don't already have a tenant_id set
UPDATE agents SET tenant_id = 'legacy-global' WHERE tenant_id IS NULL;
UPDATE memories SET tenant_id = 'legacy-global' WHERE tenant_id IS NULL;
UPDATE rooms SET tenant_id = 'legacy-global' WHERE tenant_id IS NULL;
UPDATE message_servers SET tenant_id = 'legacy-global' WHERE tenant_id IS NULL;
UPDATE message_channels SET tenant_id = 'legacy-global' WHERE tenant_id IS NULL;
UPDATE central_root_messages SET tenant_id = 'legacy-global' WHERE tenant_id IS NULL;