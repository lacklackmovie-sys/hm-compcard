import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useStore } from './store'
import { designOf } from './design'
import { clamp, cropRect, drawSide } from './render'
import type { Scene } from './render'
import type { El } from './types'

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
type Handle = (typeof HANDLES)[number]
const KIND_LABEL: Record<string, string> = { name: '이름', stats: '프로필 정보', comment: '코멘트', career: '경력', agency: '에이전시', free: '문구' }
export const elLabel = (e: El) => (e.type === 'photo' ? '사진 슬롯' : e.type === 'text' ? KIND_LABEL[e.kind] ?? '텍스트' : e.type === 'rect' ? '색 블록' : e.type === 'line' ? '라인' : '로고')

export default function Preview() {
  const s = useStore()
  const { p, sideKey, tab, imgs, logo, selSlot, selEl } = s
  const design = designOf(p)
  const editMode = tab === 'design' && p.mode === 'custom'
  const wrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [area, setArea] = useState({ w: 600, h: 700 })
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({})
  const aspect = p.size.w / p.size.h
  const [zoomPct, setZoomPct] = useState(100)

  useLayoutEffect(() => {
    const el = stageRef.current!
    const ro = new ResizeObserver(() => setArea({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setArea({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])
  const availW = Math.max(120, area.w - 40), availH = Math.max(120, area.h - 40)
  const fit = Math.min(availW / aspect, availH)
  const dispH = (fit * zoomPct) / 100
  const dispW = dispH * aspect

  // draw
  const scene: Scene = useMemo(() => ({ project: p, design, imgs, logo, placeholders: true }), [p, design, imgs, logo])
  useEffect(() => {
    const c = canvasRef.current!
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const k = Math.min(dpr, 2600 / Math.max(dispW, dispH))
    const w = Math.max(1, Math.round(dispW * k)), h = Math.max(1, Math.round(dispH * k))
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
    const id = requestAnimationFrame(() => drawSide(c.getContext('2d')!, scene, sideKey, w, h))
    return () => cancelAnimationFrame(id)
  }, [scene, sideKey, dispW, dispH, s.rev])

  const side = design.sides[sideKey]

  /* ---- crop pan (content mode) ---- */
  const panRef = useRef<{ id: string; x: number; y: number; ox: number; oy: number; rx: number; ry: number; sc: number } | null>(null)
  const onSlotDown = (e: React.PointerEvent, el: El) => {
    s.select(el.id)
    const a = p.assign[el.id]
    const meta = a && p.photos.find((m) => m.id === a.photoId)
    if (!a || !meta) return
    const c = cropRect(meta, el.w * dispW, el.h * dispH, a)
    panRef.current = { id: el.id, x: e.clientX, y: e.clientY, ox: c.ox, oy: c.oy, rx: c.rx, ry: c.ry, sc: c.scale }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onSlotMove = (e: React.PointerEvent) => {
    const r = panRef.current
    if (!r) return
    const a = useStore.getState().p.assign[r.id]
    if (!a) return
    const ox = r.rx > 1 ? clamp(r.ox - (e.clientX - r.x) / r.sc / r.rx, 0, 1) : 0.5
    const oy = r.ry > 1 ? clamp(r.oy - (e.clientY - r.y) / r.sc / r.ry, 0, 1) : 0.5
    s.mut((q) => { if (q.assign[r.id]) { q.assign[r.id].ox = ox; q.assign[r.id].oy = oy } })
  }
  const onSlotUp = () => { panRef.current = null }

  // wheel zoom on slots (non-passive)
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const h = (ev: WheelEvent) => {
      const t = (ev.target as HTMLElement).closest('[data-slot]') as HTMLElement | null
      if (!t || editMode) return
      const id = t.dataset.slot!
      const st = useStore.getState()
      if (!st.p.assign[id]) return
      ev.preventDefault()
      const f = Math.exp(-ev.deltaY * 0.0015)
      st.mut((q) => { const a = q.assign[id]; if (a) a.zoom = clamp(a.zoom * f, 1, 4) })
    }
    el.addEventListener('wheel', h, { passive: false })
    return () => el.removeEventListener('wheel', h)
  }, [editMode])

  /* ---- element move/resize (custom edit mode) ---- */
  const dragRef = useRef<null | { id: string; mode: 'move' | Handle; sx: number; sy: number; o: { x: number; y: number; w: number; h: number } }>(null)
  const snapTargets = (id: string) => {
    const xs = [0, 0.5, 1], ys = [0, 0.5, 1]
    for (const e of side.els) if (e.id !== id && !e.hidden) { xs.push(e.x, e.x + e.w, e.x + e.w / 2); ys.push(e.y, e.y + e.h, e.y + e.h / 2) }
    return { xs, ys }
  }
  const snap1 = (vals: number[], targets: number[], thr: number): { d: number; t?: number } => {
    let best = { d: 0, t: undefined as number | undefined }, bd = thr
    for (const v of vals) for (const t of targets) { const dd = Math.abs(t - v); if (dd < bd) { bd = dd; best = { d: t - v, t } } }
    return best
  }
  const startDrag = (e: React.PointerEvent, el: El, mode: 'move' | Handle) => {
    e.stopPropagation(); e.preventDefault()
    s.selectEl(el.id)
    dragRef.current = { id: el.id, mode, sx: e.clientX, sy: e.clientY, o: { x: el.x, y: el.y, w: el.w, h: el.h } }
    const move = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = (ev.clientX - d.sx) / dispW, dy = (ev.clientY - d.sy) / dispH
      const noSnap = ev.altKey
      const { xs, ys } = snapTargets(d.id)
      const thr = 0.007
      let { x, y, w, h } = d.o
      const g: { x?: number; y?: number } = {}
      if (d.mode === 'move') {
        x = d.o.x + dx; y = d.o.y + dy
        if (!noSnap) {
          const sx = snap1([x, x + w / 2, x + w], xs, thr); if (sx.t !== undefined) { x += sx.d; g.x = sx.t }
          const sy = snap1([y, y + h / 2, y + h], ys, thr); if (sy.t !== undefined) { y += sy.d; g.y = sy.t }
        }
        x = clamp(x, 0, 1 - w); y = clamp(y, 0, 1 - h)
      } else {
        let x0 = d.o.x, y0 = d.o.y, x1 = d.o.x + d.o.w, y1 = d.o.y + d.o.h
        if (d.mode.includes('w')) x0 += dx
        if (d.mode.includes('e')) x1 += dx
        if (d.mode.includes('n')) y0 += dy
        if (d.mode.includes('s')) y1 += dy
        if (!noSnap) {
          if (d.mode.includes('w')) { const sx = snap1([x0], xs, thr); if (sx.t !== undefined) { x0 = sx.t; g.x = sx.t } }
          if (d.mode.includes('e')) { const sx = snap1([x1], xs, thr); if (sx.t !== undefined) { x1 = sx.t; g.x = sx.t } }
          if (d.mode.includes('n')) { const sy = snap1([y0], ys, thr); if (sy.t !== undefined) { y0 = sy.t; g.y = sy.t } }
          if (d.mode.includes('s')) { const sy = snap1([y1], ys, thr); if (sy.t !== undefined) { y1 = sy.t; g.y = sy.t } }
        }
        x0 = clamp(x0, 0, 1); x1 = clamp(x1, 0, 1); y0 = clamp(y0, 0, 1); y1 = clamp(y1, 0, 1)
        if (x1 - x0 < 0.015) { if (d.mode.includes('w')) x0 = x1 - 0.015; else x1 = x0 + 0.015 }
        if (y1 - y0 < 0.01) { if (d.mode.includes('n')) y0 = y1 - 0.01; else y1 = y0 + 0.01 }
        x = x0; y = y0; w = x1 - x0; h = y1 - y0
      }
      setGuides(g)
      useStore.getState().mutEl(d.id, (t) => { t.x = x; t.y = y; t.w = w; t.h = h })
    }
    const up = () => {
      dragRef.current = null; setGuides({})
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }

  const [dropId, setDropId] = useState<string | null>(null)
  const boxes = side.els.filter((e) => (editMode ? true : e.type === 'photo' && !e.hidden))

  return (
    <div className="preview" ref={wrapRef}>
      <div className="sidetabs">
        {(p.sides === 2 ? (['front', 'back'] as const) : (['single'] as const)).map((k) => (
          <button key={k} className={sideKey === k ? 'on' : ''} onClick={() => s.setSide(k)}>
            {k === 'front' ? '앞면' : k === 'back' ? '뒷면' : '단면'}
          </button>
        ))}
        <span className="sp" />
        <button onClick={() => setZoomPct((z) => Math.max(40, z - 10))} aria-label="축소">−</button>
        <button onClick={() => setZoomPct(100)} title="화면에 맞추기">{zoomPct}%</button>
        <button onClick={() => setZoomPct((z) => Math.min(250, z + 10))} aria-label="확대">＋</button>
      </div>
      <div className="stage" ref={stageRef}>
        <div className="cardbox" ref={boxRef} style={{ width: dispW, height: dispH }} data-testid="cardbox">
          <canvas ref={canvasRef} className="cardcanvas" style={{ width: dispW, height: dispH }} data-testid="card-canvas" />
          <div className="overlay" onPointerDown={(e) => { if (e.target === e.currentTarget) { s.select(null); s.selectEl(null) } }}>
            {boxes.map((el) => {
              const isSel = editMode ? selEl === el.id : selSlot === el.id
              const style = { left: `${el.x * 100}%`, top: `${el.y * 100}%`, width: `${el.w * 100}%`, height: `${el.h * 100}%` }
              if (!editMode) {
                const has = !!p.assign[el.id]
                return (
                  <div key={el.id} data-slot={el.id} data-testid={`slot-${el.id}`} className={`slot ${isSel ? 'sel' : ''} ${dropId === el.id ? 'drop' : ''} ${has ? 'has' : ''}`} style={style}
                    onPointerDown={(e) => onSlotDown(e, el)} onPointerMove={onSlotMove} onPointerUp={onSlotUp} onPointerCancel={onSlotUp}
                    onDragOver={(e) => { e.preventDefault(); setDropId(el.id) }} onDragLeave={() => setDropId(null)}
                    onDrop={(e) => { e.preventDefault(); setDropId(null); const pid = e.dataTransfer.getData('text/photo-id'); if (pid) s.assignPhoto(el.id, pid) }}>
                    {isSel && <span className="tag">{has ? '드래그: 위치 · 휠: 확대' : '+ 사진 탭에서 사진 선택'}</span>}
                  </div>
                )
              }
              return (
                <div key={el.id} data-el={el.id} data-testid={`el-${el.id}`} className={`ebox t-${el.type} ${isSel ? 'sel' : ''} ${el.hidden ? 'hid' : ''}`} style={style}
                  onPointerDown={(e) => startDrag(e, el, 'move')}>
                  {isSel && <span className="tag">{elLabel(el)}</span>}
                  {isSel && HANDLES.map((h) => <i key={h} className={`h h-${h}`} data-handle={h} onPointerDown={(e) => startDrag(e, el, h)} />)}
                </div>
              )
            })}
            {guides.x !== undefined && <div className="guide gx" style={{ left: `${guides.x * 100}%` }} />}
            {guides.y !== undefined && <div className="guide gy" style={{ top: `${guides.y * 100}%` }} />}
          </div>
        </div>
      </div>
    </div>
  )
}
