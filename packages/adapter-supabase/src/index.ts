import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
    type Memory,
    type Goal,
    type Relationship,
    Actor,
    GoalStatus,
    Account,
    type UUID,
    Participant,
    Room,
    elizaLogger,
    DatabaseAdapter
    RAGKnowledgeItem,
} from "@elizaos/core";
import { v4 as uuid } from "uuid";

type ParticipantState = 'FOLLOWED' | 'MUTED' | null;

interface SearchMemoriesQueryParams {
    query_table_name: string;
    query_roomId: UUID;
    query_embedding: number[];
    query_match_threshold: number;
    query_match_count: number;
    query_unique: boolean;
    query_agentId?: UUID;
}

export class SupabaseDatabaseAdapter extends DatabaseAdapter {
    private readonly maxRetries: number = 3;
    private readonly baseDelay: number = 100; // 100ms
    private readonly maxDelay: number = 1000; // 1 second
    private readonly jitterMax: number = 100; // 100ms

    supabase: SupabaseClient;

    // Public method to reset circuit breaker for testing
    public async resetCircuitBreakerForTesting(): Promise<void> {
        elizaLogger.info('Resetting circuit breaker state for testing');
        try {
            // Add delay between attempts to allow circuit breaker to stabilize
            await new Promise(resolve => setTimeout(resolve, 100));

            // Use a simple query that's less likely to fail
            await this.withDatabase(async () => {
                const { error } = await this.supabase.from('rooms').select('count');
                if (error) throw error;
                return true;
            }, 'resetCircuitBreaker');

            elizaLogger.success('Circuit breaker reset successful');
        } catch (error) {
            // Log error but don't throw to prevent test failures
            elizaLogger.warn('Error during circuit breaker reset, continuing...', {
                error: error instanceof Error ? error.message : String(error)
            });
            // Wait for reset timeout to expire
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    constructor(supabaseUrl: string, supabaseKey: string) {
        super({
            failureThreshold: 5,
            resetTimeout: 60000,
            halfOpenMaxAttempts: 3
        });
        elizaLogger.info("=== Supabase Adapter Initialization Started ===");
        elizaLogger.debug("Initializing Supabase adapter", {
            url: supabaseUrl ? supabaseUrl.split("@")[1] : 'NO_URL',
            urlLength: supabaseUrl?.length,
            keyLength: supabaseKey?.length,
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey,
            envUrl: process.env.SUPABASE_URL?.length,
            envKey: process.env.SUPABASE_KEY?.length
        });

        if (!supabaseUrl || !supabaseKey) {
            elizaLogger.error("Missing Supabase credentials", {
                hasUrl: !!supabaseUrl,
                hasKey: !!supabaseKey,
                envUrl: !!process.env.SUPABASE_URL,
                envKey: !!process.env.SUPABASE_KEY
            });
            throw new Error("Supabase URL and Key must be provided");
        }

        try {
            elizaLogger.info("Creating Supabase client...");
            this.supabase = createClient(supabaseUrl, supabaseKey);
            elizaLogger.success("=== Supabase Adapter Initialized Successfully ===");
        } catch (error) {
            elizaLogger.error("Failed to create Supabase client", {
                error: error instanceof Error ? error.message : String(error),
                hasUrl: !!supabaseUrl,
                hasKey: !!supabaseKey
            });
            throw error;
        }
    }

    private async withDatabase<T>(
        operation: () => Promise<T>,
        context: string
    ): Promise<T> {
        return this.withCircuitBreaker(async () => {
            return this.withRetry(operation, context);
        }, context);
    }

    protected async withCircuitBreaker<T>(
        operation: () => Promise<T>,
        context: string
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            elizaLogger.error(`Circuit breaker operation failed: ${context}`, {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    private async withErrorHandling<T>(operation: string, fn: () => Promise<T>): Promise<T> {
        return this.withDatabase(fn, operation);
    }

    private async withRetry<T>(
        operation: () => Promise<T>,
        operationName: string
    ): Promise<T> {
        let lastError: Error | null = null;
        let attempt = 0;

        while (attempt < this.maxRetries) {
            try {
                return await operation();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                attempt++;

                if (attempt < this.maxRetries) {
                    // Calculate delay with exponential backoff and jitter
                    const delay = Math.min(
                        this.baseDelay * Math.pow(2, attempt) + Math.random() * this.jitterMax,
                        this.maxDelay
                    );

                    elizaLogger.warn(`Operation ${operationName} failed, retrying in ${delay}ms...`, {
                        attempt,
                        error: lastError.message,
                        nextRetryIn: delay
                    });

                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        elizaLogger.error(`Operation ${operationName} failed after ${this.maxRetries} attempts`, {
            error: lastError?.message
        });
        throw lastError;
    }

    async getRoom(roomId: UUID): Promise<UUID | null> {
        elizaLogger.info('Getting room...', { roomId });
        return await this.withErrorHandling('getRoom', async () => {
            const { data, error } = await this.supabase
                .from('rooms')
                .select('id')
                .eq('id', roomId)
                .single();

            if (error) {
                if (error.message.includes('multiple (or no) rows returned')) {
                    elizaLogger.warn('Room not found', { roomId });
                    return null;
                }
                throw new Error(`Error getting room: ${error.message}`);
            }

            elizaLogger.success('Room retrieved successfully:', { roomId });
            return data.id as UUID;
        });
    }

    async getParticipantsForAccount(accountId: UUID): Promise<Participant[]> {
        elizaLogger.info('Getting participants for account...', { accountId });
        return await this.withErrorHandling('getParticipantsForAccount', async () => {
            // First get the participants
            const { data: participantData, error: participantError } = await this.supabase
                .from('participants')
                .select('id, userId')
                .eq('userId', accountId);

            if (participantError) {
                throw new Error(`Error getting participants: ${participantError.message}`);
            }

            // Then get the account details
            const { data: accountData, error: accountError } = await this.supabase
                .from('accounts')
                .select('id, name, username, email, avatarUrl, details')
                .eq('id', accountId)
                .single();

            if (accountError) {
                throw new Error(`Error getting account: ${accountError.message}`);
            }

            // Map to the framework's Participant type
            const participants = participantData.map(p => ({
                id: p.userId,
                account: {
                    id: accountData.id,
                    name: accountData.name,
                    username: accountData.username,
                    email: accountData.email,
                    avatarUrl: accountData.avatarUrl,
                    details: accountData.details || {}
                }
            }));

            elizaLogger.success('Participants retrieved successfully', { count: participants.length });
            return participants;
        });
    }



    async setParticipantUserState(
        roomId: UUID,
        userId: UUID,
        state: "FOLLOWED" | "MUTED" | null
    ): Promise<void> {
        return await this.withErrorHandling('setParticipantUserState', async () => {
            const { error } = await this.supabase
                .from("participants")
                .update({ userState: state })
                .eq("roomId", roomId)
                .eq("userId", userId);

            if (error) {
                throw new Error(`Failed to set participant user state: ${error.message}`);
            }
        });
    }

    async getParticipantsForRoom(roomId: UUID): Promise<UUID[]> {
        return await this.withErrorHandling('getParticipantsForRoom', async () => {
            const { data, error } = await this.supabase
                .from("participants")
                .select("userId")
                .eq("roomId", roomId);

            if (error) {
                throw new Error(`Error getting participants for room: ${error.message}`);
            }

            return data.map((row) => row.userId as UUID);
        });
    }

    async init() {
        elizaLogger.info("Initializing Supabase adapter");

        try {
            // Test basic connection first
            elizaLogger.debug("Testing basic connection...", {
                hasClient: !!this.supabase,
                envUrl: process.env.SUPABASE_URL?.split("@")[1],
                envKeyPresent: !!process.env.SUPABASE_KEY,
                connectionTest: 'starting'
            });

            const { data: _data, error: connectionError } = await this.supabase
                .from("rooms")
                .select("id")
                .limit(1);

            if (connectionError) {
                elizaLogger.error("Connection test failed", {
                    error: connectionError.message,
                    code: connectionError.code,
                    details: connectionError.details,
                    envCheck: {
                        hasEnvUrl: !!process.env.SUPABASE_URL,
                        hasEnvKey: !!process.env.SUPABASE_KEY
                    }
                });
                throw connectionError;
            }
            elizaLogger.debug("Basic connection test passed", {
                hasData: !!_data,
                dataLength: _data?.length
            });

            // Validate vector setup - this should fail fast without retries
            elizaLogger.debug("Starting vector setup validation...");
            try {
                elizaLogger.debug("Checking embedding dimension...");
                const { data: dimensionData, error: dimensionError } = await this.supabase
                    .rpc('get_embedding_dimension');

                if (dimensionError) {
                    elizaLogger.error("Failed to get embedding dimension:", {
                        error: dimensionError.message,
                        code: dimensionError.code,
                        details: dimensionError.details,
                        hint: dimensionError.hint
                    });
                    throw new Error("Vector setup validation failed");
                }

                elizaLogger.debug("Got embedding dimension response:", { dimensionData });

                if (!dimensionData || typeof dimensionData !== 'number' || isNaN(dimensionData) || dimensionData <= 0) {
                    elizaLogger.error("Invalid embedding dimension returned:", {
                        dimension: dimensionData,
                        type: typeof dimensionData,
                        isNumber: typeof dimensionData === 'number',
                        isNaN: isNaN(dimensionData),
                        isPositive: dimensionData > 0
                    });
                    throw new Error("Vector setup validation failed");
                }

                elizaLogger.debug("Valid embedding dimension confirmed:", { dimension: dimensionData });

                // Verify vector extension functionality with a test query
                elizaLogger.debug("Testing vector search functionality...");
                const testEmbedding = Array(dimensionData).fill(0);
                const { error: searchError } = await this.supabase.rpc("search_memories", {
                    query_table_name: 'memories',
                    query_room_id: '00000000-0000-4000-8000-000000000000',
                    query_embedding: testEmbedding,
                    query_match_threshold: 0.0,
                    query_match_count: 1,
                    query_unique: false
                });

                if (searchError) {
                    elizaLogger.error("Vector search functionality test failed:", {
                        error: searchError.message,
                        code: searchError.code,
                        details: searchError.details,
                        hint: searchError.hint
                    });
                    throw new Error("Vector setup validation failed");
                }

                elizaLogger.debug("Vector search functionality test passed");
            } catch (error) {
                elizaLogger.error("Vector setup validation failed", {
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                });
                // Important: Rethrow with the expected error message
                throw new Error("Vector setup validation failed");
            }

            elizaLogger.success("Supabase adapter initialized successfully");
        } catch (error) {
            elizaLogger.error("Initialization failed", {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                type: error instanceof Error ? error.constructor.name : typeof error
            });
            // Important: Rethrow to ensure initialization fails
            throw error;
        }
    }

    async close() {
        // noop
    }

    async getMemoriesByRoomIds(params: { agentId: UUID; roomIds: UUID[]; tableName: string }): Promise<Memory[]> {
        elizaLogger.info('Getting memories by room IDs...', {
            roomIds: params.roomIds,
            type: params.tableName,  // Using tableName as the type
            agentId: params.agentId
        });

        return await this.withErrorHandling('getMemoriesByRoomIds', async () => {
            const { data, error } = await this.supabase
                .from('memories')  // Always query the memories table
                .select('*')
                .in('roomId', params.roomIds)
                .eq('type', params.tableName);  // Use tableName as type filter

            if (error) {
                elizaLogger.error('Failed to get memories', {
                    error: error.message,
                    type: params.tableName,
                    roomCount: params.roomIds.length
                });
                throw new Error(`Error getting memories: ${error.message}`);
            }

            elizaLogger.success('Memories retrieved successfully', {
                count: data.length,
                type: params.tableName,
                roomCount: params.roomIds.length
            });

            return data.map(memory => ({
                ...memory,
                content: typeof memory.content === 'string'
                    ? JSON.parse(memory.content)
                    : memory.content
            }));
        });
    }

    async getAccountById(userId: UUID): Promise<Account | null> {
        elizaLogger.info('Getting account by ID...', { userId });
        const { data, error } = await this.supabase
            .from("accounts")
            .select("*")
            .eq("id", userId);
        if (error) {
            elizaLogger.error('Failed to get account:', { error: error.message });
            throw new Error(error.message);
        }
        elizaLogger.success('Account retrieved successfully');
        return (data?.[0] as Account) || null;
    }

    async createAccount(account: Account): Promise<boolean> {
        elizaLogger.info('Creating account...', { accountId: account.id });
        return await this.withErrorHandling('createAccount', async () => {
            const { error } = await this.supabase
                .from('accounts')
                .insert(account);

            if (error) {
                throw new Error(`Error creating account: ${error.message}`);
            }

            elizaLogger.success('Account created successfully');
            return true;
        });
    }

    async getActorDetails(params: { roomId: UUID }): Promise<Actor[]> {
        elizaLogger.info('Getting actor details...', { roomId: params.roomId });
        return await this.withErrorHandling('getActorDetails', async () => {
            interface ParticipantRow {
                account: {
                    id: UUID;
                    name: string;
                    username: string;
                    details: string | Record<string, unknown>;
                }
            }

            const { data, error } = await this.supabase
                .from('participants')
                .select(`
                    account:accounts!participants_userId_fkey (
                        id,
                        name,
                        username,
                        details
                    )
                `)
                .eq('roomId', params.roomId);

            if (error) {
                throw new Error(`Error getting actor details: ${error.message}`);
            }

            const actors = (data as unknown as ParticipantRow[]).map(participant => {
                let details;
                try {
                    details = typeof participant.account.details === 'string'
                        ? JSON.parse(participant.account.details)
                        : participant.account.details;
                } catch (error) {
                    elizaLogger.warn('Failed to parse actor details:', {
                        actorId: participant.account.id,
                        error: error instanceof Error ? error.message : String(error)
                    });
                    details = {
                        tagline: '',
                        summary: '',
                        quote: ''
                    };
                }

                return {
                    id: participant.account.id,
                    name: participant.account.name,
                    username: participant.account.username,
                    details: {
                        tagline: details?.tagline || '',
                        summary: details?.summary || '',
                        quote: details?.quote || ''
                    }
                } as Actor;
            });

            elizaLogger.success('Actor details retrieved successfully', { count: actors.length });
            return actors;
        });
    }

    async searchMemories(params: {
        tableName: string;  // This will be used as type
        agentId: UUID;
        roomId: UUID;
        embedding: number[];
        match_threshold: number;
        match_count: number;
        unique: boolean;
    }): Promise<Array<Memory & { similarity: number }>> {
        const startTime = performance.now();
        elizaLogger.info('Searching memories...', {
            type: params.tableName,
            roomId: params.roomId,
            matchCount: params.match_count,
            threshold: params.match_threshold,
            embeddingSize: params.embedding.length
        });

        const rpcParams = {
            query_table_name: 'memories',  // Always use memories table
            query_room_id: params.roomId,
            query_embedding: params.embedding,
            query_match_threshold: params.match_threshold,
            query_match_count: params.match_count,
            query_unique: params.unique,
            query_type: params.tableName  // Add type as a parameter
        };
        elizaLogger.info('RPC parameters:', rpcParams);


        // Now perform the search
        const result = await this.supabase.rpc("search_memories", rpcParams);

        if (result.error) {
            elizaLogger.error('Failed to search memories:', {
                error: result.error,
                code: result.error.code,
                message: result.error.message,
                details: result.error.details,
                hint: result.error.hint
            });
            throw result.error;
        }

        elizaLogger.info('Raw RPC results:', {
            count: result.data?.length ?? 0,
            firstResult: result.data?.[0] ? {
                id: result.data[0].id,
                similarity: result.data[0].similarity,
                content: result.data[0].content,
                type: result.data[0].type,
                roomId: result.data[0].roomId,
                agentId: result.data[0].agentId,
                userId: result.data[0].userId,
                unique: result.data[0].unique,
                createdAt: result.data[0].createdAt
            } : null
        });

        const memories = result.data.map((memory) => ({
            ...memory,
            content: typeof memory.content === 'string'
                ? JSON.parse(memory.content)
                : memory.content
        }));

        const duration = performance.now() - startTime;
        elizaLogger.info('Search completed', { duration: `${duration.toFixed(2)}ms` });
        return memories;
    }

    async getCachedEmbeddings(params: {
        query_table_name: string;
        query_threshold: number;
        query_input: string;
        query_field_name: string;
        query_field_sub_name: string;
        query_match_count: number;
    }): Promise<Array<{ embedding: number[]; levenshtein_score: number }>> {
        elizaLogger.info('Getting cached embeddings...', {
            tableName: params.query_table_name,
            input: params.query_input,
            threshold: params.query_threshold
        });

        const result = await this.supabase.rpc("get_embedding_list", {
            query_table_name: 'memories',  // Always use memories table
            query_threshold: params.query_threshold,
            query_input: params.query_input,
            query_field_name: params.query_field_name,
            query_field_sub_name: params.query_field_sub_name,
            query_match_count: params.query_match_count
        });

        if (result.error) {
            elizaLogger.error('Failed to get cached embeddings:', { error: result.error });
            throw new Error(JSON.stringify(result.error));
        }

        elizaLogger.success('Cached embeddings retrieved', { count: result.data.length });
        return result.data;
    }

    async updateGoalStatus(params: {
        goalId: UUID;
        status: GoalStatus;
    }): Promise<void> {
        elizaLogger.info('Updating goal status...', {
            goalId: params.goalId,
            status: params.status
        });

        const { data: _data, error } = await this.supabase
            .from("goals")
            .update({ status: params.status })
            .match({ id: params.goalId });

        if (error) {
            elizaLogger.error('Failed to update goal status:', { error });
            throw error;
        }
        elizaLogger.success('Goal status updated successfully');
    }

    async log(params: {
        body: Record<string, unknown>;
        userId: UUID;
        roomId: UUID;
        type: string;
    }): Promise<void> {
        elizaLogger.info('Logging event...', {
            type: params.type,
            userId: params.userId,
            roomId: params.roomId
        });

        const { error } = await this.supabase.from("logs").insert({
            body: params.body,
            userId: params.userId,
            roomId: params.roomId,
            type: params.type,
        });

        if (error) {
            elizaLogger.error('Failed to insert log:', { error: error.message });
            throw new Error(error.message);
        }
        elizaLogger.success('Event logged successfully');
    }

    async getMemories(params: {
        roomId: UUID;
        count?: number;
        unique?: boolean;
        tableName: string;
        agentId?: UUID;
        start?: number;
        end?: number;
    }): Promise<Memory[]> {
        elizaLogger.debug('Getting memories', {
            roomId: params.roomId,
            type: params.tableName,
            filters: {
                unique: params.unique,
                agentId: params.agentId,
                start: params.start,
                end: params.end,
                count: params.count
            }
        });

        const query = this.supabase
            .from('memories')
            .select("*")
            .eq("roomId", params.roomId)
            .eq("type", params.tableName);

        // Convert timestamp numbers to ISO strings for Postgres
        if (params.start) {
            const startDate = new Date(params.start);
            if (isNaN(startDate.getTime())) {
                elizaLogger.warn('Invalid start date', { start: params.start });
            } else {
                query.gte("createdAt", startDate.toISOString());
            }
        }

        if (params.end) {
            const endDate = new Date(params.end);
            if (isNaN(endDate.getTime())) {
                elizaLogger.warn('Invalid end date', { end: params.end });
            } else {
                query.lte("createdAt", endDate.toISOString());
            }
        }

        if (params.unique) {
            query.eq("unique", true);
        }

        if (params.agentId) {
            query.eq("agentId", params.agentId);
        }

        query.order("createdAt", { ascending: false });

        if (params.count) {
            query.limit(params.count);
        }

        const { data, error } = await query;

        if (error) {
            elizaLogger.error('Failed to get memories', {
                error: error.message,
                code: error.code,
                type: params.tableName
            });
            throw new Error(`Error retrieving memories: ${error.message}`);
        }

        elizaLogger.debug('Memories retrieved', {
            count: data?.length,
            roomId: params.roomId,
            type: params.tableName
        });

        return (data || []).map(memory => ({
            ...memory,
            content: typeof memory.content === 'string'
                ? JSON.parse(memory.content)
                : memory.content
        }));
    }

    async getParticipantUserState(roomId: UUID, userId: UUID): Promise<ParticipantState> {
        elizaLogger.info('Getting participant user state...', { roomId, userId });
        return await this.withErrorHandling('getParticipantUserState', async () => {
            const { data, error } = await this.supabase
                .from('participants')
                .select('userState')
                .eq('roomId', roomId)
                .eq('userId', userId)
                .maybeSingle();  // Use maybeSingle instead of single

            if (error) {
                if (error.message.includes('not found')) {
                    elizaLogger.debug('No participant state found', { roomId, userId });
                    return null;
                }
                elizaLogger.error('Failed to get participant state', {
                    error: error.message,
                    roomId,
                    userId
                });
                throw new Error(`Error getting participant state: ${error.message}`);
            }

            elizaLogger.success('Participant user state retrieved', {
                state: data?.userState,
                roomId,
                userId
            });
            return data?.userState || null;
        });
    }

    async searchMemoriesByEmbedding(
        embedding: number[],
        params: {
            match_threshold?: number;
            count?: number;
            roomId?: UUID;
            agentId?: UUID;
            unique?: boolean;
            tableName: string;
        }
    ): Promise<Memory[]> {
        elizaLogger.debug('Searching memories by embedding', {
            tableName: params.tableName,
            filters: {
                roomId: params.roomId,
                agentId: params.agentId,
                threshold: params.match_threshold,
                count: params.count,
                unique: params.unique
            }
        });

        const queryParams: SearchMemoriesQueryParams = {
            query_table_name: params.tableName,
            query_roomId: params.roomId,
            query_embedding: embedding,
            query_match_threshold: params.match_threshold,
            query_match_count: params.count,
            query_unique: !!params.unique,
        };
        if (params.agentId) {
            queryParams.query_agentId = params.agentId;
        }

        const result = await this.supabase.rpc("search_memories", queryParams);
        if (result.error) {
            elizaLogger.error('Failed to search memories', {
                error: result.error.message,
                code: result.error.code
            });
            throw new Error(JSON.stringify(result.error));
        }

        elizaLogger.debug('Memory search completed', {
            matchesFound: result.data?.length
        });

        return result.data.map((memory) => ({
            ...memory,
        }));
    }

    async getMemoryById(id: UUID): Promise<Memory | null> {
        elizaLogger.debug('Getting memory by ID - Validation', {
            id,
            idType: typeof id,
            idLength: id.length
        });

        // Validate UUID format
        const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        if (!uuidPattern.test(id)) {
            elizaLogger.warn('Memory retrieval - UUID format issue', {
                id,
                length: id.length,
                matches: id.match(/-/g)?.length || 0
            });

            // Try to clean/fix the UUID
            const cleanedUuid = id.toLowerCase().replace(/[^0-9a-f-]/g, '');
            if (uuidPattern.test(cleanedUuid)) {
                elizaLogger.info('UUID cleaned and valid', {
                    original: id,
                    cleaned: cleanedUuid
                });
                id = cleanedUuid as UUID;
            } else {
                throw new Error('Invalid UUID format');
            }
        }

        return await this.withErrorHandling('getMemoryById', async () => {
            try {
                const { data, error } = await this.supabase
                    .from('memories')
                    .select('*')
                    .eq('id', id);

                if (error) {
                    elizaLogger.error('Failed to get memory', {
                        id,
                        error: error.message,
                        code: error.code
                    });
                    throw new Error(`Error retrieving memory: ${error.message}`);
                }

                if (!data || data.length === 0) {
                    elizaLogger.debug('Memory not found', { id });
                    return null;
                }

                if (data.length > 1) {
                    elizaLogger.error('Multiple memories found with same ID', {
                        id,
                        count: data.length
                    });
                    throw new Error('Multiple memories found with same ID');
                }

                const memory = data[0];
                elizaLogger.debug('Memory retrieved', {
                    id,
                    hasContent: !!memory.content,
                    hasEmbedding: !!memory.embedding
                });

                return {
                    ...memory,
                    content: typeof memory.content === 'string' ? JSON.parse(memory.content) : memory.content
                };
            } catch (error) {
                // If it's an invalid UUID format error, let it propagate
                if (error instanceof Error && error.message === 'Invalid UUID format') {
                    throw error;
                }
                elizaLogger.error('Unexpected error during memory retrieval', {
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                });
                throw error;
            }
        });
    }

    async createMemory(memory: Memory, tableName: string, unique = false): Promise<void> {
        // First check connection and environment
        elizaLogger.info('=== Memory Creation Started ===');
        elizaLogger.info('Connection Check', {
            env: {
                SUPABASE_URL: process.env.SUPABASE_URL ? 'present' : 'missing',
                SUPABASE_KEY: process.env.SUPABASE_KEY ? 'present' : 'missing',
                URL_LENGTH: process.env.SUPABASE_URL?.length,
                KEY_LENGTH: process.env.SUPABASE_KEY?.length
            }
        });

        // Check if we can list tables
        try {
            const { data: tableList, error: tableError } = await this.supabase
                .from('memories')  // Try to directly access memories table
                .select('id')
                .limit(1);

            elizaLogger.info('Table access check', {
                success: !tableError,
                error: tableError?.message,
                hasAccess: !!tableList,
                table: 'memories'
            });
        } catch (e) {
            elizaLogger.error('Failed to check table access', {
                error: e instanceof Error ? e.message : String(e),
                table: 'memories'
            });
        }

        // Original validation starts here
        elizaLogger.debug('Creating memory - Initial validation', {
            memoryId: memory.id,
            tableName,
            unique,
            hasContent: !!memory.content,
            hasEmbedding: !!memory.embedding,
            contentType: typeof memory.content,
            embeddingLength: memory.embedding?.length,
            contentStructure: {
                isObject: typeof memory.content === 'object',
                isNull: memory.content === null,
                keys: memory.content ? Object.keys(memory.content) : []
            }
        });

        // Validate required fields
        if (!memory.id || !memory.userId || !memory.roomId || !memory.content) {
            const missingFields = [];
            if (!memory.id) missingFields.push('id');
            if (!memory.userId) missingFields.push('userId');
            if (!memory.roomId) missingFields.push('roomId');
            if (!memory.content) missingFields.push('content');

            elizaLogger.error('Memory validation failed - Missing fields', {
                memoryId: memory.id,
                missingFields,
                providedFields: Object.keys(memory)
            });
            throw new Error('Missing required memory fields');
        }

        // Validate content structure
        if (typeof memory.content !== 'object' || memory.content === null) {
            elizaLogger.error('Memory validation failed - Invalid content structure', {
                memoryId: memory.id,
                contentType: typeof memory.content,
                isNull: memory.content === null,
                content: memory.content
            });
            throw new Error('Invalid memory content structure');
        }

        // Validate UUID formats
        const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        const uuidFields = {
            id: memory.id,
            userId: memory.userId,
            roomId: memory.roomId,
            agentId: memory.agentId
        };

        elizaLogger.debug('Validating UUID fields', {
            memoryId: memory.id,
            uuidFields: Object.entries(uuidFields).map(([key, value]) => ({
                field: key,
                value: value,
                isValid: value ? uuidPattern.test(value) : true,
                length: value?.length
            }))
        });

        for (const [field, value] of Object.entries(uuidFields)) {
            if (value && !uuidPattern.test(value)) {
                elizaLogger.warn('Memory validation - UUID format issue', {
                    field,
                    value,
                    pattern: uuidPattern.source,
                    length: value.length,
                    matches: value.match(/-/g)?.length || 0
                });

                // Try to clean/fix the UUID if possible
                const cleanedUuid = value.toLowerCase().replace(/[^0-9a-f-]/g, '');
                if (uuidPattern.test(cleanedUuid)) {
                    elizaLogger.info('UUID cleaned and valid', {
                        field,
                        original: value,
                        cleaned: cleanedUuid
                    });
                    // Update the field with cleaned UUID
                    switch(field) {
                        case 'id': memory.id = cleanedUuid as UUID; break;
                        case 'userId': memory.userId = cleanedUuid as UUID; break;
                        case 'roomId': memory.roomId = cleanedUuid as UUID; break;
                        case 'agentId': memory.agentId = cleanedUuid as UUID; break;
                    }
                } else {
                    throw new Error(`Invalid UUID format for ${field}`);
                }
            }
        }

        // Validate embedding dimension if present
        if (memory.embedding) {
            try {
                elizaLogger.debug('Starting embedding validation and cleanup', {
                    memoryId: memory.id,
                    originalEmbedding: {
                        length: memory.embedding.length,
                        sample: memory.embedding.slice(0, 5),
                        hasNulls: memory.embedding.some(n => n === null),
                        hasUndefined: memory.embedding.some(n => n === undefined),
                        hasNaN: memory.embedding.some(isNaN),
                        allNaN: memory.embedding.every(isNaN),
                        hasInfinity: memory.embedding.some(x => !isFinite(x))
                    }
                });

                // First check if all values are invalid
                if (memory.embedding.every(isNaN)) {
                    elizaLogger.error('Memory validation failed - All embedding values are invalid', {
                        memoryId: memory.id,
                        sample: memory.embedding.slice(0, 5)
                    });
                    throw new Error('Invalid embedding values');
                }

                // Clean vector like PG version - convert invalid values to 0
                memory.embedding = memory.embedding.map(n => {
                    if (!Number.isFinite(n) || n === null || n === undefined) {
                        return 0;
                    }
                    // Limit precision to avoid floating point issues
                    return Number(n.toFixed(6));
                });

                elizaLogger.debug('Cleaned embedding vector', {
                    memoryId: memory.id,
                    cleanedEmbedding: {
                        length: memory.embedding.length,
                        sample: memory.embedding.slice(0, 5),
                        stats: {
                            min: Math.min(...memory.embedding),
                            max: Math.max(...memory.embedding)
                        }
                    }
                });

                const { data: dimensionData, error: dimensionError } = await this.supabase
                    .rpc('get_embedding_dimension');

                if (dimensionError) {
                    elizaLogger.error('Failed to get embedding dimension', {
                        error: dimensionError.message,
                        code: dimensionError.code
                    });
                    throw new Error(`Error getting embedding dimension: ${dimensionError.message}`);
                }

                const expectedDimension = dimensionData as number;
                elizaLogger.info('Validating embedding dimension', {
                    expected: expectedDimension,
                    actual: memory.embedding.length,
                    memoryId: memory.id
                });

                if (memory.embedding.length !== expectedDimension) {
                    elizaLogger.error('Invalid embedding dimension', {
                        expected: expectedDimension,
                        actual: memory.embedding.length,
                        memoryId: memory.id
                    });
                    throw new Error(`expected ${expectedDimension} dimensions`);
                }
            } catch (error) {
                elizaLogger.error('Embedding validation failed', {
                    error: error instanceof Error ? error.message : String(error),
                    memoryId: memory.id
                });
                throw error;
            }
        }

        return await this.withErrorHandling('createMemory', async () => {
            try {
                elizaLogger.debug('Preparing database insert', {
                    table: tableName,
                    id: memory.id,
                    contentSize: JSON.stringify(memory.content).length,
                    hasEmbedding: !!memory.embedding,
                    type: tableName,
                    unique
                });

                // Check for uniqueness if required and if we have an embedding
                if (unique && memory.embedding) {
                    elizaLogger.debug('Checking memory uniqueness', {
                        memoryId: memory.id,
                        roomId: memory.roomId,
                        hasEmbedding: !!memory.embedding
                    });

                    const similarMemories = await this.searchMemories({
                        tableName,
                        agentId: memory.agentId,
                        roomId: memory.roomId,
                        embedding: memory.embedding,
                        match_threshold: 0.95,
                        match_count: 1,
                        unique: true
                    });

                    if (similarMemories.length > 0) {
                        elizaLogger.warn('Similar memory already exists', {
                            newMemoryId: memory.id,
                            existingMemoryId: similarMemories[0].id,
                            similarity: (similarMemories[0] as any).similarity
                        });
                        throw new Error('Similar memory already exists');
                    }
                }

                const insertData = {
                    id: memory.id,
                    userId: memory.userId,
                    agentId: memory.agentId,
                    roomId: memory.roomId,
                    content: JSON.stringify(memory.content),
                    embedding: memory.embedding,
                    unique: unique,
                    type: tableName
                };

                elizaLogger.debug('Database insert payload prepared', {
                    memoryId: memory.id,
                    payloadKeys: Object.keys(insertData),
                    contentLength: insertData.content.length,
                    hasEmbedding: !!insertData.embedding,
                    contentSample: insertData.content.slice(0, 100),
                    embeddingSample: memory.embedding ? memory.embedding.slice(0, 5) : null,
                    uuids: {
                        id: insertData.id,
                        userId: insertData.userId,
                        agentId: insertData.agentId,
                        roomId: insertData.roomId
                    }
                });

                elizaLogger.info('Attempting insert with PostgreSQL pattern', {
                    operation: 'insert',
                    table: 'memories',
                    type: tableName,
                    timestamp: new Date().toISOString()
                });

                // Try to get table info before insert
                const { data: tableInfo, error: tableInfoError } = await this.supabase
                    .from('memories')  // Always query memories table
                    .select('id')
                    .limit(1);

                elizaLogger.info('Pre-insert table check', {
                    canRead: !tableInfoError,
                    error: tableInfoError?.message,
                    tableExists: !!tableInfo,
                    table: 'memories'
                });

                const result = await this.supabase
                    .from('memories')  // Always insert into memories table
                    .insert(insertData);

                elizaLogger.debug('Raw Supabase response', {
                    hasError: !!result.error,
                    errorCode: result.error?.code,
                    errorMessage: result.error?.message,
                    errorDetails: result.error?.details,
                    status: result.status,
                    statusText: result.statusText,
                    data: result.data ? 'present' : 'null',
                    table: 'memories',
                    type: tableName,
                    requestUrl: result.error?.details || 'no url in error'
                });

                if (result.error) {
                    elizaLogger.error('Memory creation failed', {
                        error: result.error.message || 'No error message',
                        code: result.error.code || 'No error code',
                        details: result.error.details || 'No details',
                        hint: result.error.hint || 'No hint',
                        memoryId: memory.id,
                        status: result.status,
                        statusText: result.statusText
                    });
                    throw new Error(`Error creating memory: ${result.error.message || result.statusText || 'Unknown error'}`);
                }

                elizaLogger.debug('Memory created successfully', {
                    id: memory.id,
                    table: tableName,
                    timestamp: new Date().toISOString(),
                    status: result.status
                });
            } catch (error) {
                elizaLogger.error('Unexpected error during memory creation', {
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    memoryId: memory.id,
                    context: 'database_insert'
                });
                throw error;
            }
        });
    }

    async removeMemory(memoryId: UUID, tableName: string): Promise<void> {
        elizaLogger.debug('Removing memory', { memoryId, tableName });

        return await this.withErrorHandling('removeMemory', async () => {
            const { error } = await this.supabase
                .from(tableName)
                .delete()
                .eq('id', memoryId);

            if (error) {
                elizaLogger.error('Failed to remove memory', {
                    error: error.message,
                    code: error.code
                });
                throw new Error(`Error removing memory: ${error.message}`);
            }

            elizaLogger.debug('Memory removed successfully', { memoryId });
        });
    }

    async removeAllMemories(roomId: UUID, tableName: string): Promise<void> {
        elizaLogger.debug('Removing all memories', { roomId, tableName });

        return await this.withErrorHandling('removeAllMemories', async () => {
            const { error } = await this.supabase.rpc("remove_memories", {
                query_roomid: roomId,
                query_table_name: tableName
            });

            if (error) {
                elizaLogger.error('Failed to remove all memories', {
                    error: error.message,
                    code: error.code
                });
                throw new Error(`Error removing all memories: ${error.message}`);
            }

            elizaLogger.debug('All memories removed successfully', { roomId });
        });
    }

    async countMemories(roomId: UUID, _unique = false, tableName?: string): Promise<number> {
        elizaLogger.debug('Counting memories', {
            roomId,
            tableName: tableName || 'memories',
            unique: _unique
        });

        return await this.withErrorHandling('countMemories', async () => {
            const { count, error } = await this.supabase
                .from(tableName || 'memories')
                .select('*', { count: 'exact', head: true })
                .eq('roomId', roomId);

            if (error) {
                elizaLogger.error('Failed to count memories', {
                    error: error.message,
                    code: error.code
                });
                throw new Error(`Error counting memories: ${error.message}`);
            }

            elizaLogger.debug('Memories counted', {
                roomId,
                count: count || 0
            });

            return count || 0;
        });
    }

    async getGoals(params: { agentId: UUID; roomId: UUID; userId?: UUID; onlyInProgress?: boolean; count?: number }): Promise<Goal[]> {
        elizaLogger.info('Getting goals...', params);
        return await this.withErrorHandling('getGoals', async () => {
            const { data, error } = await this.supabase.rpc("get_goals", {
                query_roomid: params.roomId,
                query_userid: params.userId,
                only_in_progress: params.onlyInProgress ?? true,
                row_count: params.count ?? 5
            });

            if (error) {
                throw new Error(`Error getting goals: ${error.message}`);
            }

            elizaLogger.success('Goals retrieved successfully', { count: data.length });
            return data;
        });
    }

    async updateGoal(goal: Goal): Promise<void> {
        const { error } = await this.supabase
            .from("goals")
            .update(goal)
            .match({ id: goal.id });
        if (error) {
            throw new Error(`Error creating goal: ${error.message}`);
        }
    }

    async createGoal(goal: Goal): Promise<void> {
        const { error } = await this.supabase.from("goals").insert(goal);
        if (error) {
            throw new Error(`Error creating goal: ${error.message}`);
        }
    }

    async removeGoal(goalId: UUID): Promise<void> {
        const { error } = await this.supabase
            .from("goals")
            .delete()
            .eq("id", goalId);
        if (error) {
            throw new Error(`Error removing goal: ${error.message}`);
        }
    }

    async removeAllGoals(roomId: UUID): Promise<void> {
        const { error } = await this.supabase
            .from("goals")
            .delete()
            .eq("roomId", roomId);
        if (error) {
            throw new Error(`Error removing goals: ${error.message}`);
        }
    }

    async getRoomsForParticipant(userId: UUID): Promise<UUID[]> {
        const { data, error } = await this.supabase
            .from("participants")
            .select("roomId")
            .eq("userId", userId);

        if (error) {
            throw new Error(
                `Error getting rooms by participant: ${error.message}`
            );
        }

        return data.map((row) => row.roomId as UUID);
    }

    async getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]> {
        const { data, error } = await this.supabase
            .from("participants")
            .select("roomId")
            .in("userId", userIds);

        if (error) {
            throw new Error(
                `Error getting rooms by participants: ${error.message}`
            );
        }

        return [...new Set(data.map((row) => row.roomId as UUID))] as UUID[];
    }

    async getCache(keyOrParams: string | { key: string, agentId: string }, agentId?: string): Promise<any> {
        // Determine key and agentId based on parameter type
        let finalKey: string;
        let finalAgentId: string;

        if (typeof keyOrParams === 'object' && keyOrParams !== null) {
            finalKey = keyOrParams.key;
            finalAgentId = keyOrParams.agentId;
            elizaLogger.debug('Using object parameter format', {
                providedKey: finalKey,
                providedAgentId: finalAgentId
            });
        } else {
            finalKey = keyOrParams as string;
            finalAgentId = agentId;
            elizaLogger.debug('Using split parameter format', {
                providedKey: finalKey,
                providedAgentId: finalAgentId
            });
        }

        // Validate parameters
        if (typeof finalKey !== 'string' || typeof finalAgentId !== 'string') {
            elizaLogger.error('Invalid parameters for getCache after parsing', {
                keyType: typeof finalKey,
                agentIdType: typeof finalAgentId,
                finalKey,
                finalAgentId
            });
            throw new Error('Invalid parameters: Unable to extract valid key and agentId');
        }

        elizaLogger.info('Getting cache value...', { key: finalKey, agentId: finalAgentId });

        return await this.withErrorHandling('getCache', async () => {
            const { data, error } = await this.supabase
                .from('cache')
                .select('value')
                .eq('key', finalKey)
                .eq('agentId', finalAgentId)
                .maybeSingle();

            if (error) {
                elizaLogger.error('Failed to get cache value', {
                    error: error.message,
                    key: finalKey,
                    agentId: finalAgentId
                });
                throw new Error(`Error getting cache value: ${error.message}`);
            }

            if (!data) {
                elizaLogger.debug('Cache miss', { key: finalKey, agentId: finalAgentId });
                return null;
            }

            elizaLogger.debug('Cache hit', { key: finalKey, agentId: finalAgentId });
            return data.value;
        });
    }

    async setCache(
        keyOrParams: string | { key: string, agentId: string, value: any },
        agentIdOrValue?: string | any,
        value?: any,
        ttl?: number
    ): Promise<void> {
        // Determine parameters based on input format
        let finalKey: string;
        let finalAgentId: string;
        let finalValue: any;
        let finalTtl: number | undefined = ttl;

        if (typeof keyOrParams === 'object' && keyOrParams !== null) {
            finalKey = keyOrParams.key;
            finalAgentId = keyOrParams.agentId;
            finalValue = keyOrParams.value;
            elizaLogger.debug('Using object parameter format for setCache', {
                providedKey: finalKey,
                providedAgentId: finalAgentId
            });
        } else {
            finalKey = keyOrParams as string;
            finalAgentId = agentIdOrValue as string;
            finalValue = value;
            elizaLogger.debug('Using split parameter format for setCache', {
                providedKey: finalKey,
                providedAgentId: finalAgentId
            });
        }

        // Validate parameters
        if (typeof finalKey !== 'string' || typeof finalAgentId !== 'string') {
            elizaLogger.error('Invalid parameters for setCache after parsing', {
                keyType: typeof finalKey,
                agentIdType: typeof finalAgentId,
                finalKey,
                finalAgentId
            });
            throw new Error('Invalid parameters: Unable to extract valid key and agentId');
        }

        elizaLogger.info('Setting cache value...', {
            key: finalKey,
            agentId: finalAgentId,
            ttl: finalTtl
        });

        return await this.withErrorHandling('setCache', async () => {
            const expiresAt = finalTtl ? new Date(Date.now() + finalTtl * 1000) : null;

            const { error } = await this.supabase
                .from('cache')
                .upsert({
                    key: finalKey,
                    agentId: finalAgentId,
                    value: finalValue,
                    expiresAt: expiresAt
                }, {
                    onConflict: 'key, agentId'
                });

            if (error) {
                elizaLogger.error('Failed to set cache value', {
                    error: error.message,
                    key: finalKey,
                    agentId: finalAgentId
                });
                throw new Error(`Error setting cache value: ${error.message}`);
            }

            elizaLogger.debug('Cache value set successfully', {
                key: finalKey,
                agentId: finalAgentId
            });
        });
    }

    async deleteCache(keyOrParams: string | { key: string, agentId: string }, agentId?: string): Promise<void> {
        // Determine parameters based on input format
        let finalKey: string;
        let finalAgentId: string;

        if (typeof keyOrParams === 'object' && keyOrParams !== null) {
            finalKey = keyOrParams.key;
            finalAgentId = keyOrParams.agentId;
        } else {
            finalKey = keyOrParams as string;
            finalAgentId = agentId;
        }

        // Validate parameters
        if (typeof finalKey !== 'string' || typeof finalAgentId !== 'string') {
            elizaLogger.error('Invalid parameters for deleteCache after parsing', {
                keyType: typeof finalKey,
                agentIdType: typeof finalAgentId,
                finalKey,
                finalAgentId
            });
            throw new Error('Invalid parameters: Unable to extract valid key and agentId');
        }

        elizaLogger.info('Deleting cache value...', { key: finalKey, agentId: finalAgentId });

        return await this.withErrorHandling('deleteCache', async () => {
            const { error } = await this.supabase
                .from('cache')
                .delete()
                .eq('key', finalKey)
                .eq('agentId', finalAgentId);

            if (error) {
                elizaLogger.error('Failed to delete cache value', {
                    error: error.message,
                    key: finalKey,
                    agentId: finalAgentId
                });
                throw new Error(`Error deleting cache value: ${error.message}`);
            }

            elizaLogger.debug('Cache value deleted successfully', {
                key: finalKey,
                agentId: finalAgentId
            });
        });
    }

    async createRoom(roomId: UUID): Promise<UUID> {
        const { data, error } = await this.supabase.rpc("create_room", {
            room_id: roomId
        });

        if (error) {
            throw new Error(`Error creating room: ${error.message}`);
        }

        return data;
    }

    async removeRoom(roomId: UUID): Promise<void> {
        const { error } = await this.supabase
            .from("rooms")
            .delete()
            .eq("id", roomId);

        if (error) {
            throw new Error(`Error removing room: ${error.message}`);
        }
    }

    async addParticipant(userId: UUID, roomId: UUID): Promise<boolean> {
        const { error } = await this.supabase
            .from("participants")
            .insert({
                id: uuid() as UUID,
                userId: userId,
                roomId: roomId
            });

        if (error) {
            console.error(`Error adding participant: ${error.message}`);
            return false;
        }
        return true;
    }

    async removeParticipant(userId: UUID, roomId: UUID): Promise<boolean> {
        const { error } = await this.supabase
            .from("participants")
            .delete()
            .eq("userId", userId)
            .eq("roomId", roomId);

        if (error) {
            console.error(`Error removing participant: ${error.message}`);
            return false;
        }
        return true;
    }

    async createRelationship(params: {
        userA: UUID;
        userB: UUID;
    }): Promise<boolean> {
        const allRoomData = await this.getRoomsForParticipants([
            params.userA,
            params.userB,
        ]);

        let roomId: UUID;

        if (!allRoomData || allRoomData.length === 0) {
            // If no existing room is found, create a new room
            const { data: newRoomData, error: roomsError } = await this.supabase
                .from("rooms")
                .insert({})
                .single();

            if (roomsError) {
                throw new Error("Room creation error: " + roomsError.message);
            }

            roomId = (newRoomData as Room)?.id as UUID;
        } else {
            // If an existing room is found, use the first room's ID
            roomId = allRoomData[0];
        }

        const { error: participantsError } = await this.supabase
            .from("participants")
            .insert([
                { userId: params.userA, roomId },
                { userId: params.userB, roomId },
            ]);

        if (participantsError) {
            throw new Error(
                "Participants creation error: " + participantsError.message
            );
        }

        // Create or update the relationship between the two users
        const { error: relationshipError } = await this.supabase
            .from("relationships")
            .upsert({
                userA: params.userA,
                userB: params.userB,
                userId: params.userA,
                status: "FRIENDS",
            })
            .eq("userA", params.userA)
            .eq("userB", params.userB);

        if (relationshipError) {
            throw new Error(
                "Relationship creation error: " + relationshipError.message
            );
        }

        return true;
    }

    async getRelationship(params: {
        userA: UUID;
        userB: UUID;
    }): Promise<Relationship | null> {
        const { data, error } = await this.supabase.rpc("get_relationship", {
            usera: params.userA,
            userb: params.userB,
        });

        if (error) {
            throw new Error(error.message);
        }

        return data[0];
    }

    async getRelationships(params: { userId: UUID }): Promise<Relationship[]> {
        const { data, error } = await this.supabase
            .from("relationships")
            .select("*")
            .or(`userA.eq.${params.userId},userB.eq.${params.userId}`)
            .eq("status", "FRIENDS");

        if (error) {
            throw new Error(error.message);
        }

        return data as Relationship[];
    }

    async getCache(params: {
        key: string;
        agentId: UUID;
    }): Promise<string | undefined> {
        const { data, error } = await this.supabase
            .from('cache')
            .select('value')
            .eq('key', params.key)
            .eq('agentId', params.agentId)
            .single();

        if (error) {
            console.error('Error fetching cache:', error);
            return undefined;
        }

        return data?.value;
    }

    async setCache(params: {
        key: string;
        agentId: UUID;
        value: string;
    }): Promise<boolean> {
        const { error } = await this.supabase
            .from('cache')
            .upsert({
                key: params.key,
                agentId: params.agentId,
                value: params.value,
                createdAt: new Date()
            });

        if (error) {
            console.error('Error setting cache:', error);
            return false;
        }

        return true;
    }

    async deleteCache(params: {
        key: string;
        agentId: UUID;
    }): Promise<boolean> {
        try {
            const { error } = await this.supabase
                .from('cache')
                .delete()
                .eq('key', params.key)
                .eq('agentId', params.agentId);

            if (error) {
                elizaLogger.error("Error deleting cache", {
                    error: error.message,
                    key: params.key,
                    agentId: params.agentId,
                });
                return false;
            }
            return true;
        } catch (error) {
            elizaLogger.error(
                "Database connection error in deleteCache",
                error instanceof Error ? error.message : String(error)
            );
            return false;
        }
    }

    async getKnowledge(params: {
        id?: UUID;
        agentId: UUID;
        limit?: number;
        query?: string;
    }): Promise<RAGKnowledgeItem[]> {
        let query = this.supabase
            .from('knowledge')
            .select('*')
            .or(`agentId.eq.${params.agentId},isShared.eq.true`);

        if (params.id) {
            query = query.eq('id', params.id);
        }

        if (params.limit) {
            query = query.limit(params.limit);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Error getting knowledge: ${error.message}`);
        }

        return data.map(row => ({
            id: row.id,
            agentId: row.agentId,
            content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
            embedding: row.embedding ? new Float32Array(row.embedding) : undefined,
            createdAt: new Date(row.createdAt).getTime()
        }));
    }

    async searchKnowledge(params: {
        agentId: UUID;
        embedding: Float32Array;
        match_threshold: number;
        match_count: number;
        searchText?: string;
    }): Promise<RAGKnowledgeItem[]> {
        const cacheKey = `embedding_${params.agentId}_${params.searchText}`;
        const cachedResult = await this.getCache({
            key: cacheKey,
            agentId: params.agentId
        });

        if (cachedResult) {
            return JSON.parse(cachedResult);
        }

        // Convert Float32Array to array for Postgres vector
        const embedding = Array.from(params.embedding);

        const { data, error } = await this.supabase.rpc('search_knowledge', {
            query_embedding: embedding,
            query_agent_id: params.agentId,
            match_threshold: params.match_threshold,
            match_count: params.match_count,
            search_text: params.searchText || ''
        });

        if (error) {
            throw new Error(`Error searching knowledge: ${error.message}`);
        }

        const results = data.map(row => ({
            id: row.id,
            agentId: row.agentId,
            content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
            embedding: row.embedding ? new Float32Array(row.embedding) : undefined,
            createdAt: new Date(row.createdAt).getTime(),
            similarity: row.similarity
        }));

        await this.setCache({
            key: cacheKey,
            agentId: params.agentId,
            value: JSON.stringify(results)
        });

        return results;
    }

    async createKnowledge(knowledge: RAGKnowledgeItem): Promise<void> {
        try {
            const metadata = knowledge.content.metadata || {};

            const { error } = await this.supabase
                .from('knowledge')
                .insert({
                    id: knowledge.id,
                    agentId: metadata.isShared ? null : knowledge.agentId,
                    content: knowledge.content,
                    embedding: knowledge.embedding ? Array.from(knowledge.embedding) : null,
                    createdAt: knowledge.createdAt || new Date(),
                    isMain: metadata.isMain || false,
                    originalId: metadata.originalId || null,
                    chunkIndex: metadata.chunkIndex || null,
                    isShared: metadata.isShared || false
                });

            if (error) {
                if (metadata.isShared && error.code === '23505') { // Unique violation
                    elizaLogger.info(`Shared knowledge ${knowledge.id} already exists, skipping`);
                    return;
                }
                throw error;
            }
        } catch (error: any) {
            elizaLogger.error(`Error creating knowledge ${knowledge.id}:`, {
                error,
                embeddingLength: knowledge.embedding?.length,
                content: knowledge.content
            });
            throw error;
        }
    }

    async removeKnowledge(id: UUID): Promise<void> {
        const { error } = await this.supabase
            .from('knowledge')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Error removing knowledge: ${error.message}`);
        }
    }

    async clearKnowledge(agentId: UUID, shared?: boolean): Promise<void> {
        if (shared) {
            const { error } = await this.supabase
                .from('knowledge')
                .delete()
                .filter('agentId', 'eq', agentId)
                .filter('isShared', 'eq', true);

            if (error) {
                elizaLogger.error(`Error clearing shared knowledge for agent ${agentId}:`, error);
                throw error;
            }
        } else {
            const { error } = await this.supabase
                .from('knowledge')
                .delete()
                .eq('agentId', agentId);

            if (error) {
                elizaLogger.error(`Error clearing knowledge for agent ${agentId}:`, error);
                throw error;
            }
        }
    }
}