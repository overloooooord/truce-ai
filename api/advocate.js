import { checkSafety, sanitizeUserText } from '../lib/safety.js';
import { runDeterministicAdvocate } from '../lib/nvcEngine.js';
import { callStructuredLLM, buildAdvocatePrompts } from '../lib/llm.js';

function validateAdvocateOutput(obj, fallback) {
  if (!obj || typeof obj !== 'object') return fallback;
  return {
    partyName: typeof obj.partyName === 'string' && obj.partyName.trim() ? obj.partyName.trim().slice(0, 60) : fallback.partyName,
    detectedEmotion: typeof obj.detectedEmotion === 'string' ? obj.detectedEmotion.slice(0, 140) : fallback.detectedEmotion,
    neutralSummary: typeof obj.neutralSummary === 'string' ? obj.neutralSummary.slice(0, 500) : fallback.neutralSummary,
    coreNeeds: Array.isArray(obj.coreNeeds) && obj.coreNeeds.length
      ? obj.coreNeeds.map((x) => String(x).slice(0, 180)).slice(0, 3)
      : fallback.coreNeeds,
    nonNegotiables: Array.isArray(obj.nonNegotiables) && obj.nonNegotiables.length
      ? obj.nonNegotiables.map((x) => String(x).slice(0, 180)).slice(0, 2)
      : fallback.nonNegotiables,
    flexZones: Array.isArray(obj.flexZones) && obj.flexZones.length
      ? obj.flexZones.map((x) => String(x).slice(0, 180)).slice(0, 2)
      : fallback.flexZones,
    toxicityNote: typeof obj.toxicityNote === 'string' ? obj.toxicityNote.slice(0, 220) : fallback.toxicityNote,
    triggersRemoved: Number.isFinite(Number(obj.triggersRemoved)) ? Math.max(0, Math.min(25, Number(obj.triggersRemoved))) : fallback.triggersRemoved
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const lang = ['en', 'ru', 'kk'].includes(body.lang) ? body.lang : 'en';
    const partyName = sanitizeUserText(body.partyName || 'Person', 60);
    const contextType = sanitizeUserText(body.contextType || 'relationship', 40);
    const rawStatement = sanitizeUserText(body.rawStatement || '', 2000);
    const desiredOutcome = sanitizeUserText(body.desiredOutcome || '', 500);

    if (rawStatement.length < 8) {
      return res.status(400).json({ ok: false, error: 'Please share at least a sentence about your perspective.' });
    }

    // 1. Pre-LLM deterministic Responsible AI safety gate
    const safety = checkSafety(`${rawStatement}\n${desiredOutcome}`, lang);
    if (safety.blocked) {
      return res.status(200).json({
        ok: true,
        blocked: true,
        safety,
        engineMode: 'safety-circuit-breaker'
      });
    }

    const fallback = runDeterministicAdvocate({ partyName, rawStatement, desiredOutcome, lang });

    // 2. Try live LLM if API key is configured; gracefully fall back to deterministic NVC engine
    try {
      const { systemPrompt, userPrompt } = buildAdvocatePrompts({
        partyName,
        contextType,
        rawStatement,
        desiredOutcome,
        lang
      });
      const { provider, data } = await callStructuredLLM(systemPrompt, userPrompt);
      if (provider && data) {
        return res.status(200).json({
          ok: true,
          blocked: false,
          engineMode: `llm:${provider}`,
          promptInjectionGuarded: safety.promptInjectionDetected,
          summary: validateAdvocateOutput(data, fallback)
        });
      }
    } catch (llmErr) {
      console.warn('Advocate LLM fallback:', llmErr.message);
    }

    return res.status(200).json({
      ok: true,
      blocked: false,
      engineMode: 'deterministic-nvc',
      promptInjectionGuarded: safety.promptInjectionDetected,
      summary: fallback
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to process Advocate analysis' });
  }
}
