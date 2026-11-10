import type { Design, El, ModelInfo, PhotoMeta, Project, Side, SideKey, TextEl, Theme, PhotoEl, Assign } from './types'
import { fontStack } from './fonts'

export interface Img { src: CanvasImageSource; w: number; h: number }
export interface Scene {
  project: Project
  design: Design
  imgs: Map<string, Img>
  logo: Img | null
  placeholders: boolean
}

export const FIELDS = [
  { k: 'birth', en: 'BIRTH', ko: '출생', unit: '' },
  { k: 'height', en: 'HEIGHT', ko: '키', unit: 'cm' },
  { k: 'weight', en: 'WEIGHT', ko: '몸무게', unit: 'kg' },
  { k: 'top', en: 'TOP', ko: '상의', unit: '' },
  { k: 'bottom', en: 'BOTTOM', ko: '하의', unit: '' },
  { k: 'shoe', en: 'SHOES', ko: '신발', unit: 'mm' },
] as const

/** 년생: 2001 → '2001' (영문 라벨 BIRTH) / '2001년생' (한글 라벨). 숫자가 아니면 입력 그대로. */
export function fmtBirth(v: string, ko: boolean): string {
  const t = v.trim()
  if (!t) return ''
  const m = /^(\d{4}|\d{2})\s*(년생|년|년도)?$/.exec(t)
  if (!m) return t
  return ko ? `${m[1]}년생` : m[1]
}

export function colorOf(theme: Theme, c: string): string {
  switch (c) {
    case 'bg': return theme.bg
    case 'bg2': return theme.bg2
    case 'text': return theme.text
    case 'muted': return theme.muted
    case 'accent': return theme.accent
    default: return c || '#000000'
  }
}
function fontKeyOf(theme: Theme, f: string): string {
  if (f === 'display') return theme.fontDisplay
  if (f === 'body') return theme.fontBody
  return f
}

export function fmtValue(v: string, unit: string): string {
  const t = v.trim()
  if (!t) return ''
  return unit && /^[0-9]+([.,][0-9]+)?$/.test(t) ? `${t}${unit}` : t
}

/* ---------- photo crop ---------- */
export function autoOffset(meta: PhotoMeta | undefined, sw: number, sh: number, zoom: number): { ox: number; oy: number } {
  if (!meta) return { ox: 0.5, oy: 0.2 }
  const iw = meta.w, ih = meta.h
  const scale = Math.max(sw / iw, sh / ih) * zoom
  const vw = sw / scale, vh = sh / scale
  const rx = iw - vw, ry = ih - vh
  if (meta.face) {
    // place face centre at 50% horizontally, ~36% from the top of the slot
    const tx = 0.5, ty = sh / sw > 1.15 ? 0.34 : 0.4
    const sx = meta.face.cx * iw - tx * vw
    const sy = meta.face.cy * ih - ty * vh
    return { ox: rx > 1 ? clamp(sx / rx, 0, 1) : 0.5, oy: ry > 1 ? clamp(sy / ry, 0, 1) : 0.5 }
  }
  return { ox: 0.5, oy: ry > 1 ? 0.18 : 0.5 } // no face info: centre horizontally, top-biased vertically
}
export function cropRect(meta: PhotoMeta, sw: number, sh: number, a: Assign) {
  const iw = meta.w, ih = meta.h
  const zoom = Math.max(1, a.zoom)
  const scale = Math.max(sw / iw, sh / ih) * zoom
  const vw = sw / scale, vh = sh / scale
  const auto = autoOffset(meta, sw, sh, zoom)
  const ox = a.ox ?? auto.ox, oy = a.oy ?? auto.oy
  return { sx: (iw - vw) * ox, sy: (ih - vh) * oy, sw: vw, sh: vh, scale, ox, oy, rx: iw - vw, ry: ih - vh }
}
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/* ---------- text layout ---------- */
interface Run { text: string; fam: string; size: number; weight: number; color: string; ls: number; italic?: boolean }
interface Seg { run: Run; dx: number; w: number }
interface Line { segs: Seg[]; w: number; lh: number; gap: number }

