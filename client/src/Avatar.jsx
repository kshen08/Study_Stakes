import React, { useId } from 'react';

// Layered SVG avatar. viewBox is 200x200; head centered at (100, 95), r=42.
// Layer order: background → shirt → neck/head → hair → glasses → hat → pet.

const TORSO = 'M34 200 C34 162 58 148 100 148 C142 148 166 162 166 200 Z';

function Background({ id, uid }) {
  switch (id) {
    case 'bg_sunset':
      return (
        <>
          <defs>
            <linearGradient id={`${uid}sun`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff8a7a" />
              <stop offset="0.55" stopColor="#ffc46b" />
              <stop offset="1" stopColor="#ffe6a3" />
            </linearGradient>
          </defs>
          <rect width="200" height="200" fill={`url(#${uid}sun)`} />
          <circle cx="40" cy="150" r="26" fill="#fff3c4" opacity="0.85" />
          <path d="M0 168 Q50 152 100 166 T200 160 V200 H0Z" fill="#e8806a" opacity="0.55" />
        </>
      );
    case 'bg_library':
      return (
        <>
          <rect width="200" height="200" fill="#8a5a3b" />
          {[28, 92, 156].map((y) => (
            <g key={y}>
              <rect x="0" y={y + 40} width="200" height="6" fill="#5e3b24" />
              {Array.from({ length: 14 }, (_, i) => {
                const colors = ['#c0392b', '#2e86de', '#27ae60', '#f1c40f', '#8e44ad', '#e67e22', '#16a085'];
                const h = 28 + ((i * 7 + y) % 12);
                return <rect key={i} x={4 + i * 14} y={y + 40 - h} width="11" height={h} rx="1.5" fill={colors[(i + y) % colors.length]} opacity="0.9" />;
              })}
            </g>
          ))}
          <rect width="200" height="200" fill="#3b2412" opacity="0.25" />
        </>
      );
    case 'bg_night':
      return (
        <>
          <defs>
            <linearGradient id={`${uid}night`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#141a45" />
              <stop offset="1" stopColor="#3a3f8f" />
            </linearGradient>
          </defs>
          <rect width="200" height="200" fill={`url(#${uid}night)`} />
          {[[20, 20], [60, 35], [170, 25], [150, 60], [30, 70], [180, 110], [15, 130], [120, 15], [90, 40]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.8 : 1.1} fill="#fff" opacity="0.9" />
          ))}
          <circle cx="160" cy="38" r="14" fill="#fdf6d8" />
          <circle cx="166" cy="33" r="12" fill="#1b2150" />
        </>
      );
    case 'bg_galaxy':
      return (
        <>
          <defs>
            <radialGradient id={`${uid}gal`} cx="0.35" cy="0.3" r="0.9">
              <stop offset="0" stopColor="#c86dd7" />
              <stop offset="0.45" stopColor="#5b2a86" />
              <stop offset="1" stopColor="#120a2a" />
            </radialGradient>
          </defs>
          <rect width="200" height="200" fill={`url(#${uid}gal)`} />
          {Array.from({ length: 26 }, (_, i) => (
            <circle key={i} cx={(i * 73) % 200} cy={(i * 41) % 200} r={i % 4 === 0 ? 1.8 : 1} fill="#fff" opacity={0.5 + (i % 3) * 0.2} />
          ))}
          <circle cx="36" cy="40" r="14" fill="#ffb86b" />
          <ellipse cx="36" cy="40" rx="24" ry="6" fill="none" stroke="#ffe0b0" strokeWidth="2.5" transform="rotate(-20 36 40)" />
        </>
      );
    case 'bg_sky':
    default:
      return (
        <>
          <defs>
            <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#a9d8ff" />
              <stop offset="1" stopColor="#e8f5ff" />
            </linearGradient>
          </defs>
          <rect width="200" height="200" fill={`url(#${uid}sky)`} />
          <g fill="#fff" opacity="0.9">
            <ellipse cx="38" cy="38" rx="20" ry="9" />
            <ellipse cx="52" cy="32" rx="14" ry="9" />
            <ellipse cx="160" cy="58" rx="18" ry="8" />
            <ellipse cx="172" cy="53" rx="11" ry="7" />
          </g>
        </>
      );
  }
}

