/**
 * Deterministic Nonviolent Communication (NVC) Advocate & Neutral Mediator Engine.
 * Provides instant, zero-cost, transparent structured need-extraction and win-win
 * trade-off synthesis whenever no external LLM API key is configured, and serves as
 * a validated structural fallback if an external LLM call fails.
 */

const NEED_DOMAINS = [
  {
    id: 'time_attention',
    keywords: /(time|busy|work|late|phone|ignore|listen|attention|weekend|date|schedule|reply|text|врем|работ|поздно|телефон|игнор|вниман|выходн|пиш|отвеча|уақыт|жұмыс|көңіл)/i,
    en: { need: 'Dedicated, distraction-free quality time and responsiveness', emotion: 'unheard and disconnected', flex: 'Flexible on exact days/hours if committed in advance' },
    ru: { need: 'Качественное совместное время без отвлечений и предсказуемая связь', emotion: 'ощущение нехватки внимания и дистанции', flex: 'Гибкость в конкретных днях, если договорённость соблюдается' },
    kk: { need: 'Алаңдаусыз сапалы бірге уақыт және тұрақты байланыс', emotion: 'назар жетіспеушілігі мен алшақтық сезімі', flex: 'Алдын ала келісілсе, нақты күндер бойынша икемділік' }
  },
  {
    id: 'fairness_chores',
    keywords: /(clean|dishes|chore|house|mess|rent|split|fair|effort|cook|laz|уборк|посуд|дом|бардак|аренд|честн|вклад|готов|быт|тазалық|үй|әділ)/i,
    en: { need: 'Fair, transparent division of shared responsibilities without nagging', emotion: 'overwhelmed and carrying an unequal load', flex: 'Open to swapping specific tasks as long as total effort feels balanced' },
    ru: { need: 'Справедливое и понятное распределение общих обязанностей без упрёков', emotion: 'усталость от перегруза и ощущения несправедливости', flex: 'Готовность меняться конкретными задачами при равной общей нагрузке' },
    kk: { need: 'Ортақ міндеттерді ренішсіз, әділ және ашық бөлу', emotion: 'шаршау және жүктеменің теңсіздігі сезімі', flex: 'Жалпы жүктеме тең болса, нақты міндеттерді алмастыруға дайындық' }
  },
  {
    id: 'money_budget',
    keywords: /(money|budget|spend|expensive|cost|equity|salary|pay|profit|price|debt|деньг|бюджет|трат|дорог|дол|зарплат|плат|прибыл|цен|ақша|қаржы|шығын)/i,
    en: { need: 'Financial transparency, predictable budgeting, and mutual sign-off on major costs', emotion: 'financial anxiety and lack of control', flex: 'Open to personal discretionary allowance within an agreed monthly cap' },
    ru: { need: 'Финансовая прозрачность, предсказуемый бюджет и согласование крупных трат', emotion: 'тревога за финансовую стабильность', flex: 'Свободный личный бюджет в рамках заранее согласованного лимита' },
    kk: { need: 'Қаржылық ашықтық, болжамды бюджет және ірі шығындарды келісу', emotion: 'қаржылық алаңдаушылық', flex: 'Келісілген айлық шек ішінде еркін жеке шығындар' }
  },
  {
    id: 'autonomy_respect',
    keywords: /(control|micromanage|trust|space|freedom|criticiz|blame|respect|pressure|decision|контрол|довер|пространств|свобод|критик|обвин|уваж|давлен|решен|бақылау|сенім|құрмет)/i,
    en: { need: 'Mutual respect, psychological safety, and autonomy without micromanagement', emotion: 'pressured, criticized, and defensive', flex: 'Willing to share regular status updates if tone stays collaborative' },
    ru: { need: 'Взаимное уважение, спокойный тон и свобода действий без микроменеджмента', emotion: 'давление, защитная реакция и усталость от критики', flex: 'Готовность давать регулярные апдейты при уважительном тоне' },
    kk: { need: 'Өзара құрмет, психологиялық қауіпсіздік және қысымсыз дербестік', emotion: 'қысым мен сыннан шаршау', flex: 'Құрметті қарым-қатынас сақталса, тұрақты хабарласып отыру' }
  },
  {
    id: 'delivery_product',
    keywords: /(deadline|launch|feature|code|sales|marketing|startup|product|quality|speed|ship|дедлайн|запуск|фич|код|продаж|маркетинг|стартап|продукт|качеств|скорост|жоба|сапа)/i,
    en: { need: 'Aligned priorities, realistic milestones, and clear ownership of deliverables', emotion: 'stressed about execution risk and misalignment', flex: 'Can trade scope for speed via time-boxed 2-week experiments' },
    ru: { need: 'Общие приоритеты, реалистичные сроки и понятная зона ответственности', emotion: 'стресс из-за рассинхрона и рисков по срокам', flex: 'Готовность тестировать спорные решения через 2-недельные спринты с метриками' },
    kk: { need: 'Ортақ басымдықтар, нақты мерзімдер және айқын жауапкершілік', emotion: 'мерзімдер мен мақсаттардың сәйкес келмеуіне алаңдаушылық', flex: '2 апталық нақты метрикалы сынақ арқылы шешім қабылдауға дайындық' }
  }
];

