import { customAlphabet } from 'nanoid';

// URL-safe, lowercase alphanumerics; 16 chars ≈ plenty for catalog scale.
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
const nano = customAlphabet(alphabet, 16);

/** Generate a prefixed TEXT id (ids are generated in the Worker — ТЗ §2). */
export function newId(prefix: string): string {
  return `${prefix}_${nano()}`;
}