function Shirt({ id, uid }) {
  switch (id) {
    case 'shirt_stripes':
      return (
        <>
          <defs>
            <clipPath id={`${uid}torso`}><path d={TORSO} /></clipPath>
          </defs>
          <path d={TORSO} fill="#fdfdfd" />
          <g clipPath={`url(#${uid}torso)`}>
            {[152, 166, 180, 194].map((y) => <rect key={y} x="0" y={y} width="200" height="7" fill="#e74c3c" />)}
          </g>
          <path d="M84 149 Q100 164 116 149" fill="none" stroke="#c0392b" strokeWidth="3" />
        </>
      );
    case 'shirt_hoodie':
      return (
        <>
          <path d={TORSO} fill="#6f8f80" />
          <path d="M70 152 Q100 176 130 152 Q122 144 100 144 Q78 144 70 152Z" fill="#5a7768" />
          <line x1="92" y1="160" x2="90" y2="182" stroke="#e8e8e8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="108" y1="160" x2="110" y2="182" stroke="#e8e8e8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M72 200 Q74 184 100 184 Q126 184 128 200" fill="#5f7f70" />
        </>
      );
    case 'shirt_labcoat':
      return (
        <>
          <path d={TORSO} fill="#f6f7f9" stroke="#d5d9e0" strokeWidth="1.5" />
          <path d="M86 149 L100 182 L114 149 Z" fill="#7fb3e8" />
          <path d="M86 149 L100 182 L92 200 L78 160Z" fill="#e9ecf1" stroke="#cfd4dc" strokeWidth="1" />
          <path d="M114 149 L100 182 L108 200 L122 160Z" fill="#e9ecf1" stroke="#cfd4dc" strokeWidth="1" />
          <rect x="128" y="172" width="16" height="14" rx="2" fill="none" stroke="#cfd4dc" strokeWidth="1.5" />
          <rect x="132" y="166" width="3" height="12" rx="1" fill="#2e6fd8" />
        </>
      );
    case 'shirt_tux':
      return (
        <>
          <path d={TORSO} fill="#1f2128" />
          <path d="M84 149 L100 196 L116 149 Z" fill="#fff" />
          <path d="M84 149 L100 196 L88 200 L72 160Z" fill="#2c2f38" />
          <path d="M116 149 L100 196 L112 200 L128 160Z" fill="#2c2f38" />
          <path d="M90 156 L100 161 L110 156 L110 166 L100 161 L90 166Z" fill="#c0392b" />
          <circle cx="100" cy="175" r="1.8" fill="#1f2128" />
          <circle cx="100" cy="185" r="1.8" fill="#1f2128" />
        </>
      );
    case 'shirt_tee':
    default:
      return (
        <>
          <path d={TORSO} fill="#4f86f7" />
          <path d="M84 149 Q100 164 116 149" fill="none" stroke="#3a6fd8" strokeWidth="3" />
        </>
      );
  }
}

function Hat({ id, uid }) {
  switch (id) {
    case 'hat_cap':
      return (
        <>
          <path d="M57 78 Q57 44 100 44 Q143 44 143 78 Z" fill="#e0453a" />
          <path d="M120 76 Q160 72 172 82 Q150 86 118 82Z" fill="#b8352c" />
          <circle cx="100" cy="45" r="3" fill="#b8352c" />
          <path d="M100 46 L100 78" stroke="#b8352c" strokeWidth="1.5" opacity="0.6" />
        </>
      );
    case 'hat_beanie':
      return (
        <>
          <path d="M58 76 Q56 36 100 36 Q144 36 142 76 Z" fill="#2c4a7a" />
          <rect x="54" y="68" width="92" height="14" rx="6" fill="#20375c" />
          {Array.from({ length: 10 }, (_, i) => <line key={i} x1={60 + i * 9} y1="70" x2={60 + i * 9} y2="80" stroke="#2c4a7a" strokeWidth="2" />)}
          <circle cx="100" cy="33" r="9" fill="#f2f2f2" />
        </>
      );
    case 'hat_party':
      return (
        <g transform="rotate(-12 100 60)">
          <defs>
            <clipPath id={`${uid}party`}><path d="M74 64 L102 8 L130 64Z" /></clipPath>
          </defs>
          <path d="M74 64 L102 8 L130 64Z" fill="#ff5fa2" />
          <g clipPath={`url(#${uid}party)`}>
            {[22, 38, 54].map((y) => <rect key={y} x="60" y={y} width="80" height="6" fill="#ffd34f" />)}
          </g>
          <circle cx="102" cy="8" r="7" fill="#4fc3f7" />
        </g>
      );
    case 'hat_grad':
      return (
        <>
          <path d="M68 62 Q68 76 100 78 Q132 76 132 62 L132 54 L68 54Z" fill="#1d1d24" />
          <path d="M100 30 L160 50 L100 70 L40 50Z" fill="#2a2a33" />
          <circle cx="100" cy="50" r="3" fill="#f5b301" />
          <path d="M100 50 L146 58 L146 80" fill="none" stroke="#f5b301" strokeWidth="2.5" />
          <path d="M142 78 L150 78 L148 92 L144 92Z" fill="#f5b301" />
        </>
      );
    case 'hat_wizard':
      return (
        <>
          <path d="M66 66 Q96 40 104 -2 Q118 30 138 66Z" fill="#5b3fbf" />
          <ellipse cx="100" cy="68" rx="52" ry="10" fill="#4a32a0" />
          <path d="M92 40 l3 6 6 1 -5 4 1 6 -5 -3 -5 3 1 -6 -5 -4 6 -1z" fill="#ffd54f" />
          <circle cx="114" cy="22" r="2.5" fill="#ffd54f" />
          <circle cx="118" cy="52" r="2" fill="#ffd54f" />
        </>
      );
    case 'hat_crown':
      return (
        <>
          <path d="M62 70 L58 30 L80 50 L100 22 L120 50 L142 30 L138 70Z" fill="#f5c518" stroke="#c99a06" strokeWidth="2" strokeLinejoin="round" />
          <rect x="62" y="62" width="76" height="10" rx="2" fill="#e0b000" />
          <circle cx="100" cy="46" r="5" fill="#e53935" />
          <circle cx="78" cy="58" r="3.5" fill="#1e88e5" />
          <circle cx="122" cy="58" r="3.5" fill="#43a047" />
          <circle cx="58" cy="30" r="3" fill="#f5c518" />
          <circle cx="100" cy="22" r="3" fill="#f5c518" />
          <circle cx="142" cy="30" r="3" fill="#f5c518" />
        </>
      );
    default:
      return null;
  }
}

