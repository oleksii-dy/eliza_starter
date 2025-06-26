// Tool definitions from original Claude CLI

export interface ToolSchema {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// These are the actual tools from the original CLI
export const CORE_TOOLS: Record<string, ToolSchema> = {
  // Bash command execution
  Bash: {
    name: 'Bash',
    description: 'Executes a given bash command in a persistent shell session with optional timeout, ensuring proper handling and security measures.',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The bash command to execute'
        },
        cwd: {
          type: 'string',
          description: 'Working directory for the command'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds'
        }
      },
      required: ['command']
    }
  },

  // File editing
  Edit: {
    name: 'Edit',
    description: 'Edit a file with specific changes',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to edit'
        },
        edits: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              old_string: {
                type: 'string',
                description: 'The exact string to replace'
              },
              new_string: {
                type: 'string',
                description: 'The new string to insert'
              }
            },
            required: ['old_string', 'new_string']
          }
        }
      },
      required: ['path', 'edits']
    }
  },

  // Multi-file editing
  MultiEdit: {
    name: 'MultiEdit',
    description: 'Edit multiple files with specific changes',
    input_schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              edits: { type: 'array' }
            }
          }
        }
      },
      required: ['files']
    }
  },

  // File reading
  Read: {
    name: 'Read',
    description: 'Read contents of a file',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to read'
        }
      },
      required: ['path']
    }
  },

  // File writing
  Write: {
    name: 'Write',
    description: 'Write contents to a file',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to write'
        },
        content: {
          type: 'string',
          description: 'Content to write to the file'
        }
      },
      required: ['path', 'content']
    }
  },

  // Notebook editing
  NotebookEdit: {
    name: 'NotebookEdit',
    description: 'Edit a Jupyter notebook',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the notebook file'
        },
        cell_index: {
          type: 'number',
          description: 'Index of the cell to edit'
        },
        new_content: {
          type: 'string',
          description: 'New content for the cell'
        }
      },
      required: ['path', 'cell_index', 'new_content']
    }
  },

  // Directory listing
  List: {
    name: 'List',
    description: 'List contents of a directory',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the directory'
        }
      },
      required: ['path']
    }
  },

  // URL fetching
  FetchURL: {
    name: 'FetchURL',
    description: 'Fetches content from a specified URL and processes it',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to fetch'
        }
      },
      required: ['url']
    }
  }
};

// Tool filtering based on allowed/disallowed patterns
export function filterTools(
  tools: Record<string, ToolSchema>,
  allowedTools: string[] = [],
  disallowedTools: string[] = []
): ToolSchema[] {
  const filtered: ToolSchema[] = [];

  for (const [name, schema] of Object.entries(tools)) {
    // Check if explicitly disallowed
    if (disallowedTools.some(pattern => matchesPattern(name, pattern))) {
      continue;
    }

    // If allowed list is specified, must match
    if (allowedTools.length > 0) {
      if (!allowedTools.some(pattern => matchesPattern(name, pattern))) {
        continue;
      }
    }

    filtered.push(schema);
  }

  return filtered;
}

function matchesPattern(name: string, pattern: string): boolean {
  // Support patterns like "Bash(git:*)"
  if (pattern.includes('(') && pattern.includes(')')) {
    const [toolName, subPattern] = pattern.split('(');
    return name.startsWith(toolName);
  }
  
  // Support wildcards
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return regex.test(name);
  }

  return name === pattern;
} 