import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { Coin } from '../App.jsx';
import { TIERS, winAmount, DAILY_ALLOWANCE } from '../../../shared/economy.js';

const TYPE_LABEL = { mc: 'Multiple choice', tf: 'True / False', short: 'Short answer', numeric: 'Numeric' };

function TierPicker({ pool, coins, reviewOnly, onPick, loading }) {
  return (
    <div className="tiers">
      {Object.entries(TIERS).map(([key, t]) => {
        const count = reviewOnly ? pool?.[key]?.review : pool?.[key]?.total;
        const broke = coins < t.stake;
        const disabled = loading || broke || !count;
        return (
          <button key={key} className={`tier-card tier-${key}`} disabled={disabled} onClick={() => onPick(key)}>
            <div className="tier-name">{t.label}</div>
            <div className="tier-odds">
              <div><span className="muted small">Stake</span><strong><Coin /> {t.stake}</strong></div>
              <div><span className="muted small">Win</span><strong className="good-text">+{t.win}</strong></div>
            </div>
            <div className="muted small">
              {broke ? `Need ${t.stake} coins` : count ? `${count} question${count > 1 ? 's' : ''}${reviewOnly ? ' to review' : ''}` : reviewOnly ? 'Nothing to review' : 'No questions yet'}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AnswerInput({ q, value, setValue, onSubmit, disabled }) {
  if (q.type === 'mc') {
    return (
      <div className="choices">
        {q.choices.map((c, i) => (
          <button key={c} className={`choice ${value === c ? 'selected' : ''}`} onClick={() => setValue(c)} disabled={disabled}>
            <span className="choice-letter">{'ABCDE'[i]}</span> {c}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === 'tf') {
    return (
      <div className="choices tf">
        {['true', 'false'].map((v) => (
          <button key={v} className={`choice ${value === v ? 'selected' : ''}`} onClick={() => setValue(v)} disabled={disabled}>
            {v === 'true' ? 'True' : 'False'}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === 'numeric') {
    return (
      <input className="answer-input" inputMode="decimal" placeholder="Enter a number" value={value} disabled={disabled} autoFocus
        onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSubmit()} />
    );
  }
  return (
    <textarea className="answer-input" rows={4} placeholder="Type your answer (Ctrl/⌘+Enter to submit)" value={value} disabled={disabled} autoFocus
      onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && onSubmit()} />
  );
}

function formatAnswer(q, r) {
  if (q.type === 'tf') return r.correctAnswer === 'true' ? 'True' : 'False';
  if (q.type === 'numeric' && r.tolerance) return `${r.correctAnswer} (±${r.tolerance})`;
  return r.correctAnswer;
}

export default function Study({ profile, setCoins, notify, goTo }) {
  const [courses, setCourses] = useState(null);
  const [courseId, setCourseId] = useState(() => { try { return Number(localStorage.getItem('studyCourse')) || null; } catch { return null; } });
  const [docs, setDocs] = useState([]);
  const [documentId, setDocumentId] = useState('');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [pool, setPool] = useState(null);
  const [round, setRound] = useState(null); // { attemptId, stake, win, question, difficulty }
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/api/courses').then((cs) => {
      setCourses(cs);
      setCourseId((cur) => (cs.some((c) => c.id === cur) ? cur : cs.find((c) => c.question_count)?.id ?? cs[0]?.id ?? null));
    });
  }, []);

  useEffect(() => {
    if (!courseId) return;
    try { localStorage.setItem('studyCourse', String(courseId)); } catch { /* ignore */ }
    setDocumentId('');
    api.get(`/api/courses/${courseId}/documents`).then(setDocs);
  }, [courseId]);

  const loadPool = useCallback(() => {
    if (!courseId) return;
    const qs = new URLSearchParams({ courseId, ...(documentId ? { documentId } : {}) });
    api.get(`/api/study/pool?${qs}`).then(setPool);
  }, [courseId, documentId]);
  useEffect(() => { loadPool(); }, [loadPool]);

  const draw = async (difficulty) => {
    if (round && !result && !confirm(`Skip this question? You'll forfeit your ${round.stake}-coin stake.`)) return;
    setBusy(true);
    try {
      const r = await api.post('/api/study/draw', { courseId, documentId: documentId || undefined, difficulty, reviewOnly });
      setRound({ ...r, difficulty });
      setCoins(r.coins);
      setAnswer('');
      setResult(null);
    } catch (e) {
      notify(e.message, 'bad');
      loadPool();
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!round || result || busy) return;
    if (!String(answer).trim()) return notify('Pick or type an answer first.');
    setBusy(true);
    try {
      const r = await api.post('/api/study/answer', { attemptId: round.attemptId, answer });
      setResult(r);
      setCoins(r.coins);
      loadPool();
    } catch (e) {
      notify(e.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  const leave = () => {
    if (round && !result && !confirm(`Leave this question? You'll forfeit your ${round.stake}-coin stake.`)) return;
    setRound(null);
    setResult(null);
    loadPool();
  };

  if (!courses) return <div className="muted">Loading…</div>;

  if (!courses.length || !courses.some((c) => c.question_count)) {
    return (
      <section className="card empty-state">
        <h2>No questions yet</h2>
        <p className="muted">Create a course and upload your lecture slides or notes. Questions are generated automatically.</p>
        <button className="btn primary" onClick={() => goTo('courses')}>Go to Courses</button>
      </section>
    );
  }

  const q = round?.question;
  const minStake = Math.min(...Object.values(TIERS).map((t) => t.stake));

  return (
    <div className="study">
      <div className="card filters">
        <label>
          <span className="muted small">Course</span>
          <select value={courseId ?? ''} onChange={(e) => setCourseId(Number(e.target.value))} disabled={!!round && !result}>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.question_count})</option>)}
          </select>
        </label>
        <label>
          <span className="muted small">Material</span>
          <select value={documentId} onChange={(e) => setDocumentId(e.target.value)} disabled={!!round && !result}>
            <option value="">All documents</option>
            {docs.filter((d) => d.question_count).map((d) => <option key={d.id} value={d.id}>{d.filename}</option>)}
          </select>
        </label>
        <div className="segmented" role="group" aria-label="Mode">
          <button className={!reviewOnly ? 'active' : ''} onClick={() => setReviewOnly(false)} disabled={!!round && !result}>All questions</button>
          <button className={reviewOnly ? 'active' : ''} onClick={() => setReviewOnly(true)} disabled={!!round && !result}>Review missed</button>
        </div>
      </div>

      {!round && (
        <>
          <h2 className="section-title">Pick your stakes</h2>
          <p className="muted">The stake is taken when the question appears. A right answer returns it plus the winnings; a wrong answer or skip loses it. True/False pays 80% of the stake, since it's easy to guess.</p>
          <TierPicker pool={pool} coins={profile.coins} reviewOnly={reviewOnly} onPick={draw} loading={busy} />
          {profile.coins < minStake && (
            <div className="banner warn">You're out of coins. Come back tomorrow for your +{DAILY_ALLOWANCE} daily allowance.</div>
          )}
        </>
      )}

      {q && (
        <section className={`card question-card tier-border-${round.difficulty} ${result ? (result.correct ? 'is-correct' : 'is-wrong') : ''}`}>
          <div className="row between wrap">
            <div className="row gap-sm wrap">
              <span className={`pill tier-${round.difficulty}`}>{TIERS[round.difficulty].label}</span>
              <span className="pill muted">{TYPE_LABEL[q.type]}</span>
              {q.isReview && <span className="pill warn">Review</span>}
            </div>
            <div className="stakes small">
              At stake: <strong><Coin size={14} /> {round.stake}</strong> · Win: <strong className="good-text">+{winAmount(round.difficulty, q.type)}</strong>
            </div>
          </div>

          <h3 className="prompt">{q.prompt}</h3>

          <AnswerInput q={q} value={answer} setValue={setAnswer} onSubmit={submit} disabled={!!result || busy} />

          {!result && (
            <div className="row gap-sm actions">
              <button className="btn primary" onClick={submit} disabled={busy || !String(answer).trim()}>
                {busy ? (q.type === 'short' ? 'Grading…' : 'Checking…') : 'Lock in answer'}
              </button>
              <button className="btn ghost" onClick={leave} disabled={busy}>Skip (forfeit)</button>
            </div>
          )}

          {result && (
            <div className="result" role="status">
              <div className={`result-banner ${result.correct ? 'good' : 'bad'}`}>
                <span>{result.correct ? 'Correct!' : 'Not quite.'}</span>
                <span className="delta">{result.net > 0 ? '+' : ''}{result.net} <Coin size={16} /></span>
              </div>
              {!result.correct && q.type !== 'short' && (
                <p><strong>Correct answer:</strong> {formatAnswer(q, result)}</p>
              )}
              {q.type === 'short' && (
                <>
                  {result.feedback && <p><strong>Grader:</strong> {result.feedback}</p>}
                  <p><strong>Model answer:</strong> {result.correctAnswer}</p>
                </>
              )}
              <p><strong>Why:</strong> {result.explanation}</p>
              <p className="muted small">Source: {result.source}, page {result.page}</p>
              <div className="row gap-sm actions wrap">
                <button className="btn primary" onClick={() => draw(round.difficulty)} disabled={busy || profile.coins < round.stake}>
                  Next {TIERS[round.difficulty].label} question
                </button>
                <button className="btn ghost" onClick={leave}>Change stakes</button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