function Glasses({ id }) {
  switch (id) {
    case 'glasses_round':
      return (
        <g fill="none" stroke="#3b2f2f" strokeWidth="2.5">
          <circle cx="84" cy="95" r="11" fill="#ffffff" fillOpacity="0.15" />
          <circle cx="116" cy="95" r="11" fill="#ffffff" fillOpacity="0.15" />
          <path d="M95 94 Q100 90 105 94" />
          <path d="M73 93 L60 90 M127 93 L140 90" />
        </g>
      );
    case 'glasses_3d':
      return (
        <g>
          <rect x="68" y="85" width="64" height="20" rx="3" fill="#fafafa" stroke="#333" strokeWidth="1.5" />
          <rect x="72" y="88" width="24" height="14" rx="2" fill="#e53935" opacity="0.75" />
          <rect x="104" y="88" width="24" height="14" rx="2" fill="#26c6da" opacity="0.75" />
          <path d="M68 92 L58 89 M132 92 L142 89" stroke="#333" strokeWidth="2" />
        </g>
      );
    case 'glasses_shades':
      return (
        <g>
          <path d="M70 88 H96 Q97 104 84 104 Q71 104 70 88Z" fill="#111" />
          <path d="M104 88 H130 Q129 104 116 104 Q103 104 104 88Z" fill="#111" />
          <path d="M66 88 H134" stroke="#111" strokeWidth="3" />
          <path d="M76 92 L82 92" stroke="#fff" strokeWidth="2" opacity="0.5" strokeLinecap="round" />
        </g>
      );
    case 'glasses_monocle':
      return (
        <g fill="none" stroke="#c99a06" strokeWidth="2.5">
          <circle cx="116" cy="95" r="12" fill="#ffffff" fillOpacity="0.2" />
          <path d="M126 102 Q134 130 120 150" strokeWidth="1.5" />
        </g>
      );
    default:
      return null;
  }
}

