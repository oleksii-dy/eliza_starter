# Multi-Agent Sandbox Development Team Design

## Overview

A system where a main agent spawns multiple specialized agents in an E2B sandbox to collaboratively develop software projects.

## Architecture Components

### 1. E2B Sandbox Integration Plugin

```typescript
interface SandboxManager {
  createSandbox(template: string): Promise<string>; // Returns sandbox ID
  deployAgents(sandboxId: string, agents: AgentConfig[]): Promise<void>;
  createRoom(sandboxId: string): Promise<string>; // Returns room ID
  connectToHost(sandboxId: string, roomId: string): Promise<void>;
  destroySandbox(sandboxId: string): Promise<void>;
}
```

### 2. Custom Eliza Container (Dockerfile)

```dockerfile
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache git python3 make g++ sqlite

# Install Eliza CLI globally
WORKDIR /app
COPY . .
RUN npm install -g .

# Create workspace for projects
RUN mkdir -p /workspace

# Install common development tools
RUN npm install -g vite create-react-app express sqlite3

# Expose WebSocket port
EXPOSE 3001

# Default command to start an agent
CMD ["elizaos", "start", "--character", "/config/character.json"]
```

### 3. Character Manifests

#### Backend Agent (`backend-agent.json`)

```json
{
  "name": "DevBot Backend",
  "bio": [
    "I'm a specialized backend developer agent.",
    "I excel at Node.js, Express, SQLite, APIs, and server architecture.",
    "I write clean, efficient backend code with proper error handling."
  ],
  "system": "You are an expert backend developer. Focus on server-side logic, databases, APIs, and backend architecture. Always write production-ready code with proper error handling and validation.",
  "plugins": ["elizaos-services", "autocoder", "websocket-bridge"],
  "settings": {
    "specialty": "backend",
    "preferred_stack": ["node", "express", "sqlite", "typescript"],
    "workspace": "/workspace"
  }
}
```

#### Frontend Agent (`frontend-agent.json`)

```json
{
  "name": "DevBot Frontend",
  "bio": [
    "I'm a specialized frontend developer agent.",
    "I create beautiful, responsive UIs with React, Vite, and modern CSS.",
    "I focus on user experience and component architecture."
  ],
  "system": "You are an expert frontend developer. Focus on React components, UI/UX, responsive design, and modern JavaScript. Always create clean, maintainable component architecture.",
  "plugins": ["elizaos-services", "autocoder", "websocket-bridge"],
  "settings": {
    "specialty": "frontend",
    "preferred_stack": ["react", "vite", "typescript", "tailwind"],
    "workspace": "/workspace"
  }
}
```

#### DevOps Agent (`devops-agent.json`)

```json
{
  "name": "DevBot DevOps",
  "bio": [
    "I'm a specialized DevOps and infrastructure agent.",
    "I handle deployment, containerization, CI/CD, and project setup.",
    "I ensure projects are production-ready and well-configured."
  ],
  "system": "You are an expert DevOps engineer. Focus on project setup, build systems, deployment, and infrastructure. Ensure all projects are production-ready with proper configuration.",
  "plugins": ["elizaos-services", "autocoder", "websocket-bridge"],
  "settings": {
    "specialty": "devops",
    "preferred_tools": ["docker", "vite", "npm", "github-actions"],
    "workspace": "/workspace"
  }
}
```

### 4. WebSocket Bridge Plugin

```typescript
interface WebSocketBridge {
  // Connect sandbox agent back to host server
  connectToHost(hostUrl: string, roomId: string, agentId: string): Promise<void>;

  // Send messages to shared room
  sendToRoom(roomId: string, message: Content): Promise<void>;

  // Listen for room messages
  onRoomMessage(callback: (message: Memory) => void): void;

  // Sync project files
  syncFiles(files: ProjectFile[]): Promise<void>;
}
```

### 5. Project Orchestration Actions

#### SPAWN_DEV_TEAM Action