function setFont(ctx: CanvasRenderingContext2D, r: Run, s: number) {
  ctx.font = `${r.italic ? 'italic ' : ''}${r.weight} ${Math.max(1, r.size * s)}px ${r.fam}`
  ;(ctx as any).letterSpacing = `${r.ls * r.size * s}px`
}
function meas(ctx: CanvasRenderingContext2D, r: Run, s: number, text = r.text): number {
  setFont(ctx, r, s)
  return ctx.measureText(text).width
}
function wrapPara(ctx: CanvasRenderingContext2D, r: Run, s: number, maxW: number): string[] {
  const out: string[] = []
  for (const raw of r.text.split('\n')) {
    if (!raw.trim()) { out.push(''); continue }
    const toks = raw.split(/(\s+)/).filter((t) => t !== '')
    let cur = ''
    const flush = () => { out.push(cur.trimEnd()); cur = '' }
    for (const t of toks) {
      if (/^\s+$/.test(t)) { if (cur) cur += ' '; continue }
      if (meas(ctx, r, s, cur + t) <= maxW) { cur += t; continue }
      if (cur) flush()
      if (meas(ctx, r, s, t) <= maxW) { cur = t; continue }
      for (const ch of t) { // very long token: break by character
        if (meas(ctx, r, s, cur + ch) > maxW && cur) flush()
        cur += ch
      }
    }
    if (cur) flush()
  }
  return out
}

export function modelFieldItems(project: Project, e: TextEl) {
  const out: { label: string; value: string }[] = []
  for (const f of FIELDS) {
    if (!project.show[f.k as keyof typeof project.show]) continue
    const raw = project.model[f.k as keyof ModelInfo] as string
    const v = f.k === 'birth' ? fmtBirth(raw ?? '', e.labelMode === 'ko') : fmtValue(raw ?? '', f.unit)
    if (v) out.push({ label: e.labelMode === 'ko' ? f.ko : f.en, value: v })
  }
  return out
}

