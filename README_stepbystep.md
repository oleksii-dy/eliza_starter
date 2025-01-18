# Eliza 🤖

<div align="center">
  <img src="./docs/static/img/eliza_banner.jpg" alt="Eliza Banner" width="100%" />
</div>

<div align="center">

📖 [Documentation](https://elizaos.github.io/eliza/) | 🎯 [Examples](https://github.com/thejoven/awesome-eliza)

</div>


## 🚩 Overview

<div align="center">
  <img src="./docs/static/img/eliza_diagram.png" alt="Eliza Diagram" width="100%" />
</div>

## ✨ Features

- 🛠️ Full-featured Discord, Twitter and Telegram connectors
- 🔗 Support for every model (Llama, Grok, OpenAI, Anthropic, etc.)
- 👥 Multi-agent and room support
- 📚 Easily ingest and interact with your documents
- 💾 Retrievable memory and document store
- 🚀 Highly extensible - create your own actions and clients
- ☁️ Supports many models (local Llama, OpenAI, Anthropic, Groq, etc.)
- 📦 Just works!



### Prerequisites

- [Python 2.7+](https://www.python.org/downloads/)
- [Node.js 23+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- nvm use v23.3.0 or nvm alias default v23.3.0
- [pnpm](https://pnpm.io/installation)
- 



### Create filestructure


git clone https://github.com/elizaos/eliza.git

``

### Edit the .env file. This file holds all API Keys, Seedphrases and Twitter/Discord/Telegram credentials ... don´t share it

Copy .env.example to .env and fill in the appropriate values. Fills the file with default values first

```
cp .env.example .env
```

to edit the file:
nano .env 
    nano commands: CTRL+X Save and Exit
                    CTRL+W Search
                    

### Get Akash API KEY
Go to https://chatapi.akash.network/ and Generate a API KEY. Question How to use the service? Taking Cosmos into AI age


now edit the .env and add these keys:

```bash
nano .env
```
Search for "AKASH"... CTRL + W
Enter your key
```bash
AKASH_CHAT_API_KEY=sk-1agDViherhwqzr3r # REPLACE YOUR KEY HERE
```
Save with CTRL + X


exit & save

### Edit your character file

head into the character folder:
```
cd characters
```
get rid of racists and sexists
```
rm tate.character.json
rm trump.character.json
```
create a template of c3po.character.json:
```
cp c3po.character.json avatar.character.json
nano avatar.character.json
```
The header should be set like this, so fill in the modelProvider. "clients" should be left empty for now, as we need to create Bot Tokens for them to work properly)
```
{
    "name": "Avatar",
    "clients": ["telegram","discord","twitter"],
    "modelProvider": "akash_chat_api",
    "settings": {
        "secrets": {},
        "voice": {
            "model": "en_US-male-medium"
```

    - Use `pnpm start --characters="path/to/your/character.json"`



### First build initialization

```bash
pnpm i
pnpm build
pnpm start --characters="path/to/your/character.json"`
```

- To keep the instance running after logoff:
-```
-  npm install pm2
-```
-     pm2 start eliza
-     pm2 stop eliza
-     pm2 log
-     pm2 status
-     pm2 start "pnpm" -- start --character="/yourpath/characters/avatar.character.json" to create pm2 entry
      pm2 save

### Telegram Connectio
https://telegram.me/BotFather
actually pretty easy, copy&paste your bot token into the .env

add "telegram" to your characterfiles header:

Example:
{
    "name": "Bud",
    "plugins": ["@elizaos/plugin-web-search"],
    "clients": ["telegram"],
    "modelProvider": "akash_chat_api",
    "settings": {
        "secrets": {
            "DISCORD_APPLICATION_ID": "1330176587323924",
            "DISCORD_API_TOKEN": "MTMzMDEzMzE4NjczNnewf9843f984r98E_9dK3zQp577QWKjS4i-wz78"
        },
        "voice": {
            "model": "en_US-male-medium"
        }
    },


beware: you need to leave a space behind the ":" after "clients": ---> 
so this is correct:  "clients": ["telegram"],
but not "clients":["telegram"],

damn syntax handlers...;)

### Discord Connection

https://discord.com/developers

Somehow you need to "reset" your token, otherwise you wont see the necessary token (not just numbers, looks like this: TMzMDEzMzE4Njc.....


## Advanced Character settings:

Example:
{
    "name": "Bud",
    "plugins": ["@elizaos/plugin-web-search"],
    "clients": ["discord"],
    "modelProvider": "akash_chat_api",
    "settings": {
        "secrets": {
            "DISCORD_APPLICATION_ID": "1330176587323924",
            "DISCORD_API_TOKEN": "MTMzMDEzMzE4NjczNnewf9843f984r98E_9dK3zQp577QWKjS4i-wz78"
        },
        "voice": {
            "model": "en_US-male-medium"
        }
    },

you can add "secrets" : This overrides the values given in .env for that specific character. So you can give characters unique tg handles or discord id's
you can add "plugins" to embed plugins from the /packages folder. remember to run "npm add eliaos@your-new-lugin" from the main directory to fetch dependencies first
you can change "akash_chat_api" to "ollama" if you want to run your models on your local machine. I recommend you to choose small models only


### Community & contact

- [GitHub Issues](https://github.com/elizaos/eliza/issues). Best for: bugs you encounter using Eliza, and feature proposals.
- [Discord](https://discord.gg/ai16z). Best for: sharing your applications and hanging out with the community.

## Contributors

<a href="https://github.com/elizaos/eliza/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=elizaos/eliza" />
</a>

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=elizaos/eliza&type=Date)](https://star-history.com/#elizaos/eliza&Date)
