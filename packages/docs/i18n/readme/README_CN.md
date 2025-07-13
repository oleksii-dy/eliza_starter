# Eliza

多智能体开发和部署框架

## ✨ 特性

- 🛠️ 功能齐全的Discord、Telegram和Farcaster连接器（以及更多！）
- 🔗 支持所有模型（Llama、Grok、OpenAI、Anthropic、Gemini等）
- 🎨 现代化专业UI，重新设计的仪表板用于管理智能体和群组
- 💬 强大的实时通信，增强的频道和消息处理功能
- 👥 多智能体和群组支持，直观的管理界面
- 📚 轻松摄取和交互您的文档
- 💾 可检索的内存和文档存储
- 🚀 高度可扩展 - 创建您自己的动作和客户端
- 📦 开箱即用！

## 🎯 使用场景

- 🤖 聊天机器人
- 🕵️ 自主智能体
- 📈 业务流程处理
- 🎮 视频游戏NPC
- 🧠 交易

## 🚀 快速开始

### 前置条件

- [Node.js](https://nodejs.org/) (推荐v23或更高版本)
- [bun](https://bun.sh/docs/installation)

> **Windows用户注意:** 需要[WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install-manual)。

### 使用CLI（推荐）

ElizaOS CLI提供了创建、配置和运行智能体的最快和最可靠的方法。它会自动处理所有复杂的设置。

#### 1. 安装CLI

```bash
# 全局安装ElizaOS CLI
bun install -g @elizaos/cli

# 验证安装
elizaos --version

# 获取可用命令的帮助
elizaos --help
```

#### 2. 创建您的第一个项目

```bash
# 通过交互式设置创建新项目
elizaos create my-agent

# 或使用特定选项创建（跳过提示）
elizaos create my-agent --yes --type project
```

**初学者推荐选项:**

- **数据库**: `pglite` (轻量级，无需设置)
- **模型提供商**: `openai` (最可靠和经过测试的)
- **项目类型**: `project` (包含运行时和智能体的完整ElizaOS应用程序)

#### 3. 配置您的智能体

```bash
cd my-agent

# 编辑智能体的角色文件
elizaos env edit-local

# 或使用您喜欢的编辑器手动编辑.env文件
nano .env
```

**必需的环境变量:**

```bash
# 必需：您的模型API密钥
OPENAI_API_KEY=your_api_key_here

# 可选：日志级别 (info, debug, error)
LOG_LEVEL=info

# 可选：Discord机器人token（如果使用Discord）
DISCORD_APPLICATION_ID=your_discord_app_id
DISCORD_API_TOKEN=your_discord_bot_token
```

#### 4. 启动您的智能体

```bash
# 构建并启动智能体
elizaos start

# 或使用调试日志启动进行开发
LOG_LEVEL=debug elizaos start
```

启动后，您的智能体将在以下地址可用：

- **Web界面**: http://localhost:3000
- **API端点**: http://localhost:3000/api

#### 5. 开发工作流

```bash
# 对智能体代码进行更改
# 然后重新构建和重启
bun run build
elizaos start

# 运行测试来验证您的更改
elizaos test
```

#### 高级CLI命令

```bash
# 创建特定组件
elizaos create my-plugin --type plugin    # 创建新插件
elizaos create my-agent --type agent      # 创建新智能体角色
elizaos create my-tee --type tee          # 创建TEE项目

# 环境管理
elizaos env list            # 显示所有环境变量
elizaos env reset           # 重置为默认.env.example

# 测试选项
elizaos test --name "my-test"    # 运行特定测试
elizaos test e2e                 # 仅运行端到端测试
elizaos test component           # 仅运行组件测试

# 智能体管理
elizaos agent list                      # 列出所有可用智能体
elizaos agent start --name "Agent"     # 按名称启动特定智能体
elizaos agent stop --name "Agent"      # 停止运行的智能体
elizaos agent get --name "Agent"       # 获取智能体详情
elizaos agent set --name "Agent" --file config.json  # 更新智能体配置
```

#### 调试和日志

ElizaOS使用全面的日志记录来帮助您了解智能体在做什么：

```bash
# 不同的日志级别
LOG_LEVEL=error elizaos start    # 仅错误
LOG_LEVEL=info elizaos start     # 一般信息（默认）
LOG_LEVEL=debug elizaos start    # 详细调试信息
LOG_LEVEL=verbose elizaos start  # 所有内容（非常详细）

# 高级调试（与LOG_LEVEL=debug结合使用）
ELIZA_DEBUG=true elizaos start          # 启用ElizaOS调试输出
NODE_ENV=development elizaos start      # 带有额外日志的开发模式
```

**专业提示:**

- 使用`elizaos --help`查看所有可用命令和全局选项
- 使用`elizaos <command> --help`获取任何特定命令的详细帮助
- 在开发过程中使用`LOG_LEVEL=debug`查看详细的执行流程
- 查看http://localhost:3000的web界面以获取实时智能体状态
- 频繁使用`elizaos test`尽早发现问题
- 保护您的`.env`文件安全，永远不要将其提交到版本控制

#### 可用命令参考

**所有CLI命令:**

```bash
elizaos create     # 创建新项目、插件、智能体或TEE项目
elizaos start      # 使用角色配置文件启动智能体服务器
elizaos agent      # 管理智能体（列出、启动、停止、获取、设置）
elizaos test       # 运行测试（组件、e2e或全部）
elizaos env        # 管理环境变量和配置
elizaos dev        # 在开发模式下启动，支持自动重建
elizaos update     # 更新CLI和项目依赖
# 要停止智能体，请在运行elizaos start的终端中使用Ctrl+C
elizaos publish    # 将插件发布到注册表
elizaos plugins    # 管理和发现插件
elizaos monorepo   # 单体仓库开发工具
elizaos tee        # 可信执行环境命令

# 获取任何特定命令的帮助
elizaos <command> --help    # 例如：elizaos create --help, elizaos agent --help
```

### 手动启动Eliza（仅在您知道自己在做什么时推荐）

#### 前置条件

- **Node.js** (推荐v18+)
- **bun** (用于CLI和依赖)
- **git** (用于项目/插件测试)

#### 检出最新版本

```bash
# 克隆仓库
git clone https://github.com/elizaos/eliza.git

# 此项目迭代很快，所以我们建议检出最新版本
git checkout $(git describe --tags --abbrev=0)
# 如果上面的命令没有检出最新版本，这个应该可以：
# git checkout $(git describe --tags `git rev-list --tags --max-count=1`)
```

#### 编辑.env文件

复制.env.example到.env并填入适当的值。

```
cp .env.example .env
```

注意：.env是可选的。如果您计划运行多个不同的智能体，您可以通过角色JSON传递密钥

#### 启动Eliza

重要！我们现在使用Bun。如果您使用的是npm，您需要安装Bun：
https://bun.sh/docs/installation

```bash
bun install
bun run build
bun start
```

### 通过浏览器交互

一旦Eliza运行，访问http://localhost:3000的现代web界面。它经过专业重新设计，具有以下特性：

- 带有渐变英雄部分和清晰的创建智能体和群组呼叫操作的欢迎仪表板
- 用于管理智能体和群组的视觉增强卡片，包括状态指示器和成员计数
- 与智能体的实时聊天功能
- 角色配置选项
- 插件管理
- 全面的内存和对话历史
- 响应式设计，在各种屏幕尺寸上提供最佳体验

## 引用

我们现在有一篇[论文](https://arxiv.org/pdf/2501.06781)，您可以引用Eliza OS：

```bibtex
@article{walters2025eliza,
  title={Eliza: A Web3 friendly AI Agent Operating System},
  author={Walters, Shaw and Gao, Sam and Nerd, Shakker and Da, Feng and Williams, Warren and Meng, Ting-Chien and Han, Hunter and He, Frank and Zhang, Allen and Wu, Ming and others},
  journal={arXiv preprint arXiv:2501.06781},
  year={2025}
}
```

## 贡献者

<a href="https://github.com/elizaos/eliza/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=elizaos/eliza" alt="Eliza项目贡献者" />
</a>

## 星标历史

[![Star History Chart](https://api.star-history.com/svg?repos=elizaos/eliza&type=Date)](https://star-history.com/#elizaos/eliza&Date)

## Git钩子

该项目使用git钩子来确保代码质量：

- **pre-commit**: 在提交之前使用Prettier自动格式化暂存文件

手动运行pre-commit钩子：

```bash
bun run pre-commit
```

## 📂 仓库结构

Eliza被组织为使用Bun、Lerna和Turbo的单体仓库，用于高效的包管理和构建编排。以下是项目结构的详细概述：

- **`/`（根目录）**:

  - `.github/`: GitHub Actions工作流用于CI/CD管道和问题模板
  - `.husky/`: Git钩子配置，包括pre-commit格式化
  - `.devcontainer/`: 开发容器配置，用于一致的环境
  - `packages/`: 核心包和模块（详见下文）
  - `scripts/`: 构建、开发和实用脚本
  - `data/`: 应用程序和用户数据存储
  - `AGENTS.md`: 全面的智能体文档和规范
  - `CHANGELOG.md`: 详细的版本历史和更改
  - `Dockerfile`, `docker-compose.yaml`: 部署的容器配置
  - `lerna.json`, `package.json`, `turbo.json`: 单体仓库配置和工作空间定义

- **`/packages/`**: Eliza框架的核心组件：
  - `core/`: 基础包（@elizaos/core）实现：
    - LangChain集成，用于AI模型交互
    - PDF处理功能
    - 日志记录和错误处理基础设施
  - `app/`: 基于Tauri的跨平台应用程序（@elizaos/app）
    - 基于React的UI实现
    - 系统集成的Tauri插件
    - 桌面和移动构建支持
  - `autodoc/`: 文档自动化工具（@elizaos/autodoc）
    - 基于LangChain的文档生成
    - TypeScript解析和分析
    - 通过Octokit的GitHub集成
  - `cli/`: Eliza管理的命令行界面
  - `client/`: Web界面的客户端库
  - `create-eliza/`: 项目脚手架工具
  - `docs/`: 官方文档源文件
  - `plugin-bootstrap/`: **基本通信核心**（@elizaos/plugin-bootstrap）
    - **基本智能体功能所需** - 处理所有消息处理
    - 提供关键事件处理程序（MESSAGE_RECEIVED、VOICE_MESSAGE_RECEIVED等）
    - 实现基本智能体动作（回复、关注/取消关注、静音/取消静音）
    - 包含智能体认知的核心评估器和提供者
    - 管理消息处理管道和响应生成
    - **除非构建自定义事件处理系统，否则为必需**
  - `plugin-sql/`: 数据库集成（@elizaos/plugin-sql）
    - 带有PGLite支持的PostgreSQL集成
    - 用于类型安全查询的Drizzle ORM
    - 迁移管理工具
    - 集成测试支持
  - `plugin-starter/`: 创建新插件的模板
  - `project-starter/`, `project-tee-starter/`: 项目模板

这种架构实现了模块化开发、关注点的清晰分离，以及在Eliza生态系统中的可扩展功能实现。

## Tauri应用程序CI/CD和签名

使用Tauri构建并位于`packages/app`中的Eliza应用程序配置为跨平台持续集成和部署。此设置自动化了应用程序在各种操作系统上的构建和发布。

### 概述

Tauri应用程序设计为构建：

- 桌面：Linux、macOS和Windows
- 移动：Android和iOS

### CI/CD工作流

两个主要的GitHub Actions工作流处理Tauri应用程序的CI/CD流程：

- **`tauri-ci.yml`**:

  - 在推送到`main`和`develop`分支时触发
  - 执行桌面应用程序（Linux、macOS、Windows）的调试构建，以确保代码完整性并及早发现构建问题

- **`tauri-release.yml`**:
  - 在推送新标签（例如`v*`）或在GitHub上创建/发布新版本时触发
  - 为所有支持的桌面平台构建发布就绪版本（Linux AppImage和.deb、macOS .dmg、Windows .exe NSIS安装程序）
  - 为移动平台构建发布版本（Android .apk、iOS .ipa）
  - 将所有生成的二进制文件和安装程序作为构件上传到相应的GitHub发布版本

### 移动应用程序后端

Eliza Tauri应用程序的移动版本（Android和iOS）配置为连接到托管在`https://api.eliza.how`的外部后端服务。此连接对于移动应用程序的某些功能至关重要。

`packages/app/src-tauri/tauri.conf.json`中的内容安全策略（CSP）已更新，允许`connect-src`指令到此特定域，确保移动应用程序可以安全地与其后端通信。

### 应用程序签名（对发布很重要）

对于`tauri-release.yml`工作流产生适用于应用商店或分发的_签名_和可部署的移动应用程序，必须在GitHub仓库设置中配置特定的密钥（`Settings > Secrets and variables > Actions`）。

**Android签名密钥:**

- `ANDROID_KEYSTORE_BASE64`: Java密钥库文件（`.jks`或`.keystore`）的Base64编码内容
- `ANDROID_KEYSTORE_ALIAS`: 密钥库中密钥的别名
- `ANDROID_KEYSTORE_PRIVATE_KEY_PASSWORD`: 与别名关联的私钥密码
- `ANDROID_KEYSTORE_PASSWORD`: 密钥库文件本身的密码

> **注意**: 如果没有提供这些密钥，CI工作流目前包括为Android生成虚拟、未签名密钥库的步骤。这允许发布构建完成并产生未签名的APK，但此APK无法发布到应用商店。对于官方发布，通过这些密钥提供实际的签名凭据至关重要。

**iOS签名密钥:**

- `APPLE_DEVELOPMENT_CERTIFICATE_P12_BASE64`: Apple分发证书（`.p12`文件）的Base64编码内容
- `APPLE_CERTIFICATE_PASSWORD`: 用于加密`.p12`证书文件的密码
- `APPLE_PROVISIONING_PROFILE_BASE64`: 分发配置文件（`.mobileprovision`文件）的Base64编码内容
- `APPLE_DEVELOPMENT_TEAM`: 您的Apple开发者团队ID（例如`A1B2C3D4E5`）

> **注意**: CI工作流目前包括设置Apple开发环境和iOS签名的占位符步骤。这些步骤需要填充上述密钥。如果未提供这些密钥且签名步骤被激活（通过在工作流中取消注释），iOS构建可能会失败。

### 构件

成功完成`tauri-release.yml`工作流（由新标签/发布触发）后，所有编译的应用程序安装程序和移动包将作为该特定标签的GitHub发布页面上的可下载构件提供。这包括：

- Linux: `.AppImage`和`.deb`文件
- macOS: `.dmg`文件
- Windows: `.exe` NSIS安装程序
- Android: `.apk`文件
- iOS: `.ipa`文件