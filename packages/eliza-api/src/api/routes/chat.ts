import express, { Request, Response, Router } from 'express';
import { ChatRequest, ChatResponse } from '../../types/chat';
import { ChatService } from '../../services/chatService';

const router: Router = express.Router();

// Créer le service après que les variables d'environnement sont chargées
let chatService: ChatService;

// Handler function
const analyzeHandler = async (req: Request<{}, ChatResponse, ChatRequest>, res: Response) => {
    try {
        // Initialiser le service à la première requête
        if (!chatService) {
            chatService = new ChatService();
        }

        const { message, files, conversationId } = req.body;
        
        if (!message?.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const response = await chatService.analyze(message, files, conversationId);
        return res.json(response);
    } catch (error) {
        console.error('Error in /analyze:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Routes
router.post('/analyze', analyzeHandler);

export default router; 