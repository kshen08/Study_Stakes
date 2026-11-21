import React, { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import Avatar from './Avatar.jsx';
import Study from './pages/Study.jsx';
import Courses from './pages/Courses.jsx';
import Shop from './pages/Shop.jsx';
import Stats from './pages/Stats.jsx';

const TABS = [
  { id: 'study', label: 'Study' },
  { id: 'courses', label: 'Courses' },
  { id: 'shop', label: 'Shop & Avatar' },
  { id: 'stats', label: 'Stats' },
];

export function Coin({ size = 16 }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" className="coin-icon">
      <circle cx="10" cy="10" r="9" fill="#f5b301" stroke="#c78a00" strokeWidth="2" />
      <text x="10" y="14" fontSize="10" textAnchor="middle" fontWeight="800" fill="#fff" fontFamily="system-ui">S</text>
    </svg>
  );
}

export default function App() {
  const [tab, setTab] = useState(() => {
    const fromHash = window.location.hash.slice(1);
    if (TABS.some((t) => t.id === fromHash)) return fromHash;
    try { return localStorage.getItem('tab') || 'study'; } catch { return 'study'; }
  });
  const [profile, setProfile] = useState(null);
  const [toast, setToast] = useState(null);
  const [coinFlash, setCoinFlash] = useState(null);
  const [ollama, setOllama] = useState(null);

  const notify = useCallback((msg, kind = 'info') => {
    setToast({ msg, kind, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const updateProfile = useCallback((p) => {
    setProfile((prev) => {
      if (prev && p.coins !== prev.coins) setCoinFlash({ delta: p.coins - prev.coins, key: Date.now() });
      return { ...prev, ...p };
    });
  }, []);

  const setCoins = useCallback((coins) => updateProfile({ coins }), [updateProfile]);

  useEffect(() => {
    api.get('/api/profile').then((p) => {
      setProfile(p);
      if (p.allowanceGranted) notify(`Daily allowance: +${p.allowanceGranted} coins`, 'good');
    }).catch((e) => notify(e.message, 'bad'));
    const check = () => api.get('/api/status').then((s) => setOllama(s.ollama)).catch(() => {});
    check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, [notify]);

  useEffect(() => {
    try { localStorage.setItem('tab', tab); } catch { /* storage unavailable */ }
    if (window.location.hash.slice(1) !== tab) window.history.replaceState(null, '', `#${tab}`);
  }, [tab]);

  if (!profile) return <div className="loading-screen">Loading…</div>;

  const ctx = { profile, updateProfile, setCoins, notify, ollama, goTo: setTab };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Coin size={26} />
          <span>Study Stakes</span>
        </div>
        <nav className="tabs" aria-label="Main">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="wallet">
          <span className="coins" aria-live="polite">
            <Coin size={20} /> {profile.coins.toLocaleString()}
            {coinFlash && (
              <span key={coinFlash.key} className={`coin-flash ${coinFlash.delta > 0 ? 'up' : 'down'}`}>
                {coinFlash.delta > 0 ? '+' : ''}{coinFlash.delta}
              </span>
            )}
          </span>
          <button className="avatar-btn" onClick={() => setTab('shop')} title="Customize avatar">
            <Avatar equipped={profile.equipped} skinTone={profile.skinTone} size={40} />
          </button>
        </div>
      </header>

      {ollama && (!ollama.running || !ollama.modelInstalled) && (
        <div className="banner warn" role="status">
          {!ollama.running ? (
            <>Ollama isn't running, so questions can't be generated or short answers graded. Start it with <code>brew services start ollama</code>.</>
          ) : (
            <>Model <code>{ollama.model}</code> isn't downloaded yet. Run <code>ollama pull {ollama.model}</code>.</>
          )}
        </div>
      )}

      <main className="content">
        {tab === 'study' && <Study {...ctx} />}
        {tab === 'courses' && <Courses {...ctx} />}
        {tab === 'shop' && <Shop {...ctx} />}
        {tab === 'stats' && <Stats {...ctx} />}
      </main>

      {toast && <div key={toast.key} className={`toast ${toast.kind}`} role="status">{toast.msg}</div>}
    </div>
  );
}
