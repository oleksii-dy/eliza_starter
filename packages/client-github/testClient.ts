import { GitHubClientInterface } from "@elizaos/client-github";

(async () => {
    try {
        console.log("Initializing GitHub Client...");
        const client = await GitHubClientInterface.start({});  // Use actual runtime if required

        console.log("Client initialized successfully!");

        // Test repository cloning
        console.log("Testing repository clone...");
        await client.initialize();
        console.log("Repository cloned successfully!");

        // Test creating memories from files
        console.log("Testing memory creation...");
        await client.createMemoriesFromFiles();
        console.log("Memories created!");

        // Test creating a pull request
        console.log("Testing pull request creation...");
        await client.createPullRequest(
            "Feature: Testing PR",
            "test-branch",
            [
                {
                    path: "src/test-file.txt",
                    content: "This is a test commit for PR"
                }
            ],
            "Adding a test file for PR testing"
        );
        console.log("Pull request created!");

        // Test direct commit
        console.log("Testing commit creation...");
        await client.createCommit(
            "Test commit",
            [
                {
                    path: "src/test-commit.txt",
                    content: "This is a test commit"
                }
            ]
        );
        console.log("Commit pushed successfully!");

    } catch (error) {
        console.error("Error during testing:", error);
    }
})();
