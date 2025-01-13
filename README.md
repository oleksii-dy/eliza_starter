![SBF](sbf.png)

# GODS 🤖

This is a fork of the Eliza client repository with an improved Solana plug-in and a new character who handles all Solana based transactions: SBF.

# Setup

Rename .env.example to .env

run `pnpm install --no-frozen-lockfile` and `pnpm build` to install dependencies and build the project.

run `pnpm start --character="characters/dobby.character.json"` to start the Solana Dobby bot.

run `pnpm start:client` to start the client.

Ask Dobby to send native SOL or SPL tokens.

Right now Dobby is limited to sending fixed amounts of native SOL and SPL tokens to a single recipient - me.