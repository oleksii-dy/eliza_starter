import { contextTemplate } from "@elizaos/plugin-github";

// TODO: Improve client prompt so it doesn't do the same action type over and over again (monil)
// Ideate make more useful (monil)

// TODO: Improve individual action prompts because Each action does not properly consider previous actions it took and keeps generating the same action content (snobbee)
// TODO: Have a way to prevent duplicates potentially hae separate llm post process to explicitly check for duplicates (snobbee)
// TODO: Make sure previous issues / pull requests from repo are considered (snobbee)

export const oodaTemplate = `
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

    Determine the appropriate action based on the following criteria:
    1. CREATE_ISSUE:
        - When a new bug, feature request, or task is identified that is not already tracked.
        - Criteria:
            - The issue is not a duplicate of an existing issue. You can find the existing issues under the section "Previous Github Issues".
            - The problem described in the issue is not already being worked on by another issue. You can find the existing issues under the section "Previous Github Issues".
            - Make sure the issue title is not a duplicate of an existing issue. You can find the existing issues under the section "Previous Github Issues".
            - The issue has a significant impact on the project.
            - The issue can be clearly described with specific details and examples.

    2. COMMENT_ON_PULL_REQUEST:
        - When feedback or suggestions are needed for an open pull request.
        - Criteria:
            - The comment addresses specific lines of code or overall implementation.
            - The comment is constructive and helps improve the pull request.
    3. COMMENT_ON_ISSUE:
        - When additional information or clarification is needed for an existing issue.
        - Criteria:
            - The comment provides valuable insights or updates.
            - The comment helps in progressing the resolution of the issue.
    4. CLOSE_ISSUE:
        - When an issue has been resolved or is no longer relevant.
        - Criteria:
            - The issue has been fixed, and the solution has been verified.
            - The issue is a duplicate or no longer applicable.
    5. CLOSE_PR:
        - When a pull request is no longer needed or has been superseded.
        - Criteria:
            - The pull request has been merged or is no longer relevant.
            - The pull request does not meet the project's standards or requirements.
    6. MERGE_PR:
        - When a pull request has been approved and is ready to be merged.
        - Criteria:
            - The pull request has been approved by the necessary reviewers.
            - The pull request is ready to be merged into the target branch.
    7. NOTHING:
        - This action should ONLY be chosen as an absolute last resort, after exhaustively evaluating all other possible actions.
        - Criteria:
            - Every other action (CREATE_ISSUE, COMMENT_ON_ISSUE, etc.) has been carefully considered and definitively ruled out.
            - The repository is in an optimal state with no pending work items requiring attention.
            - All open issues and pull requests have recent activity and don't need intervention.
            - No code improvements, bugs, or potential enhancements can be identified.
            - No ongoing discussions would benefit from additional feedback or reactions.
            - WARNING: This action indicates a complete lack of needed work. Be extremely certain no other actions are appropriate before selecting it.

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
        "issue": "Issue number (required for issue operations)",
        "pullRequest": "Pull request number (required for PR operations)",
        "reaction": "Reaction type (required for reaction operations)"
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

    2. COMMENT_ON_ISSUE:
    {
        "action": "ADD_COMMENT_TO_ISSUE",
        "reasoning": "Providing more information about the issue",
        "owner": "octocat",
        "repo": "hello-world",
        "issue": 123,
        "comment": "I've found a potential solution to the issue."
    }

    3. COMMENT_ON_PULL_REQUEST:
    {
        "action": "ADD_COMMENT_TO_PR",
        "reasoning": "Providing constructive feedback on the changes proposed in the PR",
        "owner": "octocat",
        "repo": "hello-world",
        "pullRequest": 456,
        "comment": "## Code Review Feedback\\n\\n### Strengths\\n- [Positive point 1]\\n- [Positive point 2]\\n\\n### Suggestions\\n- [Suggestion 1]\\n- [Suggestion 2]\\n\\nOverall: [Summary]"
    }

    4. CLOSE_ISSUE:
    {
        "action": "CLOSE_ISSUE",
        "reasoning": "The issue has been resolved and verified.",
        "owner": "octocat",
        "repo": "hello-world",
        "issue": 123
    }
    {
        "action": "CLOSE_ISSUE",
        "reasoning": "The issue is a duplicate of another issue.",
        "owner": "octocat",
        "repo": "hello-world",
        "issue": 124
    }
    {
        "action": "CLOSE_ISSUE",
        "reasoning": "The issue was a duplicate and has been closed.",
        "owner": "octocat",
        "repo": "hello-world",
        "issue": 125
    }

    5. CLOSE_PR:
    {
        "action": "CLOSE_PR",
        "reasoning": "The pull request is no longer needed as the changes have been incorporated elsewhere.",
        "owner": "octocat",
        "repo": "hello-world",
        "pullRequest": 456
    }
    {
        "action": "CLOSE_PR",
        "reasoning": "The pull request is a duplicate of another pull request.",
        "owner": "octocat",
        "repo": "hello-world",
        "pullRequest": 457
    }
    {
        "action": "CLOSE_PR",
        "reasoning": "The pull request was opened by mistake and is a duplicate.",
        "owner": "octocat",
        "repo": "hello-world",
        "pullRequest": 458
    }

    6. REACT_TO_ISSUE:
    {
        "action": "REACT_TO_ISSUE",
        "reasoning": "Expressing agreement with the issue's importance.",
        "owner": "octocat",
        "repo": "hello-world",
        "issue": 123,
        "reaction": "+1"
    }

    7. REACT_TO_PR:
    {
        "action": "REACT_TO_PR",
        "reasoning": "Acknowledging the effort put into the pull request.",
        "owner": "octocat",
        "repo": "hello-world",
        "pullRequest": 456,
        "reaction": "heart"
    }

    8. MERGE_PULL_REQUEST:
    {
        "action": "MERGE_PULL_REQUEST",
        "reasoning": "The pull request has been approved and is ready to be merged.",
        "owner": "octocat",
        "repo": "hello-world",
        "pullRequest": 456
    }

    9. NOTHING:
    {
        "action": "NOTHING",
        "reasoning": "No action is needed because all open PRs have been commented on or there are no open PRs."
    }
    `;
