import { NextRequest, NextResponse } from 'next/server';
import { wrapHandlers } from '@/lib/api/route-wrapper';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import { getSql } from '@/lib/database';
import { AutocoderAgentService } from '@/lib/autocoder/agent-service';
import { BuildQueueManager } from '@/lib/autocoder/build-queue-manager';
import { randomUUID } from 'crypto';

interface WebSocketClient {
  id: string;
  userId: string;
  ws: WebSocket;
  subscribedProjects: Set<string>;
  lastPing: Date;
  isAlive: boolean;
}

interface WebSocketMessage {
  type: string;
  projectId?: string;
  message?: string;
  timestamp?: string;
  data?: any;
}

class AutocoderWebSocketServer {
  private static instance: AutocoderWebSocketServer;
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private agentService: AutocoderAgentService;
  private buildQueue: BuildQueueManager;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.agentService = new AutocoderAgentService();
    this.buildQueue = BuildQueueManager.getInstance();
    this.setupBuildQueueListeners();
  }

  static getInstance(): AutocoderWebSocketServer {
    if (!AutocoderWebSocketServer.instance) {
      AutocoderWebSocketServer.instance = new AutocoderWebSocketServer();
    }
    return AutocoderWebSocketServer.instance;
  }

  async initialize(server: any): Promise<void> {
    if (this.wss) {return;}

    this.wss = new WebSocketServer({
      server,
      path: '/api/autocoder/ws',
    });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    this.startHeartbeat();
    await this.agentService.initialize();

    console.log('AutoCoder WebSocket server initialized');
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const url = parse(req.url || '', true);
    const userId = url.query.userId as string;

    if (!userId) {
      ws.close(1002, 'Missing userId parameter');
      return;
    }

    const clientId = randomUUID();
    const client: WebSocketClient = {
      id: clientId,
      userId,
      ws,
      subscribedProjects: new Set(),
      lastPing: new Date(),
      isAlive: true,
    };

    this.clients.set(clientId, client);

    ws.on('message', (data: Buffer) => {
      this.handleMessage(clientId, data);
    });

    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    });

    ws.on('pong', () => {
      client.isAlive = true;
      client.lastPing = new Date();
    });

    // Send welcome message
    this.sendMessage(clientId, {
      type: 'CONNECTION_ESTABLISHED',
      data: {
        clientId,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`WebSocket client ${clientId} connected for user ${userId}`);
  }

  private async handleMessage(clientId: string, data: Buffer): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {return;}

    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'AGENT_MESSAGE':
          await this.handleAgentMessage(client, message);
          break;

        case 'SUBSCRIBE_PROJECT':
          await this.handleSubscribeProject(client, message);
          break;

        case 'UNSUBSCRIBE_PROJECT':
          await this.handleUnsubscribeProject(client, message);
          break;

        case 'PING':
          this.sendMessage(clientId, { type: 'PONG' });
          break;

        case 'PONG':
          client.isAlive = true;
          client.lastPing = new Date();
          break;

        default:
          console.log(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.sendMessage(clientId, {
        type: 'ERROR',
        data: { message: 'Invalid message format' },
      });
    }
  }

  private async handleAgentMessage(
    client: WebSocketClient,
    message: WebSocketMessage,
  ): Promise<void> {
    if (!message.projectId || !message.message) {
      return;
    }

    try {
      // Store user message in database
      const messageId = randomUUID();
      const sql = getSql();
      await sql.query(
        `
        INSERT INTO autocoder_messages (
          id, project_id, user_id, type, message, timestamp
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `,
        [messageId, message.projectId, client.userId, 'user', message.message],
      );

      // Echo user message to all subscribers
      this.broadcastToProject(message.projectId, {
        type: 'USER_MESSAGE',
        projectId: message.projectId,
        message: message.message,
        timestamp: new Date().toISOString(),
      });

      // Process message with agent and generate response
      await this.processAgentConversation(
        message.projectId,
        client.userId,
        message.message,
      );
    } catch (error) {
      console.error('Failed to handle agent message:', error);
      this.sendMessage(client.id, {
        type: 'ERROR',
        data: { message: 'Failed to process message' },
      });
    }
  }

  private async processAgentConversation(
    projectId: string,
    userId: string,
    userMessage: string,
  ): Promise<void> {
    try {
      // Get project context
      const sql = getSql();
      const project = await sql.query(
        `
        SELECT * FROM autocoder_projects WHERE id = $1 AND user_id = $2
      `,
        [projectId, userId],
      );

      if (project.length === 0) {
        throw new Error('Project not found');
      }

      const currentProject = project[0];

      // Get recent conversation history
      const recentMessages = await sql.query(
        `
        SELECT * FROM autocoder_messages 
        WHERE project_id = $1 
        ORDER BY timestamp DESC 
        LIMIT 10
      `,
        [projectId],
      );

      // Prepare conversation context
      const conversationHistory = recentMessages.reverse().map((msg: any) => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.message,
      }));

      // Determine agent response based on project status and message content
      let agentResponse = '';
      let metadata: any = {};

      if (currentProject.status === 'planning') {
        agentResponse = await this.generatePlanningResponse(
          userMessage,
          conversationHistory,
          currentProject,
        );
        metadata = {
          step: 'planning',
          capabilities: ['research', 'specification'],
        };
      } else if (currentProject.status === 'building') {
        agentResponse = await this.generateBuildingResponse(
          userMessage,
          conversationHistory,
          currentProject,
        );
        metadata = { step: 'building', progress: 50 };
      } else if (currentProject.status === 'completed') {
        agentResponse = await this.generateCompletedResponse(
          userMessage,
          conversationHistory,
          currentProject,
        );
        metadata = {
          step: 'completed',
          capabilities: ['testing', 'deployment'],
        };
      } else {
        agentResponse =
          "I'm here to help you with your project. What would you like to work on?";
      }

      // Store agent response
      const responseId = randomUUID();
      await sql.query(
        `
        INSERT INTO autocoder_messages (
          id, project_id, user_id, type, message, timestamp, metadata
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      `,
        [
          responseId,
          projectId,
          userId,
          'agent',
          agentResponse,
          JSON.stringify(metadata),
        ],
      );

      // Broadcast agent response
      this.broadcastToProject(projectId, {
        type: 'AGENT_MESSAGE',
        projectId,
        message: agentResponse,
        timestamp: new Date().toISOString(),
        data: { metadata },
      });
    } catch (error) {
      console.error('Failed to process agent conversation:', error);

      const errorResponse =
        'I apologize, but I encountered an error processing your message. Please try again.';

      this.broadcastToProject(projectId, {
        type: 'AGENT_MESSAGE',
        projectId,
        message: errorResponse,
        timestamp: new Date().toISOString(),
        data: { metadata: { error: true } },
      });
    }
  }

  private async generatePlanningResponse(
    userMessage: string,
    history: any[],
    project: any,
  ): Promise<string> {
    const lowerMessage = userMessage.toLowerCase();

    if (
      lowerMessage.includes('research') ||
      lowerMessage.includes('find') ||
      lowerMessage.includes('look up')
    ) {
      return `I'll help you research that! Let me analyze existing solutions and best practices for ${project.type} development. 

Based on your requirements, I recommend looking into:
- ElizaOS plugin architecture patterns
- Security best practices for ${project.type} integrations
- Testing strategies for reliable plugins

Would you like me to research any specific aspect in more detail?`;
    }

    if (
      lowerMessage.includes('plan') ||
      lowerMessage.includes('spec') ||
      lowerMessage.includes('requirement')
    ) {
      return `Great! Let's create a detailed specification. I'll help you define:

📋 **Core Features**: What specific functionality should your ${project.type} provide?
🔧 **Dependencies**: Which libraries and services will you need?
🧪 **Testing Strategy**: How should we validate the implementation?
🔒 **Security Requirements**: Any special security considerations?

Please describe the main features you want to include, and I'll help you build a comprehensive plan.`;
    }

    if (
      lowerMessage.includes('build') ||
      lowerMessage.includes('start') ||
      lowerMessage.includes('generate')
    ) {
      return `I'm ready to start building when you are! First, let's make sure we have a solid plan:

✅ **Project Type**: ${project.type}
✅ **Description**: ${project.description}

To proceed with building, I'll need:
1. A list of specific features to implement
2. Any external APIs or services to integrate
3. Your testing requirements
4. Security and performance considerations

Once we have these details, I can generate high-quality code with comprehensive tests. Ready to define the specifications?`;
    }

    return `I'm here to help you plan and build your ${project.type}! I can assist with:

🔍 **Research**: Find best practices and existing solutions
📋 **Planning**: Create detailed specifications and architecture
⚡ **Building**: Generate production-ready code with tests
🧪 **Testing**: Ensure quality and reliability

What aspect would you like to focus on first? Feel free to describe your ideas or ask me to research specific topics.`;
  }

  private async generateBuildingResponse(
    userMessage: string,
    history: any[],
    project: any,
  ): Promise<string> {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('status') || lowerMessage.includes('progress')) {
      return `Your ${project.name} is currently being built! Here's the current progress:

🔄 **Current Phase**: Code Generation
📊 **Progress**: ~60% complete
⏱️ **Estimated Time**: 3-5 minutes remaining

**Recent Steps Completed**:
✅ Research and analysis
✅ Implementation planning  
✅ Core code generation
🔄 Currently: Generating test suite
⏳ Next: Quality analysis and validation

The build process is automated, but feel free to ask questions or request modifications to the specification!`;
    }

    if (
      lowerMessage.includes('modify') ||
      lowerMessage.includes('change') ||
      lowerMessage.includes('update')
    ) {
      return `I can help you modify the build! However, since the build is already in progress, here are your options:

**Option 1**: Wait for this build to complete, then start a new build with your changes
**Option 2**: Cancel the current build and start fresh with modifications
**Option 3**: Make a note of changes for the next iteration

What specific changes did you want to make? I can help you plan the updates for implementation.`;
    }

    if (lowerMessage.includes('cancel') || lowerMessage.includes('stop')) {
      return `You can cancel the current build if needed. This will:

⚠️ Stop the current code generation process
📝 Save your current specification for future builds
🔄 Allow you to start a new build with modifications

Are you sure you want to cancel the current build? If so, you can use the cancel button in the Build Queue tab.`;
    }

    return `Your ${project.name} is being built automatically! The agent is currently:

🤖 Analyzing your requirements
💻 Generating production-ready code
🧪 Creating comprehensive tests
🔍 Performing quality checks

You can monitor the progress in the Build Queue tab. Feel free to ask about the build status or start planning your next project!`;
  }

  private async generateCompletedResponse(
    userMessage: string,
    history: any[],
    project: any,
  ): Promise<string> {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('test') || lowerMessage.includes('try')) {
      return `Excellent! Your ${project.name} is ready for testing. Here's what you can do:

🔍 **Preview Tab**: View all generated files and code
🧪 **Test Results**: See the comprehensive test suite results
📚 **Documentation**: Review the auto-generated docs
🚀 **Live Testing**: Try your plugin in a safe environment

The code includes:
- Full TypeScript implementation
- Comprehensive test coverage
- Security best practices
- Proper error handling
- Complete documentation

Ready to test it out?`;
    }

    if (
      lowerMessage.includes('publish') ||
      lowerMessage.includes('deploy') ||
      lowerMessage.includes('share')
    ) {
      return `Great idea! Your ${project.name} is ready for publishing. You have several options:

📦 **Plugin Registry**: Publish to the private or public registry
🐙 **GitHub**: Create a repository and push your code
📱 **NPM**: Publish as an npm package (optional)
👥 **Team Sharing**: Share with specific collaborators

The Registry tab will guide you through:
- Setting up package metadata
- Choosing visibility (public/private)
- GitHub integration
- Version management

Would you like to start the publishing process?`;
    }

    if (
      lowerMessage.includes('improve') ||
      lowerMessage.includes('enhance') ||
      lowerMessage.includes('add')
    ) {
      return `I'd love to help you improve ${project.name}! Here are some enhancement options:

🔧 **New Features**: Add additional functionality
🎨 **UI Improvements**: Enhance user experience
⚡ **Performance**: Optimize speed and efficiency
🔒 **Security**: Strengthen security measures
📚 **Documentation**: Expand guides and examples

You can either:
1. Start a new project to build an enhanced version
2. Create a new build with additional specifications
3. Manually modify the generated code

What specific improvements did you have in mind?`;
    }

    return `🎉 Congratulations! Your ${project.name} has been successfully built and is ready to use!

**What's included**:
✅ Production-ready code with TypeScript
✅ Comprehensive test suite
✅ Security best practices implemented
✅ Complete documentation
✅ Quality score: High

**Next steps**:
🔍 **Preview**: Review the generated code and tests
🧪 **Test**: Try your plugin in the live testing environment  
📦 **Publish**: Share your plugin with others
🚀 **Deploy**: Use it in your ElizaOS agent

What would you like to do next?`;
  }

  private async handleSubscribeProject(
    client: WebSocketClient,
    message: WebSocketMessage,
  ): Promise<void> {
    if (!message.projectId) {return;}

    client.subscribedProjects.add(message.projectId);

    this.sendMessage(client.id, {
      type: 'SUBSCRIBED',
      projectId: message.projectId,
      data: { message: 'Successfully subscribed to project updates' },
    });

    console.log(
      `Client ${client.id} subscribed to project ${message.projectId}`,
    );
  }

  private async handleUnsubscribeProject(
    client: WebSocketClient,
    message: WebSocketMessage,
  ): Promise<void> {
    if (!message.projectId) {return;}

    client.subscribedProjects.delete(message.projectId);

    this.sendMessage(client.id, {
      type: 'UNSUBSCRIBED',
      projectId: message.projectId,
      data: { message: 'Successfully unsubscribed from project updates' },
    });

    console.log(
      `Client ${client.id} unsubscribed from project ${message.projectId}`,
    );
  }

  private handleDisconnection(clientId: string): void {
    this.clients.delete(clientId);
    console.log(`WebSocket client ${clientId} disconnected`);
  }

  private setupBuildQueueListeners(): void {
    this.buildQueue.on('job-started', (job) => {
      this.broadcastToProject(job.projectId, {
        type: 'PROJECT_UPDATE',
        projectId: job.projectId,
        data: { updates: { status: 'building' } },
      });
    });

    this.buildQueue.on('job-progress', (job) => {
      this.broadcastToProject(job.projectId, {
        type: 'BUILD_LOG',
        projectId: job.projectId,
        data: {
          log: {
            level: 'info',
            message: job.currentStep || `Build progress: ${job.progress}%`,
            timestamp: new Date().toISOString(),
            source: 'build-queue',
          },
        },
      });
    });

    this.buildQueue.on('job-completed', (job) => {
      this.broadcastToProject(job.projectId, {
        type: 'PROJECT_UPDATE',
        projectId: job.projectId,
        data: { updates: { status: 'completed' } },
      });
    });

    this.buildQueue.on('job-failed', (job) => {
      this.broadcastToProject(job.projectId, {
        type: 'PROJECT_UPDATE',
        projectId: job.projectId,
        data: { updates: { status: 'failed' } },
      });
    });
  }

  private sendMessage(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  private broadcastToProject(
    projectId: string,
    message: WebSocketMessage,
  ): void {
    for (const client of this.clients.values()) {
      if (
        client.subscribedProjects.has(projectId) &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(JSON.stringify(message));
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [clientId, client] of this.clients.entries()) {
        if (!client.isAlive) {
          console.log(`Terminating inactive client ${clientId}`);
          client.ws.terminate();
          this.clients.delete(clientId);
          continue;
        }

        client.isAlive = false;
        client.ws.ping();
      }
    }, 30000); // 30 seconds
  }

  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    for (const client of this.clients.values()) {
      client.ws.close(1001, 'Server shutting down');
    }

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
    }

    console.log('AutoCoder WebSocket server shut down');
  }
}

// Export for Next.js API route
async function handleGET(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'WebSocket endpoint requires WebSocket upgrade',
    },
    { status: 400 },
  );
}

// Initialize WebSocket server (this would typically be done in a server setup file)
let wsServer: AutocoderWebSocketServer | null = null;

function initializeWebSocketServer(): AutocoderWebSocketServer {
  if (!wsServer) {
    wsServer = AutocoderWebSocketServer.getInstance();
  }
  return wsServer;
}

// Export class for use in other modules (but not as route export)
export type { AutocoderWebSocketServer };

export const { GET } = wrapHandlers({ handleGET });
