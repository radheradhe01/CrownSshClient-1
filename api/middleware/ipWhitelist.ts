import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

/**
 * IP Whitelist Middleware
 * Restricts access to only the IPs listed in the ALLOWED_IPS env variable.
 * Supports comma-separated IPs. If ALLOWED_IPS is empty, access is unrestricted.
 */
export const ipWhitelist = (req: Request, res: Response, next: NextFunction): void => {
    const allowedIps = process.env.ALLOWED_IPS?.split(',').map(ip => ip.trim()).filter(Boolean) || [];

    // If no IPs configured, allow all (open mode)
    if (allowedIps.length === 0) {
        return next();
    }

    // Extract client IP — handles proxied requests (x-forwarded-for) and direct connections
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.ip || req.socket.remoteAddress || '';

    // Normalize IPv6-mapped IPv4 (::ffff:1.2.3.4 → 1.2.3.4)
    const normalizedIp = clientIp.replace(/^::ffff:/, '');

    if (allowedIps.includes(normalizedIp)) {
        return next();
    }

    logger.warn(`Blocked request from unauthorized IP: ${normalizedIp} (raw: ${clientIp})`);
    res.status(403).json({ error: 'Access denied. Your IP is not authorized.' });
};
