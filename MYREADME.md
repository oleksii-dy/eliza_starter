# Eliza 🤖

trades: https://app.eliza.systems/trades
hi

top 5 wallets
https://solscan.io/account/9YnQdCWDAQRfQYm5HvRzoPgc5GRn8fyhsH2eru8nfsxG
https://solscan.io/account/8CaTuoD1r6CzR1mu6ueTDvjNpLj7sq5nWafDLymkQ4jH
https://solscan.io/account/CX3Nx8NPv8ZVqiBS7eLHBjrcRk69o7k1Z5q8Go1Uqc2z
https://solscan.io/account/G8AFH5qJ3eGx7vKFZsjo4LmxYCgTQ45WFb5FErq7PT1r
https://solscan.io/account/6rg2rfZ6Sim6j63LXvaLgbWicVGWhJUYHkCxgSHZBCqs

resources
- docs: https://ai16z.github.io/eliza/docs/intro/#
- eliza dev playlist: https://www.youtube.com/watch?v=ArptLpQiKfI&list=PLx5pnFXdPTRzWla0RaOxALTSTnVq53fKL
- each ai can launch a token: https://www.daos.fun/
    - virtuals.io is the base one: https://app.virtuals.io/
- listen: https://x.com/weremeow/status/1851365658916708616
    https://x.com/0xtechnoir/status/1853907223526920461
- watch community call: https://www.youtube.com/watch?v=iQ0UFGREhJI
-read this dialougefounder ai16z 100 agents https://www.panewslab.com/en/sqarticledetails/bn6f9u6m.html
- https://shaw.wtf/Crypto-Is-Good/
- https://shaw.wtf/
- typescript: https://github.com/moondevonyt/learn-typescript-from-python


models
https://lmarena.ai/ - go to arena to see whos top dawg
https://context.ai/compare/o1-preview-2024-09-12/gemini-1-5-pro
    usage: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/cost?project=gen-lang-client-0134479047


- claude rn is the best
- grok is good for this type of stuff
- gemeni is technically the best model out rn

cloud gpus
- lambda of course, most exp
- prime intellect cheaper but works cheaper
- https://app.hyperbolic.xyz/compute
model selection for AFI
    - gemini + rag for now
        - maybe use llama or a smaler cheaper modle for small stuff, f it just use gemini sma


notes
- Llama 70B is used for ai16z - suggested to be optimal for training character trading bots
- Truth Terminal uses Claude Opus
- nvm use 23 or nvm install
cd docs
code2prompt ./
code2prompt src/
- they use llama cloud for their bots
- fork this so i can just work on my own and keep changes seperate
- use claude and grok (by x)
- gemini has a 2m context windwo
- build our mods and community support, could be tutors
- actions: predefined behaciours that agents can execut in reponse to messages, enabling them to perform and interact iwth external systems
- clients act as interfaces between agents and platforms likediscord twitter and telegram
- providers supply agents with xontextual info including itme awareness, user relationshpsand data from extrenal source
- evaluators assess and extract info from convos helpng agents tracks goals build memory and maintain context awareness
- character files are json files define personality knowledge and behavoi of each ai agent
- memory system featurs a sophistiated memoru mangement system that utilizer verctor embediinngs and relational database storage to store and retreive info for agents
- The capability to do so is there, it's ultimately up to the AI agent on whether or not it will. TURN OFF
- they havea  tons of plug ins but bootcstrat is where its at... thats all the code they provided
- extenal integrations - they have a take order for trading
- we can also make custom actions here; https://ai16z.github.io/eliza/docs/core/actions/
- they also give access to trustscore system: https://ai16z.github.io/eliza/docs/guides/advanced/
    - more on trust score: https://ai16z.github.io/eliza/docs/advanced/trust-engine/
    - also speech with eleven labs is here
- autonomous trading: https://ai16z.github.io/eliza/docs/advanced/autonomous-trading/
- extracting tweets from a user is userful its a script for training at the bototom: https://ai16z.github.io/eliza/docs/guides/local-development/
- supabase is a cloud hosted postgres for dployment shaw said ppl use
- auto client is the trading client we would use: https://ai16z.github.io/eliza/docs/packages/clients/
- https://www.youtube.com/watch?v=XenGeAcPAQo


CONFIGUTATION: https://ai16z.github.io/eliza/docs/guides/configuration/

LEARN TYPESCRIPT FOR ELIZA: https://chatgpt.com/share/6762f33c-0cd0-800e-8fd6-1ec653feb345

contribute to project
- Contribute to the autonomous trading system and trust engine: Leverage expertise in market analysis, technical analysis, and risk management to enhance these features.

12/19

- building afi.xyz artificial financial intelligence for the people fuck wall street.
- learned typescript today, so we ready to build & contribute
- https://www.youtube.com/watch?v=XenGeAcPAQo finishing up the day with finishing this training and then will watch next one.

step 1: learn typescript

12/17 taking the school
- cod to prompt tool in here code2prompt
- he uses claude/grok > openai
- npm install langchain is node package manager, pip essentially
- pnpm is the performance node packamge manager

