import { useState, useRef, useCallback, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { SlideProps } from '@/types'
import { T } from '@/design/tokens'

// ─── colours ─────────────────────────────────────────────────────────────────
const Y   = '#eab308'
const YBG = 'rgba(234,179,8,.1)'
const YB  = 'rgba(234,179,8,.3)'

// ─── chart geometry ───────────────────────────────────────────────────────────
const PL = 52, PR = 16, PT = 18, PB = 46
const CW = 500, CH = 260
const MONTHS = 12
const X_EXT  = 15
const YMAX   = 1000
const MAX_PTS = 16
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const scx = (m: number) => PL + (m / X_EXT) * (CW - PL - PR)
const scy = (v: number) => CH - PB - (v / YMAX) * (CH - PT - PB)
const unx  = (s: number) => ((s - PL) / (CW - PL - PR)) * X_EXT
const uny  = (s: number) => ((CH - PB - s) / (CH - PT - PB)) * YMAX

// ─── point type — stable id enables layoutId morphing ────────────────────────
interface Pt { id: number; x: number; y: number }
let _uid = 0
const uid = () => ++_uid

// ─── gradient descent ─────────────────────────────────────────────────────────
function gdLearn(pts: Pt[], slope: number, intercept: number, steps = 1) {
  if (pts.length < 2) return { slope, intercept }
  let m = slope * MONTHS / YMAX, b = intercept / YMAX
  const lr = 0.04, n = pts.length
  for (let s = 0; s < steps; s++) {
    let dm = 0, db = 0
    for (const p of pts) {
      const e = m * (p.x/MONTHS) + b - (p.y/YMAX)
      dm += e * (p.x/MONTHS); db += e
    }
    m -= (2*lr/n)*dm; b -= (2*lr/n)*db
  }
  return { slope: m*YMAX/MONTHS, intercept: b*YMAX }
}

function rmse(pts: Pt[], m: number, b: number) {
  if (!pts.length) return 0
  return Math.sqrt(pts.reduce((a,p) => a + (m*p.x+b-p.y)**2, 0) / pts.length)
}
function sumDist(pts: Pt[], m: number, b: number) {
  return pts.reduce((a,p) => a + Math.abs(m*p.x+b-p.y), 0)
}
function ols(pts: Pt[]) {
  const n = pts.length; if (n < 2) return null
  let sx=0,sy=0,sxy=0,sx2=0
  for (const p of pts) { sx+=p.x;sy+=p.y;sxy+=p.x*p.y;sx2+=p.x*p.x }
  const d = n*sx2-sx*sx; if (Math.abs(d)<1e-6) return null
  const m = (n*sxy-sx*sy)/d
  return { m, b: (sy-m*sx)/n }
}

const INIT_PTS: Pt[] = [
  {id:uid(),x:1,y:140},{id:uid(),x:2,y:215},{id:uid(),x:3,y:260},
  {id:uid(),x:5,y:400},{id:uid(),x:7,y:495},{id:uid(),x:9,y:625},
  {id:uid(),x:11,y:715},{id:uid(),x:12,y:805},
]

const randomLine = () => ({ slope: (Math.random()-0.4)*90, intercept: Math.random()*500+50 })

const SENTENCE = [
  'Large','language','models','predict','the','next',
  'token','using','all','previous','context','in',
  'the','sequence','then','loop','back','to','generate','text',
]

// ─── Part A: intro ────────────────────────────────────────────────────────────
function Intro() {
  const [hovered, setHovered] = useState<'algo'|'model'|null>(null)

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',
              justifyContent:'center',alignItems:'center',gap:32}}>

      <h2 style={{fontSize:'clamp(1.9rem,3.5vw,2.5rem)',fontWeight:800,
                  color:T.text,margin:0,letterSpacing:'-.03em',textAlign:'center'}}>
        Linear Regression
      </h2>

      <p style={{fontSize:15,lineHeight:1.8,color:T.textDim,margin:0,
                 fontFamily:'Inter,sans-serif',textAlign:'center',maxWidth:480}}>
        An{' '}
        <strong style={{color:T.textDim}}>algorithm</strong>
        {' '}to produce a{' '}
        <strong style={{color:Y}}>model</strong>
        , to predict linear trends of{' '}
        <strong style={{color:T.accent}}>data points</strong>.
      </p>

      <div style={{display:'flex',alignItems:'center',gap:0,userSelect:'none'}}>

        {/* 1 · data points */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,width:110}}>
          <svg width={70} height={52} style={{overflow:'visible'}}>
            {[[8,44],[20,30],[34,34],[50,18],[62,24]].map(([cx,cy],i)=>(
              <circle key={i} cx={cx} cy={cy} r={5} fill={T.accent} opacity={.8}/>
            ))}
          </svg>
          <span style={{fontSize:11,color:T.accent,fontFamily:'Inter,sans-serif',fontWeight:600}}>
            data points
          </span>
        </div>

        <svg width={60} height={52}>
          <line x1={4} y1={26} x2={48} y2={26} stroke={T.muted} strokeWidth={1.5} strokeDasharray="4 3"/>
          <polygon points="48,21 58,26 48,31" fill={T.muted}/>
        </svg>

        {/* 2 · algorithm */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,width:110,
                     cursor:'default',position:'relative'}}
          onMouseEnter={() => setHovered('algo')} onMouseLeave={() => setHovered(null)}>
          <svg width={70} height={52} style={{overflow:'visible'}}>
            <path d="M 6 10 Q 35 8 64 44" fill="none" stroke={T.textDim}
                  strokeWidth={1.5} strokeDasharray="3 3"/>
            {[0,.33,.66,1].map(t => {
              const x=6+t*58, y=10+t**2*34+(1-t)*t*(-4)
              return <circle key={t} cx={x} cy={y} r={3} fill={T.textDim} opacity={.5+t*.5}/>
            })}
          </svg>
          <span style={{fontSize:11,color:T.textDim,fontFamily:'Inter,sans-serif',fontWeight:600}}>
            algorithm
          </span>
          <motion.span animate={{opacity:hovered==='algo'?.7:0}} transition={{duration:.15}}
            style={{position:'absolute',top:'100%',marginTop:2,fontSize:10,
                    color:T.textDim,fontFamily:'Inter,sans-serif',
                    textAlign:'center',whiteSpace:'nowrap',pointerEvents:'none'}}>
            Finds the best fit
          </motion.span>
        </div>

        <svg width={60} height={52}>
          <line x1={4} y1={26} x2={48} y2={26} stroke={T.muted} strokeWidth={1.5} strokeDasharray="4 3"/>
          <polygon points="48,21 58,26 48,31" fill={T.muted}/>
        </svg>

        {/* 3 · model */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,width:110,
                     cursor:'default',position:'relative'}}
          onMouseEnter={() => setHovered('model')} onMouseLeave={() => setHovered(null)}>
          <svg width={70} height={52} style={{overflow:'visible'}}>
            {[[8,44],[20,30],[34,34],[50,18],[62,24]].map(([cx,cy],i)=>(
              <circle key={i} cx={cx} cy={cy} r={4} fill={T.accent} opacity={.45}/>
            ))}
            <line x1={2} y1={50} x2={68} y2={8} stroke={Y} strokeWidth={2.5}/>
          </svg>
          <span style={{fontSize:11,color:Y,fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>
            model
          </span>
          <motion.span animate={{opacity:hovered==='model'?.75:0}} transition={{duration:.15}}
            style={{position:'absolute',top:'100%',marginTop:2,fontSize:10,
                    color:Y,fontFamily:'Inter,sans-serif',
                    textAlign:'center',whiteSpace:'nowrap',pointerEvents:'none'}}>
            Prediction line
          </motion.span>
        </div>

      </div>
    </motion.div>
  )
}

