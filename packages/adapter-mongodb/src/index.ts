import {
    type Memory,
    type Goal,
    type Relationship,
    Actor,
    GoalStatus,
    Account,
    type UUID,
    Participant,
    RAGKnowledgeItem,
    elizaLogger,
    DatabaseAdapter,
    IDatabaseCacheAdapter
} from "@elizaos/core";
import {Db, MongoClient} from 'mongodb';
import { v4 } from "uuid";

export class MongoDatabaseAdapter extends DatabaseAdapter<MongoClient> implements IDatabaseCacheAdapter {
    // Collections
    // TODO: check if tables/collections names are correct
    private readonly ROOMS = 'rooms';
    private readonly PARTICIPANTS = 'participants';
    private readonly MEMORIES = 'memories';
    private readonly GOALS = 'goals';
    private readonly KNOWLEDGE = 'knowledge';
    private readonly RELATIONSHIPS = 'relationships';
    private readonly LOGS = 'logs';
    private readonly ACCOUNTS = 'accounts';
    private readonly CACHE = 'cache';
    private readonly CACHE_DB = 'cacheDB';
    private readonly VECTOR_SEARCH_INDEX = 'vector_index';
    private readonly VECTOR_SEARCH_COLLECTION = 'memories';
    private roomCollection;
    private participantCollection;
    private memoriesCollection;
    private goalsCollection;
    private knowledgeCollection;
    private relationshipsCollection;
    private accountsCollection;
    private logsCollection;

