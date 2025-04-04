# CLI

The CLI provides a set of commands to manage your ElizaOS projects and plugins, from local development to cloud deployment.

# TODO: CLI Documentation goes here

## Environment Variables

Create a .env file with your required variables:

```env
ANTHROPIC_API_KEY=your_key
TELEGRAM_BOT_TOKEN=your_token
# Add other required variables
```

# TEE Deployment Docs

## Getting Started

### Prerequisites

- Docker installed and running
- Node.js and npm/bun installed
- A Docker Hub account for publishing images
- A Phala Cloud (https://cloud.phala.network/login) API key for cloud deployments

## Commands

### Building Your Image

Build your Docker image locally:

```bash
elizaos tee phala build \
  -i your-image-name \
  -u your-dockerhub-username \
  -f path/to/Dockerfile \
  -t tag-name
```

### Running the TEE Simulator

Start the local TEE simulator for testing:

```bash
elizaos tee phala simulator
```

This will start the simulator on http://localhost:8090.

### Local Development

You can develop your agent locally in two ways:

1. Build the docker-compose file separately:

```bash
elizaos tee phala build-compose \
  -i your-image-name \
  -u your-dockerhub-username \
  -t tag-name \
  -c path/to/character.json \
  -e path/to/.env \
  -v v2  # or v1 for legacy mode
```

2. Run an existing compose file:

```bash
elizaos tee phala run-local \
  -c path/to/docker-compose.yml \
  -e path/to/.env
```

This separation allows you to:

- Build compose files without running them immediately
- Version control your compose files
- Share compose files with team members
- Run the same compose file multiple times

The CLI will store generated compose files in:

```
.tee-cloud/
  └── compose-files/     # Generated docker-compose files
      └── your-character-tee-compose.yaml
```

### Publishing Your Image

Push your built image to Docker Hub:

```bash
elizaos tee phala publish \
  -i your-image-name \
  -u your-dockerhub-username \
  -t tag-name
```

### List Available Tags

View all tags for your image on Docker Hub:

```bash
elizaos tee phala list-tags \
  -i your-image-name \
  -u your-dockerhub-username
```

### Cloud Deployment

First, set your Phala Cloud API key:

```bash
elizaos tee phala set-apikey your-api-key
```

Deploy to Phala Cloud:

```bash
elizaos tee phala deploy \
  -t phala \
  -m docker-compose \
  -n your-deployment-name \
  -c path/to/docker-compose.yml \
  --env-file path/to/.env
```

### Managing Cloud Deployments

List your active agents (CVMs):

```bash
elizaos tee phala list-cvms
```

List your TEE pods:

```bash
elizaos tee phala teepods
```

List images in a specific TEE pod:

```bash
elizaos tee phala images --teepod-id your-teepod-id
```

Upgrade an existing deployment:

```bash
elizaos tee phala upgrade \
  -t phala \
  -m docker-compose \
  --app-id your-app-id \
  -c path/to/docker-compose.yml \
  --env-file path/to/.env
```

## Directory Structure

The CLI will create the following directory structure:

```
.tee-cloud/
  └── compose-files/     # Generated docker-compose files
```

## Tips

- Use the simulator for local testing before cloud deployment
- Always test your image locally with `run-local` before publishing
- Keep your API keys secure and never commit them to version control
- Use the `--help` flag with any command for detailed usage information

## Troubleshooting

Common issues and solutions:

1. **Docker Build Fails**

   - Ensure Docker daemon is running
   - Check Dockerfile path is correct
   - Verify you have necessary permissions

2. **Simulator Connection Issues**

   - Check if port 8090 is available
   - Ensure Docker has necessary permissions

3. **Cloud Deployment Fails**
   - Verify API key is set correctly
   - Check if image exists on Docker Hub
   - Ensure environment variables are properly set

For more help, use the `--help` flag with any command:

```bash
elizaos tee phala --help
elizaos tee phala <command> --help
```

##

notes
bun run ./dist/index.js start --character ./src/characters/eliza.ts

CLI

tsx ./src/index.ts train

DEBUG=\* NODE_NO_WARNINGS=1 LOG_LEVEL=debug tsx ./src/index.ts train

strace -f -s 99999 -o strace.txt tsx ./src/index.ts train # 2>&1 | grep ^JSON log.txt | cut -b 5- | jq -s . | gron | grep stack | cut -d. -f2- | sort | uniq -c | sort -n

3768953 execve("/home/mdupont/.bun/bin/node", ["node", "/home/mdupont/.local/share/pnpm/global/5/.pnpm/tsx@4.19.2/node_modules/tsx/dist/cli.mjs", "./src/index.ts", "train"], 0x5f120e0c2dc8 /_ 64 vars _/) = -1 ENOENT (No such file or directory)

3768969 execve("/gnu/store/9nx4zhahn1y95clyrga28rnrjlrqrqyn-node-18.19.0/bin/node", ["/gnu/store/9nx4zhahn1y95clyrga28rnrjlrqrqyn-node-18.19.0/bin/node", "--require", "/home/mdupont/.local/share/pnpm/global/5/.pnpm/tsx@4.19.2/node_modules/tsx/dist/preflight.cjs", "--import", "file:///home/mdupont/.local/share/pnpm/global/5/.pnpm/tsx@4.19.2/node_modules/tsx/dist/loader.mjs", "./src/index.ts", "train"], 0x7ee354003410 /_ 64 vars _/ <unfinished ...>

node --prof ./dist/index.js train
node --cpu-prof ./dist/index.js train

bun run build

DEBUG=\* NODE_NO_WARNINGS=1 LOG_LEVEL=debug tsx ./src/index.ts prof --profile isolate-0x3e14ca10-229214-v8.log

DEBUG=\* NODE_NO_WARNINGS=1 LOG_LEVEL=debug tsx ./src/index.ts cpuprof --profile ./CPU.20250328.185359.3772403.0.001.cpuprofile

DEBUG=\* NODE_NO_WARNINGS=1 LOG_LEVEL=debug tsx ./src/index.ts cpuprof --profile ./CPU.20250331.153438.803523.0.001.cpuprofile > report.txt
node --cpu-prof ./dist/index.js cpuprof --profile ./CPU.20250331.153438.803523.0.001.cpuprofile > report2.txt

cd packages/cli

bun run build:core
bun run build:cli
bun run build
bun run train train > train_log.txt

/\*\*

- This log file captures the detailed process of initializing and training an agent named "METZGER"
- within the Eliza CLI framework. The following key operations and events are documented:
-
- 1.  **Agent Initialization**:
- - The agent "METZGER" is initialized with a unique ID and configuration settings.
- - The agent's metadata includes plugins, secrets, system description, and bio.
- - The agent operates as a self-replicating, ZKP-secured theorem organism.

- 2.  **Plugin Management**:
- - Plugins such as `@elizaos/plugin-sql`, `@elizaos/plugin-groq`, and `@elizaos/plugin-twitter`
-      are loaded, initialized, and registered.
- - Each plugin's exports and default configurations are validated.
- - Plugin-specific actions and services are registered successfully.

- 3.  **Database Connection**:
- - A database connection is established using the `@elizaos/plugin-sql` plugin.
- - The database adapter is registered successfully.

- 4.  **Twitter Integration**:
- - The `@elizaos/plugin-twitter` plugin is configured with a Twitter client.
- - Twitter account details, such as username and user ID, are loaded.
- - The agent's Twitter timeline is populated, and the account joins the "WORLD_JOINED" event.

- 5.  **Action Registration**:
- - Various actions are registered for the agent, including:
-      - `JOIN_TWITTER_SPACE`
-      - `REPLY`
-      - `FOLLOW_ROOM`
-      - `UNFOLLOW_ROOM`
-      - `IGNORE`
-      - `NONE`
-      - `MUTE_ROOM`
-      - `UNMUTE_ROOM`
-      - `SEND_MESSAGE`
-      - `UPDATE_CONTACT`
-      - `CHOOSE_OPTION`
-      - `UPDATE_ROLE`
-      - `UPDATE_SETTINGS`

- 6.  **Service Registration**:
- - Services such as `twitter` are registered and initialized for the agent.

- 7.  **Logging and Debugging**:
- - Detailed logs capture the sequence of operations, including plugin loading,
-      action registration, and service initialization.
- - Debugging information includes stack traces and configuration details.

- 8.  **Provider Information**:
- - A provider named "EVALUATORS" is documented, which is used to evaluate conversations
-      after responding. This provider is marked as private and includes an asynchronous `get` method.

- This log serves as a comprehensive record of the agent's setup and operational workflow.
  \*/
