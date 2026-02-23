import crypto from 'crypto';
import logger from './logger.js';

// The key must be exactly 32 bytes (64 hex characters)
const getEncryptionKey = (): Buffer => {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
    }
    return Buffer.from(keyHex, 'hex');
};

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM

/**
 * Encrypts a plain text string using AES-256-GCM
 * Format: iv(hex):authTag(hex):encryptedData(hex)
 */
export const encrypt = (text: string): string => {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const key = getEncryptionKey();
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
        logger.error('Encryption failed:', error);
        throw new Error('Encryption failed');
    }
};

/**
 * Decrypts a cipher text string using AES-256-GCM
 * Format: iv(hex):authTag(hex):encryptedData(hex)
 */
export const decrypt = (cipherText: string): string => {
    if (!cipherText || !cipherText.includes(':')) return cipherText; // Return plain text if not encrypted

    try {
        const parts = cipherText.split(':');
        if (parts.length !== 3) return cipherText; // Fallback

        const [ivHex, authTagHex, encryptedHex] = parts;

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const key = getEncryptionKey();

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        logger.error('Decryption failed:', error);
        // Return original string or empty? Safer to return empty or error so we don't leak failures as plaintext
        return '';
    }
};
