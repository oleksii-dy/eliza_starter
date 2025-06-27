import type { Scenario, ScenarioSuite } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Comprehensive AutoCoder benchmarks testing advanced capabilities
 * These scenarios test complex coding tasks, refactoring, debugging, and optimization
 */

export const autocoderComplexRefactoring: Scenario = {
  id: 'autocoder-complex-refactoring',
  name: 'AutoCoder Complex Refactoring',
  description: 'Test AutoCoder ability to refactor legacy code into modern patterns',
  category: 'autocoder-advanced',
  tags: ['autocoder', 'refactoring', 'legacy-code', 'modern-patterns', 'advanced'],
  
  actors: [
    {
      id: uuidv4(),
      name: 'AutoCoder',
      role: 'subject',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning', '@elizaos/plugin-knowledge'],
      personality: {
        traits: ['analytical', 'methodical', 'experienced'],
        systemPrompt: 'You are a senior AutoCoder agent specializing in refactoring and modernizing legacy code. Apply best practices and modern patterns.',
      },
    },
    {
      id: uuidv4(),
      name: 'Senior Developer',
      role: 'observer',
    },
  ],

  setup: {
    roomType: 'dm',
    context: 'AutoCoder is refactoring a legacy JavaScript class to modern TypeScript',
    initialMessages: [
      {
        id: uuidv4(),
        content: `Refactor this legacy JavaScript code to modern TypeScript with proper types, async/await, and error handling:

\`\`\`javascript
function UserManager() {
  this.users = [];
  this.callbacks = {};
}

UserManager.prototype.addUser = function(user, callback) {
  var self = this;
  setTimeout(function() {
    if (user.name && user.email) {
      self.users.push(user);
      callback(null, user);
    } else {
      callback(new Error('Invalid user data'));
    }
  }, 100);
};

UserManager.prototype.findUser = function(id, callback) {
  var self = this;
  setTimeout(function() {
    var user = self.users.find(function(u) { return u.id === id; });
    callback(null, user);
  }, 50);
};
\`\`\`

Convert to modern TypeScript class with proper interfaces, async/await, and comprehensive error handling.`,
        sender: 'Senior Developer',
        timestamp: Date.now(),
      },
    ],
  },

  execution: {
    maxDuration: 240000, // 4 minutes
    maxSteps: 25,
    timeout: 90000,
    realApiCallsExpected: true,
  },

  verification: {
    rules: [
      {
        id: 'typescript-conversion',
        type: 'llm-evaluation',
        description: 'Verify conversion to proper TypeScript',
        config: {
          successCriteria: [
            'Converted to TypeScript class syntax',
            'Includes proper TypeScript interfaces',
            'Uses proper type annotations',
            'Eliminates use of var and function expressions',
          ],
          requiredKeywords: ['class', 'interface', 'async', 'await', 'Promise'],
          forbiddenKeywords: ['var', 'function()', 'prototype'],
          llmEnhancement: true,
        },
      },
      {
        id: 'modern-async-patterns',
        type: 'llm-evaluation',
        description: 'Verify modern async/await usage',
        config: {
          successCriteria: [
            'Replaced callbacks with async/await',
            'Proper Promise handling',
            'Eliminated callback hell patterns',
            'Uses modern error handling with try/catch',
          ],
          requiredKeywords: ['async', 'await', 'Promise', 'try', 'catch'],
          forbiddenKeywords: ['callback', 'setTimeout'],
          llmEnhancement: true,
        },
      },
      {
        id: 'error-handling-improvement',
        type: 'llm-evaluation',
        description: 'Verify improved error handling',
        config: {
          successCriteria: [
            'Uses proper TypeScript error types',
            'Implements comprehensive validation',
            'Provides meaningful error messages',
            'Handles edge cases properly',
          ],
          requiredKeywords: ['Error', 'throw', 'validate', 'try'],
          llmEnhancement: true,
        },
      },
      {
        id: 'best-practices-applied',
        type: 'llm-evaluation',
        description: 'Verify modern best practices applied',
        config: {
          successCriteria: [
            'Uses readonly for immutable properties',
            'Implements proper encapsulation',
            'Includes JSDoc documentation',
            'Follows SOLID principles',
          ],
          requiredKeywords: ['readonly', 'private', 'public', '/**'],
          llmEnhancement: true,
        },
      },
    ],
  },

  benchmarks: {
    maxDuration: 240000,
    maxSteps: 25,
    targetAccuracy: 0.9,
    customMetrics: [
      {
        name: 'refactoring_completeness',
        threshold: 0.9,
        target: 'complete modernization of legacy code',
      },
      {
        name: 'typescript_quality',
        threshold: 0.85,
        target: 'high-quality TypeScript implementation',
      },
      {
        name: 'modern_patterns_adoption',
        threshold: 0.8,
        target: 'proper use of modern JavaScript/TypeScript patterns',
      },
    ],
  },
};