```typescript
const spawnDevTeamAction: Action = {
  name: 'SPAWN_DEV_TEAM',
  similes: ['create dev team', 'start development team', 'spawn agents'],
  description: 'Spawns a multi-agent development team in a sandbox',
  handler: async (runtime, message, state) => {
    const projectSpec = parseJSONObjectFromText(message.content.text);

    // 1. Create E2B sandbox
    const sandboxId = await runtime.getService('sandbox-manager').createSandbox('eliza-dev-team');

    // 2. Create shared room
    const roomId = await runtime.createRoom({
      type: 'GROUP',
      name: `dev-team-${Date.now()}`,
      participants: [runtime.agentId],
    });

    // 3. Deploy specialized agents
    const agents = [
      { character: 'backend-agent.json', role: 'backend' },
      { character: 'frontend-agent.json', role: 'frontend' },
      { character: 'devops-agent.json', role: 'devops' },
    ];

    await runtime.getService('sandbox-manager').deployAgents(sandboxId, agents);

    // 4. Connect agents to room
    await runtime.getService('sandbox-manager').connectToHost(sandboxId, roomId);

    // 5. Send project briefing
    await runtime.sendMessage(roomId, {
      text: `🚀 New Project: ${projectSpec.name}
      
Requirements:
- ${projectSpec.requirements.join('\n- ')}

Tech Stack: React + Vite + Express + SQLite

Let's plan this project together! Backend, Frontend, and DevOps - please introduce yourselves and let's discuss the architecture.`,
      type: 'project_briefing',
    });

    return {
      text: `✅ Development team spawned in sandbox ${sandboxId}! 
      
Team Room: ${roomId}
- Backend Agent: Ready
- Frontend Agent: Ready  
- DevOps Agent: Ready

The team is now planning your project. Check the room for updates!`,
      data: { sandboxId, roomId, agents },
    };
  },
};
```

### 6. Specialized Development Actions

#### CREATE_PROJECT_STRUCTURE (DevOps Agent)

```typescript
const createProjectStructureAction: Action = {
  name: 'CREATE_PROJECT_STRUCTURE',
  description: 'Sets up the initial project structure and build system',
  handler: async (runtime, message, state) => {
    const projectName = 'todo-app';

    // Create project structure
    await runtime.getService('autocoder').generateFiles({
      'package.json': generatePackageJson(projectName),
      'vite.config.js': generateViteConfig(),
      'server/package.json': generateServerPackageJson(),
      'README.md': generateReadme(projectName),
      '.gitignore': generateGitignore(),
      'docker-compose.yml': generateDockerCompose(),
    });

    return {
      text: `📁 Project structure created for ${projectName}!
      
Created:
- Frontend (React + Vite)
- Backend (Express + SQLite)  
- Docker configuration
- Build scripts

Ready for development! Backend team, please set up the API. Frontend team, start on the components.`,
      files: projectFiles,
    };
  },
};
```

### 7. Room Management & Coordination

#### DELEGATE_TASK Action

```typescript
const delegateTaskAction: Action = {
  name: 'DELEGATE_TASK',
  description: 'Delegates specific tasks to team members',
  handler: async (runtime, message, state) => {
    const task = parseJSONObjectFromText(message.content.text);

    const assignments = {
      backend: [
        'Set up Express server',
        'Create SQLite schema',
        'Build REST API endpoints',
        'Add validation middleware',
      ],
      frontend: [
        'Create React components',
        'Design responsive UI',
        'Implement state management',
        'Add API integration',
      ],
      devops: [
        'Configure build system',
        'Set up development environment',
        'Create deployment scripts',
        'Add testing configuration',
      ],
    };

    // Send targeted messages to each specialist
    for (const [role, tasks] of Object.entries(assignments)) {
      await runtime.sendMessage(state.roomId, {
        text: `@${role} Your tasks for this sprint:
        
${tasks.map((task, i) => `${i + 1}. ${task}`).join('\n')}

Please start with task 1 and update the room when complete!`,
        recipient: role,
      });
    }

    return {
      text: '📋 Tasks delegated to all team members! Work is beginning...',
      data: { assignments },
    };
  },
};
```

## Demo Scenario: Todo List App

### Project Flow

1. **User**: "Create a todo list app with React, Express, and SQLite"
2. **Main Agent**: Spawns dev team, creates room, delegates project
3. **DevOps Agent**: Sets up project structure, build system
4. **Backend Agent**: Creates Express API, SQLite schema, CRUD endpoints
5. **Frontend Agent**: Builds React components, integrates with API
6. **All Agents**: Collaborate in room, share progress, resolve issues
7. **Result**: Complete working todo app deployed in sandbox

### Key Features

- **Real-time Collaboration**: Agents communicate in shared room
- **Specialized Expertise**: Each agent focuses on their domain
- **Code Generation**: Uses autocoder plugin for actual implementation
- **Project Management**: Main agent orchestrates and tracks progress
- **Isolated Environment**: All development happens in sandbox
- **File Synchronization**: Code changes shared between agents

This creates a truly autonomous AI development team that can build complete applications from natural language requirements!
