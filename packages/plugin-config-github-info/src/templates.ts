export const configGithubInfoTemplate = `
Extract the details for configuring the GitHub repository:
- **owner** (string): The owner of the GitHub repository (e.g., "octocat")
- **repo** (string): The name of the GitHub repository (e.g., "hello-world")
- **branch** (string): The branch of the GitHub repository (e.g., "main")

Provide the repository details in the following JSON format:

\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "branch": "<branch>"
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;
