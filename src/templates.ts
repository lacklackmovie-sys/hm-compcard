import type { Design, El, LineEl, LogoEl, PhotoEl, RectEl, Side, TextEl, Theme } from './types'

export const GOLD = '#C9A227'

export const defaultBorder = () => ({ on: false, inset: 2.4, w: 0.18, color: 'accent' })
export const photoEl = (id: string, x: number, y: number, w: number, h: number, o: Partial<PhotoEl> = {}): PhotoEl => ({
  type: 'photo', id, x, y, w, h, radius: 0, bw: 0, bc: 'accent', ...o,
})
export const textEl = (id: string, kind: TextEl['kind'], x: number, y: number, w: number, h: number, o: Partial<TextEl> = {}): TextEl => ({
  type: 'text', id, kind, x, y, w, h,
  sz: 2.4, sz2: 1.5, font: 'body', weight: 400, color: 'text', color2: 'accent',
  align: 'left', valign: 'top', ls: 0, upper: false, lh: 1.4, fit: true,
  showKo: true, showEn: true, nameOrder: 'en-first', labelMode: 'en', rowStyle: 'rows', cols: 3, heading: true,
  lines: { name: true, email: true, fax: true }, text: '', ...o,
})
export const rectEl = (id: string, x: number, y: number, w: number, h: number, o: Partial<RectEl> = {}): RectEl => ({
  type: 'rect', id, x, y, w, h, fill: 'accent', op: 1, sc: 'accent', sw: 0, ...o,
})
export const lineEl = (id: string, x: number, y: number, len: number, o: Partial<LineEl> & { dir?: 'h' | 'v' } = {}): LineEl => {
  const dir = o.dir ?? 'h'
  return { type: 'line', id, x, y, w: dir === 'h' ? len : 0.012, h: dir === 'h' ? 0.012 : len, dir, t: 0.2, color: 'accent', ...o }
}
export const logoEl = (id: string, x: number, y: number, w: number, h: number, o: Partial<LogoEl> = {}): LogoEl => ({
  type: 'logo', id, x, y, w, h, color: 'text', align: 'left', ...o,
})
const side = (els: El[], o: Partial<Side> = {}): Side => ({ bg: '', border: defaultBorder(), els, ...o })

/** grid of photo slots */
export function photoGrid(prefix: string, x: number, y: number, w: number, h: number, cols: number, rows: number, gx: number, gy: number, o: Partial<PhotoEl> = {}): PhotoEl[] {
  const cw = (w - gx * (cols - 1)) / cols
  const ch = (h - gy * (rows - 1)) / rows
  const out: PhotoEl[] = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push(photoEl(`${prefix}${r * cols + c + 1}`, x + c * (cw + gx), y + r * (ch + gy), cw, ch, o))
  return out
}

export interface Preset { id: string; name: string; desc: string; build: (aspect: number) => Design }

