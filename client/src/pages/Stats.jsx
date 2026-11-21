import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api } from '../api.js';

const TYPE_LABEL = { mc: 'Multiple choice', tf: 'True / False', short: 'Short answer', numeric: 'Numeric' };
const DIFF_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const DIFF_ORDER = ['easy', 'medium', 'hard'];

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  useLayoutEffect(() => {
    if (!ref.current) return;
    setW(Math.max(260, ref.current.clientWidth));
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceMax(v) {
  if (v <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p / (v / p > 5 ? 2 : 1)) * p * (v / p > 5 ? 2 : 1);
}

const pct = (c, n) => (n ? Math.round((c / n) * 100) : 0);
const fmtTime = (s) => new Date(s.replace(' ', 'T') + 'Z').toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function CoinChart({ history }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const height = 220;
  const m = { t: 12, r: 16, b: 24, l: 48 };
  const iw = width - m.l - m.r;
  const ih = height - m.t - m.b;
  const max = niceMax(Math.max(...history.map((h) => h.balance_after)));
  const x = (i) => m.l + (history.length > 1 ? (i / (history.length - 1)) * iw : iw / 2);
  const y = (v) => m.t + ih - (v / max) * ih;
  const path = history.map((h, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(h.balance_after).toFixed(1)}`).join('');
  const ticks = [0, max / 2, max];

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round(((px - m.l) / iw) * (history.length - 1));
    setHover(Math.min(history.length - 1, Math.max(0, i)));
  };

  const h = hover != null ? history[hover] : null;
  return (
    <div ref={ref} className="chart-wrap">
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label="Coin balance over time">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="axis-label">{Math.round(t)}</text>
          </g>
        ))}
        <path d={path} className="series-line" />
        {h && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} className="crosshair" />
            <circle cx={x(hover)} cy={y(h.balance_after)} r="5" className="series-dot" />
          </>
        )}
        <rect x={m.l} y={m.t} width={iw} height={ih} fill="transparent" />
      </svg>
      {h && (
        <div className="tooltip" style={{ left: Math.min(x(hover) + 12, width - 190), top: 8 }}>
          <div><strong>{h.balance_after.toLocaleString()}</strong> coins</div>
          <div className={h.delta >= 0 ? 'good-text' : 'bad-text'}>{h.delta >= 0 ? '+' : ''}{h.delta} · {h.reason}</div>
          <div className="muted small">{fmtTime(h.created_at)}</div>
        </div>
      )}
    </div>
  );
}

function AccuracyBars({ rows, labelOf }) {
  if (!rows.length) return <p className="muted small">No answers yet.</p>;
  return (
    <ul className="barlist">
      {rows.map((r) => {
        const p = pct(r.correct, r.answered);
        return (
          <li key={r.key} title={`${r.correct}/${r.answered} correct (${p}%), net ${r.net >= 0 ? '+' : ''}${r.net} coins`}>
            <span className="bar-label">{labelOf(r.key)}</span>
            <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.max(p, 1)}%` }} /></span>
            <span className="bar-value"><strong>{p}%</strong> <span className="muted small">{r.correct}/{r.answered}</span></span>
          </li>
        );
      })}
    </ul>
  );
}

