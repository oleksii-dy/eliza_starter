import {
  type Action,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import { GitHubService } from '../services/github';
import { CreateRepositoryOptions, GitHubRepository } from '../types';

// Get Repository Action
export const getRepositoryAction: Action = {
  name: 'GET_GITHUB_REPOSITORY',
  similes: ['CHECK_REPO', 'FETCH_REPOSITORY', 'REPO_INFO', 'INSPECT_REPO'],
  description: 'Retrieves information about a GitHub repository',

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined
  ): Promise<boolean> => {
    const githubService = runtime.getService<GitHubService>('github');
    return !!githubService;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options: { owner?: string; repo?: string } = {},
    callback?: HandlerCallback
  ) => {
    try {
      const githubService = runtime.getService<GitHubService>('github');
      if (!githubService) {
        throw new Error('GitHub service not available');
      }

      // Extract owner and repo from message text or options
      const text = message.content.text || '';
      const ownerRepoMatch = text.match(/(?:github\.com\/)?([^\/\s]+)\/([^\/\s]+)/);

      const owner = options.owner || ownerRepoMatch?.[1] || runtime.getSetting('GITHUB_OWNER');
      const repo = options.repo || ownerRepoMatch?.[2];

      if (!owner || !repo) {
        throw new Error(
          'Repository owner and name are required. Please specify as "owner/repo" or provide them in options'
        );
      }

      logger.info(`Getting repository information for ${owner}/${repo}`);
      const repository = await githubService.getRepository(owner, repo);

      const responseContent: Content = {
        text: `Repository: ${repository.full_name}
Description: ${repository.description || 'No description'}
Language: ${repository.language || 'Unknown'}
Stars: ${repository.stargazers_count}
Forks: ${repository.forks_count}
Open Issues: ${repository.open_issues_count}
Private: ${repository.private ? 'Yes' : 'No'}
Created: ${new Date(repository.created_at).toLocaleDateString()}
Last Updated: ${new Date(repository.updated_at).toLocaleDateString()}
URL: ${repository.html_url}`,
        actions: ['GET_GITHUB_REPOSITORY'],
        source: message.content.source,
        // Include data for callbacks
        repository,
        owner,
        repo,
      };

      if (callback) {
        await callback(responseContent);
      }

      // Return result for chaining
      return {
        text: responseContent.text,
        values: {
          repository,
          owner,
          repo,
        },
        data: {
          repository,
          github: {
            ...state?.github,
            lastRepository: repository,
            repositories: {
              ...state?.github?.repositories,
              [repository.full_name]: repository,
            },
          },
        },
      };
    } catch (error) {
      logger.error('Error in GET_GITHUB_REPOSITORY action:', error);
      const errorContent: Content = {
        text: `Failed to get repository information: ${error instanceof Error ? error.message : String(error)}`,
        actions: ['GET_GITHUB_REPOSITORY'],
        source: message.content.source,
      };

      if (callback) {
        await callback(errorContent);
      }

      return errorContent;
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Get information about elizaOS/eliza repository',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: 'Repository: elizaOS/eliza\nDescription: Eliza is a simple, fast, and lightweight AI agent framework\nLanguage: TypeScript\nStars: 1234\nForks: 567\nOpen Issues: 42\nPrivate: No\nCreated: 1/15/2024\nLast Updated: 3/20/2024\nURL: https://github.com/elizaOS/eliza',
          actions: ['GET_GITHUB_REPOSITORY'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'Check the nodejs/node repository and then list its open issues',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: "First, let me get information about the nodejs/node repository...\n\nRepository: nodejs/node\nDescription: Node.js JavaScript runtime\nLanguage: JavaScript\nStars: 98765\nForks: 26543\nOpen Issues: 1532\nPrivate: No\nCreated: 5/27/2014\nLast Updated: 3/21/2024\nURL: https://github.com/nodejs/node\n\nNow I'll list the open issues for this repository...",
          actions: ['GET_GITHUB_REPOSITORY', 'LIST_GITHUB_ISSUES'],
        },
      },
    ],
  ],
};

