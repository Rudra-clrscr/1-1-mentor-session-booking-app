import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireRole = (role: 'mentor' | 'student') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ error: `Forbidden: This action requires the '${role}' role` });
    }

    next();
  };
};

export default requireRole;