function DailyChart({ daily }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const height = 160;
  const m = { t: 10, r: 8, b: 22, l: 32 };
  const iw = width - m.l - m.r;
  const ih = height - m.t - m.b;
  const max = niceMax(Math.max(...daily.map((d) => d.answered)));
  const slot = iw / Math.max(daily.length, 7);
  const bw = Math.min(28, slot - 2);
  return (
    <div ref={ref} className="chart-wrap">
      <svg width={width} height={height} role="img" aria-label="Questions answered per day">
        {[0, max].map((t) => (
          <g key={t}>
            <line x1={m.l} x2={width - m.r} y1={m.t + ih - (t / max) * ih} y2={m.t + ih - (t / max) * ih} className="grid" />
            <text x={m.l - 6} y={m.t + ih - (t / max) * ih + 4} textAnchor="end" className="axis-label">{t}</text>
          </g>
        ))}
        {daily.map((d, i) => {
          const bh = (d.answered / max) * ih;
          const bx = m.l + i * slot + (slot - bw) / 2;
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={m.l + i * slot} y={m.t} width={slot} height={ih} fill="transparent" />
              <path d={`M${bx},${m.t + ih} V${m.t + ih - bh + 4} Q${bx},${m.t + ih - bh} ${bx + 4},${m.t + ih - bh} H${bx + bw - 4} Q${bx + bw},${m.t + ih - bh} ${bx + bw},${m.t + ih - bh + 4} V${m.t + ih} Z`}
                className={`series-bar ${hover === i ? 'hover' : ''}`} />
              {(i === 0 || i === daily.length - 1) && (
                <text x={bx + bw / 2} y={height - 6} textAnchor="middle" className="axis-label">{d.day.slice(5)}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="tooltip" style={{ left: Math.min(m.l + hover * slot + slot, width - 160), top: 4 }}>
          <div><strong>{daily[hover].day}</strong></div>
          <div>{daily[hover].answered} answered · {pct(daily[hover].correct, daily[hover].answered)}% correct</div>
        </div>
      )}
    </div>
  );
}

export default function Stats({ profile }) {
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/api/stats').then(setS); }, [profile.coins]);
  if (!s) return <div className="muted">Loading…</div>;

  const { totals } = s;
  const byDiff = DIFF_ORDER.map((k) => s.byDifficulty.find((r) => r.key === k)).filter(Boolean);
  const netAll = s.byDifficulty.reduce((a, r) => a + r.net, 0);

  return (
    <div className="stats">
      <div className="tiles">
        <div className="card tile"><span className="muted small">Questions answered</span><strong>{totals.answered}</strong></div>
        <div className="card tile"><span className="muted small">Accuracy</span><strong>{pct(totals.correct, totals.answered)}%</strong></div>
        <div className="card tile"><span className="muted small">Net from questions</span><strong className={netAll >= 0 ? 'good-text' : 'bad-text'}>{netAll >= 0 ? '+' : ''}{netAll}</strong></div>
        <div className="card tile"><span className="muted small">Skipped / forfeited</span><strong>{totals.forfeited}</strong></div>
      </div>

      <section className="card">
        <h3>Coin balance</h3>
        {s.history.length > 1 ? <CoinChart history={s.history} /> : <p className="muted small">Answer some questions to see your balance over time.</p>}
      </section>

      <div className="two-col">
        <section className="card">
          <h3>Accuracy by difficulty</h3>
          <AccuracyBars rows={byDiff} labelOf={(k) => DIFF_LABEL[k]} />
        </section>
        <section className="card">
          <h3>Accuracy by question type</h3>
          <AccuracyBars rows={s.byType} labelOf={(k) => TYPE_LABEL[k]} />
        </section>
      </div>

      <div className="two-col">
        <section className="card">
          <h3>Daily activity</h3>
          {s.daily.length ? <DailyChart daily={s.daily} /> : <p className="muted small">No activity yet.</p>}
        </section>
        <section className="card">
          <h3>Most missed</h3>
          {s.mostMissed.length ? (
            <ul className="missed">
              {s.mostMissed.map((q) => (
                <li key={q.id}>
                  <div>{q.prompt}</div>
                  <div className="muted small">Missed {q.times_wrong}× · {DIFF_LABEL[q.difficulty]} · {q.filename} p.{q.page}</div>
                </li>
              ))}
            </ul>
          ) : <p className="muted small">Nothing missed yet.</p>}
        </section>
      </div>

      <section className="card">
        <h3>By course and document</h3>
        {s.byDocument.length ? (
          <table className="table">
            <thead><tr><th>Name</th><th>Answered</th><th>Accuracy</th><th>Net coins</th></tr></thead>
            <tbody>
              {s.byCourse.map((r) => (
                <tr key={`c-${r.key}`} className="course-row"><td>{r.key}</td><td>{r.answered}</td><td>{pct(r.correct, r.answered)}%</td><td className={r.net >= 0 ? 'good-text' : 'bad-text'}>{r.net >= 0 ? '+' : ''}{r.net}</td></tr>
              ))}
              {s.byDocument.map((r) => (
                <tr key={`d-${r.key}`}><td className="indent">{r.key}</td><td>{r.answered}</td><td>{pct(r.correct, r.answered)}%</td><td className={r.net >= 0 ? 'good-text' : 'bad-text'}>{r.net >= 0 ? '+' : ''}{r.net}</td></tr>
              ))}
            </tbody>
          </table>
        ) : <p className="muted small">No answers yet.</p>}
      </section>
    </div>
  );
}