const TOXIC_MARKERS = [
  /\b(always|never|selfish|stupid|idiot|lazy|toxic|hate|liar|crazy|fault|blame|useless|shut up)\b/gi,
  /(всегда|никогда|эгоист|туп(ой|ая)|ленив|токсичн|ненавиж|врёшь|врешь|виноват|надоел|достал|бесит|пофиг|плевать)/gi,
  /(әрқашан|ешқашан|өзімшіл|жалқау|кінәлі|шаршатты)/gi
];

const COPY = {
  en: {
    defaultNeed: 'Being heard calmly and reaching a predictable, fair agreement both sides can trust',
    defaultEmotion: 'frustrated and worried about being misunderstood',
    defaultFlex: 'Open to a structured 14-day trial agreement with a calm check-in',
    nonNegotiablePrefix: 'Clear agreement on: ',
    reframeIntro: (name, emotion, need) =>
      `${name} feels ${emotion}. Underneath the tension, their core need is ${need.toLowerCase()}.`,
    echoChamberWarning: (count) =>
      count > 0
        ? `Stripped ${count} blame/absolutist trigger(s) that a personal AI chatbot would have echoed back and amplified.`
        : 'Translated raw frustration into neutral, non-accusatory NVC need statements.',
    commonGround: (nameA, nameB) => [
      `Both ${nameA} and ${nameB} care enough about this relationship/partnership to invest effort into fixing the pattern rather than walking away.`,
      'Both want predictable expectations so the same argument stops repeating every week.',
      'Both value respectful, calm communication without last-minute surprises or silent resentment.'
    ],
    asymmetric: (nameA, nameB, needA, needB) => [
      {
        title: 'Priority Trade-Off #1',
        detail: `${nameA} places top priority on "${needA}" — a concrete commitment here delivers high relief to ${nameA} at low daily cost to ${nameB}.`
      },
      {
        title: 'Priority Trade-Off #2',
        detail: `${nameB} places top priority on "${needB}" — protecting this boundary gives ${nameB} safety while keeping ${nameA}'s core goal intact.`
      }
    ],
    proposals: (nameA, nameB, needA, needB) => [
      {
        id: 'opt-balanced',
        title: 'The 14-Day Structured Experiment (Recommended)',
        badge: 'Highest Fairness Balance',
        fairnessA: 91,
        fairnessB: 90,
        summary: `Replace vague promises with a concrete 2-week pilot: pair ${nameA}'s top need with ${nameB}'s key boundary, then review calmly on Day 14.`,
        commitmentsA: [
          `Honor ${nameB}'s boundary: ${needB}.`,
          'Raise concerns using "I need..." instead of absolute "always/never" framing.'
        ],
        commitmentsB: [
          `Deliver proactively on ${nameA}'s priority: ${needA}.`,
          'Confirm schedule/status changes early rather than leaving things unspoken.'
        ],
        checkin: '10-minute calm review in 14 days — keep what works, adjust what felt heavy.'
      },
      {
        id: 'opt-ownership',
        title: 'Clear Ownership & Explicit Boundaries Split',
        badge: 'Zero Ambiguity',
        fairnessA: 86,
        fairnessB: 88,
        summary: 'Eliminate gray zones by writing down exact ownership, response windows, and a pre-agreed escalation pause rule when tension rises.',
        commitmentsA: [
          'Define the top 2 concrete signals that show progress on their core need.',
          'Give full autonomy on how the other side executes once deadlines/agreements are clear.'
        ],
        commitmentsB: [
          'Commit to a visible weekly rhythm covering the agreed expectations.',
          'Flag overload early (24h notice) instead of withdrawing or pushing back late.'
        ],
        checkin: 'Quick 5-minute Sunday alignment check for the next 3 weeks.'
      },
      {
        id: 'opt-reset',
        title: 'Immediate De-Escalation + Micro-Step Reset',
        badge: 'Lowest Friction Start',
        fairnessA: 83,
        fairnessB: 85,
        summary: 'If emotions are still high, start with one small mutual goodwill action within 48 hours to rebuild trust before negotiating bigger rules.',
        commitmentsA: [
          `Acknowledge ${nameB}'s perspective out loud without adding a "but..." caveat.`,
          'Pick ONE single smallest win needed this week and pause secondary grievances.'
        ],
        commitmentsB: [
          `Deliver one clear, visible step toward ${nameA}'s need within 48 hours.`,
          'Schedule a distraction-free 20-minute talk once both sides feel calm.'
        ],
        checkin: '48-hour pulse check: "Do we both feel 20% calmer and more aligned?"'
      }
    ]
  },
  ru: {
    defaultNeed: 'Быть спокойно услышанным и прийти к понятной, честной договорённости',
    defaultEmotion: 'напряжение и страх быть непонятым',
    defaultFlex: 'Готовность попробовать договорённость на 14 дней с последующей сверкой',
    nonNegotiablePrefix: 'Чёткое правило по теме: ',
    reframeIntro: (name, emotion, need) =>
      `${name} испытывает ${emotion}. За эмоциями стоит базовая потребность: ${need.toLowerCase()}.`,
    echoChamberWarning: (count) =>
      count > 0
        ? `Убрано ${count} триггер(а/ов) обвинений и обобщений, которые обычный личный ИИ-чат только бы усилил.`
        : 'Эмоциональный текст переведён в нейтральные формулировки потребностей без обвинений (подход ННО).',
    commonGround: (nameA, nameB) => [
      `И ${nameA}, и ${nameB} ценят отношения/партнёрство и хотят исправить ситуацию, а не разорвать контакт.`,
      'Обе стороны устали от повторяющегося цикла ссор и хотят предсказуемых, понятных правил.',
      'Обеим сторонам важен спокойный, уважительный диалог без накопленных обид и резких упрёков.'
    ],
    asymmetric: (nameA, nameB, needA, needB) => [
      {
        title: 'Асимметричный обмен #1',
        detail: `Для ${nameA} критически важно: «${needA}». Конкретный шаг здесь сильно снизит тревогу ${nameA} при небольшой нагрузке для ${nameB}.`
      },
      {
        title: 'Асимметричный обмен #2',
        detail: `Для ${nameB} критически важно: «${needB}». Уважение этой границы даст ${nameB} опору и мотивацию идти навстречу.`
      }
    ],
    proposals: (nameA, nameB, needA, needB) => [
      {
        id: 'opt-balanced',
        title: '14-дневный эксперимент по новым правилам (Рекомендуется)',
        badge: 'Максимальный баланс',
        fairnessA: 91,
        fairnessB: 90,
        summary: `Вместо абстрактных обещаний — конкретный тест на 2 недели, закрывающий главную потребность ${nameA} и ключевую границу ${nameB}.`,
        commitmentsA: [
          `Соблюдать ключевую границу ${nameB}: ${needB}.`,
          'Формулировать запросы через «мне важно…», избегая обобщений «ты всегда / никогда».'
        ],
        commitmentsB: [
          `Проактивно закрывать главный запрос ${nameA}: ${needA}.`,
          'Предупреждать об изменениях заранее, не доводя до накопленного напряжения.'
        ],
        checkin: 'Спокойная 10-минутная сверка через 14 дней: что сработало, а что подправить.'
      },
      {
        id: 'opt-ownership',
        title: 'Чёткое разделение зон ответственности и границ',
        badge: 'Ноль недосказанностей',
        fairnessA: 86,
        fairnessB: 88,
        summary: 'Убираем «серые зоны»: фиксируем конкретные ожидания, ритм синхронизации и стоп-слово для паузы при росте эмоций.',
        commitmentsA: [
          'Назвать 2 конкретных признака, по которым будет видно реальный прогресс.',
          'Не контролировать каждый шаг, пока согласованные договорённости выполняются.'
        ],
        commitmentsB: [
          'Зафиксировать понятный еженедельный ритм по согласованным задачам/времени.',
          'Честно сообщать о перегрузе за 24 часа, а не уходить в молчание.'
        ],
        checkin: 'Короткий 5-минутный чек-ин раз в неделю в течение 3 недель.'
      },
      {
        id: 'opt-reset',
        title: 'Быстрая деэскалация и первый микро-шаг за 48 часов',
        badge: 'Минимальный порог входа',
        fairnessA: 83,
        fairnessB: 85,
        summary: 'Если эмоции ещё высоки, начните с одного небольшого взаимного шага в ближайшие 48 часов, чтобы вернуть доверие.',
        commitmentsA: [
          `Вслух признать важность переживаний ${nameB} без оговорки «но…».`,
          'Выбрать ОДИН самый важный запрос на эту неделю и временно отложить второстепенные.'
        ],
        commitmentsB: [
          `Сделать один заметный шаг навстречу запросу ${nameA} в течение 48 часов.`,
          'Договориться о 20-минутном спокойном разговоре без телефонов.'
        ],
        checkin: 'Проверка через 48 часов: «Стало ли нам обоим спокойнее и понятнее?»'
      }
    ]
  },
  kk: {
    defaultNeed: 'Сабырмен тыңдалу және екі жаққа да әділ әрі түсінікті келісімге келу',
    defaultEmotion: 'күйзеліс пен түсініспеушілікке алаңдау',
    defaultFlex: '14 күндік сынақ келісіміне және оны бірге тексеруге дайындық',
    nonNegotiablePrefix: 'Нақты келісім аймағы: ',
    reframeIntro: (name, emotion, need) =>
      `${name} ${emotion} күйінде. Эмоцияның астарындағы негізгі қажеттілік: ${need.toLowerCase()}.`,
    echoChamberWarning: (count) =>
      count > 0
        ? `Жеке ЖИ-чат күшейтіп жіберетін ${count} айыптау триггері тазартылды.`
        : 'Эмоционалды мәтін айыптаусыз, бейтарап қажеттіліктер тіліне аударылды.',
    commonGround: (nameA, nameB) => [
      `${nameA} да, ${nameB} да қарым-қатынасты сақтауға және шешім табуға ниетті.`,
      'Екі жақ та қайталанатын даулардан шаршап, түсінікті ережелер қалайды.',
      'Екеуіне де құрметті әрі сабырлы диалог маңызды.'
    ],
    asymmetric: (nameA, nameB, needA, needB) => [
      {
        title: 'Басымдық алмасуы #1',
        detail: `${nameA} үшін ең маңыздысы: «${needA}». Осы бағыттағы нақты қадам ${nameA} үшін үлкен жеңілдік береді.`
      },
      {
        title: 'Басымдық алмасуы #2',
        detail: `${nameB} үшін ең маңыздысы: «${needB}». Бұл шекараны сақтау ${nameB} сенімін нығайтады.`
      }
    ],
    proposals: (nameA, nameB, needA, needB) => [
      {
        id: 'opt-balanced',
        title: '14 күндік құрылымды сынақ келісімі (Ұсынылады)',
        badge: 'Ең жоғары теңгерім',
        fairnessA: 91,
        fairnessB: 90,
        summary: `Екі апталық нақты сынақ: ${nameA} басты қажеттілігі мен ${nameB} негізгі шекарасын қатар қорғайды.`,
        commitmentsA: [
          `${nameB} маңызды шекарасын құрметтеу: ${needB}.`,
          'Айыптаусыз «маған маңызды...» форматында сөйлесу.'
        ],
        commitmentsB: [
          `${nameA} басты сұранысын орындау: ${needA}.`,
          'Өзгерістер туралы алдын ала ашық ескерту.'
        ],
        checkin: '14 күннен кейін 10 минуттық сабырлы қорытынды.'
      },
      {
        id: 'opt-ownership',
        title: 'Айқын жауапкершілік пен шекаралар',
        badge: 'Толық айқындық',
        fairnessA: 86,
        fairnessB: 88,
        summary: 'Күтулерді, мерзімдерді және эмоция көтерілгендегі үзіліс ережесін нақты бекіту.',
        commitmentsA: ['Нақты 2 нәтиже өлшемін белгілеу.', 'Келісім сақталғанда артық бақылаудан бас тарту.'],
        commitmentsB: ['Апталық тұрақты ырғақты сақтау.', 'Қиындық туса, 24 сағат бұрын хабарлау.'],
        checkin: '3 апта бойы аптасына 5 минуттық тексеріс.'
      },
      {
        id: 'opt-reset',
        title: '48 сағаттық шағын татуласу қадамы',
        badge: 'Жеңіл бастама',
        fairnessA: 83,
        fairnessB: 85,
        summary: 'Алдымен сенімді қалпына келтіру үшін 48 сағат ішінде бір шағын өзара қадам жасау.',
        commitmentsA: [`${nameB} сезімін «бірақ» сөзінсіз мойындау.`, 'Осы аптаға тек БІР басты сұранысты таңдау.'],
        commitmentsB: [`48 сағат ішінде ${nameA} үшін нақты бір қадам жасау.`, 'Телефонсыз 20 минуттық сабырлы әңгіме белгілеу.'],
        checkin: '48 сағаттан соң қысқаша күй-жағдайды сұрасу.'
      }
    ]
  }
};

