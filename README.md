![SBF](sbf.png)

# Eliza Solana Plugin Upgrade 🤖

This is a fork of the Eliza client repository with an improved Solana plug-in and a new character who handles all Solana based transactions: SBF.

The transfer action was split into two separate actions: SEND_SOL and SEND_TOKEN.

This way the agent can handle different transactions better than having both actions in one.

Also added more detailed logging and transaction state monitoring.

WARNING: as of this fresh release, there are yet no confirmations before sending out SOL or SPL tokens, so use for experimentation only.

Works with client-twitter, too.

# SBF handles Solana transactions

As plugins and characters in Eliza agentic world go hand-in-hand, SBF is a character made for leveraging Solana plugin.

# Setup the client

Rename .env.example to .env

Input your ANTHROPIC_API_KEY, SOLANA_PRIVATE_KEY and SOLANA_PUBLIC_KEY in .env.

I recommend using Anthropic's Claude, because the success rate of calling transfer actions is highly correlated with the intelligence of the AI used, but instead of ANTHROPIC_API_KEY, you can use any other model, so long as you specify it in the character.json file.

If you plan on using the client-twitter feature, you need to input your TWITTER_USERNAME, TWITTER_PASSWORD and TWITTER_EMAIL.

Put in the usernames you want to target in TWITTER_TARGET_USERS separated by commas.

If you don't want to use twitter integration, in sbf.character.json change "clients": ["twitter"] to "clients": []

run `pnpm install --no-frozen-lockfile` and `pnpm build` to install dependencies and build the project.

run `pnpm start --character="characters/sbf.character.json"` to start SBF agent up.

run `pnpm start:client` to start the client and chat with SBF using the client.

# Using the Solana plug-in

If you want the agent to send you SOL or SPL tokens, you need to simply tell the agent to do so.

For example type "send 1.5 SOL to Ae8GkmtaJmr3MS3oKStkZyPHuQf3hawn53XD4bQjVQiu".

This will send 1.5 SOL to the address Ae8GkmtaJmr3MS3oKStkZyPHuQf3hawn53XD4bQjVQiu.

For sending SPL native tokens, apart from the destination address and amount, the token contract address is also needed.


example:

"send 69 GODS (CA: GEVqugYZESSzZaYU6SKdpW6znCCEtH7aoSTzPHbqpump) to Ae8GkmtaJmr3MS3oKStkZyPHuQf3hawn53XD4bQjVQiu"

That's it. Upon success, you will be sent a transaction hash.

## extra feats in client-twitter

client-twitter was modified to a more sophisticated self-tweet handling - it will still process self-tweets if they're from target users.

Features:
1. More sophisticated handling of self-tweets and target users
2. Enhanced debugging capabilities
3. More robust state handling and action processing
4. Better formatting of character examples and actions

Let SBF manage your Solana transactions.

*note: this message was sent from federal prison, but that's totally unrelated to any of this*