// List Repositories Action
export const listRepositoriesAction: Action = {
  name: 'LIST_GITHUB_REPOSITORIES',
  similes: ['LIST_REPOS', 'MY_REPOSITORIES', 'SHOW_REPOS'],
  description: 'Lists GitHub repositories for the authenticated user',

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined
  ): Promise<boolean> => {
    const githubService = runtime.getService<GitHubService>('github');
    return !!githubService;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options: {
      type?: 'all' | 'owner' | 'public' | 'private' | 'member';
      sort?: 'created' | 'updated' | 'pushed' | 'full_name';
      limit?: number;
    } = {},
    callback?: HandlerCallback
  ) => {
    try {
      const githubService = runtime.getService<GitHubService>('github');
      if (!githubService) {
        throw new Error('GitHub service not available');
      }

      const repositories = await githubService.listRepositories({
        type: options.type || 'owner',
        sort: options.sort || 'updated',
        per_page: options.limit || 10,
      });

      const repoList = repositories
        .map(
          (repo: any) =>
            `• ${repo.full_name} (${repo.language || 'Unknown'}) - ⭐ ${repo.stargazers_count}`
        )
        .join('\n');

      const responseContent: Content = {
        text: `Your repositories (${repositories.length} shown):\n${repoList}`,
        actions: ['LIST_GITHUB_REPOSITORIES'],
        source: message.content.source,
        // Include data for callbacks
        repositories,
        repositoryCount: repositories.length,
      };

      if (callback) {
        await callback(responseContent);
      }

      // Return result for chaining
      return {
        text: responseContent.text,
        values: {
          repositories,
          repositoryCount: repositories.length,
        },
        data: {
          repositories,
          github: {
            ...state?.github,
            lastRepositories: repositories,
            repositories: {
              ...state?.github?.repositories,
              ...repositories.reduce(
                (acc: any, repo: any) => {
                  acc[repo.full_name] = repo;
                  return acc;
                },
                {} as Record<string, any>
              ),
            },
          },
        },
      };
    } catch (error) {
      logger.error('Error in LIST_GITHUB_REPOSITORIES action:', error);
      const errorContent: Content = {
        text: `Failed to list repositories: ${error instanceof Error ? error.message : String(error)}`,
        actions: ['LIST_GITHUB_REPOSITORIES'],
        source: message.content.source,
      };

      if (callback) {
        await callback(errorContent);
      }

      return errorContent;
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Show me my repositories',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: 'Your repositories (3 shown):\n• user/awesome-project (JavaScript) - ⭐ 25\n• user/my-plugin (TypeScript) - ⭐ 8\n• user/test-repo (Python) - ⭐ 2',
          actions: ['LIST_GITHUB_REPOSITORIES'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'List my most recent repositories and check which ones have open pull requests',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: "Your repositories (5 shown):\n• user/active-project (TypeScript) - ⭐ 45\n• user/new-feature (JavaScript) - ⭐ 12\n• user/api-client (Python) - ⭐ 8\n• user/docs-site (Markdown) - ⭐ 3\n• user/test-app (Go) - ⭐ 1\n\nNow I'll check for open pull requests in each repository...",
          actions: ['LIST_GITHUB_REPOSITORIES', 'LIST_GITHUB_PULL_REQUESTS'],
        },
      },
    ],
  ],
};

