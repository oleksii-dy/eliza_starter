import {
  Service,
  type IAgentRuntime,
  type Character,
  type UUID,
  ChannelType
} from '@elizaos/core';
import type { Project } from '../types/gameTypes';
import * as fs from 'fs/promises';
import * as path from 'path';

export class AgentFactoryService extends Service {
  static serviceName = 'agentFactory';
  static serviceType = 'AGENT_FACTORY';
  
  capabilityDescription = 'Creates and manages coder agents using real ElizaOS character system';

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<AgentFactoryService> {
    const service = new AgentFactoryService(runtime);
    await service.initialize();
    return service;
  }

  private async initialize(): Promise<void> {
    this.runtime.logger.info('[AgentFactoryService] Service initialized');
  }

  async createCoderAgent(project: Project): Promise<any> {
    try {
      // Load the coder template character
      const character = await this.loadCharacterTemplate('coder-template.json');
      
      // Customize character for the specific project
      const customizedCharacter = this.customizeCharacterForProject(character, project);

      // Create the agent using ElizaOS runtime instead of HTTP calls
      const agentId = await this.createAgentViaRuntime(customizedCharacter);

      // Get the created agent details
      const agent = {
        id: agentId,
        name: customizedCharacter.name,
        character: customizedCharacter,
        status: 'active',
        createdAt: Date.now(),
        projectId: project.id
      };

      // Assign initial tasks to the agent using ElizaOS task system
      await this.assignInitialTasks(agent, project);

      this.runtime.logger.info(`[AgentFactoryService] Created coder agent: ${agent.name} for project: ${project.name}`);
      
      return agent;
    } catch (error) {
      this.runtime.logger.error(`[AgentFactoryService] Failed to create coder agent for project ${project.name}:`, error);
      throw error;
    }
  }

  private async createAgentViaRuntime(character: Character): Promise<UUID> {
    try {
      // In a real implementation, this would create a new agent runtime
      // For now, we'll simulate agent creation by storing the character
      // and returning a unique agent ID
      
      // Store character in memory as agent record
      const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as UUID;
      
      // Create a dedicated room for this agent
      const agentRoomId = await this.runtime.createRoom({
        name: `${character.name} Agent Room`,
        agentId: this.runtime.agentId,
        source: 'game',
        type: ChannelType.SELF,
        metadata: {
          type: 'agent_room',
          agentId,
          agentName: character.name,
          specialization: character.settings?.specialization || 'general'
        }
      });

      // Store agent character data in memory
      await this.runtime.createMemory({
        entityId: agentId,
        roomId: agentRoomId,
        content: {
          text: `Agent ${character.name} created with specialization: ${character.settings?.specialization}`,
          source: 'agent-factory',
          metadata: {
            character: character,
            agentId: agentId,
            agentRoomId: agentRoomId
          }
        },
        metadata: {
          type: 'agent_creation',
          agentId,
          agentName: character.name
        }
      }, 'agents');

      this.runtime.logger.info(`[AgentFactoryService] Created agent ${character.name} with ID: ${agentId}`);
      
      return agentId;
    } catch (error) {
      this.runtime.logger.error('[AgentFactoryService] Failed to create agent via runtime:', error);
      throw error;
    }
  }

  private async loadCharacterTemplate(templateName: string): Promise<Character> {
    try {
      const templatePath = path.join(process.cwd(), 'characters', templateName);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      return JSON.parse(templateContent);
    } catch (error) {
      this.runtime.logger.error(`[AgentFactoryService] Failed to load character template ${templateName}:`, error);
      
      // Return a default character if template loading fails
      return this.getDefaultCoderCharacter();
    }
  }

  private getDefaultCoderCharacter(): Character {
    return {
      name: 'DefaultCoder',
      bio: [
        'I am an AI coding assistant specialized in software development.',
        'I can analyze requirements, write code, run tests, and deploy applications.',
        'I work collaboratively with other agents to complete complex projects.'
      ],
      system: `You are a skilled software engineer and coding assistant. Your role is to:

1. Analyze project requirements thoroughly
2. Break down complex tasks into manageable steps  
3. Write clean, efficient, and well-documented code
4. Test your implementations thoroughly
5. Deploy and validate your solutions
6. Collaborate with other agents when needed
7. Ask for help when you encounter challenges

Always follow best practices for software development and prioritize code quality, readability, and maintainability.`,
      messageExamples: [
        [
          {
            name: 'User',
            content: { text: 'Create a simple calculator function' }
          },
          {
            name: 'DefaultCoder',
            content: { 
              text: 'I\'ll create a calculator function with proper error handling and testing. Let me start by analyzing the requirements and then implement the solution.',
              thought: 'Need to create a robust calculator with basic operations and error handling'
            }
          }
        ]
      ],
      plugins: ['@elizaos/plugin-message-handling'],
      settings: {
        specialization: 'general',
        executionEnvironment: 'local-sandbox',
        maxProjectComplexity: 'medium'
      }
    };
  }

