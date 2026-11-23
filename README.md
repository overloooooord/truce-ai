# TruceAI — Multi-Agent AI Conflict Mediator

> **Stop letting one-sided personal AI chatbots escalate human arguments.**

When two people argue today (couples, co-founders, roommates, colleagues), each vents privately to their own personal AI chatbot. Single-user LLMs are sycophantic — they only hear one side, validate confirmation bias, and widen the divide.

**TruceAI** fixes this with a **3-Agent Anti-Sycophancy Mediation Architecture**:

1. **Private Advocate Agent A** — listens privately to Person A, strips blame/absolutist triggers, and extracts structured Nonviolent Communication (NVC) needs, boundaries, and flex zones.
2. **Private Advocate Agent B** — does the same in complete isolation for Person B. Raw emotional vents **never** cross between sides.
3. **Human-in-the-Loop Consent Gate** — each party reviews and approves their own distilled need-map before anything enters mediation.
4. **Neutral Mediator Agent** — receives *only* the two approved need-maps, uncovers hidden common ground and asymmetric win-win trade-offs, and proposes 3 balanced resolution options that both sides score until mutual agreement.

## Key Features
- **Live 2-Side Demo Mode** (single screen with 3 realistic presets: Couple, Co-Founders, Roommates — or custom input).
- **Zero-Retention 2-Phone Invite Link Mode** — encodes *only* Person A's approved NVC summary in a URL-safe link (`?invite=...`) with zero server-side storage of intimate conflicts.
- **Responsible AI Safety Circuit-Breaker** (`lib/safety.js`) — deterministic pre-LLM guardrail that blocks mediation on signs of domestic violence, threats, coercion, or self-harm and surfaces verified crisis helplines (Kazakhstan `111`, `150`, `102` & international `988`), aligned with **Kazakhstan Law on AI (#230-VIII)**.
- **Multilingual (EN / RU / KK)** — full interface, presets, safety rules, and engine support.
- **Provider-Agnostic LLM + Transparent Deterministic Fallback** — automatically uses `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, or `OPENAI_API_KEY` when set in Vercel Environment Variables; works out-of-the-box with its built-in NVC engine when no key is configured.

## Local Development & Tests

```bash
npm install
npm test        # Runs automated safety guardrail & 3-agent NVC tests
npm run dev     # Starts local Vite dev server
npm run build   # Builds production dist/
```

## Deploy to Vercel (1-Click)

1. Import this GitHub repository in [Vercel](https://vercel.com/new).
2. Framework preset is auto-detected as **Vite** (`vercel.json` is pre-configured for both `dist/` and `/api/*` serverless functions).
3. *(Optional)* Add any one of `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, or `OPENAI_API_KEY` in **Project Settings -> Environment Variables** to enable live LLM reasoning.
4. Click **Deploy**.