// Create Repository Action
export const createRepositoryAction: Action = {
  name: 'CREATE_GITHUB_REPOSITORY',
  similes: ['NEW_REPO', 'MAKE_REPOSITORY', 'CREATE_REPO'],
  description: 'Creates a new GitHub repository',

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined
  ): Promise<boolean> => {
    const githubService = runtime.getService<GitHubService>('github');
    return !!githubService;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options: any = {},
    callback?: HandlerCallback
  ) => {
    try {
      const githubService = runtime.getService<GitHubService>('github');
      if (!githubService) {
        throw new Error('GitHub service not available');
      }

      // Extract repository name from message text or options
      const text = message.content.text || '';
      const nameMatch = text.match(
        /(?:create|make|new)\s+(?:repo(?:sitory)?\s+)?(?:called\s+)?["\']?([a-zA-Z0-9_-]+)["\']?/i
      );

      const name = options.name || nameMatch?.[1];

      if (!name) {
        throw new Error(
          'Repository name is required. Please specify the name of the repository to create'
        );
      }

      // Extract description if present
      const descMatch = text.match(/(?:description|desc|about):\s*["\']?([^"'\n]+)["\']?/i);
      const description = options.description || descMatch?.[1];

      // Check for private/public keywords
      const isPrivate =
        options.private !== undefined
          ? options.private
          : text.includes('private')
            ? true
            : text.includes('public')
              ? false
              : false;

      const repositoryOptions: CreateRepositoryOptions = {
        name,
        description,
        private: isPrivate,
        auto_init: options.auto_init !== undefined ? options.auto_init : true,
        gitignore_template: options.gitignore_template,
        license_template: options.license_template,
        ...options,
      };

      logger.info(`Creating repository: ${name}`);
      const repository = await githubService.createRepository(repositoryOptions);

      const responseContent: Content = {
        text: `Successfully created repository: ${repository.full_name}
Description: ${repository.description || 'No description'}
Private: ${repository.private ? 'Yes' : 'No'}
URL: ${repository.html_url}
Clone URL: ${repository.clone_url}`,
        actions: ['CREATE_GITHUB_REPOSITORY'],
        source: message.content.source,
        // Include data for callbacks
        repository,
        repositoryUrl: repository.html_url,
        cloneUrl: repository.clone_url,
      };

      if (callback) {
        await callback(responseContent);
      }

      // Return result for chaining
      return {
        text: responseContent.text,
        values: {
          repository,
          repositoryUrl: repository.html_url,
          cloneUrl: repository.clone_url,
        },
        data: {
          repository,
          github: {
            ...state?.github,
            lastRepository: repository,
            lastCreatedRepository: repository,
            repositories: {
              ...state?.github?.repositories,
              [repository.full_name]: repository,
            },
          },
        },
      };
    } catch (error) {
      logger.error('Error in CREATE_GITHUB_REPOSITORY action:', error);
      const errorContent: Content = {
        text: `Failed to create repository: ${error instanceof Error ? error.message : String(error)}`,
        actions: ['CREATE_GITHUB_REPOSITORY'],
        source: message.content.source,
      };

      if (callback) {
        await callback(errorContent);
      }

      return errorContent;
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Create a new repository called my-awesome-project with description: "A really cool project" and make it public',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: 'Successfully created repository: user/my-awesome-project\nDescription: A really cool project\nPrivate: No\nURL: https://github.com/user/my-awesome-project\nClone URL: https://github.com/user/my-awesome-project.git',
          actions: ['CREATE_GITHUB_REPOSITORY'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'Create a private repository called "secret-project" and then create an initial issue for setting up the README',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: "Successfully created repository: user/secret-project\nDescription: No description\nPrivate: Yes\nURL: https://github.com/user/secret-project\nClone URL: https://github.com/user/secret-project.git\n\nNow I'll create an initial issue for setting up the README...",
          actions: ['CREATE_GITHUB_REPOSITORY', 'CREATE_GITHUB_ISSUE'],
        },
      },
    ],
  ],
};

// Search Repositories Action
export const searchRepositoriesAction: Action = {
  name: 'SEARCH_GITHUB_REPOSITORIES',
  similes: ['FIND_REPOS', 'SEARCH_REPOS', 'REPO_SEARCH'],
  description: 'Searches for GitHub repositories based on query',

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined
  ): Promise<boolean> => {
    const githubService = runtime.getService<GitHubService>('github');
    return !!githubService;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options: {
      query?: string;
      sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
      limit?: number;
    } = {},
    callback?: HandlerCallback
  ) => {
    try {
      const githubService = runtime.getService<GitHubService>('github');
      if (!githubService) {
        throw new Error('GitHub service not available');
      }

      // Extract search query from message text or options
      const text = message.content.text || '';
      const queryMatch = text.match(
        /(?:search|find|look for)\s+(?:repos?(?:itories?)?\s+)?(?:for\s+)?["\']?([^"'\n]+?)["\']?(?:\s|$)/i
      );

      const query = options.query || queryMatch?.[1];

      if (!query) {
        throw new Error('Search query is required. Please specify what repositories to search for');
      }

      logger.info(`Searching repositories for: ${query}`);
      const searchResult = await githubService.searchRepositories(query, {
        sort: options.sort || 'stars',
        per_page: options.limit || 10,
      });

      const repoList = searchResult.items
        .map(
          (repo: any) =>
            `• ${repo.full_name} (${repo.language || 'Unknown'}) - ⭐ ${repo.stargazers_count}\n  ${repo.description || 'No description'}`
        )
        .join('\n');

      const responseContent: Content = {
        text: `Found ${searchResult.total_count} repositories for "${query}" (showing ${searchResult.items.length}):\n${repoList}`,
        actions: ['SEARCH_GITHUB_REPOSITORIES'],
        source: message.content.source,
        // Include data for callbacks
        repositories: searchResult.items,
        query,
        totalCount: searchResult.total_count,
      };

      if (callback) {
        await callback(responseContent);
      }

      // Return result for chaining
      return {
        text: responseContent.text,
        values: {
          repositories: searchResult.items,
          query,
          totalCount: searchResult.total_count,
        },
        data: {
          repositories: searchResult.items,
          github: {
            ...state?.github,
            lastSearchResults: searchResult,
            lastSearchQuery: query,
            repositories: {
              ...state?.github?.repositories,
              ...searchResult.items.reduce(
                (acc: any, repo: any) => {
                  acc[repo.full_name] = repo;
                  return acc;
                },
                {} as Record<string, any>
              ),
            },
          },
        },
      };
    } catch (error) {
      logger.error('Error in SEARCH_GITHUB_REPOSITORIES action:', error);
      const errorContent: Content = {
        text: `Failed to search repositories: ${error instanceof Error ? error.message : String(error)}`,
        actions: ['SEARCH_GITHUB_REPOSITORIES'],
        source: message.content.source,
      };

      if (callback) {
        await callback(errorContent);
      }

      return errorContent;
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Search for repositories about machine learning',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: 'Found 50000 repositories for "machine learning" (showing 10):\n• tensorflow/tensorflow (C++) - ⭐ 185000\n  An Open Source Machine Learning Framework for Everyone\n• scikit-learn/scikit-learn (Python) - ⭐ 59000\n  Machine learning library for Python',
          actions: ['SEARCH_GITHUB_REPOSITORIES'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'Find repositories about React hooks and check the most popular one for recent activity',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: 'Found 15000 repositories for "React hooks" (showing 10):\n• rehooks/awesome-react-hooks (JavaScript) - ⭐ 9500\n  A collection of awesome React Hooks\n• streamich/react-use (TypeScript) - ⭐ 38000\n  React Hooks — 👍\n• alibaba/hooks (TypeScript) - ⭐ 12000\n  A high-quality & reliable React Hooks library\n\nLet me check the most popular one (streamich/react-use) for recent activity...',
          actions: ['SEARCH_GITHUB_REPOSITORIES', 'GET_GITHUB_ACTIVITY'],
        },
      },
    ],
  ],
};