/* ---------------------------------------------------------------- 1. classic */
const classicTheme: Theme = { bg: '#ffffff', bg2: '#f3efe6', text: '#151515', muted: '#6f6f6f', accent: GOLD, fontDisplay: 'playfair', fontBody: 'pretendard' }
function classicPortrait(): Design {
  const front = side([
    photoEl('f1', 0, 0, 1, 0.69),
    rectEl('f2', 0, 0.69, 1, 0.008),
    textEl('f3', 'name', 0.07, 0.72, 0.86, 0.1, { sz: 6.4, sz2: 2.5, font: 'display', upper: true, ls: 5, valign: 'middle' }),
    textEl('f4', 'stats', 0.07, 0.835, 0.86, 0.09, { sz: 3, sz2: 1.5, rowStyle: 'grid', cols: 5, weight: 500 }),
    lineEl('f5', 0.07, 0.938, 0.86, { color: 'muted', t: 0.08 }),
    textEl('f6', 'agency', 0.07, 0.945, 0.86, 0.035, { sz: 1.45, rowStyle: 'inline', valign: 'middle', font: 'display', color2: 'muted' }),
  ])
  const back = side([
    ...photoGrid('b', 0.05, 0.05, 0.9, 0.705, 3, 2, 0.016, 0.016),
    rectEl('b7', 0.05, 0.785, 0.9, 0.004),
    textEl('b8', 'name', 0.05, 0.8, 0.42, 0.065, { sz: 3.6, sz2: 1.7, font: 'display', upper: true, ls: 4, valign: 'middle' }),
    textEl('b9', 'stats', 0.05, 0.868, 0.42, 0.07, { sz: 1.9, sz2: 1.2, rowStyle: 'inline', weight: 500 }),
    textEl('b10', 'comment', 0.55, 0.797, 0.4, 0.085, { sz: 1.6, sz2: 1.2, labelMode: 'en' }),
    textEl('b11', 'career', 0.55, 0.885, 0.4, 0.06, { sz: 1.6, sz2: 1.2 }),
    textEl('b12', 'agency', 0.05, 0.948, 0.9, 0.03, { sz: 1.35, rowStyle: 'inline', valign: 'middle', font: 'display', color2: 'muted', align: 'center' }),
  ])
  const single = side([
    photoEl('s1', 0, 0, 0.62, 0.66),
    photoEl('s2', 0.635, 0, 0.365, 0.325),
    photoEl('s3', 0.635, 0.335, 0.365, 0.325),
    rectEl('s4', 0, 0.665, 1, 0.007),
    textEl('s5', 'name', 0.06, 0.69, 0.42, 0.1, { sz: 4.8, sz2: 2, font: 'display', upper: true, ls: 4, valign: 'middle' }),
    textEl('s6', 'stats', 0.06, 0.8, 0.4, 0.14, { sz: 2, sz2: 1.2, rowStyle: 'rows', weight: 500 }),
    textEl('s7', 'comment', 0.52, 0.7, 0.42, 0.13, { sz: 1.5, sz2: 1.1 }),
    textEl('s8', 'career', 0.52, 0.835, 0.42, 0.1, { sz: 1.5, sz2: 1.1 }),
    textEl('s9', 'agency', 0.06, 0.95, 0.88, 0.03, { sz: 1.3, rowStyle: 'inline', valign: 'middle', font: 'display', color2: 'muted' }),
  ])
  return { id: 'classic', name: '클래식 히어로', theme: { ...classicTheme }, sides: { front, back, single } }
}

/* ---------------------------------------------------------------- 2. minimal */
const minimalTheme: Theme = { bg: '#fafaf8', bg2: '#eeece8', text: '#1a1a1a', muted: '#8b8b8b', accent: GOLD, fontDisplay: 'montserrat', fontBody: 'pretendard' }
function minimalPortrait(): Design {
  const front = side([
    logoEl('f1', 0.06, 0.02, 0.34, 0.045, { color: 'text' }),
    photoEl('f2', 0.06, 0.075, 0.88, 0.72),
    textEl('f3', 'name', 0.06, 0.812, 0.88, 0.065, { sz: 4.4, sz2: 1.9, font: 'display', weight: 300, upper: true, ls: 14, valign: 'middle' }),
    textEl('f4', 'stats', 0.06, 0.885, 0.88, 0.05, { sz: 1.9, sz2: 1.1, rowStyle: 'inline', weight: 400, color2: 'accent' }),
    rectEl('f5', 0.06, 0.94, 0.07, 0.003),
    textEl('f6', 'agency', 0.06, 0.95, 0.88, 0.028, { sz: 1.25, rowStyle: 'inline', valign: 'middle', color: 'muted', color2: 'muted' }),
  ])
  const back = side([
    logoEl('b1', 0.06, 0.02, 0.34, 0.045, { color: 'text' }),
    photoEl('b2', 0.06, 0.075, 0.56, 0.62),
    ...photoGrid('b', 0.635, 0.075, 0.305, 0.62, 1, 3, 0.01, 0.012).map((p, i) => ({ ...p, id: `b${i + 3}` })),
    textEl('b6', 'name', 0.06, 0.72, 0.5, 0.05, { sz: 3, sz2: 1.4, font: 'display', weight: 300, upper: true, ls: 12, valign: 'middle' }),
    textEl('b7', 'comment', 0.06, 0.78, 0.55, 0.11, { sz: 1.6, sz2: 1.1 }),
    textEl('b8', 'career', 0.06, 0.885, 0.55, 0.06, { sz: 1.6, sz2: 1.1 }),
    textEl('b9', 'stats', 0.67, 0.72, 0.27, 0.22, { sz: 1.9, sz2: 1.1, rowStyle: 'rows', align: 'left' }),
    textEl('b10', 'agency', 0.06, 0.95, 0.88, 0.028, { sz: 1.25, rowStyle: 'inline', valign: 'middle', color: 'muted', color2: 'muted' }),
  ])
  const single = side([
    logoEl('s1', 0.06, 0.02, 0.34, 0.045, { color: 'text' }),
    photoEl('s2', 0.06, 0.075, 0.56, 0.54),
    photoEl('s3', 0.635, 0.075, 0.305, 0.265),
    photoEl('s4', 0.635, 0.35, 0.305, 0.265),
    textEl('s5', 'name', 0.06, 0.64, 0.88, 0.06, { sz: 3.6, sz2: 1.6, font: 'display', weight: 300, upper: true, ls: 12, valign: 'middle' }),
    textEl('s6', 'stats', 0.06, 0.71, 0.88, 0.05, { sz: 1.8, sz2: 1.05, rowStyle: 'inline' }),
    textEl('s7', 'comment', 0.06, 0.78, 0.88, 0.1, { sz: 1.5, sz2: 1.05 }),
    textEl('s8', 'career', 0.06, 0.88, 0.88, 0.06, { sz: 1.5, sz2: 1.05 }),
    textEl('s9', 'agency', 0.06, 0.95, 0.88, 0.028, { sz: 1.2, rowStyle: 'inline', valign: 'middle', color: 'muted', color2: 'muted' }),
  ])
  return { id: 'minimal', name: '미니멀 화이트', theme: { ...minimalTheme }, sides: { front, back, single } }
}

