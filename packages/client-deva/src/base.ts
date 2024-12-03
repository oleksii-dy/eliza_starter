import {
    Content,
    elizaLogger,
    getEmbeddingZeroVector,
    IAgentRuntime,
    stringToUuid,
} from "@ai16z/eliza";

const API_BASE = "https://api-staging.deva.me";

type DevaPersona = {
    id: string;
    user_id: string;
    display_name: string;
    username: string;
    description: string;
    avatar: number;
    cover_image: number;
};

type DevaPost = {
    id: string;
    author_type: string;
    text: string;
    persona_id: string;
    in_reply_to_id: string;
    mentioned_profile_persona_id: string;
    persona: DevaPersona;
    created_at: string;
};

export class ClientBase {
    runtime: IAgentRuntime;
    accessToken: string;
    defaultHeaders: Record<string, string>;

    persona: DevaPersona;
    posts: DevaPost[];

    constructor(runtime: IAgentRuntime, accessToken: string) {
        this.runtime = runtime;
        this.accessToken = accessToken;
        this.defaultHeaders = {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
        };
    }

    async init() {
        await this.populatePersona();
        await this.populatePosts(this.persona);
    }

    async populatePersona() {
        this.persona = await this.getMe();

        if (!this.persona) {
            elizaLogger.error("❌ Deva Client failed to fetch Persona");
            throw new Error("❌ Deva Client failed to fetch Persona");
        }

        elizaLogger.log(
            `✨ Deva Client successfully fetched Persona: ${this.persona.username}`
        );
    }

    async populatePosts(persona: DevaPersona) {
        this.posts = await this.getPersonaPosts(persona.id);

        // Get the existing memories from the database
        const existingMemories =
            await this.runtime.messageManager.getMemoriesByRoomIds({
                roomIds: this.posts.map((post) =>
                    stringToUuid(
                        post.in_reply_to_id + "-" + this.runtime.agentId
                    )
                ),
            });

        // Create a Set to store the IDs of existing memories
        const existingMemoryIds = new Set(
            existingMemories.map((memory) => memory.id.toString())
        );

        // Check if any of the posts don't exist in the existing memories
        const notExistingPostsInMemory = this.posts.filter(
            (post) =>
                !existingMemoryIds.has(
                    stringToUuid(post.id + "-" + this.runtime.agentId)
                )
        );

        for (const post of notExistingPostsInMemory) {
            elizaLogger.log("Saving Post", post.id);

            const roomId = stringToUuid(
                post.in_reply_to_id + "-" + this.runtime.agentId
            );

            const userId =
                post.persona_id === this.persona.id
                    ? this.runtime.agentId
                    : stringToUuid(post.persona_id);

            if (post.persona_id === this.persona.id) {
                await this.runtime.ensureConnection(
                    this.runtime.agentId,
                    roomId,
                    this.persona.username,
                    this.persona.display_name,
                    "deva"
                );
            } else {
                await this.runtime.ensureConnection(
                    userId,
                    roomId,
                    post.persona.username,
                    post.persona.display_name,
                    "deva"
                );
            }

            const content = {
                text: post.text,
                inReplyTo: stringToUuid(
                    post.in_reply_to_id + "-" + this.runtime.agentId
                ),
                source: "deva",
            } as Content;

            elizaLogger.log("Creating memory for post", post.id);

            // check if it already exists
            const memory = await this.runtime.messageManager.getMemoryById(
                stringToUuid(post.id + "-" + this.runtime.agentId)
            );

            if (memory) {
                elizaLogger.log(
                    "Memory already exists, skipping timeline population"
                );
                break;
            }

            await this.runtime.messageManager.createMemory({
                id: stringToUuid(post.id + "-" + this.runtime.agentId),
                userId,
                content: content,
                agentId: this.runtime.agentId,
                roomId,
                embedding: getEmbeddingZeroVector(),
                createdAt: new Date(post.created_at).getTime(),
            });

            elizaLogger.log("Created memory for post", post.id);
        }

        elizaLogger.log(
            `✨ Deva Client successfully fetched Persona Posts: ${this.posts.length}`
        );
    }

    async getMe(): Promise<DevaPersona | null> {
        const res = await fetch(`${API_BASE}/persona`, {
            headers: { ...this.defaultHeaders },
        })
            .then((res) => res.json())
            .catch((e) => null);

        return res;
    }

    async getPersonaPosts(personaId: string): Promise<DevaPost[]> {
        const res = await fetch(
            `${API_BASE}/post?filter_persona_id=${personaId}`,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        ).then((res) => res.json());
        return res.items;
    }

    async makePost({
        text,
        in_reply_to_id,
    }: {
        text: string;
        in_reply_to_id: string;
    }): Promise<DevaPost> {
        const res = await fetch(`${API_BASE}/posts`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text, in_reply_to_id }),
        }).then((res) => res.json());
        return res;
    }
}