function layoutText(ctx: CanvasRenderingContext2D, scene: Scene, e: TextEl, u: number, bw: number, s: number): Line[] {
  const { project, design } = scene
  const th = design.theme
  const m = project.model
  const main = fontStack(fontKeyOf(th, e.font))
  const body = fontStack(th.fontBody)
  const col = colorOf(th, e.color)
  const col2 = colorOf(th, e.color2)
  const size = (e.sz / 100) * u
  const size2 = (e.sz2 / 100) * u
  const ls = e.ls / 100
  const up = (t: string) => (e.upper ? t.toUpperCase() : t)
  const lines: Line[] = []
  const one = (run: Run, gap = 0, lhMul = e.lh): Line => {
    const w = meas(ctx, run, s)
    return { segs: [{ run, dx: 0, w }], w, lh: run.size * s * lhMul, gap }
  }
  const mk = (text: string, sizeV: number, o: Partial<Run> = {}): Run => ({ text, fam: main, size: sizeV, weight: e.weight, color: col, ls, ...o })

  if (e.kind === 'name') {
    const ko = e.showKo ? m.nameKo.trim() : ''
    const en = e.showEn ? m.nameEn.trim() : ''
    const list = e.nameOrder === 'en-first'
      ? [en && { t: up(en), ko: false }, ko && { t: ko, ko: true }]
      : [ko && { t: ko, ko: true }, en && { t: up(en), ko: false }]
    let first = true
    for (const it of list) {
      if (!it) continue
      const sz = first ? size : size2 * (s < 1 ? Math.sqrt(s) / s : 1) // secondary line shrinks less than the main line
      const run = mk(it.t, sz, it.ko ? { fam: first ? main : body, weight: first ? e.weight : Math.min(e.weight, 500), ls: it.ko ? Math.min(ls, 0.08) : ls } : {})
      lines.push(one(run, first ? 0 : 0.25 * sz * s, 1.15))
      first = false
    }
  } else if (e.kind === 'stats') {
    const items = modelFieldItems(project, e)
    if (!items.length) return lines
    const lab = (t: string, sz: number): Run => ({ text: e.labelMode === 'en' ? t.toUpperCase() : t, fam: e.labelMode === 'en' ? main : body, size: sz, weight: 600, color: col2, ls: e.labelMode === 'en' ? 0.16 : 0.02 })
    const val = (t: string, sz: number): Run => ({ text: t, fam: body, size: sz, weight: Math.min(500, Math.max(300, e.weight)), color: col, ls: 0.02 })
    if (e.rowStyle === 'rows' || e.rowStyle === 'stack') {
      const lw = Math.max(...items.map((i) => meas(ctx, lab(i.label, size2), s)))
      const vw = Math.max(...items.map((i) => meas(ctx, val(i.value, size), s)))
      const gapX = size * 0.9 * s
      for (const it of items) {
        const lr = lab(it.label, size2), vr = val(it.value, size)
        lines.push({
          segs: [{ run: lr, dx: 0, w: lw }, { run: vr, dx: lw + gapX, w: vw }],
          w: lw + gapX + vw,
          lh: size * s * e.lh,
          gap: 0,
        })
      }
    } else if (e.rowStyle === 'grid') {
      const cols = Math.max(1, Math.min(6, Math.round(e.cols)))
      const cw = bw / cols
      for (let i = 0; i < items.length; i += cols) {
        const row = items.slice(i, i + cols)
        const place = (r: Run, c: number): Seg => {
          const w = meas(ctx, r, s)
          const dx = e.align === 'left' ? c * cw : e.align === 'center' ? c * cw + (cw - w) / 2 : c * cw + cw - w
          return { run: r, dx, w }
        }
        lines.push({ segs: row.map((it, c) => place(lab(it.label, size2), c)), w: bw, lh: size2 * s * 1.4, gap: i === 0 ? 0 : size * s * 0.7 })
        lines.push({ segs: row.map((it, c) => place(val(it.value, size), c)), w: bw, lh: size * s * 1.25, gap: 0 })
      }
    } else { // inline
      const gapX = size * 1.1 * s
      const cells = items.map((it) => {
        const lr = lab(it.label, size2), vr = val(it.value, size)
        const lw = meas(ctx, lr, s), vw = meas(ctx, vr, s)
        return { lr, vr, lw, vw, w: lw + size * 0.4 * s + vw }
      })
      const widthOf = (c: typeof cells) => c.reduce((a, x) => a + x.w, 0) + gapX * Math.max(0, c.length - 1)
      // greedy wrap first, then rebalance to equal-sized rows (e.g. 3+3 instead of 5+1) when that still fits
      let rows: (typeof cells)[] = []
      let cur: typeof cells = []
      for (const c of cells) {
        if (cur.length && widthOf([...cur, c]) > bw + 0.5) { rows.push(cur); cur = [] }
        cur.push(c)
      }
      if (cur.length) rows.push(cur)
      if (rows.length > 1) {
        const per = Math.ceil(cells.length / rows.length)
        const bal: (typeof cells)[] = []
        for (let i = 0; i < cells.length; i += per) bal.push(cells.slice(i, i + per))
        if (bal.every((r) => widthOf(r) <= bw + 0.5)) rows = bal
      }
      for (const r of rows) {
        const segs: Seg[] = []
        let x = 0
        for (const c of r) { segs.push({ run: c.lr, dx: x, w: c.lw }, { run: c.vr, dx: x + c.lw + size * 0.4 * s, w: c.vw }); x += c.w + gapX }
        lines.push({ segs, w: x - gapX, lh: size * s * e.lh, gap: 0 })
      }
    }
  } else if (e.kind === 'comment' || e.kind === 'career' || e.kind === 'free') {
    let text = ''
    let head = ''
    if (e.kind === 'comment') { if (!project.show.comment) return lines; text = m.comment; head = e.labelMode === 'ko' ? '코멘트' : 'COMMENT' }
    else if (e.kind === 'career') { if (!project.show.career) return lines; text = m.career; head = e.labelMode === 'ko' ? '경력' : 'CAREER' }
    else text = e.text
    if (!text.trim()) return lines
    if (e.heading && e.kind !== 'free') {
      lines.push(one({ text: head, fam: main, size: size2, weight: 600, color: col2, ls: 0.2 }, 0, 1.3))
    }
    const body0 = mk(text, size, { fam: e.kind === 'free' ? main : body, weight: Math.min(500, Math.max(300, e.weight)), ls: Math.min(ls, 0.05) })
    const wrapped = wrapPara(ctx, body0, s, bw)
    wrapped.forEach((t, i) => {
      const r = { ...body0, text: t }
      lines.push({ segs: [{ run: r, dx: 0, w: t ? meas(ctx, r, s) : 0 }], w: t ? meas(ctx, r, s) : 0, lh: size * s * e.lh, gap: i === 0 && e.heading && e.kind !== 'free' ? size * s * 0.2 : 0 })
    })
  } else if (e.kind === 'agency') {
    const a = project.agency
    const items: { run: Run }[] = []
    if (project.show.agencyName && e.lines.name && a.name.trim()) items.push({ run: { text: a.name.trim().toUpperCase(), fam: main, size: size * 1.12, weight: 600, color: col, ls: Math.max(ls, 0.18) } })
    if (project.show.email && e.lines.email && a.email.trim()) items.push({ run: { text: a.email.trim(), fam: body, size, weight: 400, color: col2, ls: 0.02 } })
    if (project.show.fax && e.lines.fax && a.fax.trim()) {
      const f = a.fax.trim()
      items.push({ run: { text: /^fax/i.test(f) ? f : `FAX ${f}`, fam: body, size, weight: 400, color: col2, ls: 0.02 } })
    }
    if (!items.length) return lines
    if (e.rowStyle === 'inline') {
      let cur: Seg[] = [], x = 0
      const sep = size * 1.6 * s
      const pushLine = () => { if (cur.length) lines.push({ segs: cur, w: x - sep, lh: size * s * e.lh, gap: 0 }); cur = []; x = 0 }
      for (const it of items) {
        const w = meas(ctx, it.run, s)
        if (x > 0 && x + w > bw + 0.5) pushLine()
        cur.push({ run: it.run, dx: x, w })
        x += w + sep
      }
      pushLine()
    } else {
      items.forEach((it) => lines.push(one(it.run, 0, e.lh)))
    }
  }
  return lines
}

