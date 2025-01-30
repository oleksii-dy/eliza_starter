import type { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import axios from "axios";

import { validateDiscourseConfig } from "../enviroment";
import { Post } from "../types/Post";

function formatLatestPostsData(posts: Post[]) {
    return posts
        .map((post) => {
            return `Post ID: ${post.id}\nCreated At: ${post.created_at}\nUsername: ${post.username}\nRaw: ${post.raw}\n\n`;
        })
        .join("");
}

const discoursePostsProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
    ): Promise<string | null> => {
        try {
            // Extract and validate the Discourse configuration from the runtime context
            const config = await validateDiscourseConfig(runtime);

            // Removing any trailing slash on the instance URL
            const trimmedInstanceUrl = config.DISCOURSE_INSTANCE_URL.replace(
                /\/$/,
                "",
            );

            // Make the API call to get the latest posts
            const response = await axios.get(`${trimmedInstanceUrl}/posts`, {
                headers: {
                    accept: "application/json",
                },
            });
            const posts = response.data;

            if (
                !posts.latest_posts ||
                !posts.latest_posts.length ||
                posts.latest_posts.length === 0
            ) {
                return "No post data found - report this to the user.";
            }

            return formatLatestPostsData(posts.latest_posts as Post[]);
        } catch (error) {
            console.error("Error in discourse provider:", error);
            return "Error interacting with Discourse instance - report this to the user.";
        }
    },
};

// Module exports
export { discoursePostsProvider };
