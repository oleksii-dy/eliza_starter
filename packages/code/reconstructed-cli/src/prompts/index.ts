// Prompt system based on original Claude CLI patterns

export interface PromptCommand {
  type: 'prompt';
  name: string;
  description: string;
  isEnabled: () => boolean;
  isHidden: boolean;
  progressMessage?: string;
  userFacingName: () => string;
  getPromptForCommand: () => Promise<Array<{ type: string; text: string }>>;
}

// System prompts from original
export const SYSTEM_PROMPTS = {
  main: (appName: string) => 
    `You are ${appName}, Anthropic's official CLI for Autocoder.`,
  
  agent: (appName: string) => [
    `You are an agent for ${appName}, Anthropic's official CLI for Autocoder. Given the user's message, you should use the tools available to complete the task. Do what has been asked; nothing more, nothing less. When you complete the task simply respond with a detailed summary of what you've done.`
  ],

  bashProcessor: [
    `Your task is to process Bash commands that an AI coding agent wants to run.`,
    `Extract any file paths that this command reads or modifies. For commands like "git diff" and "cat", include the paths of files being shown. Use paths verbatim -- don't add any slashes unless they appear in the actual command.`
  ],

  gitHistory: [
    `You are an expert at analyzing git history. Given a list of files and their modification counts, return exactly five filenames that are frequently modified and represent core application files.`
  ],

  issueTitle: [
    `Generate a concise, technical issue title (max 80 chars) for a GitHub issue based on this bug report. The title should:`,
    `- Be specific and descriptive of the actual problem`,
    `- Use technical terms appropriately`
  ],

  topicAnalysis: [
    `Analyze if this message indicates a new conversation topic. If it does, extract a 2-3 word title that captures the new topic. Format your response as a JSON object with two fields: 'is_new_topic' (boolean) and 'topic_title' (string or null).`
  ]
};

// Command prompts from original
export const COMMAND_PROMPTS: Record<string, PromptCommand> = {
  init: {
    type: 'prompt',
    name: 'init',
    description: 'Initialize a new CLAUDE.md file with codebase documentation',
    isEnabled: () => true,
    isHidden: false,
    progressMessage: 'analyzing your codebase',
    userFacingName: () => 'init',
    async getPromptForCommand() {
      return [{
        type: 'text',
        text: `Please analyze this codebase and create a CLAUDE.md file, which will be given to future instances of Autocoder to operate in this repository.
          
What to add:
1. Commands that will be commonly used, such as how to build, lint, and run tests. Include the necessary commands to develop in this codebase, such as how to run a single test.
2. High-level code architecture and structure so that future instances can be productive more quickly. Focus on the "big picture" architecture that requires reading multiple files to understand

Usage notes:
- If there's already a CLAUDE.md, suggest improvements to it.
- When you make the initial CLAUDE.md, do not repeat yourself and do not include obvious instructions like "Provide helpful error messages to users", "Write unit tests for all new utilities", "Never include sensitive information (API keys, tokens) in code or commits" 
- Avoid listing every component or file structure that can be easily discovered
- Don't include generic development practices
- If there are Cursor rules (in .cursor/rules/ or .cursorrules) or Copilot rules (in .github/copilot-instructions.md), make sure to include the important parts.
- If there is a README.md, make sure to include the important parts. 
- Do not make up information such as "Common Development Tasks", "Tips for Development", "Support and Documentation" unless this is expressly included in other files that you read.
- Be sure to prefix the file with the following text:

\`\`\`
# CLAUDE.md

This file provides guidance to Autocoder (claude.ai/code) when working with code in this repository.
\`\`\``
      }];
    }
  }
};

// Tool state indicators from original
export function getToolStateIndicator(mode: string): string {
  switch (mode) {
    case 'tool-input':
      return '⚒ ';  // Tool symbol
    case 'tool-use':
      return '⚒ ';  // Tool in use
    case 'responding':
      return '↓ ';  // Arrow down
    case 'thinking':
      return '↓ ';  // Arrow down
    case 'requesting':
      return '↑ ';  // Arrow up
    default:
      return '';
  }
}

// Permission prompts from original
export const PERMISSION_PROMPTS = {
  toolUse: (toolName: string) => ({
    message: `Autocoder requested permissions to use ${toolName}, but you haven't granted it yet.`,
    choices: [
      { label: 'Yes, allow this time', value: 'temporary' },
      { label: 'Yes, allow for this session', value: 'session' },
      { label: 'Yes, always allow', value: 'permanent' },
      { label: 'No, and tell Autocoder what to do differently', value: 'reject' }
    ]
  }),

  fileRead: (path: string) => ({
    message: `Autocoder requested permissions to read from ${path}, but you haven't granted it yet.`
  }),

  fileWrite: (path: string) => ({
    message: `Autocoder requested permissions to write to ${path}, but you haven't granted it yet.`
  }),

  urlFetch: (hostname: string) => ({
    message: `Autocoder wants to fetch content from ${hostname}`,
    prompt: 'Do you want to allow Autocoder to fetch this content?'
  })
};

// Plan approval prompts from original
export const PLAN_PROMPTS = {
  approval: {
    title: "Here is Autocoder's plan:",
    choices: [
      { label: 'Approve', value: 'approve' },
      { label: 'Modify', value: 'modify' },
      { label: 'Cancel', value: 'cancel' }
    ]
  },

  userApproved: "User approved Autocoder's plan:",
  userRejected: "User rejected Autocoder's plan:"
}; 