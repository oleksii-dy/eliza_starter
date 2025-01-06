# Supabase Database Adapter Setup Guide

## Prerequisites
- A Supabase account (free tier works fine)
- Access to Supabase dashboard
- Node.js and npm/pnpm installed

## Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in the details:
   - Organization: Select or create one
   - Name: Choose a project name
   - Database Password: Save this somewhere secure
   - Region: Choose closest to you
4. Click "Create New Project"
5. Wait for the project to be created (usually takes 1-2 minutes)

## Step 2: Get Credentials

1. In your project dashboard, click on the gear icon (Settings) in the left sidebar
2. Click on "API" in the settings menu
3. You'll find two important pieces of information:
   - Project URL: Copy the URL under "Project URL"
   - API Key: Copy the anon/public key under "Project API keys"
   - **IMPORTANT**: Never share or commit these values!

## Step 3: Set Up Environment Variables

1. Create or edit the `.env` file in your project root:
   ```bash
   SUPABASE_URL=your_project_url_here
   SUPABASE_KEY=your_anon_key_here
   ```
   Replace with values from Step 2

2. **IMPORTANT**: Make sure `.env` is in your `.gitignore`

## Step 4: Initialize Database Schema

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Load `schema.sql`:
   - Open `schema.sql` from your local project
   - Copy ALL the contents
   - Paste into the SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter
   - Wait for "Success" message
   - **IMPORTANT**: If you see any errors, make sure you copied the ENTIRE file

## Step 5: Load RPC Functions

1. Still in SQL Editor, click "New Query" again
2. Load `rpc_functions.sql`:
   - Open `rpc_functions.sql` from your local project
   - Copy ALL the contents
   - Paste into the SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter
   - Wait for "Success" message
   - **IMPORTANT**: All functions must be created without errors

## Step 6: Load Test Data (Optional)

1. Still in SQL Editor, click "New Query" again
2. Load `seed.sql`:
   - Open `seed.sql` from your local project
   - Copy ALL the contents
   - Paste into the SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter
   - Wait for "Success" message
   - This will create:
     - A default test agent account
     - A default test room
     - A default participant
     - A test memory with embedding
     - A test goal
     - A test cache entry

## Step 7: Verify Setup

1. In SQL Editor, run this verification query:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_type = 'FUNCTION' 
   AND routine_schema = 'public';
   ```
2. You should see these functions listed:
   - `search_memories`
   - `get_embedding_list`
   - `remove_memories`
   - `get_goals`
   - `create_room`
   - `check_vector_extension`

## Common Issues & Solutions

### "relation does not exist"
- You missed Step 4 (schema.sql)
- Go back and run schema.sql first

### "function does not exist"
- You missed Step 5 (rpc_functions.sql)
- Go back and run rpc_functions.sql

### "memory or cache operations not working correctly"
- Run the additional fixes in sql_fix.sql:
  ```sql
  -- Open sql_fix.sql from your local project
  -- Copy ALL contents
  -- Run in SQL Editor
  -- This will update memory search and cache management
  ```
- This ensures all memory operations and caching work correctly

### "permission denied"
- You're not using the correct API key
- Check Step 2 and make sure you're using the "anon/public" key

### "URL not found"
- Your project URL is incorrect
- Make sure you copied the full URL including 'https://'


All tests should pass. If not, check the error messages and refer to the Common Issues section above.

## Need Help?

1. Double-check all steps above
2. Verify your `.env` file has correct values
3. Make sure you ran ALL 3 SQL files completely in the SQL Editor
4. Check Supabase dashboard for any error messages
5. If still stuck, provide:
   - Error message
   - Screenshot of your SQL Editor
   - Output of the verification query

## Security Notes

- Never commit `.env` file
- Never share your API keys
- Use environment variables in production
- Regularly rotate API keys
- Monitor database usage in Supabase dashboard