export function runDeterministicAdvocate({ partyName, rawStatement, desiredOutcome, lang = 'en' }) {
  const locale = COPY[lang] ? lang : 'en';
  const copy = COPY[locale];
  const combined = `${rawStatement || ''} ${desiredOutcome || ''}`;

  let toxicCount = 0;
  for (const rx of TOXIC_MARKERS) {
    const matches = combined.match(rx);
    if (matches) toxicCount += matches.length;
  }

  const matched = [];
  for (const domain of NEED_DOMAINS) {
    if (domain.keywords.test(combined)) {
      matched.push(domain[locale]);
    }
  }

  const primary = matched[0] || {
    need: copy.defaultNeed,
    emotion: copy.defaultEmotion,
    flex: copy.defaultFlex
  };
  const secondary = matched[1];

  const coreNeeds = [primary.need];
  if (secondary) coreNeeds.push(secondary.need);
  if (desiredOutcome && desiredOutcome.trim().length > 6) {
    coreNeeds.push(desiredOutcome.trim().slice(0, 140));
  }

  const nonNegotiables = [
    `${copy.nonNegotiablePrefix}${primary.need.toLowerCase()}`
  ];
  const flexZones = [primary.flex];
  if (secondary) flexZones.push(secondary.flex);

  return {
    partyName: partyName || 'Party',
    detectedEmotion: primary.emotion,
    neutralSummary: copy.reframeIntro(partyName || 'Party', primary.emotion, primary.need),
    coreNeeds: coreNeeds.slice(0, 3),
    nonNegotiables,
    flexZones: flexZones.slice(0, 2),
    toxicityNote: copy.echoChamberWarning(toxicCount),
    triggersRemoved: toxicCount
  };
}

