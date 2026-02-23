import { Request, Response, NextFunction } from 'express';
import { IUser, UserRole } from '../models/User.js';

/**
 * Middleware to ensure the user is authenticated.
 * Returns 401 if not authenticated.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    if (req.isAuthenticated() && req.user) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
};

/**
 * Middleware factory to restrict access to specific roles.
 * Must be used AFTER requireAuth.
 * Returns 403 if the user does not have the required role.
 */
export const requireRole = (...roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const user = req.user as IUser | undefined;
        if (!user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        if (!roles.includes(user.role)) {
            res.status(403).json({ error: 'Insufficient permissions. Admin access required.' });
            return;
        }
        next();
    };
};