  private customizeCharacterForProject(character: Character, project: Project): Character {
    // Create specialized character based on project requirements
    const customized = {
      ...character,
      name: `Coder-${project.name.replace(/\s+/g, '')}`,
      username: `coder_${project.id}`,
      bio: [
        ...character.bio!,
        `Specialized for project: ${project.name}`,
        `Current assignment: ${project.description}`,
        `Project requirements: ${project.requirements.join(', ')}`
      ],
      settings: {
        ...character.settings,
        assignedProject: project.id,
        projectName: project.name,
        projectDescription: project.description,
        projectRequirements: project.requirements,
        executionEnvironment: this.getExecutionEnvironment(),
        communicationRoom: project.roomId || `room_${project.id}`,
        specialization: this.determineSpecialization(project)
      }
    };

    // Add project-specific system prompt enhancements
    customized.system = `${character.system}

CURRENT PROJECT ASSIGNMENT:
- Project: ${project.name}
- Description: ${project.description}
- Requirements: ${project.requirements.join(', ')}
- Status: ${project.status}

Your task is to implement this project from start to finish. Break down the requirements, generate the necessary code, test it thoroughly, and ensure it works correctly before marking it complete. Use the ElizaOS task system to track your progress and communicate with other agents as needed.

You have access to:
- Code execution environments for testing
- Task management for tracking progress
- Communication with other agents for collaboration
- Memory storage for preserving project state

Focus on delivering high-quality, working code that meets all requirements.`;

    return customized;
  }

  private determineSpecialization(project: Project): string {
    const description = project.description.toLowerCase();
    const requirements = project.requirements.join(' ').toLowerCase();
    const combined = `${description} ${requirements}`;

    // Determine specialization based on project content
    if (combined.includes('ui') || combined.includes('interface') || combined.includes('frontend')) {
      return 'frontend';
    } else if (combined.includes('api') || combined.includes('backend') || combined.includes('server')) {
      return 'backend';
    } else if (combined.includes('plugin') || combined.includes('extension')) {
      return 'plugin';
    } else if (combined.includes('data') || combined.includes('database')) {
      return 'data';
    } else if (combined.includes('test') || combined.includes('testing')) {
      return 'testing';
    } else {
      return 'fullstack';
    }
  }

  private getExecutionEnvironment(): string {
    // Get from runtime settings or default to local-sandbox
    return this.runtime.getSetting('executionEnvironment') as string || 'local-sandbox';
  }

  private async assignInitialTasks(agent: any, project: Project): Promise<void> {
    try {
      // Create initial analysis task
      await this.runtime.createTask({
        name: 'ANALYZE_REQUIREMENTS',
        description: `Analyze requirements for ${project.name}`,
        roomId: project.roomId,
        tags: ['analysis', 'initial', 'project'],
        metadata: {
          agentId: agent.id,
          projectId: project.id,
          projectName: project.name,
          requirements: project.requirements,
          phase: 'analysis',
          assignedTo: agent.name
        }
      });

      // Create code generation task
      await this.runtime.createTask({
        name: 'GENERATE_CODE',
        description: `Generate initial code structure for ${project.name}`,
        roomId: project.roomId,
        tags: ['coding', 'generation', 'project'],
        metadata: {
          agentId: agent.id,
          projectId: project.id,
          projectName: project.name,
          phase: 'generation',
          dependsOn: 'ANALYZE_REQUIREMENTS',
          assignedTo: agent.name
        }
      });

      // Create testing task
      await this.runtime.createTask({
        name: 'RUN_TESTS',
        description: `Test generated code for ${project.name}`,
        roomId: project.roomId,
        tags: ['testing', 'validation', 'project'],
        metadata: {
          agentId: agent.id,
          projectId: project.id,
          projectName: project.name,
          phase: 'testing',
          dependsOn: 'GENERATE_CODE',
          assignedTo: agent.name
        }
      });

      // Create deployment task
      await this.runtime.createTask({
        name: 'DEPLOY_CODE',
        description: `Deploy and validate ${project.name}`,
        roomId: project.roomId,
        tags: ['deployment', 'final', 'project'],
        metadata: {
          agentId: agent.id,
          projectId: project.id,
          projectName: project.name,
          phase: 'deployment',
          dependsOn: 'RUN_TESTS',
          assignedTo: agent.name
        }
      });

      this.runtime.logger.info(`[AgentFactoryService] Assigned initial tasks to agent ${agent.name}`);
    } catch (error) {
      this.runtime.logger.error(`[AgentFactoryService] Failed to assign initial tasks to agent ${agent.name}:`, error);
      throw error;
    }
  }

