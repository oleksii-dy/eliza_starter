import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: '🚀 Introduction',
    },
    {
      type: 'category',
      label: '🏁 Getting Started',
      items: [
        {
          type: 'doc',
          id: 'quickstart',
          label: '⭐ Quick Start',
        },
        {
          type: 'doc',
          id: 'system-requirements',
          label: '💻 System Requirements',
        },
        {
          type: 'doc',
          id: 'faq',
          label: '❓ FAQ',
        },
        {
          type: 'doc',
          id: 'contributing',
          label: '👥 Contributing',
        },
      ],
      collapsed: false,
    },
    {
      type: 'category',
      label: '🧠 Core Concepts',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'core/overview',
          label: 'Overview',
        },
        {
          type: 'doc',
          id: 'core/actions',
          label: 'Actions',
        },
        {
          type: 'doc',
          id: 'core/agents',
          label: 'Agent Runtime',
        },
        {
          type: 'doc',
          id: 'core/database',
          label: 'Database Adapters',
        },
        {
          type: 'doc',
          id: 'core/entities',
          label: 'Entities',
        },
        {
          type: 'doc',
          id: 'core/evaluators',
          label: 'Evaluators',
        },
        {
          type: 'doc',
          id: 'core/characters',
          label: 'Character Files',
        },
        {
          type: 'doc',
          id: 'core/knowledge',
          label: 'Knowledge',
        },
        {
          type: 'doc',
          id: 'core/plugins',
          label: 'Plugins',
        },
        {
          type: 'doc',
          id: 'core/project',
          label: 'Project',
        },
        {
          type: 'doc',
          id: 'core/providers',
          label: 'Providers',
        },
        {
          type: 'doc',
          id: 'core/rooms',
          label: 'Rooms',
        },
        {
          type: 'doc',
          id: 'core/services',
          label: 'Services',
        },
        {
          type: 'doc',
          id: 'core/tasks',
          label: 'Tasks',
        },
        {
          type: 'doc',
          id: 'core/worlds',
          label: 'Worlds',
        },
        {
          type: 'doc',
          id: 'core/events',
          label: 'Event System',
        },
        {
          type: 'doc',
          id: 'core/state',
          label: 'State Management',
        },
        {
          type: 'doc',
          id: 'core/models',
          label: 'Model System',
        },
        {
          type: 'doc',
          id: 'core/character-system',
          label: 'Character System',
        },
        {
          type: 'doc',
          id: 'core/testing',
          label: 'Testing',
        },
      ],
    },
    {
      type: 'category',
      label: '🖥️ CLI',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'cli/overview',
          label: 'Overview',
        },
        {
          type: 'doc',
          id: 'cli/agent',
          label: 'Agent',
        },
        {
          type: 'doc',
          id: 'cli/create',
          label: 'Create',
        },
        {
          type: 'doc',
          id: 'cli/dev',
          label: 'Dev',
        },
        {
          type: 'doc',
          id: 'cli/env',
          label: 'Environment',
        },
        // {
        //   type: 'doc',
        //   id: 'cli/plugins',
        //   label: 'Plugins',
        // },
        // {
        //   type: 'doc',
        //   id: 'cli/projects',
        //   label: 'Projects',
        // },
        {
          type: 'doc',
          id: 'cli/publish',
          label: 'Publish',
        },
        {
          type: 'doc',
          id: 'cli/start',
          label: 'Start',
        },
        {
          type: 'doc',
          id: 'cli/test',
          label: 'Test',
        },
        {
          type: 'doc',
          id: 'cli/update',
          label: 'Update',
        },
      ],
    },
    {
      type: 'category',
      label: '🌐 REST API',
      items: [
        {
          type: 'doc',
          id: 'rest-api/index',
          label: 'Overview',
        },
        {
          type: 'doc',
          id: 'rest-api/authentication',
          label: 'Authentication',
        },
        {
          type: 'doc',
          id: 'rest-api/authorization',
          label: 'Authorization',
        },
        {
          type: 'doc',
          id: 'rest-api/rate-limiting',
          label: 'Rate Limiting',
        },
        {
          type: 'doc',
          id: 'rest-api/cors',
          label: 'CORS Configuration',
        },
        {
          type: 'doc',
          id: 'rest-api/security-headers',
          label: 'Security Headers',
        },
        {
          type: 'doc',
          id: 'rest-api/security-best-practices',
          label: 'Security Best Practices',
        },
        {
          type: 'doc',
          id: 'rest-api/error-responses',
          label: 'Error Handling',
        },
        {
          type: 'category',
          label: 'API Reference',
          items: [
            {
              type: 'autogenerated',
              dirName: 'rest',
            },
          ],
          collapsed: true,
        },
      ],
      collapsed: true,
    },
    {
      type: 'doc',
      id: 'awesome-eliza',
      label: 'Awesome elizaOS',
    },
    {
      type: 'doc',
      id: 'changelog',
      label: 'CHANGELOG',
    },
  ],
};

export default sidebars;
