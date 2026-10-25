// Small input helpers shared by the controllers. Everything a client sends is
// treated as untrusted: coerced to the expected type and cut to a sane length.

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HEX_COLOUR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128; // bcrypt ignores anything past 72 bytes; also stops huge inputs

/**
 * A trimmed string no longer than maxLength. Non-strings (objects, arrays)
 * become an empty string so they can never reach a database query.
 */
export const cleanText = (value, maxLength = 200) => (
  typeof value === 'string' || typeof value === 'number'
    ? String(value).trim().slice(0, maxLength)
    : ''
);

export const cleanEmail = (value) => cleanText(value, 254).toLowerCase();

export const isValidEmail = (value) => EMAIL_PATTERN.test(value);

export const isValidHexColour = (value) => HEX_COLOUR_PATTERN.test(String(value));

/**
 * Returns a message when the password is unacceptable, otherwise null.
 */
export const getPasswordProblem = (password) => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`;
  }
  return null;
};
