import { useState, useMemo } from 'react'
import type { SlideProps } from '@/types'
import { T } from '@/design/tokens'

const DIMS = [
  { key: 'royalty', label: 'Royalty',   sym: 'R' },
  { key: 'masc',    label: 'Masculine', sym: 'M' },
  { key: 'adult',   label: 'Adult',     sym: 'A' },
  { key: 'power',   label: 'Power',     sym: 'P' },
  { key: 'alive',   label: 'Living',    sym: 'L' },
  { key: 'human',   label: 'Human',     sym: 'H' },
] as const
type DimKey = (typeof DIMS)[number]['key']
const DIM_KEYS = DIMS.map(d => d.key) as DimKey[]

interface WordEntry {
  royalty: number; masc: number; adult: number; power: number; alive: number; human: number
  emoji: string; color: string
}

const WORDS: Record<string, WordEntry> = {
  king:     { royalty:9.5, masc:9.0, adult:9.0, power:9.5, alive:10, human:10, emoji:'👑', color:'#FBBF24' },
  queen:    { royalty:9.5, masc:1.0, adult:9.0, power:9.5, alive:10, human:10, emoji:'👸', color:'#F472B6' },
  man:      { royalty:1.0, masc:9.0, adult:8.0, power:5.0, alive:10, human:10, emoji:'🧔', color:'#60A5FA' },
  woman:    { royalty:1.0, masc:1.0, adult:8.0, power:5.0, alive:10, human:10, emoji:'👩', color:'#C084FC' },
  boy:      { royalty:1.0, masc:8.0, adult:2.0, power:2.0, alive:10, human:10, emoji:'👦', color:'#34D399' },
  girl:     { royalty:1.0, masc:2.0, adult:2.0, power:2.0, alive:10, human:10, emoji:'👧', color:'#FB7185' },
  prince:   { royalty:8.0, masc:8.0, adult:5.0, power:7.0, alive:10, human:10, emoji:'🤴', color:'#FCD34D' },
  princess: { royalty:8.0, masc:2.0, adult:5.0, power:7.0, alive:10, human:10, emoji:'🌸', color:'#F9A8D4' },
  dog:      { royalty:0.0, masc:5.0, adult:6.0, power:3.0, alive:10, human:1.0, emoji:'🐶', color:'#F97316' },
  stone:    { royalty:0.0, masc:5.0, adult:10.0,power:1.0, alive:0.0, human:0.0,emoji:'🪨', color:'#94A3B8' },
}
const WORD_LIST = Object.keys(WORDS)

function getVec(w: string | number[]): number[] {
  if (typeof w !== 'string') return w
  const src = WORDS[w]
  return DIM_KEYS.map(k => src[k])
}

function cosineSim(a: number[], b: number[]) {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0)
  const mA = Math.sqrt(a.reduce((s, v) => s + v * v, 0))
  const mB = Math.sqrt(b.reduce((s, v) => s + v * v, 0))
  return mA && mB ? dot / (mA * mB) : 0
}

function findClosest(vec: number[], exclude: string[] = []) {
  return WORD_LIST
    .filter(w => !exclude.includes(w))
    .map(w => ({ word: w, score: cosineSim(vec, getVec(w)) }))
    .sort((a, b) => b.score - a.score)[0]
}

type RadarEntry = { word?: string; vec?: number[]; color: string; alpha?: number }