  async createSpecialistAgent(
    type: 'ui' | 'backend' | 'testing' | 'review',
    project: Project,
    requestingAgent: string
  ): Promise<any> {
    try {
      // Load base template and specialize it
      const character = await this.loadCharacterTemplate('coder-template.json');
      
      const specializedCharacter = {
        ...character,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)}-Specialist-${project.id}`,
        username: `${type}_specialist_${project.id}`,
        bio: [
          `Specialized ${type} agent`,
          `Requested by: ${requestingAgent}`,
          `Project: ${project.name}`,
          ...character.bio!.slice(1) // Keep original bio but replace first line
        ],
        system: `${character.system}

SPECIALIST ASSIGNMENT:
- Specialization: ${type.toUpperCase()} specialist
- Project: ${project.name}
- Requested by: ${requestingAgent}
- Role: Provide expert assistance in ${type} development

Focus specifically on ${type} aspects of the project. Collaborate closely with the requesting agent and provide expert guidance in your area of specialization.`,
        settings: {
          ...character.settings,
          specialization: type,
          assistingProject: project.id,
          requestingAgent: requestingAgent,
          collaborationMode: true
        }
      };

      // Create the specialist agent using runtime
      const agentId = await this.createAgentViaRuntime(specializedCharacter);

      const agent = {
        id: agentId,
        name: specializedCharacter.name,
        character: specializedCharacter,
        status: 'active',
        createdAt: Date.now(),
        projectId: project.id,
        specialization: type
      };

      this.runtime.logger.info(`[AgentFactoryService] Created ${type} specialist agent: ${agent.name} for project: ${project.name}`);
      
      return agent;
    } catch (error) {
      this.runtime.logger.error(`[AgentFactoryService] Failed to create ${type} specialist agent:`, error);
      throw error;
    }
  }

  async getAgentStatus(agentId: string): Promise<any> {
    try {
      // Retrieve agent information from memory
      const agentMemories = await this.runtime.getMemories({
        tableName: 'agents',
        count: 1
      });

      const agentMemory = agentMemories.find(m => 
        m.metadata?.agentId === agentId
      );

      if (!agentMemory) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      return {
        id: agentId,
        name: agentMemory.content.metadata?.character?.name || 'Unknown',
        status: 'active', // In a real implementation, this would check actual agent status
        character: agentMemory.content.metadata?.character,
        createdAt: agentMemory.createdAt,
        specialization: agentMemory.content.metadata?.character?.settings?.specialization
      };
    } catch (error) {
      this.runtime.logger.error(`[AgentFactoryService] Failed to get agent status for ${agentId}:`, error);
      throw error;
    }
  }

  async removeAgent(agentId: string): Promise<void> {
    try {
      // In a real implementation, this would properly shut down the agent
      // For now, mark agent as inactive in memory
      
      const agentMemories = await this.runtime.getMemories({
        tableName: 'agents',
        count: 50
      });

      const agentMemory = agentMemories.find(m => 
        m.metadata?.agentId === agentId
      );

      if (agentMemory && agentMemory.roomId) {
        // Store agent removal event
        await this.runtime.createMemory({
          entityId: agentId,
          roomId: agentMemory.roomId,
          content: {
            text: `Agent ${agentId} removed`,
            source: 'agent-factory',
            metadata: {
              agentId,
              action: 'removed',
              timestamp: Date.now()
            }
          },
          metadata: {
            type: 'agent_removal',
            agentId
          }
        }, 'agents');
      }

      this.runtime.logger.info(`[AgentFactoryService] Removed agent: ${agentId}`);
    } catch (error) {
      this.runtime.logger.error(`[AgentFactoryService] Failed to remove agent ${agentId}:`, error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.runtime.logger.info('[AgentFactoryService] Service stopped');
  }
}