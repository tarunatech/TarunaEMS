import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';

const key = (process.env.GOOGLE_AI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
const model = 'gemini-3.6-flash';

console.log('[Diag] SDK: @google/generative-ai');
console.log('[Diag] API key detected:', key.length > 10, 'length:', key.length);
console.log('[Diag] Model:', model);

// ── TEST 1: Minimal text, NO timeout wrapper ─────────────────────────────────
console.log('\n[Diag Test 1] Minimal text - no local timeout, waiting up to 300s for actual Gemini response...');
const start = Date.now();
try {
  const genAI = new GoogleGenerativeAI(key);
  const m = genAI.getGenerativeModel({ model });
  const result = await m.generateContent('Reply with exactly GEMINI_OK');
  const durationMs = Date.now() - start;
  const text = result.response.text();
  console.log('[Diag Test 1] SUCCESS durationMs:', durationMs, 'response:', text.trim().slice(0, 60));
  process.exit(0);
} catch (err) {
  const durationMs = Date.now() - start;
  console.error('[Diag Test 1] FAILED durationMs:', durationMs);
  console.error('[Diag] error.name:', err.name || 'none');
  console.error('[Diag] error.message:', String(err.message || '').slice(0, 500));
  console.error('[Diag] error.status:', err.status ?? 'NO_HTTP_RESPONSE');
  console.error('[Diag] error.statusText:', err.statusText || 'none');
  console.error('[Diag] error.code:', err.code || 'none');
  console.error('[Diag] error.cause type:', err.cause ? typeof err.cause : 'none');
  console.error('[Diag] error.cause message:', err.cause ? String(err.cause?.message || err.cause).slice(0, 200) : 'none');
  console.error('[Diag] errorDetails:', JSON.stringify(err.errorDetails || null));
  const httpStatus = err.status || (err.response && err.response.status) || err.statusCode || 'NO_HTTP_RESPONSE';
  console.error('[Diag] HTTP status classification:', httpStatus);
  if (err.response && err.response.data) {
    console.error('[Diag] response.data:', JSON.stringify(err.response.data).slice(0, 300));
  }
  process.exit(1);
}