12/10-
- can interact with discord, twitter, and solana and eve..
- these can possible engage in trading strategies because they will be able to interact in discords and twitters in order feel sentiment
- supports openai and tropic
- i got oi data
- i got liq data
- solana plug in??
- coinbase commerce so the agent can have OHLCV data for all coinbase tokens.
* advanced/autonomous-trading and advanced/trust-engine docs to manage agent trust scores, token recommendations, and risk profiles.
* explore auditomioze trading docs
* get this agent its own discord channel and communicate with another agent to lock in on quant, using my framework and we can watch them in their own chanel
* since we built the GE that outputs millionaires of strats, then we do rigors testing, we literally have a pool of hundreds of working strats that the AI agents can pick from…


* CONCLUSION - keep my eye on it. but dont execute yet because there are some learning curves that i wanna briefly look at. typescript, postres, js…
        * the cool things here is - we can have ai agents looking at sentiment if they have Twitter access.. but we can do that with models too…
            * one thing too look is the way they access twitter because rn the twitter api is 5k and doenst give you much...

    - learning curve for no reason, im not convinced YET but when done with my GE... im going to have an unlimited pool of solid strategies that the ai agents can work on... so at that point this could be dope... again, only upside imo is the connection to socials...



FINDINGS
- they use a package called ''agent-twitter-client' with a scarper cllass...
    - essentially sending in the pas, email and 2fa
    - essentially scraping instead of the official api
    - mainstain session with cookies like other tweekit
- they use typescript and postgres...
    - as this is the #1 package in the world rn, ts must be poopping
    - look through both rq












<div align="center">
  <img src="./docs/static/img/eliza_banner.jpg" alt="Eliza Banner" width="100%" />
</div>

<div align="center">

  📖 [Documentation](https://ai16z.github.io/eliza/) | 🎯 [Examples](https://github.com/thejoven/awesome-eliza)

</div>

## 🌍 README Translations

[中文说明](./README_CN.md) | [日本語の説明](./README_JA.md) | [한국어 설명](./README_KOR.md) | [Français](./README_FR.md) | [Português](./README_PTBR.md) | [Türkçe](./README_TR.md) | [Русский](./README_RU.md) | [Español](./README_ES.md) | [Italiano](./README_IT.md) | [ไทย](./README_TH.md)

## ✨ Features

-   🛠️ Full-featured Discord, Twitter and Telegram connectors
-   🔗 Support for every model (Llama, Grok, OpenAI, Anthropic, etc.)
-   👥 Multi-agent and room support
-   📚 Easily ingest and interact with your documents
-   💾 Retrievable memory and document store
-   🚀 Highly extensible - create your own actions and clients
-   ☁️ Supports many models (local Llama, OpenAI, Anthropic, Groq, etc.)
-   📦 Just works!

## 🎯 Use Cases

-   🤖 Chatbots
-   🕵️ Autonomous Agents
-   📈 Business Process Handling
-   🎮 Video Game NPCs
-   🧠 Trading

## 🚀 Quick Start

### Prerequisites

-   [Python 2.7+](https://www.python.org/downloads/)
-   [Node.js 23+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
-   [pnpm](https://pnpm.io/installation)

> **Note for Windows Users:** [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install-manual) is required.

### Use the Starter (Recommended)

```bash
git clone https://github.com/ai16z/eliza-starter.git

cp .env.example .env

pnpm i && pnpm start
```

Then read the [Documentation](https://ai16z.github.io/eliza/) to learn how to customize your Eliza.

### Manually Start Eliza (Only recommended if you know what you are doing)

```bash
# Clone the repository
git clone https://github.com/ai16z/eliza.git

# Checkout the latest release
# This project iterates fast, so we recommend checking out the latest release
git checkout $(git describe --tags --abbrev=0)
```

### Start Eliza with Gitpod

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/ai16z/eliza/tree/main)

### Edit the .env file

Copy .env.example to .env and fill in the appropriate values.

```
cp .env.example .env
```

Note: .env is optional. If your planning to run multiple distinct agents, you can pass secrets through the character JSON

### Automatically Start Eliza

This will run everything to setup the project and start the bot with the default character.

```bash
sh scripts/start.sh
```

### Edit the character file

1. Open `agent/src/character.ts` to modify the default character. Uncomment and edit.

2. To load custom characters:
    - Use `pnpm start --characters="path/to/your/character.json"`
    - Multiple character files can be loaded simultaneously
3. Connect with X (Twitter)
    - change `"clients": []` to `"clients": ["twitter"]` in the character file to connect with X

### Manually Start Eliza

```bash
pnpm i
pnpm build
pnpm start

# The project iterates fast, sometimes you need to clean the project if you are coming back to the project
pnpm clean
```

#### Additional Requirements

You may need to install Sharp. If you see an error when starting up, try installing it with the following command:

```
pnpm install --include=optional sharp
```

### Community & contact

-   [GitHub Issues](https://github.com/ai16z/eliza/issues). Best for: bugs you encounter using Eliza, and feature proposals.
-   [Discord](https://discord.gg/ai16z). Best for: sharing your applications and hanging out with the community.

## Contributors

<a href="https://github.com/ai16z/eliza/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=ai16z/eliza" />
</a>

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ai16z/eliza&type=Date)](https://star-history.com/#ai16z/eliza&Date)