/* ---------------------------------------------------------------- 3. black & gold */
const bgTheme: Theme = { bg: '#0d0d0d', bg2: '#1a1a1a', text: '#f3efe6', muted: '#a39b86', accent: GOLD, fontDisplay: 'bodoni', fontBody: 'pretendard' }
function blackGoldPortrait(): Design {
  const brd = { on: true, inset: 2.2, w: 0.2, color: 'accent' }
  const front = side([
    photoEl('f1', 0.07, 0.07, 0.86, 0.65, { bw: 0.22, bc: 'accent' }),
    textEl('f2', 'name', 0.07, 0.745, 0.86, 0.095, { sz: 6.4, sz2: 2.3, font: 'display', upper: true, ls: 9, align: 'center', color: 'accent', color2: 'muted', valign: 'middle' }),
    lineEl('f3', 0.36, 0.848, 0.28, { t: 0.14 }),
    textEl('f4', 'stats', 0.07, 0.862, 0.86, 0.06, { sz: 1.9, sz2: 1.15, rowStyle: 'inline', align: 'center', weight: 400, color2: 'accent' }),
    textEl('f5', 'agency', 0.07, 0.932, 0.86, 0.03, { sz: 1.3, rowStyle: 'inline', align: 'center', valign: 'middle', font: 'display', color2: 'muted' }),
  ], { border: brd })
  const back = side([
    photoEl('b1', 0.07, 0.07, 0.5, 0.58, { bw: 0.2 }),
    ...photoGrid('b', 0.585, 0.07, 0.345, 0.58, 2, 2, 0.012, 0.01, { bw: 0.2 }).map((p, i) => ({ ...p, id: `b${i + 2}` })),
    lineEl('b6', 0.07, 0.675, 0.86, { t: 0.14 }),
    textEl('b7', 'name', 0.07, 0.69, 0.4, 0.06, { sz: 3.4, sz2: 1.5, font: 'display', upper: true, ls: 6, color: 'accent', color2: 'muted', valign: 'middle' }),
    textEl('b8', 'stats', 0.07, 0.76, 0.36, 0.17, { sz: 1.9, sz2: 1.15, rowStyle: 'rows' }),
    textEl('b9', 'comment', 0.5, 0.695, 0.43, 0.1, { sz: 1.55, sz2: 1.15 }),
    textEl('b10', 'career', 0.5, 0.805, 0.43, 0.12, { sz: 1.55, sz2: 1.15 }),
    textEl('b11', 'agency', 0.07, 0.935, 0.86, 0.03, { sz: 1.3, rowStyle: 'inline', align: 'center', valign: 'middle', font: 'display', color2: 'muted' }),
  ], { border: brd })
  const single = side([
    photoEl('s1', 0.07, 0.07, 0.56, 0.55, { bw: 0.2 }),
    photoEl('s2', 0.64, 0.07, 0.29, 0.268, { bw: 0.2 }),
    photoEl('s3', 0.64, 0.352, 0.29, 0.268, { bw: 0.2 }),
    textEl('s4', 'name', 0.07, 0.64, 0.86, 0.08, { sz: 4.8, sz2: 1.9, font: 'display', upper: true, ls: 8, align: 'center', color: 'accent', color2: 'muted', valign: 'middle' }),
    textEl('s5', 'stats', 0.07, 0.725, 0.86, 0.05, { sz: 1.8, sz2: 1.1, rowStyle: 'inline', align: 'center' }),
    lineEl('s6', 0.36, 0.782, 0.28, { t: 0.14 }),
    textEl('s7', 'comment', 0.1, 0.795, 0.8, 0.085, { sz: 1.45, sz2: 1.1, align: 'center' }),
    textEl('s8', 'career', 0.1, 0.88, 0.8, 0.05, { sz: 1.45, sz2: 1.1, align: 'center' }),
    textEl('s9', 'agency', 0.07, 0.935, 0.86, 0.03, { sz: 1.25, rowStyle: 'inline', align: 'center', valign: 'middle', font: 'display', color2: 'muted' }),
  ], { border: brd })
  return { id: 'blackgold', name: '블랙 & 골드 매거진', theme: { ...bgTheme }, sides: { front, back, single } }
}

