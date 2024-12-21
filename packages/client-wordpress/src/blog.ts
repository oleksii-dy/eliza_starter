import { WordpressClient } from "./client";
import {
    elizaLogger,
    stringToUuid,
    composeContext,
    IAgentRuntime,
    generateText,
    ModelClass
} from "@ai16z/eliza";
import { buildBlogPost } from "./utils";
const wordpressPostTemplate = `{{timeline}}

# Knowledge
{{knowledge}}

About {{agentName}}:
{{bio}}

{{summary}}
{{postDirections}}

{{providers}}

# Task: Generate a blog post in the voice and style of {{agentName}}
Write a post that is {{adjective}} about {{topic}}, from the perspective of {{agentName}}.
`;

export class WordpressBlogClient {

    runtime: IAgentRuntime;
    client: WordpressClient;

    async start() {
        await this.client.init();

        const generateNewPostLoop = async () => {
            await this.generateNewBlogPost();
            setTimeout(generateNewPostLoop, 1000 * 60 * 60 * 24); // 24 hours
        };

        generateNewPostLoop();

    };

    constructor(client: WordpressClient, runtime: IAgentRuntime) {
        this.runtime = runtime;
        this.client = client;
    }

    private async generateNewBlogPost() {
        elizaLogger.log("Generating new blog post");

        try {
            // get the last 5 posts
            const posts = await this.client.getPosts();
            const last5Posts = posts.slice(-5);
            const formattedPosts = last5Posts.map(post =>
                `Title: ${post.title.rendered}\nContent: ${post.content.rendered}`).join("\n\n");
            const topics = this.runtime.character.topics.join(', ');

            const state = await this.runtime.composeState(
                  {
                    userId: this.runtime.agentId,
                    roomId: stringToUuid('wordpress_generate_room'),
                    agentId: this.runtime.agentId,
                    content: {
                      text: topics,
                      action: ''
                    }
                  },
                  {
                    timeline: formattedPosts,
                  }
            );
        const context = composeContext({
            state,
            template: this.runtime.character.templates?.wordpressPostTemplate || wordpressPostTemplate
        });

        elizaLogger.debug('Generate post prompt:\n' + context);

        const { title, content } = await buildBlogPost(this.runtime, this.client);

        if (this.runtime.getSetting('WORDPRESS_DRY_RUN') === 'true') {
            elizaLogger.info(`Dry run: would have posted:\nTitle: ${title}\nContent: ${content}`);
            return;
        }
        try {
            elizaLogger.log(`Posting new WordPress blog post:\n${content}`);

            const result = await this.client.addToRequestQueue(
                async () => await this.client.createPost({
                    title: title,
                    content: content,
                    status: 'draft'
                })
            );

            await this.runtime.cacheManager.set(
              `wordpress/${this.client.getPublicConfig().username}/lastPost`,
              {
                id: result.id,
                timestamp: Date.now()
              }
            );

            const roomId = stringToUuid(`wordpress-post-${result.id}`);
            await this.runtime.messageManager.createMemory({
              id: stringToUuid(`${result.id}-${this.runtime.agentId}`),
              userId: this.runtime.agentId,
              content: {
                text: content,
                url: result.url,
                source: 'wordpress'
              },
              agentId: this.runtime.agentId,
              roomId,
              createdAt: Date.now()
            });

            elizaLogger.log(`WordPress post created: ${result.url}`);
          } catch (error) {
            elizaLogger.error('Error creating WordPress post:', error);
        }

        } catch (error) {
            elizaLogger.error("Error generating new blog post", error);
        }
    }

}