function linesHeight(lines: Line[]): number {
  return lines.reduce((a, l) => a + l.lh + l.gap, 0)
}

function drawText(ctx: CanvasRenderingContext2D, scene: Scene, e: TextEl, bx: number, by: number, bw: number, bh: number, u: number) {
  let s = 1
  let lines = layoutText(ctx, scene, e, u, bw, s)
  if (!lines.length) return
  if (e.fit) {
    for (let i = 0; i < 40; i++) {
      const tooTall = linesHeight(lines) > bh + 0.5
      const tooWide = lines.some((l) => l.w > bw + 0.5)
      if (!tooTall && !tooWide) break
      s *= 0.94
      if (s < 0.3) break
      lines = layoutText(ctx, scene, e, u, bw, s)
    }
  }
  const total = linesHeight(lines)
  let y = e.valign === 'top' ? by : e.valign === 'middle' ? by + (bh - total) / 2 : by + bh - total
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  for (const l of lines) {
    y += l.gap
    const left = e.rowStyle === 'grid' && e.kind === 'stats' ? bx : e.align === 'left' ? bx : e.align === 'center' ? bx + (bw - l.w) / 2 : bx + bw - l.w
    const maxSize = Math.max(...l.segs.map((g) => g.run.size * s))
    const base = y + (l.lh - maxSize * 1.0) / 2 + maxSize * 0.82
    for (const g of l.segs) {
      setFont(ctx, g.run, s)
      ctx.fillStyle = g.run.color
      // align each segment's baseline: use the line's max font as reference
      const sizeS = g.run.size * s
      ctx.fillText(g.run.text, left + g.dx, base - (maxSize - sizeS) * 0.0)
    }
    y += l.lh
  }
  ;(ctx as any).letterSpacing = '0px'
}

/* ---------- main renderer ---------- */
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  if (rad > 0) ctx.roundRect(x, y, w, h, rad)
  else ctx.rect(x, y, w, h)
}

export function sideOf(design: Design, key: SideKey): Side {
  return design.sides[key]
}

export function drawSide(ctx: CanvasRenderingContext2D, scene: Scene, key: SideKey, W: number, H: number) {
  const { design, project } = scene
  const th = design.theme
  const side = design.sides[key]
  const u = Math.sqrt(W * H)
  ctx.save()
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = colorOf(th, side.bg || 'bg')
  ctx.fillRect(0, 0, W, H)
  for (const el of side.els) {
    if (el.hidden) continue
    const x0 = Math.round(el.x * W), y0 = Math.round(el.y * H)
    const x1 = Math.round((el.x + el.w) * W), y1 = Math.round((el.y + el.h) * H)
    const bx = x0, by = y0, bw = x1 - x0, bh = y1 - y0
    if (bw <= 0 || bh <= 0) continue
    ctx.save()
    if (el.type === 'rect') {
      ctx.globalAlpha = el.op
      if (el.fill) { ctx.fillStyle = colorOf(th, el.fill); ctx.fillRect(bx, by, bw, bh) }
      ctx.globalAlpha = 1
      if (el.sw > 0) {
        const w = Math.max(1, (el.sw / 100) * u)
        ctx.strokeStyle = colorOf(th, el.sc); ctx.lineWidth = w
        ctx.strokeRect(bx + w / 2, by + w / 2, bw - w, bh - w)
      }
    } else if (el.type === 'line') {
      const t = Math.max(1, Math.round((el.t / 100) * u))
      ctx.fillStyle = colorOf(th, el.color)
      if (el.dir === 'h') ctx.fillRect(bx, Math.round(by + bh / 2 - t / 2), bw, t)
      else ctx.fillRect(Math.round(bx + bw / 2 - t / 2), by, t, bh)
    } else if (el.type === 'photo') {
      drawPhoto(ctx, scene, el, bx, by, bw, bh, u)
    } else if (el.type === 'text') {
      drawText(ctx, scene, el, bx, by, bw, bh, u)
    } else if (el.type === 'logo') {
      if (project.show.logo) drawLogo(ctx, scene, el, bx, by, bw, bh)
    }
    ctx.restore()
  }
  if (side.border.on) {
    const w = Math.max(1, (side.border.w / 100) * u)
    const ins = (side.border.inset / 100) * u
    ctx.strokeStyle = colorOf(th, side.border.color)
    ctx.lineWidth = w
    ctx.strokeRect(ins + w / 2, ins + w / 2, W - 2 * ins - w, H - 2 * ins - w)
  }
  ctx.restore()
}