function Radar({ entries, size = 200 }: { entries: RadarEntry[]; size?: number }) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 34
  const n = DIMS.length
  const angles = DIMS.map((_, i) => (i * 2 * Math.PI / n) - Math.PI / 2)

  const pts = (values: number[]) =>
    values.map((v, i) => {
      const d = (Math.max(0, Math.min(10, v)) / 10) * R
      return `${(cx + d * Math.cos(angles[i])).toFixed(1)},${(cy + d * Math.sin(angles[i])).toFixed(1)}`
    }).join(' ')

  const gridLevels = [0.25, 0.5, 0.75, 1]
  const gridVec = Array(n).fill(10)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        {entries.map(({ color }, i) => (
          <radialGradient key={i} id={`rg${i}s${size}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.04" />
          </radialGradient>
        ))}
      </defs>

      {gridLevels.map(lv => (
        <polygon key={lv} points={pts(gridVec.map(v => v * lv))}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}

      {angles.map((a, i) => (
        <line key={i} x1={cx} y1={cy}
          x2={(cx + R * Math.cos(a)).toFixed(1)}
          y2={(cy + R * Math.sin(a)).toFixed(1)}
          stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      ))}

      {entries.map(({ word, vec, color, alpha = 1 }, ei) => {
        const values = word ? getVec(word) : vec!
        return (
          <g key={ei}>
            <polygon points={pts(values)}
              fill={`url(#rg${ei}s${size})`}
              stroke={color} strokeWidth="2" opacity={alpha}
              style={{ transition:'all 0.55s cubic-bezier(0.34,1.56,0.64,1)' }} />
            {values.map((v, j) => {
              const d = (Math.max(0, Math.min(10, v)) / 10) * R
              return (
                <circle key={j}
                  cx={(cx + d * Math.cos(angles[j])).toFixed(1)}
                  cy={(cy + d * Math.sin(angles[j])).toFixed(1)}
                  r="3" fill={color} opacity={alpha}
                  style={{ transition:'all 0.55s ease' }} />
              )
            })}
          </g>
        )
      })}

      {DIMS.map((dim, i) => {
        const a = angles[i]
        const lx = (cx + (R + 24) * Math.cos(a)).toFixed(1)
        const ly = (cy + (R + 24) * Math.sin(a)).toFixed(1)
        return (
          <text key={dim.key} x={lx} y={ly}
            textAnchor="middle" dominantBaseline="middle"
            fill="rgba(255,255,255,0.42)" fontSize="9"
            fontFamily="'JetBrains Mono', monospace">
            {dim.label}
          </text>
        )
      })}
    </svg>
  )
}

function DimBars({ word, color }: { word: string; color: string }) {
  const vec = getVec(word)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'7px', flex:1, minWidth:0 }}>
      {DIMS.map((dim, i) => (
        <div key={dim.key}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
            <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.5)', fontFamily:'JetBrains Mono, monospace' }}>
              {dim.sym}· {dim.label}
            </span>
            <span style={{ fontSize:'11px', color, fontFamily:'JetBrains Mono, monospace', fontWeight:700 }}>
              {vec[i].toFixed(1)}
            </span>
          </div>
          <div style={{ height:'6px', background:'rgba(255,255,255,0.06)', borderRadius:'3px', overflow:'hidden' }}>
            <div style={{
              height:'100%', width:`${vec[i] * 10}%`, background:color, borderRadius:'3px',
              transition:'width 0.55s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow:`0 0 8px ${color}55`,
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function WordChip({ word, selected, onClick }: { word: string; selected: boolean; onClick: () => void }) {
  const w = WORDS[word]
  return (
    <button onClick={onClick} style={{
      padding:'5px 11px', borderRadius:'20px',
      border: selected ? `1.5px solid ${w.color}` : '1.5px solid rgba(255,255,255,0.1)',
      background: selected ? `${w.color}22` : 'rgba(255,255,255,0.03)',
      color: selected ? w.color : 'rgba(255,255,255,0.55)',
      cursor:'pointer', fontSize:'12px', fontFamily:'JetBrains Mono, monospace',
      transition:'all 0.2s', whiteSpace:'nowrap',
    }}>
      {w.emoji} {word}
    </button>
  )
}

function WordSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const w = WORDS[value]
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      background:T.surface, border:`1.5px solid ${w.color}55`, borderRadius:'8px',
      color:w.color, padding:'6px 10px', fontFamily:'JetBrains Mono, monospace', fontSize:'13px',
      cursor:'pointer', outline:'none',
    }}>
      {WORD_LIST.map(x => (
        <option key={x} value={x}>{WORDS[x].emoji} {x}</option>
      ))}
    </select>
  )
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding:'7px 14px', background:'transparent', border:'none',
      borderBottom: active ? `2px solid ${T.accent}` : '2px solid transparent',
      color: active ? T.accent : 'rgba(255,255,255,0.38)',
      cursor:'pointer', fontSize:'12px', fontFamily:'JetBrains Mono, monospace',
      transition:'all 0.2s', whiteSpace:'nowrap',
    }}>
      {label}
    </button>
  )
}

