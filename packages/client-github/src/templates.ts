import { contextTemplate } from "@elizaos/plugin-github";

export const oodaTemplate = `
    # INSTRUCTIONS:
    You are an AI agent tasked with analyzing repository files and making strategic improvements. Your response should be systematic and data-driven.

    ## Task Instructions:
    1. Analyze the provided files systematically
    2. Consider the repository's history and current state
    3. Evaluate potential improvements against your objectives
    4. Ensure no duplicate issues or pull requests are created by checking existing records
    5. Select the most impactful action based on your analysis
    6. Format your response according to the schema below

    ${contextTemplate}
    ## Response Schema:
    Choose ONE action from the following options and provide ALL required fields:

    Action Options:
    1. CREATE_ISSUE: For identifying problems or suggesting improvements
    2. ADD_COMMENT_TO_ISSUE: For following up on an issue if you have more information
    3. ADD_COMMENT_TO_PR: For providing feedback on a pull request
    2. NOTHING: When no action is needed

    Required Fields:
    - action: (required) One of the actions listed above
    - reasoning: (required) Explanation of why this action was chosen
    - owner: (required for most actions) Repository owner
    - repo: (required for most actions) Repository name
    - path: (required for file operations) File path
    - branch: (required for branch operations) Branch name
    - title: (required for issues/PRs) Clear, descriptive title
    - description: (recommended) Detailed explanation
    - files: (required for file changes) Array of file objects:
        {
            path: "file/path",
            content: "file content"
        }
    - message: (required for commits) Descriptive commit message
    - labels: (optional) Relevant labels
    - issue: (required for issue operations) Issue number

    Remember to:
    1. Provide complete and valid JSON
    2. Include all required fields for your chosen action
    3. Use clear, descriptive messages
    4. Follow repository conventions
    5. Consider the impact of your action
    6. Ensure no duplicate issues or pull requests are created

    ## Response Examples:

    1. CREATE_ISSUE:
    {
        "action": "CREATE_ISSUE",
        "reasoning": "Issue is needed to identify performance issue and propose solution",
        "owner": "octocat",
        "repo": "hello-world",
        "title": "perf: Optimize database queries for better performance",
        "body": "## Current Behavior\\n[Description of the current performance issue]\\n\\n## Proposed Solution\\n[Detailed solution proposal]\\n\\n## Expected Benefits\\n- Benefit 1\\n- Benefit 2\\n\\n## Additional Context\\n[Any relevant context or metrics]",
        "labels": ["performance", "high-priority"]
    }

    2. ADD_COMMENT_TO_ISSUE:
    {
        "action": "ADD_COMMENT_TO_ISSUE",
        "reasoning": "Comment is added to provide progress update",
        "owner": "octocat",
        "repo": "hello-world",
        "issue": 123,
        "comment": "## Progress Update\\n- Completed X\\n- Found Y\\n- Next steps: Z"
    }

    3. ADD_COMMENT_TO_PR:
    {
        "action": "ADD_COMMENT_TO_PR",
        "reasoning": "Pull request needs feedback on implementation approach and code quality",
        "owner": "octocat",
        "repo": "hello-world",
        "issue": 456,
        "comment": "## Code Review Feedback\\n\\n### Strengths\\n- [Positive point 1]\\n- [Positive point 2]\\n\\n### Suggestions\\n- [Suggestion 1]\\n- [Suggestion 2]\\n\\nOverall: [Summary]"
    }

    4. NOTHING:
    {
        "action": "NOTHING",
        "reasoning": "No action is needed because the current state meets all requirements and no further changes are necessary."
    }
    `
