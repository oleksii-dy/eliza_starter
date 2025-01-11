import { validateToken } from '../utilities/jwt';

const authMiddleware = (req: any, res: any, next: any) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const payload = validateToken(token);
        req.clientId = payload.clientId;
        next();
    } catch (err:any) {
        console.error(err);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export default authMiddleware;