const card: React.CSSProperties = {
  background:'rgba(255,255,255,0.03)',
  border:`1px solid ${T.border}`,
  borderRadius:'12px',
  padding:'12px',
}

function ExploreTab({ selected, setSelected }: { selected: string; setSelected: (s: string) => void }) {
  const w = WORDS[selected]
  const simList = WORD_LIST
    .filter(x => x !== selected)
    .map(x => ({ word: x, score: cosineSim(getVec(selected), getVec(x)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
      <div style={{ fontSize:'12px', color:T.textDim, lineHeight:1.6 }}>
        AI gives every word a hidden{' '}
        <span style={{ color:T.accent }}>recipe</span> — a list of numbers, one per dimension.
        Pick any word to see its fingerprint.
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
        {WORD_LIST.map(word => (
          <WordChip key={word} word={word} selected={selected === word} onClick={() => setSelected(word)} />
        ))}
      </div>

      <div style={{ ...card, display:'flex', gap:'14px', alignItems:'center' }}>
        <Radar entries={[{ word: selected, color: w.color }]} size={180} />
        <DimBars word={selected} color={w.color} />
      </div>

      <div style={card}>
        <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.35)', marginBottom:'8px', fontFamily:'JetBrains Mono, monospace', letterSpacing:'1px' }}>
          NEAREST WORDS TO "{selected.toUpperCase()}"
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
          {simList.map(({ word, score }) => (
            <div key={word} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ fontSize:'12px', fontFamily:'JetBrains Mono, monospace', color:WORDS[word].color, width:'82px', flexShrink:0 }}>
                {WORDS[word].emoji} {word}
              </span>
              <div style={{ flex:1, height:'5px', background:'rgba(255,255,255,0.05)', borderRadius:'3px' }}>
                <div style={{
                  height:'100%', width:`${score * 100}%`, background:WORDS[word].color,
                  borderRadius:'3px', transition:'width 0.45s ease',
                  boxShadow:`0 0 6px ${WORDS[word].color}44`,
                }} />
              </div>
              <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', fontFamily:'JetBrains Mono, monospace', width:'36px', textAlign:'right' }}>
                {(score * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CompareTab({ a, b, setA, setB }: { a: string; b: string; setA: (v: string) => void; setB: (v: string) => void }) {
  const wA = WORDS[a], wB = WORDS[b]
  const vecA = getVec(a), vecB = getVec(b)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
      <div style={{ fontSize:'12px', color:T.textDim, lineHeight:1.6 }}>
        Similar meanings have{' '}
        <span style={{ color:T.accent }}>similar-shaped fingerprints</span>.
        Overlapping polygons = close in meaning-space.
      </div>

      <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
        <WordSelect value={a} onChange={setA} />
        <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'14px' }}>vs</span>
        <WordSelect value={b} onChange={setB} />
      </div>

      <div style={{ ...card, display:'flex', justifyContent:'center' }}>
        <Radar entries={[
          { word: a, color: wA.color, alpha: 0.85 },
          { word: b, color: wB.color, alpha: 0.85 },
        ]} size={220} />
      </div>

      <div style={card}>
        <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.35)', marginBottom:'10px', fontFamily:'JetBrains Mono, monospace', letterSpacing:'1px' }}>
          DIMENSION BY DIMENSION
        </div>
        {DIMS.map((dim, i) => {
          const diff = Math.abs(vecA[i] - vecB[i])
          return (
            <div key={dim.key} style={{ marginBottom:'9px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.45)', fontFamily:'JetBrains Mono, monospace' }}>
                  {dim.sym}· {dim.label}
                </span>
                <span style={{ fontSize:'10px', fontFamily:'JetBrains Mono, monospace',
                  color: diff > 4 ? '#FB7185' : diff > 1.5 ? '#FBBF24' : '#4ADE80' }}>
                  {diff < 0.5 ? 'identical ✓' : diff > 4 ? `big diff (${diff.toFixed(1)})` : `slight diff (${diff.toFixed(1)})`}
                </span>
              </div>
              <div style={{ display:'flex', gap:'4px', marginBottom:'3px' }}>
                {[{ vec: vecA, color: wA.color }, { vec: vecB, color: wB.color }].map((x, xi) => (
                  <div key={xi} style={{ flex:1, height:'8px', background:'rgba(255,255,255,0.05)', borderRadius:'4px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${x.vec[i] * 10}%`, background:x.color, borderRadius:'4px', opacity:0.85, transition:'width 0.4s ease' }} />
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:'4px' }}>
                <span style={{ flex:1, fontSize:'10px', color:wA.color, fontFamily:'JetBrains Mono, monospace' }}>{wA.emoji} {vecA[i].toFixed(1)}</span>
                <span style={{ flex:1, fontSize:'10px', color:wB.color, fontFamily:'JetBrains Mono, monospace' }}>{wB.emoji} {vecB[i].toFixed(1)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MagicTab({ mathA, mathB, mathC, setMathA, setMathB, setMathC }: {
  mathA: string; mathB: string; mathC: string
  setMathA: (v: string) => void; setMathB: (v: string) => void; setMathC: (v: string) => void
}) {
  const { mathVec, closest } = useMemo(() => {
    const a = getVec(mathA), b = getVec(mathB), c = getVec(mathC)
    const mv = a.map((v, i) => Math.max(0, Math.min(10, v - b[i] + c[i])))
    return { mathVec: mv, closest: findClosest(mv, [mathA, mathB, mathC]) }
  }, [mathA, mathB, mathC])

  const rw = closest.word

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
      <div style={{ fontSize:'12px', color:T.textDim, lineHeight:1.6 }}>
        Because words are numbers, we can do{' '}
        <span style={{ color:T.accent }}>arithmetic</span> on them — subtract one fingerprint,
        add another, land on a different word.
      </div>

      <div style={{ ...card, display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', justifyContent:'center' }}>
        <WordSelect value={mathA} onChange={setMathA} />
        <span style={{ fontSize:'22px', color:'#FB7185', fontWeight:300, lineHeight:1 }}>−</span>
        <WordSelect value={mathB} onChange={setMathB} />
        <span style={{ fontSize:'22px', color:'#4ADE80', fontWeight:300, lineHeight:1 }}>+</span>
        <WordSelect value={mathC} onChange={setMathC} />
        <span style={{ fontSize:'22px', color:'rgba(255,255,255,0.25)', lineHeight:1 }}>=</span>
      </div>

      <div style={{ ...card, textAlign:'center', borderColor:`${WORDS[rw].color}44`, background:`${WORDS[rw].color}09` }}>
        <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.35)', fontFamily:'JetBrains Mono, monospace', letterSpacing:'1px', marginBottom:'6px' }}>
          CLOSEST MATCH
        </div>
        <div style={{ fontSize:'40px', marginBottom:'2px' }}>{WORDS[rw].emoji}</div>
        <div style={{ fontSize:'24px', fontWeight:800, color:WORDS[rw].color, fontFamily:'JetBrains Mono, monospace', letterSpacing:'-0.5px' }}>
          {rw}
        </div>
        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'3px', fontFamily:'JetBrains Mono, monospace' }}>
          {(closest.score * 100).toFixed(1)}% match
        </div>
      </div>

      <div style={{ ...card, display:'flex', gap:'12px', flexWrap:'wrap' }}>
        <div style={{ flex:'1 1 150px' }}>
          <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.35)', fontFamily:'JetBrains Mono, monospace', marginBottom:'6px', textAlign:'center', letterSpacing:'0.5px' }}>
            RESULT vs {rw.toUpperCase()}
          </div>
          <div style={{ display:'flex', justifyContent:'center' }}>
            <Radar entries={[
              { vec: mathVec, color:'#818CF8', alpha:0.9 },
              { word: rw, color:WORDS[rw].color, alpha:0.7 },
            ]} size={160} />
          </div>
        </div>
        <div style={{ flex:'1 1 150px' }}>
          <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.35)', fontFamily:'JetBrains Mono, monospace', marginBottom:'8px', letterSpacing:'0.5px' }}>
            THE MATH, STEP BY STEP
          </div>
          {DIMS.map((dim) => {
            const a = WORDS[mathA][dim.key], b = WORDS[mathB][dim.key], c = WORDS[mathC][dim.key]
            const res = Math.max(0, Math.min(10, a - b + c))
            return (
              <div key={dim.key} style={{ marginBottom:'6px' }}>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.4)', fontFamily:'JetBrains Mono, monospace', marginBottom:'2px' }}>{dim.label}</div>
                <div style={{ fontSize:'11px', fontFamily:'JetBrains Mono, monospace' }}>
                  <span style={{ color:WORDS[mathA].color }}>{a.toFixed(1)}</span>
                  <span style={{ color:'#FB7185' }}> − </span>
                  <span style={{ color:WORDS[mathB].color }}>{b.toFixed(1)}</span>
                  <span style={{ color:'#4ADE80' }}> + </span>
                  <span style={{ color:WORDS[mathC].color }}>{c.toFixed(1)}</span>
                  <span style={{ color:'rgba(255,255,255,0.3)' }}> = </span>
                  <span style={{ color:'#818CF8', fontWeight:'bold' }}>{res.toFixed(1)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.35)', fontFamily:'JetBrains Mono, monospace', letterSpacing:'1px', marginBottom:'8px' }}>
          CLASSIC EXAMPLES
        </div>
        {[
          { a:'king',  b:'man', c:'woman', label:'👑 king  −  🧔 man  +  👩 woman  =  ?' },
          { a:'prince',b:'boy', c:'girl',  label:'🤴 prince  −  👦 boy  +  👧 girl  =  ?' },
        ].map(({ a, b, c, label }) => (
          <button key={label} onClick={() => { setMathA(a); setMathB(b); setMathC(c) }}
            style={{
              display:'block', width:'100%', marginBottom:'6px',
              background:`${T.accent}0e`, border:`1px solid ${T.accent}30`,
              borderRadius:'7px', color:T.accent, padding:'8px 12px',
              cursor:'pointer', fontFamily:'JetBrains Mono, monospace', fontSize:'12px',
              textAlign:'left',
            }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function WordDimensions({ isActive: _isActive }: SlideProps) {
  const [tab, setTab] = useState<'explore' | 'compare' | 'magic'>('explore')
  const [selected, setSelected] = useState('king')
  const [cmpA, setCmpA] = useState('king')
  const [cmpB, setCmpB] = useState('queen')
  const [mathA, setMathA] = useState('king')
  const [mathB, setMathB] = useState('man')
  const [mathC, setMathC] = useState('woman')

  return (
    <div style={{
      width:'100%', height:'100%', background:T.bg, color:T.text,
      fontFamily:"'Inter', system-ui, sans-serif",
      display:'flex', flexDirection:'column', overflow:'hidden',
    }}>
      <div style={{ padding:'16px 20px 0', borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
        <h1 style={{
          margin:'0 0 2px', fontSize:'18px', fontWeight:800, letterSpacing:'-0.3px',
          background:`linear-gradient(100deg, ${T.accent} 0%, ${T.highlight} 100%)`,
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
        }}>
          How Words Become Numbers
        </h1>
        <p style={{ margin:'0 0 10px', fontSize:'11px', color:T.textDim, fontFamily:'JetBrains Mono, monospace' }}>
          The secret behind AI understanding language
        </p>
        <div style={{ display:'flex', overflowX:'auto' }}>
          <TabBtn label="① The Fingerprint" active={tab==='explore'} onClick={() => setTab('explore')} />
          <TabBtn label="② Side by Side"    active={tab==='compare'} onClick={() => setTab('compare')} />
          <TabBtn label="③ Word Math"       active={tab==='magic'}   onClick={() => setTab('magic')} />
        </div>
      </div>

      <div style={{ padding:'14px 20px', flex:1, minHeight:0, overflowY:'auto' }}>
        {tab === 'explore' && <ExploreTab selected={selected} setSelected={setSelected} />}
        {tab === 'compare' && <CompareTab a={cmpA} b={cmpB} setA={setCmpA} setB={setCmpB} />}
        {tab === 'magic'   && (
          <MagicTab mathA={mathA} mathB={mathB} mathC={mathC}
            setMathA={setMathA} setMathB={setMathB} setMathC={setMathC} />
        )}
      </div>
    </div>
  )
}
