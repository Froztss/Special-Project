export const JWT_EXPIRES_IN = '8h';

/** JWT signing secret from the environment (NFR-SEC-01). Never hard-coded. */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET must be set (at least 16 characters). See apps/api/.env.example');
  }
  return secret;
}