// ─── Part B: learning chart ───────────────────────────────────────────────────
function LearnChart({
  svgRef, pts, setPts,
}: {
  svgRef: React.RefObject<SVGSVGElement | null>
  pts: Pt[]
  setPts: (p: Pt[]) => void
}) {
  const [line,     setLine]     = useState(randomLine)
  const [steps,    setSteps]    = useState(0)
  const [showRes,  setShowRes]  = useState(false)
  const [drag,     setDrag]     = useState<number|null>(null)
  const [dragPred, setDragPred] = useState(false)
  const [predictX, setPredictX] = useState(13.5)
  const didDrag = useRef(false)

  const fit       = ols(pts)
  const err       = rmse(pts, line.slope, line.intercept)
  const sigma     = sumDist(pts, line.slope, line.intercept)
  const best      = fit ? rmse(pts, fit.m, fit.b) : null
  const converged = best !== null && pts.length >= 2 && err < best*1.04
  const predictedY = line.slope*predictX + line.intercept

  const svgP = useCallback((e: React.PointerEvent) => {
    const s = svgRef.current!
    const p = s.createSVGPoint(); p.x=e.clientX; p.y=e.clientY
    return p.matrixTransform(s.getScreenCTM()!.inverse())
  }, [svgRef])

  const bgClick = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    if (pts.length >= MAX_PTS) return
    const sp = svgP(e as unknown as React.PointerEvent)
    const x = +Math.max(0.5,Math.min(MONTHS,unx(sp.x))).toFixed(1)
    const y = +Math.max(30,Math.min(YMAX-30,uny(sp.y))).toFixed(0)
    setPts([...pts, {id:uid(), x, y}])
  }, [pts, svgP, setPts])

  const predDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    svgRef.current!.setPointerCapture(e.pointerId)
    setDragPred(true)
  }, [svgRef])

  const dotDown = useCallback((e: React.PointerEvent, i: number) => {
    e.stopPropagation()
    svgRef.current!.setPointerCapture(e.pointerId)
    didDrag.current = false
    setDrag(i)
  }, [svgRef])

  // All pointer moves routed through SVG (captured on svgRef)
  const svgMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const sp = svgP(e)
    if (dragPred) {
      setPredictX(Math.max(MONTHS+0.1, Math.min(X_EXT-0.1, unx(sp.x))))
    } else if (drag !== null) {
      didDrag.current = true
      const x = Math.max(0.5, Math.min(MONTHS, unx(sp.x)))
      const y = Math.max(30,  Math.min(YMAX-30, uny(sp.y)))
      setPts(pts.map((p,j) => j===drag ? {...p, x, y} : p))
    }
  }, [dragPred, drag, svgP, pts, setPts])

  const svgUp = useCallback(() => {
    if (drag !== null && !didDrag.current) setPts(pts.filter((_,j) => j!==drag))
    setDrag(null)
    setDragPred(false)
  }, [drag, pts, setPts])

  const learn = (n = 1) => {
    if (pts.length < 2) return
    setLine(l => { let c=l; for(let i=0;i<n;i++) c=gdLearn(pts,c.slope,c.intercept,10); return c })
    setSteps(s => s+n)
  }
  const reset = () => { setLine(randomLine()); setSteps(0) }

  const clY = (v: number) => Math.max(-150, Math.min(YMAX+150, v))
  const y0   = clY(line.intercept)
  const yM   = clY(line.slope*MONTHS + line.intercept)
  const yExt = clY(line.slope*X_EXT  + line.intercept)
  const pyC  = clY(predictedY)

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}}
      exit={{opacity:0, transition:{duration:.2}}}
      transition={{duration:.25}}
      style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',
              alignItems:'center',justifyContent:'center',gap:8,overflow:'auto'}}>

      <p style={{fontSize:11,color:T.textDim,fontFamily:'Inter,sans-serif',
                 margin:'0 0 2px',textAlign:'center'}}>
        click chart to add · click point to remove · drag to move
      </p>

      <div style={{width:'100%',maxWidth:CW}}>
        <svg ref={svgRef} viewBox={`0 0 ${CW} ${CH}`}
          style={{width:'100%',display:'block',
                  cursor:dragPred?'ew-resize':drag!==null?'grabbing':'crosshair',
                  userSelect:'none'}}
          onPointerMove={svgMove} onPointerUp={svgUp}>

          {/* prediction zone */}
          <rect x={scx(MONTHS)} y={PT} width={scx(X_EXT)-scx(MONTHS)} height={CH-PT-PB}
                fill={`${Y}07`}/>
          <text x={(scx(MONTHS)+scx(X_EXT))/2} y={PT+11} textAnchor="middle"
                fill={Y} fontSize={8} fontFamily="Inter,sans-serif" opacity={.5}>
            prediction zone
          </text>

          {/* month gridlines */}
          {MON.map((lbl,i) => (
            <g key={i}>
              <line x1={scx(i+1)} y1={PT} x2={scx(i+1)} y2={CH-PB} stroke={T.border} strokeWidth={.5}/>
              <text x={scx(i+1)} y={CH-PB+13} textAnchor="middle"
                    fill={T.textDim} fontSize={7.5} fontFamily="Inter,sans-serif">{lbl}</text>
            </g>
          ))}

          {/* prediction zone ticks */}
          {[13,14,15].map(m => (
            <g key={m}>
              <line x1={scx(m)} y1={CH-PB} x2={scx(m)} y2={CH-PB+4}
                    stroke={Y} strokeWidth={.8} opacity={.5}/>
              <text x={scx(m)} y={CH-PB+13} textAnchor="middle"
                    fill={Y} fontSize={7.5} fontFamily="Inter,sans-serif" opacity={.6}>M{m}</text>
            </g>
          ))}

          {/* y gridlines */}
          {[250,500,750].map(v => (
            <g key={v}>
              <line x1={PL} y1={scy(v)} x2={CW-PR} y2={scy(v)} stroke={T.border} strokeWidth={.5}/>
              <text x={PL-4} y={scy(v)} textAnchor="end" dominantBaseline="middle"
                    fill={T.textDim} fontSize={8} fontFamily="Inter,sans-serif">{v}</text>
            </g>
          ))}

          {/* axes */}
          <line x1={PL} y1={CH-PB} x2={CW-PR} y2={CH-PB} stroke={T.muted} strokeWidth={1}/>
          <line x1={PL} y1={PT}    x2={PL}     y2={CH-PB} stroke={T.muted} strokeWidth={1}/>
          <text x={CW/2} y={CH-2} textAnchor="middle" fill={T.textDim}
                fontSize={9} fontFamily="Inter,sans-serif">Time →</text>
          <text x={11} y={CH/2} textAnchor="middle" fill={T.textDim} fontSize={9}
                fontFamily="Inter,sans-serif" transform={`rotate(-90,11,${CH/2})`}>$ →</text>

          {/* click-to-add zone */}
          <rect x={PL} y={PT} width={scx(MONTHS)-PL} height={CH-PT-PB}
                fill="transparent" onClick={bgClick}/>

          {/* residuals */}
          {showRes && pts.map((p,i) => (
            <line key={i}
              x1={scx(p.x)} y1={scy(p.y)}
              x2={scx(p.x)} y2={scy(clY(line.slope*p.x+line.intercept))}
              stroke="#f97316" strokeWidth={1.5} strokeDasharray="3 2" opacity={.65}/>
          ))}

          {/* model line */}
          <motion.line animate={{x1:scx(0),y1:scy(y0),x2:scx(MONTHS),y2:scy(yM),
                                 stroke:converged?Y:T.accent}}
            transition={{duration:.3}} strokeWidth={2}/>
          <motion.line animate={{x1:scx(MONTHS),y1:scy(yM),x2:scx(X_EXT),y2:scy(yExt),
                                 stroke:converged?Y:T.accent}}
            transition={{duration:.3}} strokeWidth={1.5} strokeDasharray="5 3" opacity={.55}/>
          <text x={scx(X_EXT)-3}
                y={Math.max(PT+12,Math.min(CH-PB-4,scy(yExt)-8))}
                textAnchor="end" fontSize={9.5} fontFamily="JetBrains Mono,monospace" fontWeight={600}
                fill={converged?Y:T.accent}>
            {converged?'model ✓':'model'}
          </text>

          {/* prediction handle */}
          <line x1={scx(predictX)} y1={scy(Math.max(0,Math.min(YMAX,pyC)))}
                x2={scx(predictX)} y2={CH-PB}
                stroke={Y} strokeWidth={1} strokeDasharray="4 3" opacity={.7}/>
          <circle cx={scx(predictX)} cy={scy(Math.max(0,Math.min(YMAX,pyC)))}
                  r={5} fill={Y} opacity={.9}/>
          <text x={scx(predictX)+7}
                y={Math.max(PT+10,Math.min(CH-PB-4,scy(Math.max(0,Math.min(YMAX,pyC)))-6))}
                fill={Y} fontSize={9} fontFamily="JetBrains Mono,monospace" fontWeight={600}>
            ${Math.round(predictedY)}
          </text>
          <g style={{cursor:'ew-resize'}} onPointerDown={predDown}>
            <rect x={scx(predictX)-7} y={CH-PB-7} width={14} height={14}
                  rx={3} fill={Y} opacity={.85}/>
            <text x={scx(predictX)} y={CH-PB+1} textAnchor="middle" dominantBaseline="middle"
                  fill={T.bg} fontSize={8} fontWeight={700}
                  style={{pointerEvents:'none'}}>◆</text>
          </g>

          {/* invisible hit areas for dot drag/click — visual dots are in portal */}
          {pts.map((p,i) => (
            <circle key={`hit-${p.id}`}
              cx={scx(p.x)} cy={scy(p.y)} r={9}
              fill="transparent"
              style={{cursor: drag===i ? 'grabbing' : 'grab'}}
              onPointerDown={e => dotDown(e, i)}
            />
          ))}
        </svg>
      </div>

      {/* controls */}
      <div style={{display:'flex',alignItems:'center',gap:6,width:'100%',maxWidth:CW,paddingTop:4}}>
        <div style={{display:'flex',gap:0,flexShrink:0}}>
          <button onClick={() => learn(1)} disabled={pts.length<2}
            style={{padding:'5px 14px',borderRadius:'16px 0 0 16px',
                    border:`1px solid ${T.accent}`,background:`${T.accent}14`,
                    color:T.accent,fontFamily:'Inter,sans-serif',fontSize:11,fontWeight:600,
                    cursor:pts.length<2?'not-allowed':'pointer',opacity:pts.length<2?.35:1,lineHeight:1}}>
            Learn
          </button>
          <button onClick={() => learn(4)} disabled={pts.length<2}
            style={{padding:'5px 11px',borderRadius:'0 16px 16px 0',
                    border:`1px solid ${T.accent}`,borderLeft:`1px solid ${T.accent}40`,
                    background:`${T.accent}0e`,
                    color:T.accent,fontFamily:'Inter,sans-serif',fontSize:11,fontWeight:600,
                    cursor:pts.length<2?'not-allowed':'pointer',opacity:pts.length<2?.35:1,lineHeight:1}}>
            ×4
          </button>
        </div>
        <button onClick={reset}
          style={{padding:'5px 11px',borderRadius:16,flexShrink:0,
                  border:`1px solid ${T.border}`,background:'transparent',
                  color:T.textDim,fontFamily:'Inter,sans-serif',fontSize:11,cursor:'pointer',lineHeight:1}}>
          ↺
        </button>
        <button onClick={() => setShowRes(v=>!v)}
          style={{padding:'5px 11px',borderRadius:16,flexShrink:0,
                  border:`1px solid ${showRes?'#f97316':T.border}`,
                  background:showRes?'rgba(249,115,22,.08)':'transparent',
                  color:showRes?'#f97316':T.textDim,
                  fontFamily:'Inter,sans-serif',fontSize:11,cursor:'pointer',lineHeight:1}}>
          residuals
        </button>
        <div style={{width:1,height:14,background:T.border,flexShrink:0,margin:'0 2px'}}/>
        <div style={{display:'flex',alignItems:'center',gap:12,flex:1,minWidth:0,
                     fontFamily:'JetBrains Mono,monospace',fontSize:10.5,color:T.textDim}}>
          <span style={{whiteSpace:'nowrap'}}>
            step <span style={{color:T.text,fontWeight:600}}>{steps}</span>
          </span>
          <span style={{whiteSpace:'nowrap'}}>
            Σ <span style={{color:showRes?'#f97316':T.textDim,fontWeight:600}}>${sigma.toFixed(0)}</span>
          </span>
          <span style={{whiteSpace:'nowrap'}}>
            err <span style={{fontWeight:600,color:err>300?'#f97316':err>100?Y:T.highlight}}>
              ${err.toFixed(0)}
            </span>
          </span>
          <motion.span animate={{opacity:converged?1:0}} transition={{duration:.5}}
            style={{color:Y,fontWeight:600,whiteSpace:'nowrap'}}>
            converged ✓
          </motion.span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Context chip — morphs from dot via shared layoutId ─────────────────────
