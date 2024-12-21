import {
    composeContext,
    elizaLogger,
    generateObjectV2,
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    Plugin,
    State,
    stringToUuid,
} from "@ai16z/eliza";
import { ideationTemplate } from "../templates";
import { IdeationSchema, isIdeationContent } from "../types";
import { getRepositoryRoomId, incorporateRepositoryState } from "../utils";

export const ideationAction: Action = {
    name: "IDEATE",
    similes: ["IDEAS", "IDEATION", "CO_CREATION", "BRAINSTORM", "THOUGHTS", "SUGGESTIONS", "THINKING"],
    description: "Generates ideas and suggestions based on user message using the context of the files and previous messages",
    validate: async (runtime: IAgentRuntime) => {
        const token = !!runtime.getSetting("GITHUB_API_TOKEN");
        return token;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        elizaLogger.log("[ideation] Composing state for message:", message);

        if (!state) {
            state = (await runtime.composeState(message, {})) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }
        state = await incorporateRepositoryState(state, runtime, message);
        const context = composeContext({
            state,
            template: ideationTemplate,
        });

        const details = await generateObjectV2({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
            schema: IdeationSchema,
        });

        if (!isIdeationContent(details.object)) {
            elizaLogger.error("Invalid content:", details.object);
            throw new Error("Invalid content");
        }

        const content = details.object;

        elizaLogger.info("Generating ideas based on the context...");
        // Create a memory for the response:
        const roomId = getRepositoryRoomId(runtime);
        const timestamp = Date.now();
        const userIdUUID = stringToUuid(`${runtime.agentId}-${timestamp}`);
        const memoryUUID = stringToUuid(`${roomId}-${runtime.agentId}-${timestamp}`);
        elizaLogger.log("Generated memory UUID:", memoryUUID);

        const newMemory: Memory = {
            id: memoryUUID,
            userId: userIdUUID,
            agentId: runtime.agentId,
            content: {
                text: content.response,
                action: "IDEAS",
                source: "github",
                inReplyTo: stringToUuid(`${roomId}-${runtime.agentId}`)
            },
            roomId,
            createdAt: timestamp,
        };
        await runtime.messageManager.createMemory(newMemory);
        await callback({
            text: content.response,
            attachments: [],
        });
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Generate ideas for repository user1/repo1",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Based on the current state of the repository and previous interactions, here are some detailed suggestions:\n\n1. **Enhance Documentation**: The README could be expanded with more comprehensive setup instructions and examples, which aligns with previous feedback from contributors. Consider adding a 'Getting Started' section to guide new users.\n2. **Refactor Legacy Code**: Several modules identified in past code reviews could be refactored for better maintainability. Focus on the `utils` directory, which has been flagged for complexity in previous pull requests.\n3. **Increase Test Coverage**: Previous issues highlighted gaps in test coverage, particularly in the authentication module. Implementing unit tests for edge cases could improve reliability.\n4. **Optimize Database Queries**: Recent performance logs suggest that certain database queries could be optimized to reduce load times. Look into indexing strategies for frequently queried tables.\n5. **Implement CI/CD Pipeline**: Automating the deployment process was a recurring suggestion in past discussions, which could improve efficiency and reduce errors. Consider using GitHub Actions for seamless integration.",
                    action: "IDEATION",
                },
            },
        ],
        [
            {
                user: "{{user2}}",
                content: {
                    text: "What improvements can be made to the frontend of user2/repo2?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Analyzing the repository and considering previous user feedback, here are some frontend improvement ideas:\n\n1. **Redesign UI for Better UX**: The current design could be more intuitive. Implementing a modern design framework like Material-UI could enhance user experience.\n2. **Improve Accessibility**: Past user feedback has pointed out accessibility issues. Implementing ARIA roles and ensuring color contrast could be beneficial. Consider using tools like Lighthouse to audit accessibility.\n3. **Optimize Asset Loading**: There are opportunities to lazy-load images and scripts to improve page load times, as noted in previous performance audits. This could significantly enhance the user experience on slower networks.\n4. **Enhance State Management**: Transitioning to a more robust state management solution like Redux could address issues raised in past bug reports, particularly those related to data consistency.\n5. **Implement Responsive Design**: Ensuring the application is fully responsive was a common request in user surveys. Use CSS Grid and Flexbox to create a fluid layout that adapts to different screen sizes.",
                    action: "IDEATION",
                },
            },
        ],
        [
            {
                user: "{{user3}}",
                content: {
                    text: "Can you suggest backend improvements for user3/repo3?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are some backend improvement suggestions, taking into account the repository's history and current state:\n\n1. **Optimize API Endpoints**: Previous performance tests indicate that certain API endpoints could be optimized for faster response times. Consider implementing pagination for data-heavy endpoints.\n2. **Implement Caching Strategies**: Introducing caching for frequently accessed data could significantly reduce server load, as discussed in past meetings. Tools like Redis could be beneficial here.\n3. **Enhance Security Protocols**: A security audit revealed potential vulnerabilities that should be addressed to protect user data. Implementing OAuth 2.0 for authentication could enhance security.\n4. **Improve Error Logging**: Enhancing the logging system to capture more detailed error information could aid in faster debugging, as suggested in recent retrospectives. Consider using structured logging with tools like Logstash.\n5. **Refactor Monolithic Services**: Consider breaking down monolithic services into microservices to improve scalability and maintainability. This approach was recommended in previous architecture reviews.",
                    action: "IDEATION",
                },
            },
        ],
        [
            {
                user: "{{user4}}",
                content: {
                    text: "What are some ideas for improving the deployment process of user4/repo4?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are some deployment process improvement ideas, informed by past deployment logs and team feedback:\n\n1. **Automate Deployment with CI/CD**: Implementing a CI/CD pipeline could streamline the deployment process and reduce manual errors, as previously discussed. GitHub Actions or Jenkins could be used for this purpose.\n2. **Implement Blue-Green Deployments**: This strategy could minimize downtime and allow for safer rollbacks, which was a concern raised in past incidents. It also provides a seamless user experience during updates.\n3. **Containerize Applications**: Using Docker to containerize applications can ensure consistency across environments, as suggested in previous technical meetings. This approach also simplifies scaling and deployment.\n4. **Monitor Deployment Metrics**: Setting up monitoring tools to track deployment success and application performance post-deployment could provide valuable insights. Tools like Prometheus and Grafana could be integrated for real-time monitoring.\n5. **Optimize Build Process**: Reviewing and optimizing the build process to reduce build times was a recurring theme in past developer feedback. Consider using parallel builds and caching strategies to speed up the process.",
                    action: "IDEATION",
                },
            },
        ],
    ],
};

export const githubIdeationPlugin: Plugin = {
    name: "githubIdeation",
    description: "Integration with GitHub for ideation and co-creation",
    actions: [ideationAction],
    evaluators: [],
    providers: [],
};