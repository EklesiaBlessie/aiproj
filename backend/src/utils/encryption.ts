import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

/**
 * Returns the 32-byte encryption key.
 * Hard-fails in production if ENCRYPTION_KEY is unset.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: ENCRYPTION_KEY environment variable is required in production!');
    }
    // Static fallback key for development:
    return Buffer.from('d3f4b2a1c0e9f8d7c6b5a4938271605f4e3d2c1b0a9f8e7d6c5b4a3928170f6e', 'hex');
  }
  // Securely hash the custom key string using sha256 to guarantee it matches 32 bytes (256 bits)
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypts a plain text string into a formatted iv:ciphertext hex string.
 */
export function encrypt(text?: string): string | undefined {
  if (!text) return text;
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a formatted iv:ciphertext hex string back into plain text.
 * Falls back to returning the text as-is if it is not formatted or encrypted.
 */
export function decrypt(encryptedText?: string): string | undefined {
  if (!encryptedText) return encryptedText;
  
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    // Graceful fall-through for pre-existing plain text seed data
    return encryptedText;
  }
  
  try {
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    // If decryption fails (e.g. key mismatch or unencrypted data), return as-is for backward compatibility
    return encryptedText;
  }
}
