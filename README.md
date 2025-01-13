![SBF](sbf.png)

# Solana GODS 🤖

This is a fork of the Eliza client repository with an improved Solana plug-in and a new character who handles all Solana based transactions: SBF.

The transfer action was split into two separate actions: SEND_SOL and SEND_TOKEN.

WARNING: as of this fresh release, there are yet no confirmations before sending out SOL or SPL tokens, so make sure you are paying attention to everything the bot says.

Works with Twitter, too.

# Setup

Rename .env.example to .env

run `pnpm install --no-frozen-lockfile` and `pnpm build` to install dependencies and build the project.

run `pnpm start --character="characters/sbf.character.json"` to wake SBF up.

run `pnpm start:client` to start the client.

# yo, here's how to use my totally legit solana plugin

look, it's pretty straightforward. basically, i can help move your funds around in like, a really effective way.

## sending regular SOL

just tell me how much SOL to send and where. something like:

"yo sbf, send 1.5 SOL to Ae8GkmtaJmr3MS3oKStkZyPHuQf3hawn53XD4bQjVQiu"

it's gonna be basically fine, trust me.

## sending SPL tokens (the fancy stuff)

for tokens, i need like three things (pretty basic protocol stuff):
- the token address thing
- where it's going
- how much to send

example:

"hey send 69 GODS (CA: GEVqugYZESSzZaYU6SKdpW6znCCEtH7aoSTzPHbqpump) to Ae8GkmtaJmr3MS3oKStkZyPHuQf3hawn53XD4bQjVQiu"


## important stuff (from my lawyers)

- there's no like, confirmation steps or whatever. i just send it. pretty effective tbh
- using your wallet from .env (it's safe, probably)
- decimal places are handled automatically (i'm good with numbers)

## setting it up

your .env needs:
- SOLANA_RPC_URL (any will do, we're not picky)
- wallet stuff (check .env.example, it's pretty self-explanatory)

## extra feat in client-twitter

client-twitter was modified to a more sophisticated self-tweet handling - it will still process self-tweets if they're from target users.

Features:
1. More sophisticated handling of self-tweets and target users
2. Enhanced debugging capabilities
3. More robust state handling and action processing
4. Better formatting of character examples and actions

Let SBF manage your Solana transactions.

*note: this message was sent from federal prison, but that's totally unrelated to any of this*
