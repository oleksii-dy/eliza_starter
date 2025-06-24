module.exports = {
  extends: ['../../eslint.config.js'],
  rules: {
    // Allow unused parameters in validate functions for consistency
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^(_|message|state|response)$',
        varsIgnorePattern: '^(_|responseReceived|reposResult)$',
        ignoreRestSiblings: true,
      },
    ],
    
    // Allow commonly unused imports in type files
    'no-unused-vars': 'off', // Use TypeScript version
    
    // These are commonly unused in action validate functions
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        args: 'none', // Don't check function arguments
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
        // Allow common unused type imports
        vars: 'local',
        argsIgnorePattern: '^_',
      },
    ],
  },
  overrides: [
    {
      files: ['src/actions/*.ts'],
      rules: {
        // Action files often have unused validate parameters
        '@typescript-eslint/no-unused-vars': [
          'warn',
          {
            args: 'none', // Don't check function arguments in action files
            varsIgnorePattern: '^_',
          },
        ],
      },
    },
    {
      files: ['src/providers/*.ts'],
      rules: {
        // Provider files often have unused get parameters
        '@typescript-eslint/no-unused-vars': [
          'warn',
          {
            args: 'none', // Don't check function arguments in provider files
            varsIgnorePattern: '^_',
          },
        ],
      },
    },
  ],
}; 