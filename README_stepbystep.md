# Eliza 🤖

<div align="center">
  <img src="./docs/static/img/eliza_banner.jpg" alt="Eliza Banner" width="100%" />
</div>

<div align="center">

📖 [Documentation](https://elizaos.github.io/eliza/) | 🎯 [Examples](https://github.com/thejoven/awesome-eliza)

</div>

## 🌍 README Translations

[中文说明](./README_CN.md) | [日本語の説明](./README_JA.md) | [한국어 설명](./README_KOR.md) | [Persian](./README_FA.md) | [Français](./README_FR.md) | [Português](./README_PTBR.md) | [Türkçe](./README_TR.md) | [Русский](./README_RU.md) | [Español](./README_ES.md) | [Italiano](./README_IT.md) | [ไทย](./README_TH.md) | [Deutsch](./README_DE.md) | [Tiếng Việt](./README_VI.md) | [עִברִית](https://github.com/elizaos/Elisa/blob/main/README_HE.md) | [Tagalog](./README_TG.md) | [Polski](./README_PL.md) | [Arabic](./README_AR.md) | [Hungarian](./README_HU.md) | [Srpski](./README_RS.md) | [Română](./README_RO.md) | [Nederlands](./README_NL.md)

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

## Video Tutorials

[AI Agent Dev School](https://www.youtube.com/watch?v=ArptLpQiKfI&list=PLx5pnFXdPTRzWla0RaOxALTSTnVq53fKL)

## 🎯 Use Cases

- 🤖 Chatbots
- 🕵️ Autonomous Agents
- 📈 Business Process Handling
- 🎮 Video Game NPCs
- 🧠 Trading

## 🚀 Quick Start

### Prerequisites

- [Python 2.7+](https://www.python.org/downloads/)
- [Node.js 23+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- nvm use v23.3.0 or nvm alias default v23.3.0
- [pnpm](https://pnpm.io/installation)
- 
- To keep the instance running after logoff:
- npm install pm2
-
-     pm2 start eliza
-     pm2 stop eliza
-     pm2 log
-     pm2 status
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
Search for "AKASH"...
# Akash Chat API Configuration docs: https://chatapi.akash.network/documentation
AKASH_CHAT_API_KEY=sk-1agDViherhwqzr3r # REPLACE YOUR KEY HERE

exit & save

### Edit your character file

head into the character folder:
cd characters

get rid of racists and sexists
rm tate.character.json
rm trump.character.json

create a template of c3po.character.json:
cp c3po.character.json avatar.character.json
nano avatar.character.json

The header should be set like this, so fill in the modelProvider. "clients" should be left empty for now, as we need to create Bot Tokens for them to work properly)

{
    "name": "Avatar",
    "clients": ["telegram","discord","twitter"],
    "modelProvider": "akash_chat_api",
    "settings": {
        "secrets": {},
        "voice": {
            "model": "en_US-male-medium"


    - Use `pnpm start --characters="path/to/your/character.json"`



### First build initialization

```bash
pnpm i
pnpm build
pnpm start --characters="path/to/your/character.json"`








### Community & contact

- [GitHub Issues](https://github.com/elizaos/eliza/issues). Best for: bugs you encounter using Eliza, and feature proposals.
- [Discord](https://discord.gg/ai16z). Best for: sharing your applications and hanging out with the community.

## Contributors

<a href="https://github.com/elizaos/eliza/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=elizaos/eliza" />
</a>

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=elizaos/eliza&type=Date)](https://star-history.com/#elizaos/eliza&Date)
