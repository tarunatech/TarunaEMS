// utils/helpers.js
import crypto from 'crypto';

/**
 * Generate a random password with specified criteria
 * @param {number} length - Password length (default: 12)
 * @param {object} options - Password generation options
 * @returns {string} Generated password
 */
export const generatePassword = (length = 12, options = {}) => {
  const {
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSpecialChars = false,
    excludeSimilar = true // Exclude similar looking characters like 0, O, l, I, 1
  } = options;

  let charset = '';
  
  if (includeUppercase) {
    charset += excludeSimilar ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  
  if (includeLowercase) {
    charset += excludeSimilar ? 'abcdefghijkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
  }
  
  if (includeNumbers) {
    charset += excludeSimilar ? '23456789' : '0123456789';
  }
  
  if (includeSpecialChars) {
    charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  }

  if (!charset) {
    throw new Error('At least one character type must be included');
  }

  let password = '';
  
  // Ensure at least one character from each selected type
  if (includeUppercase) {
    const uppercaseChars = excludeSimilar ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    password += uppercaseChars[crypto.randomInt(uppercaseChars.length)];
  }
  
  if (includeLowercase) {
    const lowercaseChars = excludeSimilar ? 'abcdefghijkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
    password += lowercaseChars[crypto.randomInt(lowercaseChars.length)];
  }
  
  if (includeNumbers) {
    const numberChars = excludeSimilar ? '23456789' : '0123456789';
    password += numberChars[crypto.randomInt(numberChars.length)];
  }
  
  if (includeSpecialChars) {
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    password += specialChars[crypto.randomInt(specialChars.length)];
  }

  // Fill the rest of the password
  for (let i = password.length; i < length; i++) {
    password += charset[crypto.randomInt(charset.length)];
  }

  // Shuffle the password to avoid predictable patterns
  return shuffleString(password);
};

/**
 * Shuffle a string randomly
 * @param {string} str - String to shuffle
 * @returns {string} Shuffled string
 */
const shuffleString = (str) => {
  const array = str.split('');
  for (let i = array.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array.join('');
};

/**
 * Generate a simple memorable password (for temporary use)
 * @returns {string} Simple 8-character password
 */
export const generateSimplePassword = () => {
  const adjectives = ['Quick', 'Bright', 'Swift', 'Smart', 'Cool', 'Fast', 'Blue', 'Red', 'Green'];
  const numbers = [123, 456, 789, 321, 654, 987, 111, 222, 333];
  
  const adjective = adjectives[crypto.randomInt(adjectives.length)];
  const number = numbers[crypto.randomInt(numbers.length)];
  
  return `${adjective}${number}`;
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with score and feedback
 */
export const validatePasswordStrength = (password) => {
  let score = 0;
  const feedback = [];

  if (!password) {
    return { score: 0, strength: 'Invalid', feedback: ['Password is required'] };
  }

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password should be at least 8 characters long');
  }

  if (password.length >= 12) {
    score += 1;
  }

  // Character type checks
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain uppercase letters');
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain numbers');
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) {
    score += 1;
  }

  // Common patterns (subtract points)
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push('Avoid repeating characters');
  }

  if (/123|abc|qwe/i.test(password)) {
    score -= 1;
    feedback.push('Avoid common sequences');
  }

  // Determine strength
  let strength;
  if (score < 2) {
    strength = 'Weak';
  } else if (score < 4) {
    strength = 'Fair';
  } else if (score < 6) {
    strength = 'Good';
  } else {
    strength = 'Strong';
  }

  return { score, strength, feedback };
};

/**
 * Format error messages for API responses
 * @param {Error} error - Error object
 * @returns {string} Formatted error message
 */
export const formatErrorMessage = (error) => {
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return messages.join(', ');
  }
  
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return `${field} already exists`;
  }
  
  return error.message || 'An unexpected error occurred';
};

/**
 * Sanitize user input
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and > to prevent XSS
    .substring(0, 1000); // Limit length
};

/**
 * Generate a slug from text
 * @param {string} text - Text to convert to slug
 * @returns {string} URL-friendly slug
 */
export const generateSlug = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};