    private database: Db;
    private readonly databaseName: string;
    private isConnected = false;
    private hasVectorSearch = false;
    private hasSharding = false;
    constructor(connectionString: string, databaseName: string) {
        super();
        this.db = new MongoClient( // TODO: make sure that this assignment is ok
            connectionString,
            { // TODO: finetune this
                maxPoolSize: 100,
                minPoolSize: 5,
                maxIdleTimeMS: 60000,
                connectTimeoutMS: 10000,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                compressors: ['zlib'],
                retryWrites: true,
                retryReads: true
            });
        this.databaseName = databaseName;
        this.isConnected = false;
        this.hasVectorSearch = false;
        this.hasSharding = false;
    }
    async createCollectionsWithIndexes() {
        const collectionsWithIndexes = [
            {
                collectionName: 'memories',
                indexes: [
                    { key: { type: 1, roomId: 1, agentId: 1, createdAt: -1 } },
                    { key: { content: "text" }, options: { weights: { content: 10 } } }
                ]
            },
            {
                collectionName: 'participants',
                indexes: [
                    { key: { userId: 1, roomId: 1 }, options: { unique: true } }
                ]
            },
            {
                collectionName: 'cache',
                indexes: [
                    { key: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } }
                ]
            }
        ];
        for (const { collectionName, indexes } of collectionsWithIndexes) {
            const collection = this.database.collection(collectionName);
            const existingIndexes = await collection.indexes();
            for (const index of indexes) {
                const indexExists = existingIndexes.some(existingIndex => {
                    return JSON.stringify(existingIndex.key) === JSON.stringify(index.key);
                     // TODO: add options check
                });
                if (!indexExists) {
                    console.log(`Creating index for ${collectionName}:`, index.key);
                    await collection.createIndex(index.key, index.options || {});
                     // TODO: index.key fix
                } else {
                    console.log(`Index already exists for ${collectionName}:`, index.key);
                }
            }
        }
    }
    async createVectorSearchIndexes() {
        if (this.hasVectorSearch) { return; }
        try {
            await this.database.collection('memories').createIndex(
                { embedding: "vectorSearch" },
                {
                    name: this.VECTOR_SEARCH_INDEX,
                    definition: {
                        vectorSearchConfig: {
                            dimensions: 1536,
                            similarity: "cosine",
                            numLists: 100,
                            efConstruction: 128
                        }
                    }
                }
            );
            this.hasVectorSearch = true;
            elizaLogger.log("Vector search capabilities are available and enabled");
        } catch (error) {
            elizaLogger.log("Vector search not available, falling back to standard search", error);
            await this.database.collection(this.MEMORIES).createIndex(
                { embedding: 1 }
            );
        }
    }
    async enableSharding() {

    }
    async init(): Promise<void> {
        if(this.isConnected) { return; }
        await this.db.connect();
        this.database = this.db.db(this.databaseName);
        await Promise.all([
            this.createVectorSearchIndexes(),
            this.createCollectionsWithIndexes(),
            this.enableSharding(),
        ]);
        this.roomCollection = this.database.collection(this.ROOMS);
        this.participantCollection = this.database.collection(this.PARTICIPANTS);
        this.memoriesCollection = this.database.collection(this.MEMORIES);
        this.goalsCollection = this.database.collection(this.GOALS);
        this.knowledgeCollection = this.database.collection(this.KNOWLEDGE);
        this.relationshipsCollection = this.database.collection(this.RELATIONSHIPS);
        this.logsCollection = this.database.collection(this.LOGS);
    }
    async close(): Promise<void> {
        await this.db.close();
    }

    async getRoom(id: UUID): Promise<UUID | null> {
        try {
            const room = await this.roomCollection
                .findOne({ id: id })
                .project({ id: 1 });
            return room?.id ?? null;
        } catch (e) {
            elizaLogger.error(`Error getting room with id ${ id }: ${ e }`);
            throw e;
        }
    }
    async createRoom(roomId: UUID | undefined): Promise<UUID> {
        const newRoomId = roomId || v4() as UUID;
        try {
            await this.roomCollection.insertOne({ id: newRoomId, createdAt: new Date() });
            return newRoomId;
        } catch (e) {
            elizaLogger.error(`Error creating room with id ${ roomId }: ${ e }`);
            throw e;
        }
    }
    async getRoomsForParticipant(userId: UUID): Promise<UUID[]> {
        try {
            const participantRooms = await this.participantCollection
                .find({ userId: userId })
                .project({roomId: 1})
                .toArray();
            return participantRooms.map(i => i.roomId);
        } catch (e) {
            elizaLogger.error(`Error getting rooms for participant with id: ${ userId }: ${ e }`);
        }
    }
    async getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]> {
        try {
            const participantsRooms = await this.participantCollection
                .find({ userId: { $in: userIds } })
                .project({roomId: 1})
                .toArray();
            return participantsRooms.map(i => i.roomId);
        } catch (e) {
            elizaLogger.error("Error getting rooms for participants: ", e);
        }
    }
    async removeMemoryByRoomId(roomId: UUID): Promise<void> {
       try {
           await this.memoriesCollection.deleteMany({ roomId: roomId });
       }  catch (e) {
           elizaLogger.error(`Error while removing memories for room with id ${ roomId }: ${ e }`);
           throw e;
       }
    }
    async removeParticipantByRoomId(roomId: UUID): Promise<void> {
       try {
          await this.participantCollection.deleteMany({ roomId: roomId });
       } catch (e) {
           elizaLogger.error(`Error while removing participants for room with id ${ roomId }: ${ e }`);
           throw e;
       }
    }
    async removeGoalByRoomId(roomId: UUID): Promise<void> {
       try {
           await this.goalsCollection.deleteMany({ roomId: roomId });
       } catch (e) {
           elizaLogger.error(`Error while removing goals for room with id ${ roomId }: ${ e }`);
           throw e;
       }
    }
    async removeRoomWithId(roomId: UUID): Promise<void> {
       try {
           await this.roomCollection.deleteOne({ id: roomId });
       } catch (e) {
           elizaLogger.error(`Error while removing room with id ${ roomId }: ${ e }`);
           throw e;
       }
    }
    async removeRoom(roomId: UUID): Promise<void> {
        const session = this.db.startSession()
        try {
            if (await this.roomCollection.countDocuments({ id: roomId }) === 0) {
                elizaLogger.log(`Room with id ${ roomId } does not exist, skipping removal`);
                return;
            }
            await session.withTransaction(async () => {
                await Promise.all([
                    this.removeMemoryByRoomId(roomId),
                    this.removeParticipantByRoomId(roomId),
                    this.removeGoalByRoomId(roomId),
                    this.removeRoomWithId(roomId),
                ]);
            });
        } catch (e) {
           elizaLogger.error(`Error while removing room with id ${ roomId }: ${ e }`);
        } finally {
           session.endSession();
        }
    }
    async addParticipant(userId: UUID, roomId: UUID): Promise<boolean> { // TODO: what about userState
        try {
            await this.participantCollection.insertOne({id: v4(), userId: userId, roomId: roomId });
            return true;
        } catch (e) {
            elizaLogger.error(`Error adding participant with id ${ userId } to room with id ${ roomId }: ${ e }`);
            return false;
        }
    }
    async removeParticipant(userId: UUID, roomId: UUID): Promise<boolean> {
        try {
            await this.participantCollection.remove({ userId, roomId});
            return true;
        } catch (e) {
            elizaLogger.error(`Error while removing participant with roomId ${ roomId } and userId ${ userId }: ${ e }`);
            return false;
        }
    }
    async getParticipantUserState(roomId: UUID, userId: UUID): Promise<"FOLLOWED" | "MUTED" | null> {
        try {
            const participant = await this.participantCollection.findOne({ userId, roomId }).project({ userState: 1 });
            return participant && (participant.userState === "FOLLOWED" || participant.userState === "MUTED")
                ? participant.userState
                : null;
        } catch (e) {
            elizaLogger.error(`Error getting participant user state for roomId ${ roomId } and userId ${ userId }: ${ e }`);
            throw e;
        }
    }

    async getParticipantsForAccount(userId: UUID): Promise<Participant[]> {
        try {
            return this.participantCollection.find({ userId: userId }).toArray();
        } catch (e) {
            elizaLogger.error(`Error getting participants for account with id ${ userId }: ${ e }`);
        }
    }

    async getParticipantsForRoom(roomId: UUID): Promise<UUID[]> {
        try {
           const participants = this.participantCollection.find({ roomId: roomId }).project({ userId: 1 }).toArray();
           return participants.map(i => i.userId);
        } catch (e) {
            elizaLogger.error(`Error getting participants for room with id ${ roomId }: ${ e }`);
        }
    }
    async getCache(params: { agentId: UUID; key: string }): Promise<string | undefined> {
        const cacheCollection = this.database.collection('cache');
        const cacheItem = await cacheCollection.findOne(
            {
                agentId: params.agentId,
                key: params.key,
                expiresAt: { $gt: new Date() }
            });
        return cacheItem ? cacheItem.value : undefined;
    }

    async setCache(params: { agentId: UUID; key: string; value: string }): Promise<boolean> {
        const cacheCollection = this.db.db('cacheDB').collection('cache');
        const result = await cacheCollection.updateOne(
            { agentId: params.agentId, key: params.key },
            { $set: { value: params.value } },
            { upsert: true }
        );
        return result.acknowledged;
    }

    async deleteCache(params: { agentId: UUID; key: string }): Promise<boolean> {
        const cacheCollection = this.db.db('cacheDB').collection('cache');
        const result = await cacheCollection.deleteOne({ agentId: params.agentId, key: params.key });
        return result.deletedCount > 0;
    }


    async clearKnowledge(agentId: UUID, shared?: boolean): Promise<void> {
        const filter = shared
            ? { $or: [{ agentId }, { isShared: true }] }
            : { agentId };
        try {
            await this.knowledgeCollection.deleteMany(filter);
        } catch (e) {
            elizaLogger.error(`Error while clearing knowledge for agent with id ${ agentId }: ${ e }`);
            throw e;
        }
    }

    async countMemories(roomId: UUID, unique: boolean | undefined, tableName: string | undefined): Promise<number> {
        if(!tableName) {
            throw new Error("tableName is required");
        }
        const filter = unique ? { roomId, unique, tableName } : { roomId, tableName };
        return this.memoriesCollection.countDocuments(filter);
    }

    async createAccount(account: Account): Promise<boolean> {
        try {
            await this.accountsCollection.insertOne({
                id: account.id ?? v4(),
                name: account.name,
                email: account.email,
                username: account.username,
                details: JSON.stringify(account.details),
                avatarUrl: account.avatarUrl,
            });
            return true;
        } catch (e) {
            elizaLogger.error(`Error creating account: ${ e }`);
            return false;
        }
    }

    async createGoal(goal: Goal): Promise<void> {
        try {
            await this.goalsCollection.insertOne({
                id: goal.id ?? v4(),
                name: goal.name,
                roomId: goal.roomId,
                userId: goal.userId,
                objectives: JSON.stringify(goal.objectives),
                status: goal.status,
            });
        } catch (e) {
            elizaLogger.error(`Error creating goal: ${ e }`);
            throw e;
        }
    }

    async createKnowledge(knowledge: RAGKnowledgeItem): Promise<void> {
        try {
            const metadata = knowledge.content.metadata || {};
            const isShared = metadata.isShared;
            await this.knowledgeCollection.insertOne({
                id: knowledge.id,
                isShared: isShared ? 1 : 0,
                content: JSON.stringify(knowledge.content),
                embedding: knowledge.embedding || null,
                agentId: isShared ? null : knowledge.agentId,
                createdAt: knowledge.createdAt || new Date(),
                isMain: metadata.isMain ? 1 : 0,
                originalId: metadata.originalId || null,
                chunkIndex: metadata.chunkIndex || null,

            })
        } catch (e: any) {
            const isShared = knowledge.content.metadata?.isShared;
            const isPrimaryKeyError =
                e?.code === "SQLITE_CONSTRAINT_PRIMARYKEY";

            if (isShared && isPrimaryKeyError) {
                elizaLogger.info(
                    `Shared knowledge ${knowledge.id} already exists, skipping`
                );
                return;
            } else if (
                !isShared &&
                !e.message?.includes("SQLITE_CONSTRAINT_PRIMARYKEY")
            ) {
                elizaLogger.error(`Error creating knowledge ${knowledge.id}:`, {
                    e,
                    embeddingLength: knowledge.embedding?.length,
                    content: knowledge.content,
                });
                throw e;
            }
        }
    }

    async createMemory(memory: Memory, tableName: string, unique: boolean | undefined): Promise<void> {
        let isUnique = true;
        if (memory.embedding) {
            // Check if a similar memory already exists
            const similarMemories = await this.searchMemoriesByEmbedding(
                memory.embedding,
                {
                    tableName,
                    agentId: memory.agentId,
                    roomId: memory.roomId,
                    match_threshold: 0.95, // 5% similarity threshold
                    count: 1,
                }
            );
            isUnique = similarMemories.length === 0;
        }
        const content = JSON.stringify(memory.content);
        const createdAt = memory.createdAt ?? Date.now();

        let embeddingValue: Float32Array = new Float32Array(384);
        // If embedding is not available, we just load an array with a length of 384
        if (memory?.embedding && memory?.embedding?.length > 0) {
            embeddingValue = new Float32Array(memory.embedding);
        }
        await this.memoriesCollection.updateOne(
            { id: memory.id ?? v4() }, // Match based on memory.id or generate a new one
            {
                $set: {
                    type: tableName,
                    content: content,
                    embedding: embeddingValue,
                    userId: memory.userId,
                    roomId: memory.roomId,
                    agentId: memory.agentId,
                    unique: isUnique ? 1 : 0,
                    createdAt: createdAt
                },
            },
            { upsert: true });
    }

    async createRelationship(params: { userA: UUID; userB: UUID }): Promise<boolean> {
        if (!params.userA || !params.userB) {
            throw new Error("userA and userB are required");
        }
        await this.relationshipsCollection.insertOne({
            id: v4(),
            userA: params.userA,
            userB: params.userB,
            userId: params.userA,
        });
        return true;
    }


    async getAccountById(userId: UUID): Promise<Account | null> {
        const account = await this.accountsCollection.findOne({ id: userId });
        if (!account) { return null; }
        if(typeof account.details === "string") {
            account.details = JSON.parse(
                account.details as unknown as string
            );
        }
        return account;
    }

    async getActorDetails(params: { roomId: UUID }): Promise<Actor[]> {
        const id = params.roomId
        try { // TODO: check this up
            const rows = await this.participantCollection.aggregate([
                {
                    $match: {
                        roomId: id,
                    },
                },
                {
                    $lookup: {
                        from: "accounts",
                        localField: "userId",
                        foreignField: "_id",
                        as: "accountDetails",
                    },
                },
                {
                    $unwind: {
                        path: "$accountDetails",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        _id: 0,
                        id: "$accountDetails._id",
                        name: "$accountDetails.name",
                        username: "$accountDetails.username",
                        details: "$accountDetails.details",
                    },
                },
            ]).toArray();
            return rows.filter(row => !!row).map((row) => {
                return {
                    id: row.id,
                    name: row.name,
                    username: row.username,
                    details: typeof row.details === "string"
                        ? JSON.parse(row.details)
                        : row.details,
                } as Actor });
        } catch (e) {
            elizaLogger.error(`Error while getting Actor details for room with id ${ id }: ${ e }`);
        }
    }

    async getGoals(params: {
        roomId: UUID;
        userId?: UUID | null;
        onlyInProgress?: boolean;
        count?: number
    }): Promise<Goal[]> {
        const filter: { [key: string]: any } = { roomId: params.roomId };

        if (params.userId) {
            filter.userId = params.userId;
        }
        if (params.onlyInProgress) {
            filter.status = "IN_PROGRESS";
        }
        const query: any[] = [{ $match: filter }];
        if (params.count) {
            query.push({ $limit: params.count });
        }
        const goals = await this.goalsCollection.aggregate(query).toArray();

        return goals.map(g => {
            g.objectives = JSON.parse(g.objectives);
            return g;
        });
    }

    async getKnowledge(params: {
        id?: UUID;
        agentId: UUID;
        limit?: number;
        query?: string;
    }): Promise<RAGKnowledgeItem[]> {
        const filter: { [key: string]: any } = {
            $or: [
                { agentId: params.agentId },
                { isShared: true }
            ]
        };
        if (params.id) {
            filter.id = params.id;
        }
        if (params.query) {
            filter.content = { $regex: new RegExp(params.query, 'i') }; // case-insensitive search
        }
        const pipeline: any[] = [{ $match: filter }];

        if (params.limit) {
            pipeline.push({ $limit: params.limit });
        }

        const rows = await this.knowledgeCollection.aggregate(pipeline).toArray();

        return rows.map((row) => ({
            id: row.id,
            agentId: row.agentId,
            content: JSON.parse(row.content),
            embedding: row.embedding
                ? new Float32Array(row.embedding)
                : undefined,
            createdAt:
                typeof row.createdAt === "string"
                    ? Date.parse(row.createdAt)
                    : row.createdAt,
        }));
    }


    async getMemoryById(id: UUID): Promise<Memory | null> {
        const memory = await this.memoriesCollection.findOne({ id: id });
        return memory
            ? {
            ...memory,
            content: JSON.parse(memory.content as unknown as string),
            }
            : null;
    }


    async getRelationship(params: { userA: UUID; userB: UUID }): Promise<Relationship | null> {
        const relationship = await this.relationshipsCollection.findOne({
            $or: [
                { userA: params.userA, userB: params.userB },
                { userA: params.userB, userB: params.userA },
            ] ,
        });
        return relationship ?? null;
    }

    async getRelationships(params: { userId: UUID }): Promise<Relationship[]> {
        return this.relationshipsCollection.find({
            $or: [
                { userA: params.userId },
                { userB: params.userId },
            ]},
        ).toArray();
    }

    async log(params: {
        body: { [p: string]: unknown };
        userId: UUID;
        roomId: UUID;
        type: string
    }): Promise<void> {
        await this.logsCollection.insertOne({
            body: JSON.stringify(params.body),
            userId: params.userId,
            roomId: params.roomId,
            type: params.type,
        });
    }

    async removeAllGoals(roomId: UUID): Promise<void> {
        await this.goalsCollection.deleteMany({ roomId: roomId });
    }

    async removeAllMemories(roomId: UUID, tableName: string): Promise<void> {
        await this.memoriesCollection.deleteMany({ roomId: roomId, type: tableName });
    }

    async removeGoal(goalId: UUID): Promise<void> {
        await this.goalsCollection.deleteOne({ id: goalId });
    }

    async removeKnowledge(id: UUID): Promise<void> {
        await this.knowledgeCollection.deleteOne({ id: id });
    }

    async removeMemory(memoryId: UUID, tableName: string): Promise<void> {
        await this.memoriesCollection.deleteOne({ id: memoryId, type: tableName });
    }

    async searchKnowledge(params: { // TODO: make sure that this is ok
        agentId: string;
        embedding: Float32Array;
        match_threshold: number;
        match_count: number;
        searchText?: string;
    }): Promise<RAGKnowledgeItem[]> {
        const cacheKey = `embedding_${params.agentId}_${params.searchText}`;
        const cachedResult = await this.getCache({
            key: cacheKey,
            agentId: params.agentId,
        });

        if (cachedResult) {
            return JSON.parse(cachedResult);
        }

        const embeddingArray = Array.from(params.embedding);

        const pipeline: any[] = [
            {
                $match: {
                    $or: [
                        { agentId: null, isShared: true },
                        { agentId: params.agentId },
                    ],
                    embedding: { $exists: true, $ne: null },
                },
            },
            {
                $addFields: {
                    vector_score: {
                        $let: {
                            vars: {
                                distance: {
                                    $reduce: {
                                        input: { $range: [0, { $size: "$embedding" }] },
                                        initialValue: 0,
                                        in: {
                                            $add: [
                                                "$$value",
                                                {
                                                    $pow: [
                                                        {
                                                            $subtract: [
                                                                { $arrayElemAt: ["$embedding", "$$this"] },
                                                                { $arrayElemAt: [embeddingArray, "$$this"] },
                                                            ],
                                                        },
                                                        2,
                                                    ],
                                                },
                                            ],
                                        },
                                    },
                                },
                            },
                            in: { $divide: [1, { $add: [1, { $sqrt: "$$distance" }] }] },
                        },
                    },
                },
            },
            {
                $addFields: {
                    keyword_score: {
                        $multiply: [
                            {
                                $cond: {
                                    if: {
                                        $regexMatch: {
                                            input: { $toLower: "$content.text" },
                                            regex: new RegExp(params.searchText?.toLowerCase() || "", "i"),
                                        },
                                    },
                                    then: 3.0,
                                    else: 1.0,
                                },
                            },
                            {
                                $cond: {
                                    if: { $eq: ["$content.metadata.isChunk", true] },
                                    then: 1.5,
                                    else: {
                                        $cond: {
                                            if: { $eq: ["$content.metadata.isMain", true] },
                                            then: 1.2,
                                            else: 1.0,
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
            },
            {
                $addFields: {
                    combined_score: {
                        $multiply: ["$vector_score", "$keyword_score"],
                    },
                },
            },
            {
                $match: {
                    $or: [
                        { vector_score: { $gte: params.match_threshold } },
                        {
                            $and: [
                                { keyword_score: { $gt: 1.0 } },
                                { vector_score: { $gte: 0.3 } },
                            ],
                        },
                    ],
                },
            },
            { $sort: { combined_score: -1 } },
            { $limit: params.match_count },
        ];

        try {
            const rows = await this.knowledgeCollection.aggregate(pipeline).toArray();

            const results = rows.map((row) => ({
                id: row._id,
                agentId: row.agentId,
                content: row.content,
                embedding: row.embedding
                    ? new Float32Array(row.embedding)
                    : undefined,
                createdAt: new Date(row.createdAt),
                similarity: row.combined_score,
            }));

            await this.setCache({
                key: cacheKey,
                agentId: params.agentId,
                value: JSON.stringify(results),
            });

            return results;
        } catch (error) {
            elizaLogger.error("Error in searchKnowledge:", error);
            throw error;
        }
    }


    async searchMemories(params: { // TODO: make sure that this is ok
        tableName: string;
        roomId: string;
        agentId?: string;
        embedding: number[];
        match_threshold: number;
        match_count: number;
        unique: boolean;
    }): Promise<Memory[]> {
        const pipeline: any[] = [
            {
                $match: {
                    embedding: { $exists: true, $ne: null },
                    type: params.tableName,
                    roomId: params.roomId,
                    ...(params.unique ? { unique: true } : {}),
                    ...(params.agentId ? { agentId: params.agentId } : {}),
                },
            },
            {
                $addFields: {
                    similarity: {
                        $let: {
                            vars: {
                                distance: {
                                    $reduce: {
                                        input: { $range: [0, { $size: "$embedding" }] },
                                        initialValue: 0,
                                        in: {
                                            $add: [
                                                "$$value",
                                                {
                                                    $pow: [
                                                        {
                                                            $subtract: [
                                                                { $arrayElemAt: ["$embedding", "$$this"] },
                                                                { $arrayElemAt: [params.embedding, "$$this"] },
                                                            ],
                                                        },
                                                        2,
                                                    ],
                                                },
                                            ],
                                        },
                                    },
                                },
                            },
                            in: { $sqrt: "$$distance" },
                        },
                    },
                },
            },
            { $match: { similarity: { $lte: params.match_threshold } } },
            { $sort: { similarity: 1 } },
            { $limit: params.match_count },
        ];

        const results = await this.memoriesCollection.aggregate(pipeline).toArray();

        return results.map((doc) => ({
            ...doc,
            createdAt: new Date(doc.createdAt),
            content: JSON.parse(doc.content),
        }));
    }

    async searchMemoriesByEmbedding( // TODO: make sure that this is ok
        embedding: number[],
        params: {
            match_threshold?: number;
            count?: number;
            roomId?: string;
            agentId: string;
            unique?: boolean;
            tableName: string;
        }
    ): Promise<Memory[]> {
        const pipeline: any[] = [
            {
                $match: {
                    embedding: { $exists: true, $ne: null },
                    type: params.tableName,
                    agentId: params.agentId,
                    ...(params.unique ? { unique: 1 } : {}),
                    ...(params.roomId ? { roomId: params.roomId } : {}),
                },
            },
            {
                $addFields: {
                    similarity: {
                        $let: {
                            vars: {
                                distance: {
                                    $reduce: {
                                        input: { $range: [0, { $size: "$embedding" }] },
                                        initialValue: 0,
                                        in: {
                                            $add: [
                                                "$$value",
                                                {
                                                    $pow: [
                                                        {
                                                            $subtract: [
                                                                { $arrayElemAt: ["$embedding", "$$this"] },
                                                                { $arrayElemAt: [embedding, "$$this"] },
                                                            ],
                                                        },
                                                        2,
                                                    ],
                                                },
                                            ],
                                        },
                                    },
                                },
                            },
                            in: { $sqrt: "$$distance" },
                        },
                    },
                },
            },
            ...(params.match_threshold
                ? [{ $match: { similarity: { $lte: params.match_threshold } } }]
                : []),
            { $sort: { similarity: 1 } },
            ...(params.count ? [{ $limit: params.count }] : []),
        ];

        const results = await this.memoriesCollection.aggregate(pipeline).toArray();

        return results.map((doc) => ({
            ...doc,
            content: JSON.parse(doc.content),
            createdAt: new Date(doc.createdAt),
        }));
    }


    async updateGoal(goal: Goal): Promise<void> {
        await this.goalsCollection.updateOne(
            { id: goal.id },
            { $set: {
                name: goal.name,
                objectives: JSON.stringify(goal.objectives),
                    status: goal.status
                }
            });
    }

    async updateGoalStatus(params: { goalId: UUID; status: GoalStatus }): Promise<void> {
        await this.goalsCollection.updateOne({ id: params.goalId }, { $set: { status: params.status } });
    }

    async getCachedEmbeddings(opts: { // TODO make sure that this is ok
        query_table_name: string;
        query_threshold: number;
        query_input: string;
        query_field_name: string;
        query_field_sub_name: string;
        query_match_count: number
    }): Promise<{ embedding: number[]; levenshtein_score: number }[]> {
        const pipeline = [
            {
                $match: {
                    type: opts.query_table_name,
                    [`content.${opts.query_field_name}.${opts.query_field_sub_name}`]: { $exists: true },
                },
            },
            {
                $project: {
                    embedding: 1,
                    content_text: {
                        $toString: `$content.${opts.query_field_name}.${opts.query_field_sub_name}`,
                    },
                },
            },
        ];

        const results = await this.memoriesCollection.aggregate(pipeline).toArray();

        const calculateLevenshtein = (a: string, b: string): number => {
            const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
                Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
            );

            for (let i = 1; i <= a.length; i++) {
                for (let j = 1; j <= b.length; j++) {
                    if (a[i - 1] === b[j - 1]) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]) + 1;
                    }
                }
            }

            return matrix[a.length][b.length];
        };

        const processedResults = results
            .map((doc) => ({
                embedding: Array.from(new Float32Array(doc.embedding.buffer)),
                levenshtein_score: calculateLevenshtein(
                    opts.query_input.toLowerCase(),
                    doc.content_text.toLowerCase()
                ),
            }))
            .sort((a, b) => a.levenshtein_score - b.levenshtein_score)
            .slice(0, opts.query_match_count);

        return processedResults;
    }

    async getMemories(params: {
        roomId: UUID;
        count?: number;
        unique?: boolean;
        tableName: string;
        agentId: UUID;
        start?: number;
        end?: number
    }): Promise<Memory[]> {
        if (!params.tableName) {
            throw new Error("tableName is required");
        }
        if (!params.roomId) {
            throw new Error("roomId is required");
        }
        const query: any = {
            type: params.tableName,
            agentId: params.agentId,
            roomId: params.roomId,
        };
        if (params.unique) {
            query.unique = 1;
        }
        if (params.start) {
            query.createdAt = { ...(query.createdAt || {}), $gte: params.start };
        }
        if (params.end) {
            query.createdAt = { ...(query.createdAt || {}), $lte: params.end };
        }
        const results = await this.memoriesCollection
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();
        return results.map((memory) => ({
            ...memory,
            createdAt:
                typeof memory.createdAt === "string"
                    ? Date.parse(memory.createdAt as string)
                    : memory.createdAt,
            content: JSON.parse(memory.content as unknown as string),
        }));
    }

    async getMemoriesByRoomIds(params: {
        tableName: string;
        agentId: UUID;
        roomIds: UUID[];
    }): Promise<Memory[]> {
        if (!params.tableName) {
            params.tableName = "messages";
        }
        const results = await this.memoriesCollection.find({
            type: params.tableName,
            agentId: params.agentId,
            roomId: { $in: params.roomIds },
        });
        return results.map((memory) => ({
            ...memory,
            content: JSON.parse(JSON.stringify(memory.content)),
        }));
    }

    async setParticipantUserState(roomId: UUID, userId: UUID, state: "FOLLOWED" | "MUTED" | null): Promise<void> {
        return this.participantCollection.updateOne({ roomId, userId }, { $set: { userState: state } });
    }
}