function drawLogo(ctx: CanvasRenderingContext2D, scene: Scene, e: Extract<El, { type: 'logo' }>, bx: number, by: number, bw: number, bh: number) {
  const th = scene.design.theme
  if (scene.project.hasLogo && scene.logo) {
    const l = scene.logo
    const sc = Math.min(bw / l.w, bh / l.h)
    const w = l.w * sc, h = l.h * sc
    const x = e.align === 'left' ? bx : e.align === 'center' ? bx + (bw - w) / 2 : bx + bw - w
    ctx.drawImage(l.src, x, by + (bh - h) / 2, w, h)
    return
  }
  const text = (scene.project.agency.name.trim() || 'HONEY MEDIA').toUpperCase()
  const fam = fontStack(th.fontDisplay)
  let size = bh * 0.36
  const run: Run = { text, fam, size, weight: 600, color: colorOf(th, e.color), ls: 0.22 }
  let w = meas(ctx, run, 1)
  if (w > bw) { size *= bw / w; run.size = size; w = meas(ctx, run, 1) }
  setFont(ctx, run, 1)
  ctx.fillStyle = run.color
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  const x = e.align === 'left' ? bx : e.align === 'center' ? bx + (bw - w + run.ls * size) / 2 : bx + bw - w + run.ls * size
  ctx.fillText(text, x, by + (bh - size) / 2 + size * 0.8)
  ;(ctx as any).letterSpacing = '0px'
}

function drawPhoto(ctx: CanvasRenderingContext2D, scene: Scene, e: PhotoEl, bx: number, by: number, bw: number, bh: number, u: number) {
  const th = scene.design.theme
  const a = scene.project.assign[e.id]
  const meta = a ? scene.project.photos.find((p) => p.id === a.photoId) : undefined
  const img = a ? scene.imgs.get(a.photoId) : undefined
  const radius = (e.radius / 100) * u
  rr(ctx, bx, by, bw, bh, radius)
  ctx.save()
  ctx.clip()
  if (meta && img) {
    // crop in the coordinates of the (possibly down-scaled) bitmap
    const c = cropRect(meta, bw, bh, a)
    const k = img.w / meta.w
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img.src, c.sx * k, c.sy * k, c.sw * k, c.sh * k, bx, by, bw, bh)
  } else {
    ctx.fillStyle = scene.placeholders ? '#e4e1da' : '#d9d6cf'
    ctx.fillRect(bx, by, bw, bh)
    if (scene.placeholders) {
      ctx.fillStyle = '#8a867c'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      const fs = Math.max(10, Math.min(bw, bh) * 0.11)
      ctx.font = `500 ${fs}px "Pretendard Variable", sans-serif`
      ctx.fillText('+ 사진', bx + bw / 2, by + bh / 2)
    }
  }
  ctx.restore()
  if (e.bw > 0) {
    const w = Math.max(1, (e.bw / 100) * u)
    ctx.strokeStyle = colorOf(th, e.bc)
    ctx.lineWidth = w
    rr(ctx, bx + w / 2, by + w / 2, bw - w, bh - w, Math.max(0, radius - w / 2))
    ctx.stroke()
  }
}

export const px2mm = (px: number) => (px / 96) * 25.4
export function sizeToMm(s: { w: number; h: number; unit: 'mm' | 'px' }) {
  return s.unit === 'mm' ? { w: s.w, h: s.h } : { w: px2mm(s.w), h: px2mm(s.h) }
}