export const autocoderDebuggingScenario: Scenario = {
  id: 'autocoder-debugging-scenario',
  name: 'AutoCoder Debugging and Bug Fixing',
  description: 'Test AutoCoder ability to identify and fix bugs in complex code',
  category: 'autocoder-advanced',
  tags: ['autocoder', 'debugging', 'bug-fixing', 'analysis', 'advanced'],
  
  actors: [
    {
      id: uuidv4(),
      name: 'AutoCoder',
      role: 'subject',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning', '@elizaos/plugin-knowledge'],
    },
    {
      id: uuidv4(),
      name: 'QA Engineer',
      role: 'observer',
    },
  ],

  setup: {
    roomType: 'dm',
    context: 'AutoCoder is debugging a failing data processing function',
    initialMessages: [
      {
        id: uuidv4(),
        content: `This function is supposed to process user data but has multiple bugs. Find and fix all issues:

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  preferences: string[];
}

function processUsers(users: User[]): { valid: User[], invalid: User[] } {
  const result = { valid: [], invalid: [] };
  
  for (let i = 0; i <= users.length; i++) {
    const user = users[i];
    
    if (user.name.length > 0 && user.email.includes('@') && user.age >= 18) {
      if (user.preferences.length > 0) {
        user.preferences.forEach(pref => {
          if (pref === 'newsletter') {
            user.email = user.email.toUpperCase();
          }
        });
      }
      result.valid.push(user);
    } else {
      result.invalid.push(user);
    }
  }
  
  return result;
}
\`\`\`

The function should validate users and categorize them. Find all bugs and provide a corrected version with explanation.`,
        sender: 'QA Engineer',
        timestamp: Date.now(),
      },
    ],
  },

  execution: {
    maxDuration: 180000, // 3 minutes
    maxSteps: 20,
    timeout: 60000,
    realApiCallsExpected: true,
  },

  verification: {
    rules: [
      {
        id: 'off-by-one-bug-fixed',
        type: 'llm-evaluation',
        description: 'Verify off-by-one error was identified and fixed',
        config: {
          successCriteria: [
            'Identified the <= vs < bug in loop condition',
            'Changed i <= users.length to i < users.length',
            'Explained why this was causing array index out of bounds',
          ],
          requiredKeywords: ['<', 'length', 'off-by-one', 'index'],
          forbiddenKeywords: ['<='],
          llmEnhancement: true,
        },
      },
      {
        id: 'null-safety-implemented',
        type: 'llm-evaluation',
        description: 'Verify null/undefined safety was added',
        config: {
          successCriteria: [
            'Added null/undefined checks for user object',
            'Added safety checks for user properties',
            'Prevents runtime errors from undefined access',
          ],
          requiredKeywords: ['null', 'undefined', '?', '?.', 'check'],
          llmEnhancement: true,
        },
      },
      {
        id: 'mutation-bug-fixed',
        type: 'llm-evaluation',
        description: 'Verify mutation issue was addressed',
        config: {
          successCriteria: [
            'Identified that the function mutates input data',
            'Either cloned objects or documented side effects',
            'Explained the implications of mutation',
          ],
          requiredKeywords: ['mutation', 'clone', 'spread', 'side effect'],
          llmEnhancement: true,
        },
      },
      {
        id: 'comprehensive-explanation',
        type: 'llm-evaluation',
        description: 'Verify comprehensive bug explanation provided',
        config: {
          successCriteria: [
            'Explained each bug found',
            'Provided reasoning for fixes',
            'Suggested best practices to prevent similar bugs',
          ],
          requiredKeywords: ['bug', 'fix', 'explanation', 'because', 'prevent'],
          llmEnhancement: true,
        },
      },
    ],
  },

  benchmarks: {
    maxDuration: 180000,
    maxSteps: 20,
    targetAccuracy: 0.9,
    customMetrics: [
      {
        name: 'bug_detection_accuracy',
        threshold: 0.9,
        target: 'identified all critical bugs',
      },
      {
        name: 'fix_quality',
        threshold: 0.85,
        target: 'provided high-quality fixes',
      },
      {
        name: 'explanation_completeness',
        threshold: 0.8,
        target: 'comprehensive explanation of issues and solutions',
      },
    ],
  },
};