/* ---------------------------------------------------------------- 4. split */
const splitTheme: Theme = { bg: '#ffffff', bg2: '#121212', text: '#141414', muted: '#7d7d7d', accent: GOLD, fontDisplay: 'cormorant', fontBody: 'pretendard' }
const LIGHT = '#f3efe6', LIGHT2 = '#b9b2a0'
function splitPortrait(): Design {
  const front = side([
    rectEl('f1', 0, 0, 0.42, 1, { fill: 'bg2' }),
    photoEl('f2', 0.42, 0, 0.58, 1),
    logoEl('f3', 0.07, 0.04, 0.28, 0.05, { color: 'accent' }),
    textEl('f4', 'name', 0.07, 0.36, 0.31, 0.22, { sz: 6.4, sz2: 2.4, font: 'display', weight: 600, upper: true, ls: 3, color: LIGHT, color2: LIGHT2, valign: 'bottom' }),
    lineEl('f5', 0.07, 0.6, 0.12, { t: 0.2 }),
    textEl('f6', 'stats', 0.07, 0.625, 0.31, 0.22, { sz: 2.4, sz2: 1.3, rowStyle: 'rows', color: LIGHT, color2: 'accent' }),
    textEl('f7', 'agency', 0.07, 0.885, 0.31, 0.09, { sz: 1.2, rowStyle: 'stack', color: LIGHT, color2: LIGHT2, valign: 'bottom', font: 'body' }),
  ])
  const back = side([
    rectEl('b1', 0, 0, 0.42, 1, { fill: 'bg2' }),
    ...photoGrid('b', 0.44, 0.03, 0.53, 0.94, 2, 2, 0.015, 0.012).map((p, i) => ({ ...p, id: `b${i + 2}` })),
    textEl('b6', 'name', 0.07, 0.05, 0.31, 0.09, { sz: 3.6, sz2: 1.6, font: 'display', weight: 600, upper: true, ls: 3, color: LIGHT, color2: LIGHT2, valign: 'top' }),
    lineEl('b7', 0.07, 0.15, 0.12, { t: 0.2 }),
    textEl('b8', 'comment', 0.07, 0.18, 0.31, 0.38, { sz: 1.7, sz2: 1.15, color: LIGHT, color2: 'accent' }),
    textEl('b9', 'career', 0.07, 0.58, 0.31, 0.26, { sz: 1.7, sz2: 1.15, color: LIGHT, color2: 'accent' }),
    textEl('b10', 'agency', 0.07, 0.885, 0.31, 0.09, { sz: 1.2, rowStyle: 'stack', color: LIGHT, color2: LIGHT2, valign: 'bottom' }),
  ])
  const single = side([
    rectEl('s1', 0, 0, 0.38, 1, { fill: 'bg2' }),
    photoEl('s2', 0.38, 0, 0.62, 0.62),
    photoEl('s3', 0.38, 0.62, 0.31, 0.38),
    photoEl('s4', 0.69, 0.62, 0.31, 0.38),
    textEl('s5', 'name', 0.06, 0.05, 0.28, 0.14, { sz: 5, sz2: 1.8, font: 'display', weight: 600, upper: true, ls: 2, color: LIGHT, color2: LIGHT2 }),
    lineEl('s6', 0.06, 0.205, 0.1, { t: 0.2 }),
    textEl('s7', 'stats', 0.06, 0.225, 0.28, 0.22, { sz: 1.9, sz2: 1.1, rowStyle: 'rows', color: LIGHT, color2: 'accent' }),
    textEl('s8', 'comment', 0.06, 0.47, 0.28, 0.25, { sz: 1.4, sz2: 1.05, color: LIGHT, color2: 'accent' }),
    textEl('s9', 'career', 0.06, 0.73, 0.28, 0.14, { sz: 1.4, sz2: 1.05, color: LIGHT, color2: 'accent' }),
    textEl('s10', 'agency', 0.06, 0.89, 0.28, 0.085, { sz: 1.1, rowStyle: 'stack', color: LIGHT, color2: LIGHT2, valign: 'bottom' }),
  ])
  return { id: 'split', name: '스플릿 레이아웃', theme: { ...splitTheme }, sides: { front, back, single } }
}

