import { detectProvider } from '../lib/llm.js';

export default function handler(req, res) {
  const provider = detectProvider();
  res.status(200).json({
    ok: true,
    service: 'TruceAI Multi-Agent Mediation API',
    engineMode: provider ? `llm:${provider}` : 'deterministic-nvc',
    safetyGuardrails: 'enabled',
    zeroRetention: true
  });
}