export const autocoderPerformanceOptimization: Scenario = {
  id: 'autocoder-performance-optimization',
  name: 'AutoCoder Performance Optimization',
  description: 'Test AutoCoder ability to optimize code for better performance',
  category: 'autocoder-advanced',
  tags: ['autocoder', 'performance', 'optimization', 'algorithms', 'advanced'],
  
  actors: [
    {
      id: uuidv4(),
      name: 'AutoCoder',
      role: 'subject',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning', '@elizaos/plugin-knowledge'],
    },
    {
      id: uuidv4(),
      name: 'Performance Engineer',
      role: 'observer',
    },
  ],

  setup: {
    roomType: 'dm',
    context: 'AutoCoder is optimizing a slow data processing algorithm',
    initialMessages: [
      {
        id: uuidv4(),
        content: `This function is performing poorly with large datasets. Optimize it for better performance:

\`\`\`typescript
function findDuplicates(arr: number[]): number[] {
  const duplicates: number[] = [];
  
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {
        duplicates.push(arr[i]);
      }
    }
  }
  
  return duplicates;
}

function filterAndSort(users: any[], minAge: number): any[] {
  let result = [];
  
  for (let i = 0; i < users.length; i++) {
    if (users[i].age >= minAge) {
      result.push(users[i]);
    }
  }
  
  for (let i = 0; i < result.length - 1; i++) {
    for (let j = 0; j < result.length - i - 1; j++) {
      if (result[j].age > result[j + 1].age) {
        let temp = result[j];
        result[j] = result[j + 1];
        result[j + 1] = temp;
      }
    }
  }
  
  return result;
}
\`\`\`

Optimize these functions for O(n) or O(n log n) complexity where possible. Explain the performance improvements.`,
        sender: 'Performance Engineer',
        timestamp: Date.now(),
      },
    ],
  },

  execution: {
    maxDuration: 300000, // 5 minutes
    maxSteps: 30,
    timeout: 120000,
    realApiCallsExpected: true,
  },

  verification: {
    rules: [
      {
        id: 'duplicates-optimization',
        type: 'llm-evaluation',
        description: 'Verify duplicates function was optimized',
        config: {
          successCriteria: [
            'Replaced O(n²) nested loops with O(n) solution',
            'Used Set or Map for O(1) lookups',
            'Eliminated the includes() call which was O(n)',
            'Improved overall complexity from O(n³) to O(n)',
          ],
          requiredKeywords: ['Set', 'Map', 'O(n)', 'hash', 'lookup'],
          forbiddenKeywords: ['includes', 'nested loop'],
          llmEnhancement: true,
        },
      },
      {
        id: 'filter-sort-optimization',
        type: 'llm-evaluation',
        description: 'Verify filter and sort function was optimized',
        config: {
          successCriteria: [
            'Used filter() and sort() methods instead of manual loops',
            'Replaced bubble sort with native sort (O(n log n))',
            'Combined filtering and sorting in functional chain',
            'Improved from O(n²) to O(n log n)',
          ],
          requiredKeywords: ['filter', 'sort', 'O(n log n)', 'functional'],
          forbiddenKeywords: ['bubble sort', 'nested for'],
          llmEnhancement: true,
        },
      },
      {
        id: 'performance-analysis',
        type: 'llm-evaluation',
        description: 'Verify performance analysis was provided',
        config: {
          successCriteria: [
            'Explained Big O complexity improvements',
            'Provided before/after complexity analysis',
            'Discussed practical performance implications',
            'Mentioned space-time tradeoffs where applicable',
          ],
          requiredKeywords: ['complexity', 'Big O', 'performance', 'improvement'],
          llmEnhancement: true,
        },
      },
      {
        id: 'modern-javascript-usage',
        type: 'llm-evaluation',
        description: 'Verify modern JavaScript methods were used',
        config: {
          successCriteria: [
            'Used modern array methods (filter, map, sort)',
            'Utilized ES6+ features where appropriate',
            'Applied functional programming concepts',
            'Improved code readability alongside performance',
          ],
          requiredKeywords: ['filter', 'map', 'sort', 'functional', 'ES6'],
          llmEnhancement: true,
        },
      },
    ],
  },

  benchmarks: {
    maxDuration: 300000,
    maxSteps: 30,
    targetAccuracy: 0.85,
    customMetrics: [
      {
        name: 'optimization_effectiveness',
        threshold: 0.9,
        target: 'significant performance improvements achieved',
      },
      {
        name: 'algorithm_complexity_improvement',
        threshold: 0.8,
        target: 'improved algorithmic complexity',
      },
      {
        name: 'code_maintainability',
        threshold: 0.8,
        target: 'maintained or improved code readability',
      },
    ],
  },
};

export const autocoderComprehensiveBenchmarks: ScenarioSuite = {
  name: 'AutoCoder Comprehensive Benchmarks',
  description: 'Advanced benchmarks testing complex AutoCoder capabilities including refactoring, debugging, and optimization',
  scenarios: [
    autocoderComplexRefactoring,
    autocoderDebuggingScenario,
    autocoderPerformanceOptimization,
  ],
};