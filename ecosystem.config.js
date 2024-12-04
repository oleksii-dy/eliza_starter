module.exports = {
    apps: [
      {
        name: 'eliza',
        script: 'pnpm',
        args: 'start --characters="/path-to-character.json"',
        interpreter: 'none',
      },
    ],
};