/* ---------------------------------------------------------------- landscape (generic) */
function landscape(base: Design, kind: 'classic' | 'minimal' | 'blackgold' | 'split'): Design {
  const th = base.theme
  const dark = kind === 'blackgold' || kind === 'split'
  const tc = kind === 'split' ? LIGHT : 'text'
  const tc2 = kind === 'split' ? LIGHT2 : 'muted'
  const nameStyle: Partial<TextEl> = { font: 'display', upper: true, ls: kind === 'minimal' ? 12 : 5, weight: kind === 'minimal' ? 300 : 400, color: kind === 'blackgold' ? 'accent' : tc, color2: tc2 }
  const bor = kind === 'blackgold' ? { on: true, inset: 2.2, w: 0.2, color: 'accent' } : defaultBorder()
  const pad = kind === 'blackgold' ? 0.045 : kind === 'minimal' ? 0.04 : 0
  const panel = kind === 'split' ? [rectEl('f0', 0, 0, 0.5, 1, { fill: 'bg2' })] : []
  const tx = kind === 'split' ? 0.05 : 0.54
  const photoR = kind === 'split' ? 0.5 : 0
  const front = side([
    ...panel,
    ...(kind === 'split'
      ? [photoEl('f1', photoR, 0, 0.5, 1)]
      : [photoEl('f1', pad, pad * 1.4, 0.46 - pad, 1 - pad * 2.8, kind === 'blackgold' ? { bw: 0.22 } : {})]),
    textEl('f2', 'name', tx, 0.12, 0.4, 0.2, { sz: 5.8, sz2: 2.2, valign: 'bottom', ...nameStyle }),
    lineEl('f3', tx, 0.345, 0.12, { t: 0.2 }),
    textEl('f4', 'stats', tx, 0.38, 0.4, 0.4, { sz: 2.4, sz2: 1.3, rowStyle: 'rows', color: tc, color2: 'accent', weight: 500 }),
    textEl('f5', 'agency', tx, 0.84, 0.42, 0.1, { sz: 1.3, rowStyle: 'stack', valign: 'bottom', color: tc, color2: tc2 }),
  ], { bg: '', border: bor })
  const cells = photoGrid('b', pad || 0.03, (pad || 0.03) * 1.4, 1 - 2 * (pad || 0.03), 0.58, 4, 1, 0.014, 0, kind === 'blackgold' ? { bw: 0.2 } : {})
  const back = side([
    ...cells,
    textEl('b5', 'name', 0.04 + pad, 0.7, 0.3, 0.12, { sz: 3.4, sz2: 1.5, valign: 'middle', ...nameStyle }),
    textEl('b6', 'stats', 0.04 + pad, 0.83, 0.3, 0.15, { sz: 1.8, sz2: 1.1, rowStyle: 'inline', color: tc, color2: 'accent' }),
    textEl('b7', 'comment', 0.4, 0.7, 0.3, 0.2, { sz: 1.6, sz2: 1.1, color: tc, color2: 'accent' }),
    textEl('b8', 'career', 0.72, 0.7, 0.24 - pad / 2, 0.2, { sz: 1.6, sz2: 1.1, color: tc, color2: 'accent' }),
    textEl('b9', 'agency', 0.4, 0.92, 0.56 - pad / 2, 0.05, { sz: 1.25, rowStyle: 'inline', valign: 'middle', color: tc, color2: tc2, align: 'right' }),
  ], { border: bor, bg: kind === 'split' ? 'bg2' : '' })
  const single = side([
    ...(kind === 'split' ? [rectEl('s0', 0, 0, 0.36, 1, { fill: 'bg2' })] : []),
    photoEl('s1', kind === 'split' ? 0.36 : 0.03, kind === 'split' ? 0 : 0.05, kind === 'split' ? 0.3 : 0.3, kind === 'split' ? 1 : 0.9),
    photoEl('s2', kind === 'split' ? 0.665 : 0.345, kind === 'split' ? 0 : 0.05, kind === 'split' ? 0.335 : 0.18, kind === 'split' ? 0.5 : 0.44),
    photoEl('s3', kind === 'split' ? 0.665 : 0.345, kind === 'split' ? 0.5 : 0.51, kind === 'split' ? 0.335 : 0.18, kind === 'split' ? 0.5 : 0.44),
    textEl('s4', 'name', kind === 'split' ? 0.04 : 0.56, 0.06, kind === 'split' ? 0.28 : 0.4, 0.15, { sz: 4.6, sz2: 1.8, valign: 'bottom', ...nameStyle }),
    textEl('s5', 'stats', kind === 'split' ? 0.04 : 0.56, 0.24, kind === 'split' ? 0.28 : 0.4, 0.3, { sz: 1.9, sz2: 1.1, rowStyle: 'rows', color: tc, color2: 'accent' }),
    textEl('s6', 'comment', kind === 'split' ? 0.04 : 0.56, 0.56, kind === 'split' ? 0.28 : 0.4, 0.2, { sz: 1.4, sz2: 1.05, color: tc, color2: 'accent' }),
    textEl('s7', 'career', kind === 'split' ? 0.04 : 0.56, 0.77, kind === 'split' ? 0.28 : 0.4, 0.1, { sz: 1.4, sz2: 1.05, color: tc, color2: 'accent' }),
    textEl('s8', 'agency', kind === 'split' ? 0.04 : 0.56, 0.9, kind === 'split' ? 0.28 : 0.4, 0.07, { sz: 1.1, rowStyle: 'stack', valign: 'bottom', color: tc, color2: tc2 }),
  ], { border: bor })
  void dark; void th
  return { ...base, sides: { front, back, single } }
}

const wrap = (id: 'classic' | 'minimal' | 'blackgold' | 'split', p: () => Design) => (aspect: number) => (aspect > 1.1 ? landscape(p(), id) : p())
export const PRESETS: Preset[] = [
  { id: 'classic', name: '클래식 히어로', desc: '앞면 큰 대표 사진 + 뒷면 6컷 그리드, 화이트 & 골드', build: wrap('classic', classicPortrait) },
  { id: 'minimal', name: '미니멀 화이트', desc: '여백 중심의 가는 서체, 앞면 1컷 + 뒷면 4컷', build: wrap('minimal', minimalPortrait) },
  { id: 'blackgold', name: '블랙 & 골드 매거진', desc: '블랙 배경 + 골드 라인, 보그 스타일 세리프', build: wrap('blackgold', blackGoldPortrait) },
  { id: 'split', name: '스플릿 레이아웃', desc: '좌측 정보 패널 / 우측 풀 사진, 뒷면 4컷', build: wrap('split', splitPortrait) },
]
export function buildPreset(id: string, aspect: number): Design {
  const p = PRESETS.find((x) => x.id === id) ?? PRESETS[0]
  const d = p.build(aspect)
  d.id = p.id
  return d
}
export const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o))