function ContextChip({ word, id, index }: {
  word: string
  id: string
  index: number
}) {
  return (
    <motion.span
      layoutId={`dot-${id}`}
      transition={{ type:'spring', stiffness:200, damping:14, delay: 0.5 + index * 0.15 }}
      style={{
        display:'inline-flex', alignItems:'center', padding:'5px 11px',
        fontFamily:'JetBrains Mono,monospace', fontSize:13, fontWeight:500,
        background:T.surface, border:`1.5px solid ${T.accent}`, color:T.accent,
        borderRadius:8,
      }}>
      <motion.span initial={{opacity:0}} animate={{opacity:1}}
        transition={{delay: 0.5 + index*0.15 + 0.3, duration:.2}}>
        {word}
      </motion.span>
    </motion.span>
  )
}

// ─── Part C: token prediction ─────────────────────────────────────────────────
function TokenPredict({ pts }: {
  pts: Pt[]
}) {
  const count = Math.min(pts.length, SENTENCE.length)
  const [predicted, setPredicted] = useState(0)
  const [latestIdx, setLatestIdx] = useState(-1)

  const buttonDelay = 0.5 + count * 0.15 + 0.8

  const predict = () => {
    setLatestIdx((count + predicted) % SENTENCE.length)
    setPredicted(p => p+1)
  }

  return (
    <motion.div exit={{opacity:0, transition:{duration:.25}}}
      style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',
              alignItems:'center',justifyContent:'center',gap:22}}>

      <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.3, duration:.25}}
        style={{fontSize:12,color:T.textDim,fontFamily:'Inter,sans-serif',
                margin:0,textAlign:'center'}}>
        Each point became a{' '}
        <span style={{color:Y,fontFamily:'JetBrains Mono,monospace',fontSize:11}}>token</span>.
        {' '}The{' '}
        <span style={{color:Y,background:YBG,border:`1px solid ${YB}`,borderRadius:5,
                      padding:'1px 6px',fontFamily:'JetBrains Mono,monospace',fontSize:11}}>model</span>
        {' '}predicts what's next.
      </motion.p>

      <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',maxWidth:600}}>
        {SENTENCE.map((word, i) => {
          const isPred = i >= count && (i-count) < predicted
          const isLast = i === latestIdx

          if (i < count) {
            return (
              <ContextChip
                key={pts[i].id}
                word={word}
                id={String(pts[i].id)}
                index={i}
              />
            )
          }

          return (
            <motion.span key={i}
              initial={{opacity:.1}} animate={{opacity: isPred ? 1 : .1}}
              transition={{duration:.4}}
              style={{
                display:'inline-flex', alignItems:'center',
                padding:'5px 11px', borderRadius:8,
                fontFamily:'JetBrains Mono,monospace', fontSize:13, fontWeight:500,
                background: isLast ? YBG      : `${T.accent}10`,
                border:`1px solid ${isLast ? YB : `${T.accent}30`}`,
                color: isLast ? Y : T.accent,
                transform: isLast ? 'scale(1.06)' : 'scale(1)',
                boxShadow: isLast ? `0 0 14px ${Y}35` : 'none',
                transition:'transform .3s, box-shadow .3s',
              }}>
              {word}
            </motion.span>
          )
        })}
      </div>

      <motion.button
        initial={{opacity:0, y:8}} animate={{opacity:1, y:0}}
        transition={{delay: buttonDelay, duration:.4}}
        onClick={predict}
        style={{padding:'9px 30px',borderRadius:22,
                border:`1.5px solid ${YB}`,background:YBG,
                color:Y,fontFamily:'Inter,sans-serif',fontSize:13,fontWeight:600,
                cursor:'pointer',boxShadow:`0 0 18px ${Y}20`}}>
        Predict next ✦
      </motion.button>

      <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay: buttonDelay, duration:.25}}
        style={{fontSize:11,color:T.textDim,fontFamily:'Inter,sans-serif',
                textAlign:'center',maxWidth:420,lineHeight:1.7,margin:0}}>
        Regression predicts a number from inputs.
        LLMs do the same — but predict the next <em>token</em>.
      </motion.p>
    </motion.div>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────