function Pet({ id }) {
  // Pets sit in the bottom-right corner.
  switch (id) {
    case 'pet_duck':
      return (
        <g transform="translate(150 160)">
          <ellipse cx="18" cy="26" rx="22" ry="14" fill="#ffd31a" />
          <circle cx="26" cy="8" r="11" fill="#ffd31a" />
          <path d="M35 8 L46 11 L35 14Z" fill="#ff8a00" />
          <circle cx="29" cy="5" r="2" fill="#222" />
          <path d="M4 24 Q14 18 22 26" fill="none" stroke="#e6b800" strokeWidth="2" />
        </g>
      );
    case 'pet_cat':
      return (
        <g transform="translate(146 140)">
          <path d="M46 52 Q62 40 54 24" fill="none" stroke="#f08c3a" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="28" cy="44" rx="20" ry="16" fill="#f5a04a" />
          <circle cx="28" cy="20" r="15" fill="#f5a04a" />
          <path d="M15 12 L14 -2 L24 8Z M41 12 L42 -2 L32 8Z" fill="#f5a04a" />
          <circle cx="22" cy="19" r="2.2" fill="#222" />
          <circle cx="34" cy="19" r="2.2" fill="#222" />
          <path d="M26 25 L28 27 L30 25" fill="none" stroke="#7a3d12" strokeWidth="1.5" />
          <path d="M20 40 L24 50 M28 38 L28 50 M36 40 L32 50" stroke="#e0853a" strokeWidth="2" />
        </g>
      );
    case 'pet_owl':
      return (
        <g transform="translate(148 132)">
          <path d="M8 10 L14 0 L20 8 M36 8 L42 0 L48 10" fill="#7a5233" />
          <ellipse cx="28" cy="36" rx="22" ry="28" fill="#8d6240" />
          <ellipse cx="28" cy="46" rx="14" ry="16" fill="#d9b48a" />
          <circle cx="19" cy="22" r="9" fill="#fff" />
          <circle cx="37" cy="22" r="9" fill="#fff" />
          <circle cx="19" cy="22" r="4" fill="#222" />
          <circle cx="37" cy="22" r="4" fill="#222" />
          <path d="M25 29 L28 35 L31 29Z" fill="#f5a623" />
        </g>
      );
    case 'pet_dragon':
      return (
        <g transform="translate(132 130)">
          <path d="M22 34 Q2 14 6 40 Q12 38 22 44Z" fill="#2fa36b" />
          <path d="M44 52 Q66 60 60 40" fill="none" stroke="#3cbf7f" strokeWidth="6" strokeLinecap="round" />
          <path d="M60 40 L66 34 L62 44Z" fill="#2fa36b" />
          <ellipse cx="34" cy="48" rx="18" ry="16" fill="#3cbf7f" />
          <ellipse cx="34" cy="52" rx="10" ry="10" fill="#bdf0c9" />
          <circle cx="36" cy="22" r="14" fill="#3cbf7f" />
          <path d="M28 10 L26 0 L33 9 M42 9 L46 0 L46 11" fill="#f5d76e" />
          <circle cx="40" cy="20" r="3" fill="#222" />
          <circle cx="41" cy="19" r="1" fill="#fff" />
          <circle cx="47" cy="27" r="1.2" fill="#1f7a4d" />
        </g>
      );
    default:
      return null;
  }
}

export default function Avatar({ equipped = {}, skinTone = '#eebb8f', size = 160, className = '', title = 'Your avatar' }) {
  const uid = useId().replace(/:/g, '');
  const hasHat = !!equipped.hat;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={`avatar ${className}`} role="img" aria-label={title}>
      <defs>
        <clipPath id={`${uid}frame`}><rect width="200" height="200" rx="24" /></clipPath>
      </defs>
      <g clipPath={`url(#${uid}frame)`}>
        <Background id={equipped.background} uid={uid} />
        <Shirt id={equipped.shirt} uid={uid} />
        <rect x="88" y="124" width="24" height="28" rx="8" fill={skinTone} />
        <circle cx="58" cy="98" r="8" fill={skinTone} />
        <circle cx="142" cy="98" r="8" fill={skinTone} />
        <circle cx="100" cy="95" r="42" fill={skinTone} />
        {!hasHat && <path d="M58 92 Q56 50 100 50 Q144 50 142 92 Q134 70 112 66 Q104 74 88 70 Q66 72 58 92Z" fill="#3a2a20" />}
        {hasHat && <path d="M58 92 Q58 80 64 74 L136 74 Q142 80 142 92 Q132 80 100 80 Q68 80 58 92Z" fill="#3a2a20" />}
        <circle cx="84" cy="95" r="4.5" fill="#2a2220" />
        <circle cx="116" cy="95" r="4.5" fill="#2a2220" />
        <circle cx="85.5" cy="93.5" r="1.4" fill="#fff" />
        <circle cx="117.5" cy="93.5" r="1.4" fill="#fff" />
        <circle cx="74" cy="110" r="6" fill="#ff8a80" opacity="0.35" />
        <circle cx="126" cy="110" r="6" fill="#ff8a80" opacity="0.35" />
        <path d="M89 112 Q100 122 111 112" fill="none" stroke="#2a2220" strokeWidth="3" strokeLinecap="round" />
        <Glasses id={equipped.glasses} />
        <Hat id={equipped.hat} uid={uid} />
        <Pet id={equipped.pet} />
      </g>
    </svg>
  );
}
