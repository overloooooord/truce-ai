import { checkSafety, sanitizeUserText } from '../lib/safety.js';
import { runDeterministicMediator } from '../lib/nvcEngine.js';
import { callStructuredLLM, buildMediatorPrompts } from '../lib/llm.js';

function validateMediatorOutput(obj, fallback) {
  if (!obj || typeof obj !== 'object') return fallback;
  const proposals = Array.isArray(obj.proposals) && obj.proposals.length >= 2
    ? obj.proposals.slice(0, 3).map((p, idx) => ({
        id: typeof p.id === 'string' ? p.id.slice(0, 40) : `opt-${idx + 1}`,
        title: typeof p.title === 'string' ? p.title.slice(0, 120) : fallback.proposals[idx]?.title || 'Resolution Option',
        badge: typeof p.badge === 'string' ? p.badge.slice(0, 50) : 'Balanced',
        fairnessA: Number.isFinite(Number(p.fairnessA)) ? Math.max(50, Math.min(99, Math.round(Number(p.fairnessA)))) : 88,
        fairnessB: Number.isFinite(Number(p.fairnessB)) ? Math.max(50, Math.min(99, Math.round(Number(p.fairnessB)))) : 88,
        summary: typeof p.summary === 'string' ? p.summary.slice(0, 400) : '',
        commitmentsA: Array.isArray(p.commitmentsA) ? p.commitmentsA.map((s) => String(s).slice(0, 220)).slice(0, 3) : [],
        commitmentsB: Array.isArray(p.commitmentsB) ? p.commitmentsB.map((s) => String(s).slice(0, 220)).slice(0, 3) : [],
        checkin: typeof p.checkin === 'string' ? p.checkin.slice(0, 220) : ''
      }))
    : fallback.proposals;

  return {
    topic: typeof obj.topic === 'string' ? obj.topic.slice(0, 120) : fallback.topic,
    sharedReframe: typeof obj.sharedReframe === 'string' ? obj.sharedReframe.slice(0, 400) : fallback.sharedReframe,
    commonGround: Array.isArray(obj.commonGround) && obj.commonGround.length
      ? obj.commonGround.map((x) => String(x).slice(0, 240)).slice(0, 4)
      : fallback.commonGround,
    asymmetricTradeoffs: Array.isArray(obj.asymmetricTradeoffs) && obj.asymmetricTradeoffs.length
      ? obj.asymmetricTradeoffs.slice(0, 3).map((t) => ({
          title: String(t.title || 'Trade-Off').slice(0, 90),
          detail: String(t.detail || '').slice(0, 280)
        }))
      : fallback.asymmetricTradeoffs,
    proposals
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const lang = ['en', 'ru', 'kk'].includes(body.lang) ? body.lang : 'en';
    const topic = sanitizeUserText(body.topic || 'Shared Agreement', 120);
    const contextType = sanitizeUserText(body.contextType || 'relationship', 40);
    const partyA = body.partyA;
    const partyB = body.partyB;

    if (!partyA || !partyB || !partyA.approved || !partyB.approved) {
      return res.status(400).json({
        ok: false,
        error: 'Both parties must review and approve their private need-maps before mediation.'
      });
    }

    // Double-check safety on both approved summaries
    const combinedText = JSON.stringify({ partyA, partyB });
    const safety = checkSafety(combinedText, lang);
    if (safety.blocked) {
      return res.status(200).json({ ok: true, blocked: true, safety, engineMode: 'safety-circuit-breaker' });
    }

    const fallback = runDeterministicMediator({ topic, partyA, partyB, lang });

    try {
      const { systemPrompt, userPrompt } = buildMediatorPrompts({
        topic,
        contextType,
        partyA,
        partyB,
        lang
      });
      const { provider, data } = await callStructuredLLM(systemPrompt, userPrompt);
      if (provider && data) {
        return res.status(200).json({
          ok: true,
          blocked: false,
          engineMode: `llm:${provider}`,
          mediation: validateMediatorOutput(data, fallback)
        });
      }
    } catch (llmErr) {
      console.warn('Mediator LLM fallback:', llmErr.message);
    }

    return res.status(200).json({
      ok: true,
      blocked: false,
      engineMode: 'deterministic-nvc',
      mediation: fallback
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to synthesize neutral mediation' });
  }
}
