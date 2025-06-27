import type {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import type { E2BService } from '../services/E2BService.js';
import {
  getTemplate,
  generateCode,
  listAllTemplates,
  suggestTemplates,
  getCategories,
  getTemplatesByCategory,
} from '../templates/index.js';

// Helper function to parse template requests
function parseTemplateRequest(text: string): {
  action: 'list' | 'run' | 'suggest' | 'categories';
  language?: 'javascript' | 'python';
  templateName?: string;
  category?: string;
  keywords?: string[];
  inputs?: Record<string, any>;
} {
  const lowerText = text.toLowerCase();

  // Check for list action
  if (lowerText.includes('list templates') || lowerText.includes('show templates')) {
    return { action: 'list' };
  }

  // Check for categories action
  if (lowerText.includes('categories') || lowerText.includes('what categories')) {
    const language = lowerText.includes('javascript') || lowerText.includes('js') ? 'javascript' :
                    lowerText.includes('python') || lowerText.includes('py') ? 'python' : undefined;
    return { action: 'categories', language };
  }

  // Check for suggest action
  if (lowerText.includes('suggest') || lowerText.includes('recommend')) {
    const words = text.split(/\\s+/).filter(word => word.length > 2);
    return { action: 'suggest', keywords: words };
  }

  // Check for run template action
  const runMatch = text.match(/(?:run|execute|use)\\s+(?:template\\s+)?([\\w-]+)(?:\\s+(?:with|using)\\s+(.+))?/i);
  if (runMatch) {
    const templateName = runMatch[1];
    const language = lowerText.includes('javascript') || lowerText.includes('js') ? 'javascript' :
                    lowerText.includes('python') || lowerText.includes('py') ? 'python' : 
                    'python'; // Default to Python

    // Parse inputs if provided
    let inputs: Record<string, any> = {};
    if (runMatch[2]) {
      try {
        // Try to parse as JSON
        inputs = JSON.parse(runMatch[2]);
      } catch {
        // If not JSON, treat as key=value pairs
        const pairs = runMatch[2].split(',');
        for (const pair of pairs) {
          const [key, value] = pair.split('=');
          if (key && value) {
            inputs[key.trim()] = value.trim();
          }
        }
      }
    }

    return { action: 'run', language, templateName, inputs };
  }

  // Check for category listing
  const categoryMatch = text.match(/(?:show|list)\\s+([\\w-]+)\\s+(?:templates|category)/i);
  if (categoryMatch) {
    const category = categoryMatch[1];
    const language = lowerText.includes('javascript') || lowerText.includes('js') ? 'javascript' :
                    lowerText.includes('python') || lowerText.includes('py') ? 'python' : undefined;
    return { action: 'list', language, category };
  }

  // Default to suggest based on all words
  const words = text.split(/\\s+/).filter(word => word.length > 2);
  return { action: 'suggest', keywords: words };
}

// Helper function to format template list
function formatTemplateList(templates: any[], title: string): string {
  if (templates.length === 0) {
    return `${title}: No templates found.`;
  }

  let output = `${title}:\\n`;
  
  // Group by category
  const byCategory: Record<string, any[]> = {};
  for (const template of templates) {
    if (!byCategory[template.category]) {
      byCategory[template.category] = [];
    }
    byCategory[template.category].push(template);
  }

  for (const [category, categoryTemplates] of Object.entries(byCategory)) {
    output += `\\n**${category.charAt(0).toUpperCase() + category.slice(1)}:**\\n`;
    for (const template of categoryTemplates) {
      const lang = template.language ? `[${template.language.toUpperCase()}]` : '';
      output += `  • \`${template.name}\` ${lang} - ${template.description}\\n`;
    }
  }

  return output;
}

export const executeTemplateAction: Action = {
  name: 'EXECUTE_TEMPLATE',
  description:
    'Execute pre-built code templates for JavaScript and Python. Supports listing, running, and suggesting templates.',

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    try {
      // Check if E2B service is available
      const e2bService = runtime.getService<E2BService>('e2b');
      if (!e2bService) {
        return false;
      }

      const text = message.content.text || '';
      
      // Check for template-related keywords
      const templateKeywords = [
        'template',
        'run template',
        'execute template',
        'use template',
        'list templates',
        'show templates',
        'template categories',
        'suggest template',
        'recommend template',
      ];

      return templateKeywords.some(keyword => 
        text.toLowerCase().includes(keyword)
      );
    } catch (error) {
      elizaLogger.error('Error validating template action', { error: error.message });
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      elizaLogger.info('Executing template action', { messageId: message.id });

      const e2bService = runtime.getService<E2BService>('e2b');
      if (!e2bService) {
        throw new Error('E2B service not available');
      }

      const text = message.content.text || '';
      const request = parseTemplateRequest(text);

      let responseText = '';
      let actionData: any = {};

      switch (request.action) {
        case 'list': {
          if (request.category && request.language) {
            const templates = getTemplatesByCategory(request.language, request.category);
            responseText = formatTemplateList(
              templates.map(t => ({ ...t, language: request.language })),
              `${request.language.charAt(0).toUpperCase() + request.language.slice(1)} Templates in "${request.category}" Category`
            );
          } else if (request.language) {
            const allTemplates = listAllTemplates().filter(t => t.language === request.language);
            responseText = formatTemplateList(allTemplates, `All ${request.language.charAt(0).toUpperCase() + request.language.slice(1)} Templates`);
          } else {
            const allTemplates = listAllTemplates();
            responseText = formatTemplateList(allTemplates, 'All Available Templates');
          }
          
          actionData = { templates: listAllTemplates() };
          break;
        }

        case 'categories': {
          if (request.language) {
            const categories = getCategories(request.language);
            responseText = `**${request.language.charAt(0).toUpperCase() + request.language.slice(1)} Template Categories:**\\n`;
            responseText += categories.map(cat => `  • ${cat}`).join('\\n');
          } else {
            const jsCategories = getCategories('javascript');
            const pyCategories = getCategories('python');
            responseText = '**Template Categories:**\\n\\n';
            responseText += '**JavaScript:** ' + jsCategories.join(', ') + '\\n\\n';
            responseText += '**Python:** ' + pyCategories.join(', ');
          }
          
          actionData = {
            javascript: getCategories('javascript'),
            python: getCategories('python'),
          };
          break;
        }

        case 'suggest': {
          if (!request.keywords || request.keywords.length === 0) {
            responseText = 'Please provide keywords to get template suggestions.';
            break;
          }

          const suggestions = suggestTemplates(request.keywords);
          if (suggestions.length === 0) {
            responseText = `No templates found matching keywords: ${request.keywords.join(', ')}`;
          } else {
            responseText = formatTemplateList(
              suggestions.slice(0, 10), // Limit to top 10
              `Template Suggestions for: ${request.keywords.join(', ')}`
            );
          }
          
          actionData = { suggestions, keywords: request.keywords };
          break;
        }

        case 'run': {
          if (!request.templateName || !request.language) {
            throw new Error('Template name and language are required');
          }

          elizaLogger.debug('Running template', {
            templateName: request.templateName,
            language: request.language,
            inputs: request.inputs,
          });

          // Get the template
          const template = getTemplate(request.language, request.templateName);
          if (!template) {
            throw new Error(`Template '${request.templateName}' not found for ${request.language}`);
          }

          // Generate code
          const code = generateCode(request.language, request.templateName, request.inputs);

          // Execute the code
          const result = await e2bService.executeCode(code, request.language);

          responseText = `**Template: ${template.name} (${request.language})**\\n`;
          responseText += `*${template.description}*\\n\\n`;

          if (result.error) {
            responseText += `❌ **Execution Error:**\\n`;
            responseText += `\`\`\`\\n${result.error.value}\\n\`\`\`\\n`;
            if (result.error.traceback) {
              responseText += `**Traceback:**\\n\`\`\`\\n${result.error.traceback}\\n\`\`\`\\n`;
            }
          } else {
            responseText += `✅ **Execution Successful**\\n\\n`;
            
            if (result.text) {
              responseText += `**Result:** \`${result.text}\`\\n\\n`;
            }

            if (result.logs.stdout.length > 0) {
              responseText += `**Output:**\\n\`\`\`\\n${result.logs.stdout.join('\\n')}\\n\`\`\`\\n`;
            }

            if (result.logs.stderr.length > 0) {
              responseText += `**Warnings:**\\n\`\`\`\\n${result.logs.stderr.join('\\n')}\\n\`\`\`\\n`;
            }
          }

          responseText += `\\n**Code Executed:**\\n\`\`\`${request.language}\\n${code}\\n\`\`\``;

          actionData = {
            template,
            executionResult: result,
            generatedCode: code,
            inputs: request.inputs,
          };
          break;
        }

        default:
          throw new Error(`Unknown template action: ${request.action}`);
      }

      const actionResult: ActionResult = {
        text: responseText,
        values: {
          success: true,
          action: request.action,
          language: request.language,
          templateName: request.templateName,
        },
        data: actionData,
      };

      elizaLogger.info('Template action completed', {
        action: request.action,
        language: request.language,
        templateName: request.templateName,
      });

      // Call callback if provided
      if (callback) {
        const content = {
          text: actionResult.text,
          ...(actionResult.values &&
            Object.keys(actionResult.values).length > 0 &&
            actionResult.values),
        };
        await callback(content);
      }

      return actionResult;
    } catch (error) {
      elizaLogger.error('Template action failed', { error: error.message });

      const errorResult: ActionResult = {
        text: `Failed to execute template: ${error.message}`,
        values: { success: false, error: error.message },
        data: { error: error.message },
      };

      if (callback) {
        const content = {
          text: errorResult.text,
          ...(errorResult.values &&
            Object.keys(errorResult.values).length > 0 &&
            errorResult.values),
        };
        await callback(content);
      }

      return errorResult;
    }
  },

  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'List all available templates' },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Here are all available templates organized by category and language...',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'Run template hello-world in Python' },
      },
      {
        name: '{{agentName}}',
        content: {
          text: '**Template: hello-world (python)**\\n*Simple Hello World example*\\n\\n✅ **Execution Successful**\\n\\n**Output:**\\n```\\nHello, World!\\n```',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'Show me JavaScript data processing templates' },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Here are the JavaScript templates in the "data-processing" category...',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'Suggest templates for sorting algorithms' },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Here are template suggestions for "sorting algorithms"...',
        },
      },
    ],
  ],
};