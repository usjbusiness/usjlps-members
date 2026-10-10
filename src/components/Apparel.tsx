// Product renders for LPS apparel (vector, so they stay sharp on every screen).
export const COLORS = {
  black: { name: 'Black', body: '#242424', shade: '#0b0b0b', line: '#4d4d4d', mono: '/img/mono-gold.webp', note: 'Gold monogram' },
  ivy: { name: 'Ivy Green', body: '#1C5743', shade: '#0A2A20', line: '#3A7D66', mono: '/img/mono-gold.webp', note: 'Gold monogram' },
  white: { name: 'White', body: '#F4F1EA', shade: '#CFC8BA', line: '#DCD5C7', mono: '/img/mono-ivy.webp', note: 'Ivy monogram' },
} as const
export type ColorKey = keyof typeof COLORS

const POLO = 'M150,38 L95,60 L28,118 L52,186 L93,168 L91,418 Q200,430 309,418 L307,168 L348,186 L372,118 L305,60 L250,38 Q200,52 150,38 Z'

export function Polo({ color = 'black', className = '' }: { color?: ColorKey; className?: string }) {
  const c = COLORS[color]; const id = `polo-${color}`
  return (
    <svg viewBox="0 0 400 440" className={className} role="img" aria-label={`LPS polo, ${c.name}`}>
      <defs>
        <linearGradient id={`${id}-h`} x1="0" x2="1"><stop offset="0" stopColor={c.shade} stopOpacity=".6" /><stop offset=".22" stopColor={c.shade} stopOpacity="0" /><stop offset=".78" stopColor={c.shade} stopOpacity="0" /><stop offset="1" stopColor={c.shade} stopOpacity=".65" /></linearGradient>
        <linearGradient id={`${id}-v`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".13" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".14" /></linearGradient>
        <filter id={`${id}-d`} x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#000" floodOpacity=".45" /></filter>
      </defs>
      <g filter={`url(#${id}-d)`}>
        <path d="M150,38 Q200,64 250,38 L246,30 Q200,46 154,30 Z" fill={c.shade} />
        <path d={POLO} fill={c.body} /><path d={POLO} fill={`url(#${id}-h)`} /><path d={POLO} fill={`url(#${id}-v)`} stroke="rgba(233,212,154,.22)" strokeWidth="1.3" />
      </g>
      <path d="M36,140 L60,130 M364,140 L340,130" stroke={c.line} strokeWidth="2" opacity=".7" />
      <path d="M28,118 L52,186 M372,118 L348,186" stroke={c.shade} strokeWidth="5" opacity=".55" />
      <path d="M93,168 Q100,220 98,260 M307,168 Q300,220 302,260" stroke={c.shade} strokeWidth="2" fill="none" opacity=".4" />
      <path d="M92,404 Q200,418 308,404" stroke={c.line} strokeWidth="1.6" fill="none" opacity=".6" strokeDasharray="3 3" />
      <rect x="189" y="64" width="22" height="98" fill={c.body} stroke={c.line} strokeOpacity=".8" strokeWidth="1.4" />
      {[88, 118, 148].map((y) => <g key={y}><circle cx="200" cy={y} r="4.2" fill={c.line} /><circle cx="200" cy={y} r="1.4" fill={c.shade} /></g>)}
      <path d="M152,36 Q170,62 186,104 L200,70 Z M248,36 Q230,62 214,104 L200,70 Z" fill={c.body} stroke={c.line} strokeOpacity=".9" strokeWidth="1.4" />
      <path d="M152,36 Q170,62 186,104 L200,70 Z" fill={c.shade} opacity=".2" />
      <image href={c.mono} x="258" y="100" width="30" height="52" preserveAspectRatio="xMidYMid meet" />
    </svg>
  )
}

export function Cap({ color = 'black', className = '' }: { color?: ColorKey; className?: string }) {
  const c = COLORS[color]; const id = `cap-${color}`
  return (
    <svg viewBox="0 0 400 320" className={className} role="img" aria-label={`LPS cap, ${c.name}`}>
      <defs>
        <radialGradient id={`${id}-dome`} cx=".42" cy=".3" r=".85"><stop offset="0" stopColor="#fff" stopOpacity=".14" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".35" /></radialGradient>
        <linearGradient id={`${id}-brim`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.shade} /><stop offset=".35" stopColor={c.body} /><stop offset="1" stopColor={c.shade} /></linearGradient>
        <filter id={`${id}-d`} x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="16" stdDeviation="14" floodColor="#000" floodOpacity=".5" /></filter>
      </defs>
      <g filter={`url(#${id}-d)`}>
        <path d="M78,196 C70,108 128,46 204,44 C282,42 336,104 328,196 Z" fill={c.body} />
        <path d="M78,196 C70,108 128,46 204,44 C282,42 336,104 328,196 Z" fill={`url(#${id}-dome)`} stroke="rgba(233,212,154,.22)" strokeWidth="1.3" />
        <path d="M62,198 C110,180 296,178 344,198 C372,214 352,262 300,272 C246,282 160,282 106,272 C54,262 34,214 62,198 Z" fill={`url(#${id}-brim)`} />
      </g>
      <path d="M62,198 C110,180 296,178 344,198" stroke={c.line} strokeWidth="2" fill="none" opacity=".9" />
      <path d="M72,214 C120,196 288,194 334,214" stroke={c.line} strokeWidth="1.2" fill="none" opacity=".6" strokeDasharray="4 4" />
      <path d="M204,46 C186,92 172,140 168,190 M204,46 C222,92 236,140 240,190 M204,46 C150,70 112,124 104,194 M204,46 C258,70 298,124 304,194" stroke={c.shade} strokeWidth="1.6" fill="none" opacity=".55" />
      <path d="M204,46 C186,92 172,140 168,190 M204,46 C222,92 236,140 240,190" stroke={c.line} strokeWidth=".8" fill="none" opacity=".7" strokeDasharray="2 3" transform="translate(4 0)" />
      <ellipse cx="204" cy="45" rx="9" ry="4.5" fill={c.body} stroke={c.line} strokeWidth="1.2" />
      {[[132, 104], [276, 104]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3" fill={c.shade} stroke={c.line} strokeWidth="1" />)}
      <image href={c.mono} x="183" y="84" width="42" height="78" preserveAspectRatio="xMidYMid meet" />
    </svg>
  )
}
