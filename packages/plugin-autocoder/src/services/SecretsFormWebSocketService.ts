import {
    type IAgentRuntime,
    Service,
    ServiceType,
    elizaLogger,
} from '@elizaos/core';
import { EventEmitter } from 'events';

export interface SecretsFormInjectionMessage {
    type: 'INJECT_SECRETS_FORM' | 'FORM_COMPLETED' | 'FORM_CANCELLED';
    data: {
        formRequest?: any;
        formUrl?: string;
        formId?: string;
        secrets?: Record<string, string>;
        timestamp: string;
        projectId?: string;
    };
}

export class SecretsFormWebSocketService extends Service {
    static serviceType = ServiceType.WEBSOCKET;
    
    private eventEmitter: EventEmitter;
    private activeConnections: Set<any> = new Set();
    private activeForms: Map<string, any> = new Map();

    get capabilityDescription(): string {
        return 'Handles WebSocket communication for secrets form injection and completion';
    }

    constructor(runtime?: IAgentRuntime) {
        super(runtime);
        this.eventEmitter = new EventEmitter();
        elizaLogger.info('SecretsFormWebSocketService initialized');
    }

    static async start(runtime: IAgentRuntime): Promise<SecretsFormWebSocketService> {
        const service = new SecretsFormWebSocketService(runtime);
        await service.initialize();
        return service;
    }

