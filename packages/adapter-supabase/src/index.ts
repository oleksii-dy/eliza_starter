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
} from "@elizaos/core";
import { DatabaseAdapter } from "@elizaos/core";
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

    private async withErrorHandling<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
        try {
            return await this.withRetry(operation, operationName);
        } catch (error) {
            elizaLogger.error(`Error in ${operationName}:`, {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
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

    async getParticipantUserState(roomId: UUID, userId: UUID): Promise<ParticipantState> {
        elizaLogger.info('Getting participant user state...', { roomId, userId });
        return await this.withErrorHandling('getParticipantUserState', async () => {
            const { data, error } = await this.supabase
                .from('participants')
                .select('userState')
                .eq('roomId', roomId)
                .eq('userId', userId)
                .single();

            if (error) {
                throw new Error(`Error getting participant state: ${error.message}`);
            }

            elizaLogger.success('Participant user state retrieved', { state: data.userState });
            return data.userState;
        });
    }

    async setParticipantUserState(
        roomId: UUID,
        userId: UUID,
        state: "FOLLOWED" | "MUTED" | null
    ): Promise<void> {
        const { error } = await this.supabase
            .from("participants")
            .update({ userState: state })
            .eq("roomId", roomId)
            .eq("userId", userId);

        if (error) {
            console.error("Error setting participant user state:", error);
            throw new Error("Failed to set participant user state");
        }
    }

    async getParticipantsForRoom(roomId: UUID): Promise<UUID[]> {
        const { data, error } = await this.supabase
            .from("participants")
            .select("userId")
            .eq("roomId", roomId);

        if (error) {
            throw new Error(
                `Error getting participants for room: ${error.message}`
            );
        }

        return data.map((row) => row.userId as UUID);
    }

    supabase: SupabaseClient;

    constructor(supabaseUrl: string, supabaseKey: string) {
        super();
        elizaLogger.debug("Initializing Supabase adapter", {
            url: supabaseUrl.split("@")[1]
        });

        if (!supabaseUrl || !supabaseKey) {
            elizaLogger.error("Missing Supabase credentials");
            throw new Error("Supabase URL and Key must be provided");
        }

        try {
            this.supabase = createClient(supabaseUrl, supabaseKey);
            elizaLogger.debug("Supabase client created successfully");
        } catch (error) {
            elizaLogger.error("Failed to create Supabase client", {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    async init() {
        elizaLogger.info("Initializing Supabase adapter");
        try {
            // Test connection
            const { data: _data, error } = await this.supabase
                .from("rooms")
                .select("id")
                .limit(1);

            if (error) {
                elizaLogger.error("Connection test failed", {
                    error: error.message
                });
                throw error;
            }


            elizaLogger.success("Supabase adapter initialized successfully");
        } catch (error) {
            elizaLogger.error("Failed to initialize Supabase adapter", {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    async close() {
        // noop
    }

    async getMemoriesByRoomIds(params: { agentId: UUID; roomIds: UUID[]; tableName: string }): Promise<Memory[]> {
        elizaLogger.info('Getting memories by room IDs...', { roomIds: params.roomIds, tableName: params.tableName });
        return await this.withErrorHandling('getMemoriesByRoomIds', async () => {
            const { data, error } = await this.supabase
                .from(params.tableName)
                .select('*')
                .in('roomId', params.roomIds);

            if (error) {
                throw new Error(`Error getting memories: ${error.message}`);
            }

            elizaLogger.success('Memories retrieved successfully', { count: data.length });
            return data;
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
        tableName: string;
        agentId: UUID;
        roomId: UUID;
        embedding: number[];
        match_threshold: number;
        match_count: number;
        unique: boolean;
    }): Promise<Array<Memory & { similarity: number }>> {
        elizaLogger.info('Searching memories...', {
            tableName: params.tableName,
            roomId: params.roomId,
            agentId: params.agentId,
            matchCount: params.match_count,
            threshold: params.match_threshold,
            unique: params.unique,
            embeddingSize: params.embedding.length,
            embeddingSample: params.embedding.slice(0, 5)
        });

        const rpcParams = {
            query_table_name: params.tableName,
            query_room_id: params.roomId,
            query_embedding: params.embedding,
            query_match_threshold: params.match_threshold,
            query_match_count: params.match_count,
            query_unique: params.unique,
        };
        elizaLogger.info('RPC parameters:', rpcParams);

        const result = await this.supabase.rpc("search_memories", rpcParams);

        if (result.error) {
            elizaLogger.error('Failed to search memories:', { 
                error: result.error,
                code: result.error.code,
                message: result.error.message,
                details: result.error.details,
                hint: result.error.hint
            });
            throw new Error(JSON.stringify(result.error));
        }

        elizaLogger.info('Raw RPC results:', {
            count: result.data?.length ?? 0,
            firstResult: result.data?.[0] ? {
                id: result.data[0].id,
                similarity: result.data[0].similarity,
                content: result.data[0].content,
                roomId: result.data[0].roomId,
                agentId: result.data[0].agentId,
                userId: result.data[0].userId,
                unique: result.data[0].unique,
                createdAt: result.data[0].createdAt
            } : null
        });

        const memories = result.data.map((memory) => ({
            ...memory,
            content: memory.content,
            embedding: memory.embedding,
        }));

        elizaLogger.info('Processed results:', {
            count: memories.length,
            firstMemory: memories[0] ? {
                id: memories[0].id,
                similarity: memories[0].similarity,
                content: memories[0].content,
                roomId: memories[0].roomId,
                agentId: memories[0].agentId,
                userId: memories[0].userId,
                unique: memories[0].unique,
                createdAt: memories[0].createdAt
            } : null
        });

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

        const result = await this.supabase.rpc("get_embedding_list", params);
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
        const query = this.supabase
            .from(params.tableName)
            .select("*")
            .eq("roomId", params.roomId);

        if (params.start) {
            query.gte("createdAt", params.start);
        }

        if (params.end) {
            query.lte("createdAt", params.end);
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
            throw new Error(`Error retrieving memories: ${error.message}`);
        }

        return data as Memory[];
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
            throw new Error(JSON.stringify(result.error));
        }
        return result.data.map((memory) => ({
            ...memory,
        }));
    }

    async getMemoryById(memoryId: UUID): Promise<Memory | null> {
        elizaLogger.info('Getting memory by ID...', { memoryId });
        return await this.withErrorHandling('getMemoryById', async () => {
            const { data, error } = await this.supabase
                .from('memories')
                .select('*')
                .eq('id', memoryId)
                .single();

            if (error) {
                if (error.message.includes('multiple (or no) rows returned')) {
                    elizaLogger.warn('Memory not found', { memoryId });
                    return null;
                }
                throw new Error(`Error getting memory: ${error.message}`);
            }

            elizaLogger.success('Memory retrieved successfully');
            return data;
        });
    }

    async createMemory(memory: Memory, tableName: string, unique = false): Promise<void> {
        elizaLogger.info('Creating memory...', { memoryId: memory.id, tableName, unique });
        return await this.withErrorHandling('createMemory', async () => {
            const { data: _data, error } = await this.supabase
                .from(tableName)
                .insert({
                    id: memory.id,
                    userId: memory.userId,
                    agentId: memory.agentId,
                    roomId: memory.roomId,
                    content: JSON.stringify(memory.content),
                    embedding: memory.embedding,
                    unique: unique,
                    type: (memory as { type?: string }).type || 'message'
                });

            if (error) {
                throw new Error(`Error creating memory: ${error.message}`);
            }

            elizaLogger.success('Memory created successfully', { memoryId: memory.id });
        });
    }

    async removeMemory(memoryId: UUID, tableName: string): Promise<void> {
        elizaLogger.info('Removing memory...', { memoryId, tableName });
        return await this.withErrorHandling('removeMemory', async () => {
            const { error } = await this.supabase
                .from(tableName)
                .delete()
                .eq('id', memoryId);

            if (error) {
                throw new Error(`Error removing memory: ${error.message}`);
            }

            elizaLogger.success('Memory removed successfully');
        });
    }

    async removeAllMemories(roomId: UUID, tableName: string): Promise<void> {
        elizaLogger.info('Removing all memories...', { roomId, tableName });
        return await this.withErrorHandling('removeAllMemories', async () => {
            const { error } = await this.supabase.rpc("remove_memories", {
                query_roomid: roomId,
                query_table_name: tableName
            });

            if (error) {
                throw new Error(`Error removing all memories: ${error.message}`);
            }

            elizaLogger.success('All memories removed successfully');
        });
    }

    async countMemories(roomId: UUID, _unique = false, tableName?: string): Promise<number> {
        elizaLogger.info('Counting memories...', { tableName, roomId });
        return await this.withErrorHandling('countMemories', async () => {
            const { count, error } = await this.supabase
                .from(tableName || 'memories')
                .select('*', { count: 'exact', head: true })
                .eq('roomId', roomId);

            if (error) {
                throw new Error(`Error counting memories: ${error.message}`);
            }

            elizaLogger.success('Memories counted successfully', { count });
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
}
