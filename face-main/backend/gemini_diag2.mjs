import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';

const key = (process.env.GOOGLE_AI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
const model = 'gemini-3.6-flash';

// ── TEST 2: Structured JSON ──────────────────────────────────────────────────
console.log('\n[Diag Test 2] Structured JSON test...');
const start2 = Date.now();
try {
  const genAI = new GoogleGenerativeAI(key);
  const m = genAI.getGenerativeModel({ model });
  const result = await m.generateContent('Return strict JSON only, no markdown, no explanation:\n{"status":"ok"}');
  const durationMs = Date.now() - start2;
  const text = result.response.text().trim();
  console.log('[Diag Test 2] SUCCESS durationMs:', durationMs, 'response:', text.slice(0, 100));
  try {
    const parsed = JSON.parse(text.replace(/^```json\s*/i,'').replace(/^```/,'').replace(/```$/,'').trim());
    console.log('[Diag Test 2] JSON parse: SUCCESS, status:', parsed.status);
  } catch (e) {
    console.log('[Diag Test 2] JSON parse FAILED:', e.message, 'raw:', text.slice(0, 100));
  }
} catch (err) {
  const durationMs = Date.now() - start2;
  console.error('[Diag Test 2] FAILED durationMs:', durationMs, 'message:', String(err.message || '').slice(0, 300));
}
