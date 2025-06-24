module.exports = {
  // Basic formatting
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,

  // JSX specific
  jsxSingleQuote: true,
  jsxBracketSameLine: false,

  // Other formatting rules
  arrowParens: 'always',
  bracketSpacing: true,
  endOfLine: 'lf',
  quoteProps: 'as-needed',

  // File specific overrides
  overrides: [
    {
      files: '*.json',
      options: {
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'preserve',
      },
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
      },
    },
    {
      files: '*.yaml',
      options: {
        tabWidth: 2,
      },
    },
  ],
};
