import express from 'express';
import { generateGeminiText } from '../services/geminiKeyManager.js';

const router = express.Router();

/**
 * GET /api/test/gemini
 * Development-only connectivity diagnostic for Gemini API.
 * Returns timing and error classification. Never returns the API key.
 */
router.get('/gemini', async (req, res) => {
  const startMs = Date.now();
  try {
    const result = await generateGeminiText('Reply with exactly GEMINI_OK');
    const durationMs = Date.now() - startMs;
    return res.json({
      success: true,
      response: result.text?.trim(),
      model: result.model,
      keySlot: result.keySlot,
      durationMs
    });
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const msg = String(err?.message || '');
    let errorType = 'UNKNOWN';
    if (msg.includes('Gemini request timeout') || msg.includes('timeout')) errorType = 'CLIENT_SIDE_TIMEOUT';
    else if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('resource_exhausted')) errorType = 'QUOTA_OR_RATE_LIMIT';
    else if (msg.includes('503') || msg.toLowerCase().includes('overloaded') || msg.toLowerCase().includes('service unavailable')) errorType = 'GEMINI_SERVICE_UNAVAILABLE';
    else if (msg.includes('400')) errorType = 'INVALID_REQUEST';
    else if (msg.includes('401') || msg.includes('403')) errorType = 'AUTHENTICATION_OR_PERMISSION';
    else if (msg.includes('404') || msg.toLowerCase().includes('not found')) errorType = 'MODEL_NOT_FOUND';
    else if (!err.status && !err.statusCode) errorType = 'NO_HTTP_RESPONSE';

    return res.status(500).json({
      success: false,
      durationMs,
      errorType,
      status: err.status || err.statusCode || null,
      message: msg.slice(0, 500)
    });
  }
});

export default router;
