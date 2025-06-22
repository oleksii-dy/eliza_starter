-- Custom Reasoning Training Data Schema
-- This creates a dedicated training_data table for storing all reasoning decisions
-- Designed to work with both PGLite and PostgreSQL adapters

-- Training data table for custom reasoning decisions
CREATE TABLE IF NOT EXISTS training_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Core identification
    agent_id UUID NOT NULL,
    room_id UUID,
    world_id UUID,
    message_id UUID,
    
    -- Training data classification
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('should_respond', 'planning', 'coding')),
    interaction_type VARCHAR(50) NOT NULL,
    
    -- Input data (what the model received)
    input_data JSONB NOT NULL,
    
    -- Output data (what the model produced)
    output_data JSONB NOT NULL,
    
    -- Context and metadata
    conversation_context JSONB,
    state_data JSONB,
    metadata JSONB,
    
    -- Performance metrics
    response_time_ms INTEGER,
    tokens_used INTEGER,
    cost_usd DECIMAL(10, 6),
    
    -- Quality indicators
    confidence_score DECIMAL(3, 2),
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Training metadata
    is_training_sample BOOLEAN DEFAULT true,
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    tags TEXT[],
    
    -- Indexing for efficient queries
    CONSTRAINT training_data_agent_id_idx FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    INDEX idx_training_data_agent_model (agent_id, model_type),
    INDEX idx_training_data_created_at (created_at),
    INDEX idx_training_data_quality (is_training_sample, quality_rating),
    INDEX idx_training_data_tags USING GIN (tags)
);

-- Training sessions table to track model training runs
CREATE TABLE IF NOT EXISTS training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Session identification
    agent_id UUID NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    session_name VARCHAR(255),
    
    -- Training configuration
    base_model VARCHAR(255) NOT NULL,
    training_config JSONB NOT NULL,
    
    -- Data used for training
    training_samples_count INTEGER NOT NULL DEFAULT 0,
    validation_samples_count INTEGER DEFAULT 0,
    data_start_date TIMESTAMP WITH TIME ZONE,
    data_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Training progress
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    
    -- Results
    final_model_name VARCHAR(255),
    deployment_id VARCHAR(255),
    validation_metrics JSONB,
    training_cost_usd DECIMAL(10, 2),
    
    -- Logs and debugging
    training_logs TEXT,
    error_details TEXT,
    
    CONSTRAINT training_sessions_agent_id_idx FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    INDEX idx_training_sessions_agent_model (agent_id, model_type),
    INDEX idx_training_sessions_status (status),
    INDEX idx_training_sessions_created (created_at)
);

-- Model deployments table to track active model deployments
CREATE TABLE IF NOT EXISTS model_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Deployment identification
    agent_id UUID NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    deployment_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- Deployment details
    provider VARCHAR(50) NOT NULL DEFAULT 'together-ai',
    endpoint_url TEXT,
    status VARCHAR(50) DEFAULT 'deploying' CHECK (status IN ('deploying', 'active', 'inactive', 'failed')),
    
    -- Usage tracking
    total_requests INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(10, 6) DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Configuration
    auto_shutdown_minutes INTEGER DEFAULT 30,
    max_cost_per_hour DECIMAL(10, 2),
    
    CONSTRAINT model_deployments_agent_id_idx FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    INDEX idx_model_deployments_agent_model (agent_id, model_type),
    INDEX idx_model_deployments_status (status),
    INDEX idx_model_deployments_last_used (last_used_at)
);

-- Reasoning decisions audit log for debugging and monitoring
CREATE TABLE IF NOT EXISTS reasoning_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Context
    agent_id UUID NOT NULL,
    room_id UUID,
    message_id UUID,
    
    -- Decision details
    decision_type VARCHAR(50) NOT NULL CHECK (decision_type IN ('should_respond', 'planning', 'coding', 'fallback')),
    model_used VARCHAR(255),
    custom_reasoning_used BOOLEAN NOT NULL DEFAULT false,
    
    -- Input and output
    input_summary TEXT,
    output_summary TEXT,
    
    -- Performance
    response_time_ms INTEGER,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    
    -- Context for debugging
    full_context JSONB,
    
    CONSTRAINT reasoning_decisions_agent_id_idx FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    INDEX idx_reasoning_decisions_agent_created (agent_id, created_at),
    INDEX idx_reasoning_decisions_type (decision_type),
    INDEX idx_reasoning_decisions_custom (custom_reasoning_used)
);

-- Cost tracking table for budget management
CREATE TABLE IF NOT EXISTS reasoning_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Cost attribution
    agent_id UUID NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    deployment_id VARCHAR(255),
    
    -- Cost details
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('inference', 'deployment', 'storage')),
    tokens_used INTEGER DEFAULT 0,
    cost_usd DECIMAL(10, 6) NOT NULL,
    
    -- Billing period
    billing_period DATE NOT NULL DEFAULT CURRENT_DATE,
    
    CONSTRAINT reasoning_costs_agent_id_idx FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    INDEX idx_reasoning_costs_agent_period (agent_id, billing_period),
    INDEX idx_reasoning_costs_model_period (model_type, billing_period)
);

-- Create updated_at triggers for PostgreSQL
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $trigger$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $trigger$ LANGUAGE plpgsql;
    END IF;
END
$$;

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_training_data_updated_at 
    BEFORE UPDATE ON training_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_sessions_updated_at 
    BEFORE UPDATE ON training_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_deployments_updated_at 
    BEFORE UPDATE ON model_deployments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
CREATE OR REPLACE VIEW training_data_summary AS
SELECT 
    agent_id,
    model_type,
    COUNT(*) as total_samples,
    COUNT(*) FILTER (WHERE is_training_sample = true) as training_samples,
    COUNT(*) FILTER (WHERE success = true) as successful_samples,
    AVG(confidence_score) as avg_confidence,
    AVG(response_time_ms) as avg_response_time,
    SUM(cost_usd) as total_cost,
    MIN(created_at) as earliest_sample,
    MAX(created_at) as latest_sample
FROM training_data 
GROUP BY agent_id, model_type;

CREATE OR REPLACE VIEW daily_costs AS
SELECT 
    agent_id,
    model_type,
    billing_period,
    SUM(cost_usd) as daily_cost,
    COUNT(*) as operation_count
FROM reasoning_costs
GROUP BY agent_id, model_type, billing_period
ORDER BY billing_period DESC;

-- Insert initial data or migration logic can go here
-- This schema is designed to be backwards compatible and will only be used
-- when custom reasoning is enabled