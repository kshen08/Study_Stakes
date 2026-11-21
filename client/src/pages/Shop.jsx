import React, { useState } from 'react';
import { api } from '../api.js';
import Avatar from '../Avatar.jsx';
import { Coin } from '../App.jsx';
import { ITEMS, SLOTS, SLOT_LABELS, RARITIES, SKIN_TONES } from '../../../shared/items.js';

export default function Shop({ profile, updateProfile, notify }) {
  const [slot, setSlot] = useState('hat');
  const [tryOn, setTryOn] = useState(null);
  const owned = new Set(profile.inventory);

  const preview = tryOn ? { ...profile.equipped, [tryOn.slot]: tryOn.id } : profile.equipped;

  const call = async (url, body, msg) => {
    try {
      updateProfile(await api.post(url, body));
      if (msg) notify(msg, 'good');
    } catch (e) {
      notify(e.message, 'bad');
    }
  };

  const buy = (item) => {
    if (profile.coins < item.price) return notify(`You need ${item.price - profile.coins} more coins.`, 'bad');
    if (confirm(`Buy ${item.name} for ${item.price} coins?`)) call('/api/shop/buy', { itemId: item.id }, `Bought ${item.name}!`);
  };

  const items = ITEMS.filter((i) => i.slot === slot);
  const canUnequip = slot !== 'background' && slot !== 'shirt';

  return (
    <div className="shop-layout">
      <aside className="card avatar-panel">
        <Avatar equipped={preview} skinTone={profile.skinTone} size={240} />
        <div className="muted small center">{tryOn ? `Trying on: ${tryOn.name}` : 'Hover an item to try it on'}</div>
        <div>
          <div className="muted small">Skin tone</div>
          <div className="swatches">
            {SKIN_TONES.map((s) => (
              <button key={s} className={`swatch ${profile.skinTone === s ? 'active' : ''}`} style={{ background: s }}
                aria-label={`Skin tone ${s}`} onClick={() => call('/api/profile/skin', { skinTone: s })} />
            ))}
          </div>
        </div>
        <div className="balance-box">
          <span className="muted small">Balance</span>
          <strong><Coin size={20} /> {profile.coins.toLocaleString()}</strong>
        </div>
      </aside>

      <section className="card shop-main">
        <div className="segmented wrap" role="tablist">
          {SLOTS.map((s) => (
            <button key={s} role="tab" aria-selected={slot === s} className={slot === s ? 'active' : ''} onClick={() => setSlot(s)}>{SLOT_LABELS[s]}</button>
          ))}
        </div>

        <div className="item-grid">
          {items.map((item) => {
            const isOwned = owned.has(item.id);
            const isEquipped = profile.equipped[slot] === item.id;
            const rarity = RARITIES[item.rarity];
            return (
              <div key={item.id} className={`item-card ${isEquipped ? 'equipped' : ''}`}
                onMouseEnter={() => setTryOn(item)} onMouseLeave={() => setTryOn(null)} onFocus={() => setTryOn(item)} onBlur={() => setTryOn(null)}>
                <Avatar equipped={{ ...profile.equipped, [slot]: item.id }} skinTone={profile.skinTone} size={120} title={item.name} />
                <div className="item-name">{item.name}</div>
                <div className="rarity small" style={{ '--rarity': rarity.color }}>
                  <span className="rarity-dot" aria-hidden="true" /> {rarity.label}
                </div>
                {isEquipped ? (
                  canUnequip ? (
                    <button className="btn ghost small" onClick={() => call('/api/avatar/equip', { slot, itemId: null })}>Unequip</button>
                  ) : <span className="pill good">Wearing</span>
                ) : isOwned ? (
                  <button className="btn small" onClick={() => call('/api/avatar/equip', { slot, itemId: item.id })}>Equip</button>
                ) : (
                  <button className="btn primary small" onClick={() => buy(item)} disabled={profile.coins < item.price}>
                    <Coin size={14} /> {item.price.toLocaleString()}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
