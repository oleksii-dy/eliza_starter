# Eliza V2 - Instrumentation Implementation

<div align="center">
  <img src="./docs/static/img/eliza_banner.jpg" alt="Eliza Banner" width="100%" />
</div>

<div align="center">
  📑 [Technical Report](https://arxiv.org/pdf/2501.00781) | 📕 [Documentation](https://elizaos.github.io/eliza/) | 🎮 [Examples](https://github.com/thejoven/awesome-eliza)
</div>

## 🌐 README Translations

- [中文说明](packages/docs/i18n/readme/README_CN.md) | [日本語の説明](packages/docs/i18n/readme/README_JA.md) | [한국어 설명](packages/docs/i18n/readme/README_KOR.md) | [Persian](packages/docs/i18n/readme/README_FA.md) | [Français](packages/docs/i18n/readme/README_FR.md) | [Português](packages/docs/i18n/readme/README_PTBR.md) | [Türkçe](packages/docs/i18n/readme/README_TR.md) | [Русский](packages/docs/i18n/readme/README_RU.md) | [Español](packages/docs/i18n/readme/README_ES.md) | [Italiano](packages/docs/i18n/readme/README_IT.md) | [Twi](packages/docs/i18n/readme/README_TH.md) | [Deutsch](packages/docs/i18n/readme/README_DE.md) | [Tiếng Việt](packages/docs/i18n/readme/README_VI.md) | [ภาษาไทย](packages/docs/i18n/readme/README_HE.md) | [Tagalog](packages/docs/i18n/readme/README_TG.md) | [Polski](packages/docs/i18n/readme/README_PL.md) | [Arabic](packages/docs/i18n/readme/README_AR.md) | [Hungarian](packages/docs/i18n/readme/README_HU.md) | [Srpski](packages/docs/i18n/readme/README_RS.md) | [Română](packages/docs/i18n/readme/README_RO.md) | [Nederlands](packages/docs/i18n/readme/README_NL.md) | [Ελληνικά](packages/docs/i18n/readme/README_GR.md)

## ▶ Overview

<div align="center">
  <img src="./docs/static/img/eliza_diagram.jpg" alt="Eliza Diagram" width="100%" />
</div>

## ✨ Features

- Character-focused interface: Your agent is a character with a backstory, motivations, and preferences.
- Personality-driven responses: Responses are tailored to your agent's unique character.
- Memory and state management: Comprehensive system for maintaining context across interactions.
- Plugin ecosystem: Extend your agent's capabilities with plugins.
- Flexible deployment: Run locally or in the cloud, with or without an internet connection.
- Private by design: Your data stays on your device, with opt-in sharing features.
- Open LLM support: Use any LLM that supports the OpenAI API format.
- Developer-friendly: Comprehensive documentation and examples.

## 📦 Packages

Eliza is organized into several packages:

- [@elizaos/core](packages/core): Core functionality for the Eliza runtime.
- [@elizaos/app](packages/app): A web UI for interacting with Eliza.
- [@elizaos/cli](packages/cli): A command-line interface for interacting with Eliza.
- [@elizaos/create-eliza](packages/create-eliza): A tool for creating Eliza projects.
- [@elizaos/docs](packages/docs): Documentation for Eliza.
- [@elizaos/plugin-\*](packages): Various plugins for extending Eliza's capabilities.

## 🚀 Getting Started

0. **Prerequisites**

   - Node.js 20.x or higher
   - npm 10.x or higher
   - pnpm 8.x or higher (recommended)

1. **Installation**

   ```bash
   # Install the Eliza CLI
   npm install -g @elizaos/cli
   ```

2. **Create an Eliza project**

   ```bash
   # Using the Eliza CLI
   eliza init my-eliza-project
   cd my-eliza-project

   # Using npm
   npm init eliza
   # or
   npx create-eliza
   ```

3. **Teach Eliza about the world**
   Eliza needs to know about your world in order to interact with it. You can add information using the `world` command, or by editing the `world.yaml` file.

   ```bash
   # Add a location to your world
   eliza world add location "San Francisco" "A city in California"

   # Add a person to your world
   eliza world add person "John Doe" "A friend who lives in San Francisco"
   ```

4. **Chat with Eliza**
   ```bash
   # Start a chat with Eliza
   eliza chat
   ```

## 🧩 Plugins

Eliza supports a plugin system for extending its capabilities. You can find a list of available plugins in the [plugins directory](packages/).

To add a plugin to your Eliza project:

```bash
eliza plugin add @elizaos/plugin-name
```

## 🛠️ Development

To build and run Eliza locally:

1. **Clone the repository**

   ```bash
   git clone https://github.com/elizaOS/eliza.git
   cd eliza
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Build the packages**

   ```bash
   pnpm build
   ```

4. **Link the packages for local development**

   ```bash
   pnpm link --global
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   ```

## 📝 License

Eliza is licensed under the [MIT License](LICENSE).

## 🤝 Contributing

We welcome contributions! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

## 🔗 Related Projects

- [Awesome Eliza](https://github.com/thejoven/awesome-eliza): A curated list of awesome projects built with Eliza.
- [Character API](https://character.ai/): An API for creating and interacting with characters, which inspired some of Eliza's design.
