-- First, check if the agent exists
SELECT id, name, created_at FROM agents WHERE id = 'b850bc30-45f8-0041-a00a-83df46d8555d';

-- If you want to delete this agent and start fresh:
-- DELETE FROM agents WHERE id = 'b850bc30-45f8-0041-a00a-83df46d8555d';

-- Or if you want to see all agents:
-- SELECT id, name, created_at FROM agents; 