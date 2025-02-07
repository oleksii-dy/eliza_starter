import express from 'express';
import cors from 'cors';
import chatRoutes from './api/routes/chat';
import dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement depuis la racine du projet
const envPath = path.join(__dirname, '../../../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Debug des variables d'environnement
console.log('Environment variables:', {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'Present' : 'Missing',
    NODE_ENV: process.env.NODE_ENV,
    PWD: process.env.PWD,
    // Autres variables importantes...
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Augmenter la limite pour les gros fichiers

// Routes
app.use('/api/chat', chatRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Something broke!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app; 