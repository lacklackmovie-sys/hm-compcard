import type { Design, El, Project, Side, SideKey, Theme } from './types'
import { buildPreset, clone, defaultBorder, lineEl, logoEl, photoEl, rectEl, textEl } from './templates'
import { FONTS } from './fonts'

export const aspectOf = (p: Project) => p.size.w / p.size.h

const memo = new Map<string, Design>()
/** The design currently used for rendering */
export function designOf(p: Project): Design {
  if (p.mode === 'custom' && p.design) return p.design
  const a = Math.round(aspectOf(p) * 1000) / 1000
  const key = `${p.presetId}|${a > 1.1 ? 'L' : 'P'}`
  let d = memo.get(key)
  if (!d) { d = buildPreset(p.presetId, a); memo.set(key, d) }
  return d
}
export function presetDesign(id: string, aspect: number): Design { return clone(buildPreset(id, aspect)) }

export const activeSides = (p: Project): SideKey[] => (p.sides === 2 ? ['front', 'back'] : ['single'])
export const SIDE_LABEL: Record<SideKey, string> = { front: '앞면', back: '뒷면', single: '단면' }

export function photoSlots(p: Project, d: Design = designOf(p)): { side: SideKey; id: string; w: number; h: number }[] {
  const out: { side: SideKey; id: string; w: number; h: number }[] = []
  for (const k of activeSides(p)) for (const e of d.sides[k].els) if (e.type === 'photo' && !e.hidden) out.push({ side: k, id: e.id, w: e.w, h: e.h })
  return out
}

let seq = 0
export const uid = (pre = 'e') => `${pre}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

/* ---------- sanitising imported designs ---------- */
const num = (v: unknown, d: number, lo = -1e4, hi = 1e4) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d)
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d)
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)
const fontKeys = new Set(FONTS.map((f) => f.key))
const fontKey = (v: unknown, d: string) => (typeof v === 'string' && (fontKeys.has(v) || v === 'display' || v === 'body') ? v : d)
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d)

function sanitizeEl(r: any, used: Set<string>): El | null {
  if (!r || typeof r !== 'object') return null
  let id = str(r.id, '')
  if (!id || used.has(id)) id = uid('e')
  used.add(id)
  const x = num(r.x, 0, -1, 2), y = num(r.y, 0, -1, 2), w = num(r.w, 0.2, 0, 3), h = num(r.h, 0.2, 0, 3)
  const hidden = r.hidden === true ? true : undefined
  switch (r.type) {
    case 'photo': return { ...photoEl(id, x, y, w, h), radius: num(r.radius, 0, 0, 50), bw: num(r.bw, 0, 0, 10), bc: str(r.bc, 'accent'), hidden }
    case 'rect': return { ...rectEl(id, x, y, w, h), fill: str(r.fill, 'accent'), op: num(r.op, 1, 0, 1), sc: str(r.sc, 'accent'), sw: num(r.sw, 0, 0, 10), hidden }
    case 'line': { const dir = oneOf(r.dir, ['h', 'v'] as const, 'h'); return { ...lineEl(id, x, y, 0.1, { dir }), x, y, w, h, t: num(r.t, 0.2, 0.02, 5), color: str(r.color, 'accent'), hidden } }
    case 'logo': return { ...logoEl(id, x, y, w, h), color: str(r.color, 'text'), align: oneOf(r.align, ['left', 'center', 'right'] as const, 'left'), hidden }
    case 'text': {
      const kind = oneOf(r.kind, ['name', 'stats', 'comment', 'career', 'agency', 'free'] as const, 'free')
      const b = textEl(id, kind, x, y, w, h)
      return {
        ...b, hidden,
        sz: num(r.sz, b.sz, 0.3, 40), sz2: num(r.sz2, b.sz2, 0.3, 40), font: fontKey(r.font, 'body'),
        weight: num(r.weight, 400, 100, 900), color: str(r.color, 'text'), color2: str(r.color2, 'accent'),
        align: oneOf(r.align, ['left', 'center', 'right'] as const, 'left'), valign: oneOf(r.valign, ['top', 'middle', 'bottom'] as const, 'top'),
        ls: num(r.ls, 0, -10, 80), upper: bool(r.upper, false), lh: num(r.lh, 1.4, 0.8, 3), fit: bool(r.fit, true),
        showKo: bool(r.showKo, true), showEn: bool(r.showEn, true), nameOrder: oneOf(r.nameOrder, ['en-first', 'ko-first'] as const, 'en-first'),
        labelMode: oneOf(r.labelMode, ['en', 'ko'] as const, 'en'), rowStyle: oneOf(r.rowStyle, ['rows', 'inline', 'grid', 'stack'] as const, 'rows'),
        cols: num(r.cols, 3, 1, 6), heading: bool(r.heading, true),
        lines: { name: bool(r.lines?.name, true), email: bool(r.lines?.email, true), fax: bool(r.lines?.fax, true) },
        text: str(r.text, '').slice(0, 4000),
      }
    }
  }
  return null
}
function sanitizeSide(r: any, used: Set<string>): Side {
  const b = defaultBorder()
  return {
    bg: str(r?.bg, ''),
    border: { on: bool(r?.border?.on, false), inset: num(r?.border?.inset, b.inset, 0, 20), w: num(r?.border?.w, b.w, 0.02, 5), color: str(r?.border?.color, b.color) },
    els: (Array.isArray(r?.els) ? r.els : []).map((e: unknown) => sanitizeEl(e, used)).filter(Boolean) as El[],
  }
}
export function sanitizeDesign(r: any, fallbackName = '가져온 템플릿'): Design {
  if (!r || typeof r !== 'object' || !r.sides || typeof r.sides !== 'object') throw new Error('디자인 형식이 올바르지 않습니다')
  const t = r.theme ?? {}
  const theme: Theme = {
    bg: str(t.bg, '#ffffff'), bg2: str(t.bg2, '#f3efe6'), text: str(t.text, '#151515'), muted: str(t.muted, '#777777'), accent: str(t.accent, '#C9A227'),
    fontDisplay: fontKey(t.fontDisplay, 'playfair'), fontBody: fontKey(t.fontBody, 'pretendard'),
  }
  const used = new Set<string>()
  return { id: uid('d'), name: str(r.name, fallbackName).slice(0, 60) || fallbackName, theme, sides: { front: sanitizeSide(r.sides.front, used), back: sanitizeSide(r.sides.back, used), single: sanitizeSide(r.sides.single, used) } }
}
