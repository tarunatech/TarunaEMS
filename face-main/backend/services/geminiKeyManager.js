import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import crypto from 'crypto';

// TASK 8: Default 120 seconds for proposal/PDF extraction. Override via GEMINI_REQUEST_TIMEOUT_MS in .env
const COOLDOWN_MS = Number(process.env.GOOGLE_AI_KEY_COOLDOWN_MS || 5 * 60 * 1000);
const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_REQUEST_TIMEOUT_MS || process.env.GOOGLE_AI_TIMEOUT_MS || 120000);
const RESPONSE_CACHE_TTL_MS = Number(process.env.GEMINI_RESPONSE_CACHE_TTL_MS || 10 * 60 * 1000);
const RESPONSE_CACHE_MAX_ENTRIES = Number(process.env.GEMINI_RESPONSE_CACHE_MAX_ENTRIES || 200);

// TASK 4: SDK is @google/generative-ai ^0.24.1 — compatible with gemini-3.6-flash via v1beta
// TASK 5: No generation config (temperature, topP, topK) sent — gemini-3.6-flash does not accept these via the basic SDK path

// TASK 6 candidate model list — gemini-3.6-flash first, fallback to others only on 404
const candidateModels = Array.from(new Set([
  process.env.GOOGLE_AI_MODEL,
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash'
].filter(Boolean)));

const isPlaceholderKey = (val) =>
  !val || typeof val !== 'string' || val.trim().length < 15 ||
  val.includes('your-google-ai-api-key') || val.includes('YOUR_API_KEY');

const keys = Array.from({ length: 5 }, (_, index) => {
  const slot = index + 1;
  const key = process.env[`GOOGLE_AI_API_KEY_${slot}`] || (slot === 1 ? process.env.GOOGLE_AI_API_KEY : '');
  const cleanKey = key ? key.trim().replace(/^["']|["']$/g, '') : '';
  return !isPlaceholderKey(cleanKey) ? {
    slot,
    key: cleanKey,
    requestCount: 0,
    successCount: 0,
    failureCount: 0,
    cooldownUntil: null,
    lastUsedAt: null
  } : null;
}).filter(Boolean);

let cursor = 0;
const responseCache = new Map();

const normalizePrompt = (prompt) => String(prompt || '').trim().replace(/\r\n/g, '\n');
const cacheKeyFor = (prompt) => crypto.createHash('sha256').update(normalizePrompt(prompt)).digest('hex');

const getCachedResponse = (prompt) => {
  const key = cacheKeyFor(prompt);
  const cached = responseCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }
  responseCache.delete(key);
  responseCache.set(key, cached);
  return cached.value;
};

const setCachedResponse = (prompt, value) => {
  if (!RESPONSE_CACHE_TTL_MS || RESPONSE_CACHE_TTL_MS <= 0) return;
  const key = cacheKeyFor(prompt);
  if (responseCache.size >= RESPONSE_CACHE_MAX_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, { value, expiresAt: Date.now() + RESPONSE_CACHE_TTL_MS });
};

// TASK 10: Error classification
const classifyError = (error) => {
  const msg = String(error?.message || error || '').toLowerCase();
  const status = error?.status || error?.statusCode || 0;
  if (msg.includes('gemini request timeout') || msg.includes('timeout') || msg.includes('abort')) return 'CLIENT_SIDE_TIMEOUT';
  if (String(status) === '429' || msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted') || msg.includes('rate_limit')) return 'QUOTA_OR_RATE_LIMIT';
  if (String(status) === '503' || msg.includes('503') || msg.includes('service unavailable') || msg.includes('overloaded')) return 'GEMINI_SERVICE_UNAVAILABLE';
  if (String(status) === '400' || msg.includes('400') || msg.includes('invalid')) return 'INVALID_REQUEST';
  if (['401', '403'].includes(String(status)) || msg.includes('401') || msg.includes('403') || msg.includes('permission') || msg.includes('unauthorized')) return 'AUTHENTICATION_OR_PERMISSION';
  if (msg.includes('404') || msg.includes('not found')) return 'MODEL_NOT_FOUND';
  return 'UNKNOWN';
};

const isTransientError = (errorType) =>
  ['CLIENT_SIDE_TIMEOUT', 'GEMINI_SERVICE_UNAVAILABLE', 'QUOTA_OR_RATE_LIMIT'].includes(errorType);

const withTimeout = (promise) => Promise.race([
  promise,
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Gemini request timeout')), REQUEST_TIMEOUT_MS)
  )
]);

const selectKey = () => {
  if (!keys.length) return null;
  const now = Date.now();
  for (let attempt = 0; attempt < keys.length; attempt += 1) {
    const key = keys[cursor % keys.length];
    cursor += 1;
    if (!key.cooldownUntil || key.cooldownUntil <= now) return key;
  }
  return null;
};

const tryGroqFallback = async (prompt) => {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey || isPlaceholderKey(groqKey)) return null;
  const groq = new Groq({ apiKey: groqKey.trim() });
  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2
  });
  const text = chatCompletion.choices[0]?.message?.content || '';
  return { text, model: 'llama-3.3-70b-versatile', keySlot: 'groq' };
};

