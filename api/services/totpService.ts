import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { User, IUser } from '../models/User.js';
import logger from '../utils/logger.js';

const APP_NAME = 'SSH Manager';

export const totpService = {
    /**
     * Generate a new TOTP secret and QR code for the user.
     * Does NOT persist until verified.
     */
    async generateSecret(user: IUser): Promise<{ secret: string; qrCodeUrl: string }> {
        const secret = speakeasy.generateSecret({
            name: `${APP_NAME} (${user.email})`,
            issuer: APP_NAME,
            length: 20,
        });

        const otpauthUrl = secret.otpauth_url!;
        const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

        logger.info(`TOTP secret generated for user ${user.email}`);

        return {
            secret: secret.base32,
            qrCodeUrl,
        };
    },

    /**
     * Verify a TOTP token against a secret (used during setup).
     */
    verifyToken(secret: string, token: string): boolean {
        return speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: 1, // Allow 1 step tolerance (30s before/after)
        });
    },

    /**
     * Enable TOTP for a user after successful verification.
     */
    async enableTotp(userId: string, secret: string): Promise<void> {
        await User.findByIdAndUpdate(userId, {
            totpSecret: secret,
            isTotpEnabled: true,
        });
        logger.info(`TOTP enabled for user ${userId}`);
    },

    /**
     * Verify a TOTP token for a user who has 2FA enabled.
     * Returns true if the token is valid.
     */
    async verifyUserToken(user: IUser, token: string): Promise<boolean> {
        if (!user.isTotpEnabled || !user.totpSecret) {
            logger.warn(`TOTP verification attempted for user ${user.email} without 2FA enabled`);
            return false;
        }

        return speakeasy.totp.verify({
            secret: user.totpSecret,
            encoding: 'base32',
            token,
            window: 1,
        });
    },

    /**
     * Disable TOTP for a user.
     */
    async disableTotp(userId: string): Promise<void> {
        await User.findByIdAndUpdate(userId, {
            totpSecret: undefined,
            isTotpEnabled: false,
        });
        logger.info(`TOTP disabled for user ${userId}`);
    },
};
