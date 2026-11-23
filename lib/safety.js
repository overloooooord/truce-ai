/**
 * Deterministic Pre-LLM Responsible AI Safety Circuit-Breaker.
 * Runs BEFORE any LLM call to ensure TruceAI never mediates situations involving
 * domestic abuse, physical violence, threats, coercion, or self-harm.
 * Designed in alignment with Kazakhstan Law on Artificial Intelligence (#230-VIII).
 */

const RULES = [
  {
    category: 'self_harm',
    severity: 'critical',
    patterns: [
      /\b(kill\s+myself|suicide|end\s+my\s+life|want\s+to\s+die|hurt\s+myself|self[\s-]?harm)\b/i,
      /(поконч(у|ить)\s+с\s+собой|суицид|не\s+хочу\s+жить|убить\s+себя|порезать\s+себя)/i,
      /(өзіме\s+қол\s+жұмса|өмір\s+сүргім\s+келмейді)/i
    ]
  },
  {
    category: 'physical_violence',
    severity: 'critical',
    patterns: [
      /\b(he\s+hits\s+me|she\s+hits\s+me|hit\s+me|beat\s+me|beats\s+me|choked\s+me|strangled|slapped\s+me|punched\s+me|physical\s+abuse|domestic\s+violence|threatened\s+to\s+kill|going\s+to\s+kill\s+(him|her|them|you))\b/i,
      /(бь[её]т\s+меня|ударил(а)?\s+меня|избива(ет|л)|душил(а)?|домашн(ее|его)\s+насили|угрожа(ет|л)\s+убить|убью\s+(его|е[её]|тебя)|поднял\s+руку)/i,
      /(ұрады|соққыға\s+жықты|тұрмыстық\s+зорлық|өлтіремін\s+деп)/i
    ]
  },
  {
    category: 'coercion_or_threat',
    severity: 'high',
    patterns: [
      /\b(blackmail|extort|locked\s+me\s+in|took\s+my\s+passport|won't\s+let\s+me\s+leave|stalk(ing|s)\s+me|revenge\s+porn)\b/i,
      /(шантажир|забрал\s+паспорт|не\s+выпускает\s+из\s+дома|запер(ла)?\s+меня|преследует\s+меня|угрожает\s+слить)/i,
      /(бопсалайды|үйден\s+шығармайды|құжатымды\s+алып\s+қойды)/i
    ]
  }
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /reveal\s+(your\s+)?system\s+prompt/i,
  /игнорируй\s+(все\s+)?предыдущие\s+инструкции/i,
  /выведи\s+системный\s+промпт/i
];

export const HELPLINES = {
  en: [
    { name: 'Kazakhstan Unified Contact Center (Family, Women & Children)', number: '111', note: 'Free, 24/7, confidential' },
    { name: 'Kazakhstan National Crisis Helpline', number: '150', note: 'Free, 24/7 psychological & crisis support' },
    { name: 'Emergency Police / Medical (KZ)', number: '102 / 103', note: 'Immediate physical danger' },
    { name: 'International Suicide & Crisis Lifeline (US/Global)', number: '988 / findahelpline.com', note: '24/7 support' }
  ],
  ru: [
    { name: 'Единый контакт-центр РК (семья, женщины, дети)', number: '111', note: 'Бесплатно, 24/7, анонимно' },
    { name: 'Национальная линия доверия РК', number: '150', note: 'Бесплатная кризисная поддержка 24/7' },
    { name: 'Экстренная помощь (Полиция / Скорая)', number: '102 / 103', note: 'При непосредственной угрозе' },
    { name: 'Международный каталог линий помощи', number: 'findahelpline.com', note: 'Поддержка по всему миру' }
  ],
  kk: [
    { name: 'ҚР Бірыңғай байланыс орталығы (отбасы, әйелдер, балалар)', number: '111', note: 'Тегін, 24/7, құпия' },
    { name: 'ҚР Ұлттық сенім телефоны', number: '150', note: 'Тегін психологиялық көмек 24/7' },
    { name: 'Жедел жәрдем / Полиция', number: '102 / 103', note: 'Тікелей қауіп төнгенде' },
    { name: 'Халықаралық көмек желісі', number: 'findahelpline.com', note: '24/7 қолдау' }
  ]
};

const BLOCK_MESSAGES = {
  en: {
    title: 'Mediation Paused — Safety First',
    body: 'TruceAI detected signs of potential physical danger, abuse, coercion, or emotional crisis. AI mediation is NOT safe or appropriate in situations involving violence, threats, or self-harm. Please reach out to trained human specialists immediately.'
  },
  ru: {
    title: 'Медиация остановлена — безопасность прежде всего',
    body: 'TruceAI обнаружил признаки возможного насилия, угроз, принуждения или кризисного состояния. ИИ-медиация НЕ подходит и небезопасна в таких ситуациях. Пожалуйста, свяжитесь с профессиональными службами поддержки.'
  },
  kk: {
    title: 'Медиация тоқтатылды — қауіпсіздік бірінші орында',
    body: 'TruceAI зорлық-зомбылық, қоқан-лоққы немесе дағдарыс белгілерін анықтады. Мұндай жағдайларда ЖИ-медиация қолданылмайды. Төмендегі сенім нөмірлеріне хабарласыңыз.'
  }
};

export function checkSafety(rawText, lang = 'en') {
  const text = String(rawText || '').slice(0, 4000);
  const locale = HELPLINES[lang] ? lang : 'en';

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        return {
          safe: false,
          blocked: true,
          category: rule.category,
          severity: rule.severity,
          message: BLOCK_MESSAGES[locale],
          helplines: HELPLINES[locale]
        };
      }
    }
  }

  let promptInjectionDetected = false;
  for (const p of PROMPT_INJECTION_PATTERNS) {
    if (p.test(text)) {
      promptInjectionDetected = true;
      break;
    }
  }

  return {
    safe: true,
    blocked: false,
    category: null,
    severity: null,
    promptInjectionDetected
  };
}

export function sanitizeUserText(rawText, maxLen = 2000) {
  return String(rawText || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLen);
}