export function runDeterministicMediator({ topic, partyA, partyB, lang = 'en' }) {
  const locale = COPY[lang] ? lang : 'en';
  const copy = COPY[locale];
  const nameA = partyA?.partyName || 'Person A';
  const nameB = partyB?.partyName || 'Person B';
  const needA = partyA?.coreNeeds?.[0] || copy.defaultNeed;
  const needB = partyB?.coreNeeds?.[0] || copy.defaultNeed;

  return {
    topic: topic || 'Shared Resolution',
    sharedReframe:
      locale === 'ru'
        ? `Это не «${nameA} против ${nameB}», а общая задача: совместить запрос ${nameA} («${needA}») и границу ${nameB} («${needB}»).`
        : locale === 'kk'
        ? `Бұл «${nameA} мен ${nameB} қарсылығы» емес, ортақ міндет: ${nameA} қажеттілігі мен ${nameB} шекарасын теңестіру.`
        : `This is not "${nameA} vs. ${nameB}" — it is a shared design challenge: fulfilling ${nameA}'s core need ("${needA}") while protecting ${nameB}'s boundary ("${needB}").`,
    commonGround: copy.commonGround(nameA, nameB),
    asymmetricTradeoffs: copy.asymmetric(nameA, nameB, needA, needB),
    proposals: copy.proposals(nameA, nameB, needA, needB)
  };
}