type Part = 'intro' | 'learn' | 'tokens'

export default function LinearRegression({ isActive: _isActive }: SlideProps) {
  const [part, setPart] = useState<Part>('intro')
  const [pts,  setPts]  = useState<Pt[]>(INIT_PTS)
  const svgRef       = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [svgRelRect, setSvgRelRect] = useState<{left:number,top:number,width:number,height:number}|null>(null)

  // Track SVG position relative to the container so sibling dots stay aligned
  useLayoutEffect(() => {
    if (part !== 'learn') { setSvgRelRect(null); return }
    const svgEl = svgRef.current
    const conEl = containerRef.current
    if (!svgEl || !conEl) return
    const update = () => {
      const sr = svgEl.getBoundingClientRect()
      const cr = conEl.getBoundingClientRect()
      setSvgRelRect({ left: sr.left-cr.left, top: sr.top-cr.top, width: sr.width, height: sr.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(svgEl); ro.observe(conEl)
    return () => ro.disconnect()
  }, [part])

  const navigate = (k: Part) => {
    if (k === 'learn') setPts(p => p.map(pt => ({ ...pt, id: uid() })))
    setPart(k)
  }

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',
                 background:T.bg,padding:'20px 28px',boxSizing:'border-box'}}>

      <div ref={containerRef} style={{flex:1,position:'relative',minHeight:0,overflow:'hidden'}}>
        <AnimatePresence mode="sync">
          {part==='intro'  && <Intro key="intro"/>}
          {part==='learn'  && (
            <LearnChart key="learn" svgRef={svgRef} pts={pts} setPts={setPts}/>
          )}
          {part==='tokens' && (
            <TokenPredict key="tokens" pts={pts}/>
          )}
        </AnimatePresence>

        {/* Dots layer — sibling of AnimatePresence children, never inside a fading div.
            Unmounts when part changes to 'tokens'; chips take over via layoutId. */}
        {part === 'learn' && svgRelRect && (
          <div style={{position:'absolute',inset:0,pointerEvents:'none'}}>
            {pts.map(p => (
              <motion.div
                key={p.id}
                layoutId={`dot-${p.id}`}
                style={{
                  position: 'absolute',
                  left: svgRelRect.left + (scx(p.x)/CW) * svgRelRect.width - 6,
                  top:  svgRelRect.top  + (scy(p.y)/CH) * svgRelRect.height - 6,
                  width: 12, height: 12, borderRadius: '50%',
                  background: T.surface,
                  border: `1.5px solid ${T.accent}`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div style={{display:'flex',gap:6,justifyContent:'center',paddingTop:10,flexShrink:0}}>
        {([
          {k:'intro',  l:'01 · What is it?'},
          {k:'learn',  l:'02 · Learning'},
          {k:'tokens', l:'03 · Token prediction'},
        ] as {k:Part;l:string}[]).map(({k,l}) => (
          <button key={k} onClick={() => navigate(k)}
            style={{padding:'5px 16px',borderRadius:18,
                    border:`1.5px solid ${part===k?T.accent:T.border}`,
                    background:part===k?`${T.accent}14`:'transparent',
                    color:part===k?T.accent:T.textDim,
                    fontFamily:'Inter,sans-serif',fontSize:11,fontWeight:600,
                    cursor:'pointer',transition:'all .2s'}}>
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}