    private async initialize(): Promise<void> {
        try {
            // Set up event listeners for form lifecycle
            this.eventEmitter.on('form_injected', this.handleFormInjected.bind(this));
            this.eventEmitter.on('form_completed', this.handleFormCompleted.bind(this));
            this.eventEmitter.on('form_cancelled', this.handleFormCancelled.bind(this));

            // Listen for incoming WebSocket messages
            this.eventEmitter.on('websocket_message', this.handleWebSocketMessage.bind(this));

            elizaLogger.info('SecretsFormWebSocketService initialized successfully');
        } catch (error) {
            elizaLogger.error('Error initializing SecretsFormWebSocketService:', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
        try {
            // Clean up all active connections
            this.activeConnections.clear();
            this.activeForms.clear();
            this.eventEmitter.removeAllListeners();
            
            elizaLogger.info('SecretsFormWebSocketService stopped');
        } catch (error) {
            elizaLogger.error('Error stopping SecretsFormWebSocketService:', error);
        }
    }

    // Register a WebSocket connection
    registerConnection(connection: any): void {
        this.activeConnections.add(connection);
        elizaLogger.info(`WebSocket connection registered, total: ${this.activeConnections.size}`);
        
        // Set up connection event handlers
        if (connection.on) {
            connection.on('message', (data: any) => {
                this.handleIncomingMessage(connection, data);
            });

            connection.on('close', () => {
                this.activeConnections.delete(connection);
                elizaLogger.info(`WebSocket connection closed, remaining: ${this.activeConnections.size}`);
            });
        }
    }

    // Broadcast form injection to all active connections
    async broadcastFormInjection(formRequest: any, formUrl: string): Promise<void> {
        const message: SecretsFormInjectionMessage = {
            type: 'INJECT_SECRETS_FORM',
            data: {
                formRequest,
                formUrl,
                timestamp: new Date().toISOString(),
                projectId: formRequest.projectId
            }
        };

        await this.broadcast(message);
        
        // Track active form
        this.activeForms.set(formRequest.id, {
            ...formRequest,
            formUrl,
            createdAt: new Date().toISOString(),
            status: 'active'
        });

        elizaLogger.info(`Broadcasted form injection for form ${formRequest.id} to ${this.activeConnections.size} connections`);
    }

    // Broadcast message to all active connections
    async broadcast(message: SecretsFormInjectionMessage): Promise<void> {
        if (this.activeConnections.size === 0) {
            elizaLogger.warn('No active WebSocket connections for broadcast');
            return;
        }

        const messageString = JSON.stringify(message);
        
        for (const connection of this.activeConnections) {
            try {
                if (connection.send && typeof connection.send === 'function') {
                    connection.send(messageString);
                } else if (connection.emit && typeof connection.emit === 'function') {
                    connection.emit('secrets_form_message', message);
                }
            } catch (error) {
                elizaLogger.error('Error sending message to connection:', error);
                // Remove failed connection
                this.activeConnections.delete(connection);
            }
        }
    }

    // Handle incoming WebSocket messages
    private handleIncomingMessage(connection: any, data: any): void {
        try {
            let message: SecretsFormInjectionMessage;
            
            if (typeof data === 'string') {
                message = JSON.parse(data);
            } else {
                message = data;
            }

            elizaLogger.info('Received WebSocket message:', { type: message.type, formId: message.data?.formId });

            switch (message.type) {
                case 'FORM_COMPLETED':
                    this.handleFormCompletedMessage(message);
                    break;
                case 'FORM_CANCELLED':
                    this.handleFormCancelledMessage(message);
                    break;
                default:
                    elizaLogger.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            elizaLogger.error('Error handling incoming WebSocket message:', error);
        }
    }

    // Handle form completion
    private async handleFormCompletedMessage(message: SecretsFormInjectionMessage): Promise<void> {
        const { formId, secrets, projectId } = message.data;
        
        if (!formId || !secrets) {
            elizaLogger.error('Invalid form completion message - missing formId or secrets');
            return;
        }

        const activeForm = this.activeForms.get(formId);
        if (!activeForm) {
            elizaLogger.error('Form completion received for unknown form:', formId);
            return;
        }

        try {
            // Store secrets using secrets manager
            const secretsService = this.runtime?.getService('SECRETS');
            if (secretsService && typeof secretsService.storeSecrets === 'function') {
                await secretsService.storeSecrets(secrets, {
                    formId,
                    projectId,
                    source: 'autocoder_form'
                });
                
                elizaLogger.info(`Stored ${Object.keys(secrets).length} secrets from form ${formId}`);
            }

            // Update form status
            this.activeForms.set(formId, {
                ...activeForm,
                status: 'completed',
                completedAt: new Date().toISOString(),
                secretsCount: Object.keys(secrets).length
            });

            // Notify runtime about form completion
            if (this.runtime) {
                await this.runtime.createMemory({
                    entityId: this.runtime.agentId,
                    roomId: projectId || 'autocoder',
                    content: {
                        text: `Secrets form completed: ${Object.keys(secrets).length} values provided`,
                        source: 'autocoder',
                        type: 'secrets_form_completion',
                        formId,
                        secretKeys: Object.keys(secrets)
                    },
                    metadata: {
                        type: 'secrets_form',
                        formId,
                        status: 'completed',
                        secretsProvided: Object.keys(secrets)
                    }
                });
            }

            this.eventEmitter.emit('form_completed', { formId, secrets, projectId });
            
        } catch (error) {
            elizaLogger.error('Error handling form completion:', error);
        }
    }

    // Handle form cancellation
    private async handleFormCancelledMessage(message: SecretsFormInjectionMessage): Promise<void> {
        const { formId, projectId } = message.data;
        
        if (!formId) {
            elizaLogger.error('Invalid form cancellation message - missing formId');
            return;
        }

        const activeForm = this.activeForms.get(formId);
        if (activeForm) {
            this.activeForms.set(formId, {
                ...activeForm,
                status: 'cancelled',
                cancelledAt: new Date().toISOString()
            });
        }

        // Notify runtime about form cancellation
        if (this.runtime) {
            await this.runtime.createMemory({
                entityId: this.runtime.agentId,
                roomId: projectId || 'autocoder',
                content: {
                    text: 'Secrets form was cancelled by user',
                    source: 'autocoder',
                    type: 'secrets_form_cancellation',
                    formId
                },
                metadata: {
                    type: 'secrets_form',
                    formId,
                    status: 'cancelled'
                }
            });
        }

        this.eventEmitter.emit('form_cancelled', { formId, projectId });
        elizaLogger.info(`Form ${formId} was cancelled`);
    }

    private handleFormInjected(data: any): void {
        elizaLogger.info('Form injected event:', data);
    }

    private handleFormCompleted(data: any): void {
        elizaLogger.info('Form completed event:', data);
    }

    private handleFormCancelled(data: any): void {
        elizaLogger.info('Form cancelled event:', data);
    }

    private handleWebSocketMessage(data: any): void {
        elizaLogger.info('WebSocket message event:', data);
    }

    // Get active forms
    getActiveForms(): Array<any> {
        return Array.from(this.activeForms.values());
    }

    // Get form by ID
    getForm(formId: string): any | null {
        return this.activeForms.get(formId) || null;
    }

    // Get connection count
    getConnectionCount(): number {
        return this.activeConnections.size;
    }
}