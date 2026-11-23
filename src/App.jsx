import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Lock,
  CheckCircle2,
  Scale,
  Link2,
  Copy,
  Check,
  RefreshCw,
  Users,
  Smartphone,
  Handshake
} from 'lucide-react';
import { UI, PRESETS } from './i18n.js';
import { encodeInvitePayload, decodeInvitePayload } from './invite.js';
import { checkSafety } from '../lib/safety.js';
import { runDeterministicAdvocate, runDeterministicMediator } from '../lib/nvcEngine.js';

async function postAdvocate(payload) {
  try {
    const res = await fetch('/api/advocate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback to identical local shared engine when running pure static preview
  }
  const safety = checkSafety(`${payload.rawStatement}\n${payload.desiredOutcome}`, payload.lang);
  if (safety.blocked) {
    return { ok: true, blocked: true, safety, engineMode: 'safety-circuit-breaker' };
  }
  return {
    ok: true,
    blocked: false,
    engineMode: 'deterministic-nvc',
    summary: runDeterministicAdvocate(payload)
  };
}

async function postMediator(payload) {
  try {
    const res = await fetch('/api/mediator', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback to identical local shared engine when running pure static preview
  }
  return {
    ok: true,
    blocked: false,
    engineMode: 'deterministic-nvc',
    mediation: runDeterministicMediator(payload)
  };
}

function PartyCard({
  side,
  title,
  t,
  data,
  setData,
  summary,
  approved,
  loading,
  onAnalyze,
  onApprove,
  onEdit,
  readOnlyNotice
}) {
  const isA = side === 'A';

  return (
    <section className={`card ${isA ? 'side-a' : 'side-b'}`}>
      <div className="card-head">
        <div>
          <h3 className="card-title">
            <Lock size={18} color={isA ? '#f59e0b' : '#60a5fa'} />
            {title}
          </h3>
        </div>
        <span className="lock-chip">
          <ShieldCheck size={13} color="#34d399" />
          {t.isolationBadge}
        </span>
      </div>

      {readOnlyNotice ? (
        <div className="approved-bar">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={17} />
            {readOnlyNotice}
          </span>
        </div>
      ) : (
        <>
          <div className="field">
            <label>{t.nameLabel}</label>
            <input
              type="text"
              value={data.name}
              disabled={approved}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              placeholder={isA ? 'e.g. Aigerim' : 'e.g. Timur'}
            />
          </div>

          <div className="field">
            <label>{t.ventLabel}</label>
            <textarea
              rows={4}
              value={data.raw}
              disabled={approved}
              onChange={(e) => setData({ ...data, raw: e.target.value })}
              placeholder={t.ventLabel}
            />
          </div>

          <div className="field">
            <label>{t.wishLabel}</label>
            <input
              type="text"
              value={data.wish}
              disabled={approved}
              onChange={(e) => setData({ ...data, wish: e.target.value })}
              placeholder={t.wishLabel}
            />
          </div>

          {!approved && (
            <button
              type="button"
              className={`btn-primary ${isA ? 'btn-a' : 'btn-b'}`}
              disabled={loading || data.raw.trim().length < 8}
              onClick={onAnalyze}
            >
              <Sparkles size={17} />
              {loading ? t.analyzing : t.analyzeBtn}
            </button>
          )}
        </>
      )}

      {summary && (
        <div className="summary-box">
          <div className="summary-header">
            <h4>{t.summaryTitle}</h4>
            {approved && !readOnlyNotice && (
              <button type="button" className="btn-ghost" onClick={onEdit} style={{ padding: '4px 10px', fontSize: 12 }}>
                {t.editBtn}
              </button>
            )}
          </div>

          <div className="tox-note">{summary.toxicityNote}</div>
          <p className="summary-text">{summary.neutralSummary}</p>

          <div className="summary-section">
            <div className="summary-k">{t.emotionLbl}</div>
            <div style={{ fontSize: 13.5, color: '#e2e8f0' }}>{summary.detectedEmotion}</div>
          </div>

          <div className="summary-section">
            <div className="summary-k">{t.needsLbl}</div>
            <ul className="summary-list">
              {(summary.coreNeeds || []).map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>

          <div className="summary-section">
            <div className="summary-k">{t.boundaryLbl}</div>
            <ul className="summary-list">
              {(summary.nonNegotiables || []).map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>

          <div className="summary-section">
            <div className="summary-k">{t.flexLbl}</div>
            <ul className="summary-list">
              {(summary.flexZones || []).map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>

          {!approved && !readOnlyNotice && (
            <button
              type="button"
              className="btn-primary btn-mediator"
              style={{ marginTop: 10 }}
              onClick={onApprove}
            >
              <CheckCircle2 size={17} />
              {t.approveBtn}
            </button>
          )}

          {approved && !readOnlyNotice && (
            <div className="approved-bar">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <CheckCircle2 size={17} />
                {t.approvedBadge}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [lang, setLang] = useState('en');
  const t = UI[lang] || UI.en;

  const [mode, setMode] = useState('split'); // 'split' | 'two-phone'
  const [invitedFlow, setInvitedFlow] = useState(false);

  const [contextType, setContextType] = useState('relationship');
  const [topic, setTopic] = useState(PRESETS.en[0].topic);
  const [partyA, setPartyA] = useState({ ...PRESETS.en[0].partyA });
  const [partyB, setPartyB] = useState({ ...PRESETS.en[0].partyB });

  const [summaryA, setSummaryA] = useState(null);
  const [summaryB, setSummaryB] = useState(null);
  const [approvedA, setApprovedA] = useState(false);
  const [approvedB, setApprovedB] = useState(false);

  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [loadingMediator, setLoadingMediator] = useState(false);

  const [mediation, setMediation] = useState(null);
  const [votes, setVotes] = useState({}); // { [optId]: { a: bool, b: bool } }
  const [lockedOptionId, setLockedOptionId] = useState(null);

  const [safetyAlert, setSafetyAlert] = useState(null);
  const [engineMode, setEngineMode] = useState('deterministic-nvc');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedPlan, setCopiedPlan] = useState(false);

  // Check health endpoint + detect ?invite=... zero-retention link on load
  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.engineMode) setEngineMode(d.engineMode);
      })
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (token) {
      const decoded = decodeInvitePayload(token);
      if (decoded) {
        if (decoded.lang && UI[decoded.lang]) setLang(decoded.lang);
        setMode('two-phone');
        setInvitedFlow(true);
        setTopic(decoded.topic || 'Shared Mediation');
        setContextType(decoded.contextType || 'relationship');
        setPartyA({ name: decoded.partyA.partyName || 'Person A', raw: '', wish: '' });
        setSummaryA(decoded.partyA);
        setApprovedA(true);
        setPartyB({ name: '', raw: '', wish: '' });
      }
    }
  }, []);

  const inviteUrl = useMemo(() => {
    if (!approvedA || !summaryA) return '';
    const token = encodeInvitePayload({
      lang,
      topic,
      contextType,
      partyA: { ...summaryA, approved: true }
    });
    return `${window.location.origin}${window.location.pathname}?invite=${token}`;
  }, [approvedA, summaryA, lang, topic, contextType]);

  function loadPreset(preset) {
    setSafetyAlert(null);
    setInvitedFlow(false);
    setContextType(preset.contextType);
    setTopic(preset.topic);
    setPartyA({ ...preset.partyA });
    setPartyB({ ...preset.partyB });
    setSummaryA(null);
    setSummaryB(null);
    setApprovedA(false);
    setApprovedB(false);
    setMediation(null);
    setVotes({});
    setLockedOptionId(null);
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  function switchLang(newLang) {
    setLang(newLang);
    if (!summaryA && !summaryB && !invitedFlow) {
      const list = PRESETS[newLang] || PRESETS.en;
      loadPreset(list[0]);
    }
  }

  async function handleAnalyze(side) {
    setSafetyAlert(null);
    const isA = side === 'A';
    const data = isA ? partyA : partyB;
    if (isA) setLoadingA(true);
    else setLoadingB(true);

    const res = await postAdvocate({
      partyName: data.name || (isA ? 'Person A' : 'Person B'),
      contextType,
      rawStatement: data.raw,
      desiredOutcome: data.wish,
      lang
    });

    if (isA) setLoadingA(false);
    else setLoadingB(false);

    if (res.engineMode) setEngineMode(res.engineMode);

    if (res.blocked && res.safety) {
      setSafetyAlert(res.safety);
      return;
    }

    if (res.summary) {
      if (isA) setSummaryA(res.summary);
      else setSummaryB(res.summary);
    }
  }

  async function handleMediate() {
    if (!approvedA || !approvedB || !summaryA || !summaryB) return;
    setLoadingMediator(true);
    setSafetyAlert(null);

    const res = await postMediator({
      topic,
      contextType,
      partyA: { ...summaryA, approved: true },
      partyB: { ...summaryB, approved: true },
      lang
    });

    setLoadingMediator(false);
    if (res.engineMode) setEngineMode(res.engineMode);

    if (res.blocked && res.safety) {
      setSafetyAlert(res.safety);
      return;
    }
    if (res.mediation) {
      setMediation(res.mediation);
      setVotes({});
      setLockedOptionId(null);
    }
  }

  async function handleTestSafety() {
    const sample =
      lang === 'ru'
        ? 'Он ударил меня вчера и угрожает убить, если я уйду.'
        : lang === 'kk'
        ? 'Ол мені соққыға жықты және үйден шығармайды.'
        : 'He hit me last night and threatened to hurt me if I try to leave.';
    const res = await postAdvocate({
      partyName: 'Safety Test',
      contextType: 'safety_test',
      rawStatement: sample,
      desiredOutcome: '',
      lang
    });
    if (res.blocked && res.safety) {
      setSafetyAlert(res.safety);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function toggleVote(optId, who) {
    setVotes((prev) => {
      const cur = prev[optId] || { a: false, b: false };
      return { ...prev, [optId]: { ...cur, [who]: !cur[who] } };
    });
  }

  const mutuallyAgreedOption = useMemo(() => {
    if (!mediation?.proposals) return null;
    if (lockedOptionId) {
      return mediation.proposals.find((p) => p.id === lockedOptionId) || null;
    }
    return null;
  }, [mediation, lockedOptionId]);

  const matchedIds = useMemo(() => {
    const ids = [];
    for (const [id, v] of Object.entries(votes)) {
      if (v.a && v.b) ids.push(id);
    }
    return ids;
  }, [votes]);

  function handleCopyInvite() {
    if (!inviteUrl) return;
    navigator.clipboard?.writeText(inviteUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  }

  function handleCopyPlan() {
    if (!mutuallyAgreedOption) return;
    const nameA = summaryA?.partyName || partyA.name || 'Person A';
    const nameB = summaryB?.partyName || partyB.name || 'Person B';
    const text = [
      `TRUCEAI — MUTUAL ACTION PLAN`,
      `Topic: ${topic}`,
      `Agreed Option: ${mutuallyAgreedOption.title}`,
      ``,
      `${nameA}'s Commitments:`,
      ...mutuallyAgreedOption.commitmentsA.map((c) => `- ${c}`),
      ``,
      `${nameB}'s Commitments:`,
      ...mutuallyAgreedOption.commitmentsB.map((c) => `- ${c}`),
      ``,
      `Check-In: ${mutuallyAgreedOption.checkin}`
    ].join('\n');
    navigator.clipboard?.writeText(text);
    setCopiedPlan(true);
    setTimeout(() => setCopiedPlan(false), 2000);
  }

  const currentPresets = PRESETS[lang] || PRESETS.en;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Scale size={22} />
          </div>
          <div>
            <div className="brand-name">TruceAI</div>
            <div className="brand-tag">Dual-Advocate + Neutral Mediator</div>
          </div>
        </div>

        <div className="topbar-controls">
          <button type="button" className="btn-ghost btn-danger-ghost" onClick={handleTestSafety}>
            <ShieldAlert size={15} />
            {t.safetyTestBtn}
          </button>

          <div className="lang-switch" role="group" aria-label="Language">
            {['en', 'ru', 'kk'].map((code) => (
              <button
                key={code}
                type="button"
                className={lang === code ? 'active' : ''}
                onClick={() => switchLang(code)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="kicker">
          <Sparkles size={14} />
          {t.badge}
        </div>
        <h1>{t.heroTitle}</h1>
        <p>{t.heroSub}</p>

        <div className="control-bar">
          <button
            type="button"
            className={`mode-btn ${mode === 'split' ? 'active' : ''}`}
            onClick={() => {
              setMode('split');
              setInvitedFlow(false);
            }}
          >
            <Users size={16} />
            {t.modeSplit}
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === 'two-phone' ? 'active' : ''}`}
            onClick={() => setMode('two-phone')}
          >
            <Smartphone size={16} />
            {t.modeTwoPhone}
          </button>
        </div>

        {!invitedFlow && (
          <div className="preset-row">
            <span className="preset-label">{t.presetLabel}</span>
            {currentPresets.map((p) => (
              <button key={p.id} type="button" className="preset-chip" onClick={() => loadPreset(p)}>
                {p.label}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Progress Stepper */}
      <div className="stepper">
        <div className={`step-pill ${approvedA ? 'done' : 'current'}`}>
          {approvedA && <CheckCircle2 size={15} />}
          {t.step1}
        </div>
        <div className={`step-pill ${approvedB ? 'done' : approvedA ? 'current' : ''}`}>
          {approvedB && <CheckCircle2 size={15} />}
          {t.step2}
        </div>
        <div className={`step-pill ${mediation ? 'done' : approvedA && approvedB ? 'current' : ''}`}>
          {mediation && <CheckCircle2 size={15} />}
          {t.step3}
        </div>
        <div className={`step-pill ${mutuallyAgreedOption ? 'done' : mediation ? 'current' : ''}`}>
          {mutuallyAgreedOption && <CheckCircle2 size={15} />}
          {t.step4}
        </div>
      </div>

      {/* Invited Banner */}
      {invitedFlow && (
        <div className="banner info">
          <Link2 size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>{t.invitedBanner}</div>
        </div>
      )}

      {/* Safety Circuit-Breaker Alert */}
      {safetyAlert && (
        <div className="banner danger" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}>
            <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
              <ShieldAlert size={20} />
              {safetyAlert.message?.title}
            </strong>
            <button type="button" className="btn-ghost" onClick={() => setSafetyAlert(null)}>
              Close
            </button>
          </div>
          <p style={{ fontSize: 14 }}>{safetyAlert.message?.body}</p>
          <div className="helpline-grid">
            {(safetyAlert.helplines || []).map((h, i) => (
              <div className="helpline-card" key={i}>
                <div className="helpline-num">{h.number}</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{h.name}</div>
                <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2 }}>{h.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared Topic */}
      <div className="topic-card">
        <label>{t.topicLabel}:</label>
        <input
          type="text"
          value={topic}
          disabled={invitedFlow}
          onChange={(e) => setTopic(e.target.value)}
        />
      </div>

      {/* Split-Screen Mode OR Two-Phone Step Mode */}
      {mode === 'split' ? (
        <div className="split-grid">
          <PartyCard
            side="A"
            title={t.sideATitle}
            t={t}
            data={partyA}
            setData={setPartyA}
            summary={summaryA}
            approved={approvedA}
            loading={loadingA}
            onAnalyze={() => handleAnalyze('A')}
            onApprove={() => setApprovedA(true)}
            onEdit={() => {
              setApprovedA(false);
              setMediation(null);
            }}
          />

          <PartyCard
            side="B"
            title={t.sideBTitle}
            t={t}
            data={partyB}
            setData={setPartyB}
            summary={summaryB}
            approved={approvedB}
            loading={loadingB}
            onAnalyze={() => handleAnalyze('B')}
            onApprove={() => setApprovedB(true)}
            onEdit={() => {
              setApprovedB(false);
              setMediation(null);
            }}
          />
        </div>
      ) : (
        <div className="single-col">
          {!invitedFlow && (
            <>
              <PartyCard
                side="A"
                title={t.sideATitle}
                t={t}
                data={partyA}
                setData={setPartyA}
                summary={summaryA}
                approved={approvedA}
                loading={loadingA}
                onAnalyze={() => handleAnalyze('A')}
                onApprove={() => setApprovedA(true)}
                onEdit={() => {
                  setApprovedA(false);
                  setMediation(null);
                }}
              />

              {approvedA && (
                <div className="invite-box">
                  <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Link2 size={16} color="#93c5fd" />
                    {t.shareLinkTitle}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#cbd5e1', marginTop: 4 }}>{t.shareLinkSub}</div>
                  <input type="text" className="invite-url" readOnly value={inviteUrl} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <button type="button" className="btn-ghost" onClick={handleCopyInvite}>
                      {copiedInvite ? <Check size={15} color="#34d399" /> : <Copy size={15} />}
                      {copiedInvite ? t.copied : t.copyLink}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setInvitedFlow(true)}
                    >
                      {t.openSideB} →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {invitedFlow && (
            <PartyCard
              side="B"
              title={t.sideBTitle}
              t={t}
              data={partyB}
              setData={setPartyB}
              summary={summaryB}
              approved={approvedB}
              loading={loadingB}
              onAnalyze={() => handleAnalyze('B')}
              onApprove={() => setApprovedB(true)}
              onEdit={() => {
                setApprovedB(false);
                setMediation(null);
              }}
            />
          )}
        </div>
      )}

      {/* Trigger Neutral Mediator */}
      {approvedA && approvedB && !mediation && (
        <div className="mediate-cta">
          <button
            type="button"
            className="btn-primary btn-mediator"
            style={{ padding: '15px 22px', fontSize: 16 }}
            disabled={loadingMediator}
            onClick={handleMediate}
          >
            <Scale size={20} />
            {loadingMediator ? t.mediating : t.mediateBtn}
          </button>
        </div>
      )}

      {/* Neutral Mediator Results */}
      {mediation && (
        <section className="card mediator">
          <div className="card-head">
            <h2 className="card-title" style={{ fontSize: 22 }}>
              <Scale size={22} color="#34d399" />
              {t.mediatorTitle}
            </h2>
            <span className="lock-chip">Impartial · Context-Isolated</span>
          </div>

          <div className="summary-k" style={{ marginBottom: 6 }}>
            {t.reframeLbl}
          </div>
          <div className="reframe-box">{mediation.sharedReframe}</div>

          <div className="insights-grid">
            <div className="insight-panel">
              <h4>{t.commonGroundLbl}</h4>
              <ul className="summary-list">
                {(mediation.commonGround || []).map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>

            <div className="insight-panel">
              <h4>{t.tradeoffsLbl}</h4>
              {(mediation.asymmetricTradeoffs || []).map((tr, i) => (
                <div className="tradeoff-item" key={i}>
                  <strong>{tr.title}</strong>
                  <span>{tr.detail}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="summary-k">{t.proposalsLbl}</div>
          <div className="proposals-grid">
            {(mediation.proposals || []).map((opt) => {
              const v = votes[opt.id] || { a: false, b: false };
              const isMatched = v.a && v.b;
              const nameA = summaryA?.partyName || partyA.name || 'A';
              const nameB = summaryB?.partyName || partyB.name || 'B';
              return (
                <div key={opt.id} className={`proposal-card ${isMatched ? 'matched' : ''}`}>
                  <div>
                    <span className="proposal-badge">{opt.badge}</span>
                    <h4>{opt.title}</h4>
                    <div className="fairness-row">
                      <span className="fair-a">{nameA}: {opt.fairnessA}%</span>
                      <span className="fair-b">{nameB}: {opt.fairnessB}%</span>
                    </div>
                    <p className="proposal-summary">{opt.summary}</p>

                    <div className="commit-block">
                      <div className="who-a">{t.commitALbl} {nameA}</div>
                      <ul className="summary-list">
                        {(opt.commitmentsA || []).map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="commit-block">
                      <div className="who-b">{t.commitBLbl} {nameB}</div>
                      <ul className="summary-list">
                        {(opt.commitmentsB || []).map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="checkin-line">
                      <strong>{t.checkinLbl}:</strong> {opt.checkin}
                    </div>
                  </div>

                  <div className="vote-row">
                    <button
                      type="button"
                      className={`vote-btn ${v.a ? 'active-a' : ''}`}
                      onClick={() => toggleVote(opt.id, 'a')}
                    >
                      {v.a && <Check size={14} />}
                      {nameA} {t.acceptA}
                    </button>
                    <button
                      type="button"
                      className={`vote-btn ${v.b ? 'active-b' : ''}`}
                      onClick={() => toggleVote(opt.id, 'b')}
                    >
                      {v.b && <Check size={14} />}
                      {nameB} {t.acceptB}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {matchedIds.length > 0 && !mutuallyAgreedOption && (
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <button
                type="button"
                className="btn-primary btn-mediator"
                style={{ maxWidth: 420 }}
                onClick={() => setLockedOptionId(matchedIds[0])}
              >
                <Handshake size={19} />
                {t.finalizeBtn}
              </button>
            </div>
          )}

          {mutuallyAgreedOption && (
            <div className="final-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Handshake size={26} color="#34d399" />
                <h3 style={{ fontSize: 21, fontWeight: 800 }}>{t.finalTitle}: {mutuallyAgreedOption.title}</h3>
              </div>
              <p style={{ color: '#cbd5e1', fontSize: 14 }}>{t.finalSub}</p>
              <div className="final-actions">
                <button type="button" className="btn-primary btn-mediator" style={{ width: 'auto' }} onClick={handleCopyPlan}>
                  {copiedPlan ? <Check size={16} /> : <Copy size={16} />}
                  {copiedPlan ? t.copiedPlan : t.copyPlan}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => loadPreset(currentPresets[0])}
                >
                  <RefreshCw size={15} />
                  {t.resetBtn}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <footer className="footer-meta">
        <span className="engine-badge">
          <Sparkles size={13} color="#34d399" />
          {engineMode.startsWith('llm:') ? `${t.engineLLM} (${engineMode.replace('llm:', '')})` : t.engineNVC}
        </span>
        <div>{t.disclaimer}</div>
      </footer>
    </div>
  );
}
