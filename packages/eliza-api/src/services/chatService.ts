import Anthropic from '@anthropic-ai/sdk';
import { ChatResponse, CodeSuggestion } from '../types/chat';

export class ChatService {
    private anthropic: Anthropic;
    private conversations: Map<string, Array<{ role: string, content: string }>> = new Map();

    constructor() {
        console.log('ChatService constructor - ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'Present' : 'Missing');
        
        // Temporairement, on ne lance pas d'erreur
        // if (!process.env.ANTHROPIC_API_KEY) {
        //     throw new Error('ANTHROPIC_API_KEY is not configured');
        // }
        
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY || ''
        });
    }

    async analyze(message: string, files?: Array<{name: string, content: string}>, conversationId?: string): Promise<ChatResponse> {
        try {
            console.log('Received request:', { message, files, conversationId });
            
            // Construire le prompt avec les fichiers
            let prompt = message;
            if (files?.length) {
                prompt = files.map(file => 
                    `Fichier ${file.name}:\n\`\`\`\n${file.content}\n\`\`\`\n`
                ).join('\n') + '\n' + message;
            }

            console.log('Sending to Anthropic:', { prompt });

            // Obtenir la réponse de Claude
            const completion = await this.anthropic.messages.create({
                model: "claude-3-opus-20240229",
                max_tokens: 4000,
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                system: "Tu es un assistant de programmation expert qui aide à analyser et améliorer le code. Tu fournis des explications détaillées et des suggestions concrètes."
            });

            console.log('Received response from Anthropic');

            const response = completion.content[0].text;

            // Créer ou récupérer la conversation
            let conversation = this.conversations.get(conversationId || '') || [];
            if (!conversationId) {
                conversationId = Date.now().toString();
            }

            // Ajouter à l'historique
            conversation.push({ role: 'user', content: prompt });
            conversation.push({ role: 'assistant', content: response });

            // Sauvegarder la conversation
            this.conversations.set(conversationId, conversation);

            return {
                message: response,
                conversationId,
                suggestions: []  // Pour l'instant, on retourne un tableau vide
            };
        } catch (error) {
            console.error('Error in analyze:', error);
            if (error instanceof Error) {
                throw new Error(`Failed to analyze: ${error.message}`);
            } else {
                throw new Error('Failed to analyze: An unknown error occurred');
            }
        }
    }
}