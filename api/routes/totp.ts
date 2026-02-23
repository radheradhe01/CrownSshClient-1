import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/requireAuth.js';
import { totpService } from '../services/totpService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { IUser } from '../models/User.js';

const router = Router();

// All TOTP routes require authentication
router.use(requireAuth);

/**
 * GET /api/totp/status
 * Check if the current user has 2FA enabled.
 */
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    res.json({
        isTotpEnabled: user.isTotpEnabled || false,
    });
}));

/**
 * POST /api/totp/setup
 * Generate a new TOTP secret and QR code. Admin only.
 * The secret is returned but NOT persisted until verified.
 */
router.post('/setup', requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    const { secret, qrCodeUrl } = await totpService.generateSecret(user);

    // Store the temporary secret in the session until verified
    (req.session as any).pendingTotpSecret = secret;

    res.json({
        qrCodeUrl,
        // Don't send the raw secret for security — QR code is sufficient
    });
}));

/**
 * POST /api/totp/verify
 * Verify a TOTP token and enable 2FA for the user. Admin only.
 * Body: { token: string }
 */
router.post('/verify', requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
        res.status(400).json({ error: 'Token is required' });
        return;
    }

    const pendingSecret = (req.session as any).pendingTotpSecret;
    if (!pendingSecret) {
        res.status(400).json({ error: 'No pending 2FA setup. Please initiate setup first.' });
        return;
    }

    const isValid = totpService.verifyToken(pendingSecret, token);
    if (!isValid) {
        res.status(400).json({ error: 'Invalid token. Please try again.' });
        return;
    }

    // Token is valid — persist the secret and enable 2FA
    await totpService.enableTotp((user._id as any).toString(), pendingSecret);

    // Clear the pending secret from session
    delete (req.session as any).pendingTotpSecret;

    res.json({ success: true, message: '2FA has been enabled successfully.' });
}));

/**
 * POST /api/totp/validate
 * Validate a TOTP token for an admin who already has 2FA enabled.
 * Used before destructive actions like deleting an environment.
 * Body: { token: string }
 */
router.post('/validate', requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
        res.status(400).json({ error: 'Token is required' });
        return;
    }

    if (!user.isTotpEnabled) {
        res.status(400).json({ error: '2FA is not enabled for this account.' });
        return;
    }

    const isValid = await totpService.verifyUserToken(user, token);
    if (!isValid) {
        res.status(403).json({ error: 'Invalid 2FA code. Please try again.' });
        return;
    }

    res.json({ success: true });
}));

/**
 * POST /api/totp/disable
 * Disable 2FA for the current admin. Requires a valid TOTP code to confirm.
 * Body: { token: string }
 */
router.post('/disable', requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    const { token } = req.body;

    if (!user.isTotpEnabled) {
        res.status(400).json({ error: '2FA is not currently enabled.' });
        return;
    }

    if (!token || typeof token !== 'string') {
        res.status(400).json({ error: 'Current 2FA code is required to disable.' });
        return;
    }

    const isValid = await totpService.verifyUserToken(user, token);
    if (!isValid) {
        res.status(403).json({ error: 'Invalid 2FA code. Cannot disable.' });
        return;
    }

    await totpService.disableTotp((user._id as any).toString());
    res.json({ success: true, message: '2FA has been disabled.' });
}));

export default router;
