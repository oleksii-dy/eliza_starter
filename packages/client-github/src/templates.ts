import { contextTemplate } from "@elizaos/plugin-github";

export const oodaTemplate = `
    ## Task Instructions:
    1. Systematically analyze the provided files.
    2. Consider the repository's history and current state.
    3. Evaluate potential improvements against your objectives.
    4. Check existing records to avoid duplicate issues or pull requests.
    5. Select the most impactful action based on your analysis.
    6. Format your response according to the schema below.

    Context:
    ${contextTemplate}
    \`\`\`json
    {
        "action": "One of the actions listed below (required)",
        "reasoning": "Explanation of why this action was chosen (required)",
        "owner": "Repository owner (required for most actions)",
        "repo": "Repository name (required for most actions)",
        "path": "File path (required for file operations)",
        "branch": "Branch name (required for branch operations)",
        "title": "Clear, descriptive title (required for issues/PRs)",
        "description": "Detailed explanation (recommended)",
        "files": [
            {
                "path": "file/path",
                "content": "file content"
            }
        ],
        "message": "Descriptive commit message (required for commits)",
        "labels": "Relevant labels (optional)",
        "issue": "Issue number (required for issue operations)"
    }
    \`\`\`

    Examples:
    1. CREATE_ISSUE:
    {
        "action": "CREATE_ISSUE",
        "reasoning": "Identifying a problem in the codebase",
        "owner": "octocat",
        "repo": "hello-world",
        "title": "Improvement suggestion",
        "description": "The codebase could benefit from a more efficient data structure."
    }

    2. ADD_COMMENT_TO_ISSUE:
    {
        "action": "ADD_COMMENT_TO_ISSUE",
        "reasoning": "Providing more information about the issue",
        "owner": "octocat",
        "repo": "hello-world",
        "issue": 123,
        "comment": "I've found a potential solution to the issue."
    }

    3. ADD_COMMENT_TO_PR:
    {
        "action": "ADD_COMMENT_TO_PR",
        "reasoning": "Providing constructive feedback on the changes proposed in the PR",
        "owner": "octocat",
        "repo": "hello-world",
        "issue": 456,
        "comment": "## Code Review Feedback\\n\\n### Strengths\\n- [Positive point 1]\\n- [Positive point 2]\\n\\n### Suggestions\\n- [Suggestion 1]\\n- [Suggestion 2]\\n\\nOverall: [Summary]"
    }

    4. NOTHING:
    {
        "action": "NOTHING",
        "reasoning": "No action is needed because all open PRs have been commented on or there are no open PRs."
    }
    `