// TASK 6: Log prompt metadata without logging the content
const logPromptMetadata = (prompt) => {
  const charCount = prompt.length;
  const estimatedTokens = Math.round(charCount / 4);
  console.log(`[Gemini Prompt] promptCharacterCount: ${charCount}, estimatedInputTokens: ~${estimatedTokens}`);
};

// TASK 9: Single controlled attempt per key, no retry loop; outer loop is max 2 keys
const tryWithKey = async (key, prompt) => {
  for (const targetModel of candidateModels) {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();

    // TASK 2: request diagnostics
    console.log(`[Gemini Request] keySlot: ${key.slot}, model: ${targetModel}, timeoutMs: ${REQUEST_TIMEOUT_MS}, startedAt: ${startedAt}`);

    try {
      const model = new GoogleGenerativeAI(key.key).getGenerativeModel({ model: targetModel });
      const result = await withTimeout(model.generateContent(prompt));
      const durationMs = Date.now() - startMs;
      key.successCount += 1;
      console.log(`[Gemini Response] keySlot: ${key.slot}, model: ${targetModel}, durationMs: ${durationMs}, success: true`);
      return { text: result.response.text(), model: targetModel, keySlot: key.slot };
    } catch (error) {
      const durationMs = Date.now() - startMs;
      const errorType = classifyError(error);
      const msg = String(error?.message || '');
      console.warn(`[Gemini Error] keySlot: ${key.slot}, model: ${targetModel}, durationMs: ${durationMs}, errorType: ${errorType}, message: ${msg.slice(0, 300)}`);

      if (errorType === 'MODEL_NOT_FOUND') {
        // try next candidate model
        continue;
      }

      key.failureCount += 1;
      if (isTransientError(errorType)) {
        key.cooldownUntil = Date.now() + COOLDOWN_MS;
      }
      // non-404 error: stop trying models for this key
      throw Object.assign(error, { _errorType: errorType });
    }
  }
  throw new Error('All candidate models failed with MODEL_NOT_FOUND');
};

export const generateGeminiText = async (prompt) => {
  const normalizedPrompt = normalizePrompt(prompt);
  const cached = getCachedResponse(normalizedPrompt);
  if (cached) {
    console.log('[Gemini Cache] Hit for prompt');
    return cached;
  }

  logPromptMetadata(normalizedPrompt);

  let lastError = null;

  // TASK 9: At most 2 key slots tried (single attempt per key, no rapid retry)
  for (let attempt = 0; attempt < Math.min(keys.length, 2); attempt += 1) {
    const key = selectKey();
    if (!key) break;
    key.requestCount += 1;
    key.lastUsedAt = new Date();

    try {
      const response = await tryWithKey(key, normalizedPrompt);
      setCachedResponse(normalizedPrompt, response);
      return response;
    } catch (error) {
      lastError = error;
      const errorType = error._errorType || classifyError(error);
      // Only try another key on transient errors; stop immediately for auth/invalid
      if (!isTransientError(errorType)) break;
    }
  }

  // TASK 11: Groq fallback before giving up
  try {
    const groqResult = await tryGroqFallback(normalizedPrompt);
    if (groqResult) {
      console.log('[AI Provider] Generated content using Groq AI fallback.');
      setCachedResponse(normalizedPrompt, groqResult);
      return groqResult;
    }
  } catch (groqErr) {
    console.warn('[AI Provider] Groq fallback failed:', groqErr.message);
  }

  if (!keys.length) {
    throw new Error('No valid GOOGLE_AI_API_KEY or GROQ_API_KEY found in backend/.env file.');
  }

  throw lastError || new Error('AI generation is temporarily unavailable. Please try again later.');
};

export const getGeminiKeyStatus = () => keys.map(({ slot, requestCount, successCount, failureCount, cooldownUntil, lastUsedAt }) => ({
  slot,
  requestCount,
  successCount,
  failureCount,
  cooldownUntil,
  lastUsedAt,
  timeoutMs: REQUEST_TIMEOUT_MS,
  status: cooldownUntil && cooldownUntil > Date.now() ? 'cooldown' : 'healthy'
}));
