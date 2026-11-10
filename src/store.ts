import { create } from 'zustand'
import type { Agency, Assign, CardSize, Design, El, ModelInfo, PhotoMeta, Project, ShowMap, SideKey, UserTemplate } from './types'
import * as db from './db'
import { arrangeInto } from './arrange'
import { aspectOf, activeSides, designOf, photoSlots, presetDesign, sanitizeDesign, uid } from './design'
import { clone } from './templates'
import { loadFonts } from './fonts'
import { detectFace, preloadFace, faceStatus, faceListeners } from './face'
import type { Img } from './render'

export const SIZE_PRESETS: { id: string; label: string; size: CardSize }[] = [
  { id: 'comp', label: '컴카드 표준 5.5×8.5 inch', size: { w: 139.7, h: 215.9, unit: 'mm' } },
  { id: 'a5', label: 'A5 (148×210 mm)', size: { w: 148, h: 210, unit: 'mm' } },
  { id: 'a4', label: 'A4 (210×297 mm)', size: { w: 210, h: 297, unit: 'mm' } },
  { id: 'ig45', label: '인스타그램 4:5 (1080×1350 px)', size: { w: 1080, h: 1350, unit: 'px' } },
]

export const emptyModel = (): ModelInfo => ({ nameKo: '', nameEn: '', birth: '', height: '', weight: '', top: '', bottom: '', shoe: '', comment: '', career: '' })
export const defaultShow = (): ShowMap => ({ birth: true, height: true, weight: true, top: true, bottom: true, shoe: true, comment: true, career: true, agencyName: true, email: true, fax: true, logo: true })
export const DEFAULT_AGENCY: Agency = { name: 'HONEY MEDIA', email: 'hmagency@nate.com', fax: '0504-435-1081' }

export function newProject(name = '새 모델', agency: Agency = DEFAULT_AGENCY): Project {
  return {
    id: uid('p'), name, updated: Date.now(), model: emptyModel(), show: defaultShow(), agency: { ...agency }, hasLogo: false,
    size: { ...SIZE_PRESETS[0].size }, sides: 2, mode: 'preset', presetId: 'classic', design: null, designBase: null,
    photos: [], assign: {},
  }
}

export type Tab = 'model' | 'photo' | 'design' | 'size'
interface State {
  ready: boolean
  p: Project
  projects: Project[]
  templates: UserTemplate[]
  imgs: Map<string, Img>
  logo: Img | null
  tab: Tab
  sideKey: SideKey
  selSlot: string | null
  selEl: string | null
  saved: 'saved' | 'saving' | 'error'
  face: typeof faceStatus
  busy: string
  toast: string
  expDpi: number
  expScale: number
  expBusy: boolean
  expMsg: string
  setExp: (v: Partial<{ expDpi: number; expScale: number; expBusy: boolean; expMsg: string }>) => void
  rev: number
  init: () => Promise<void>
  mut: (fn: (p: Project) => void, opts?: { arrange?: boolean }) => void
  setTab: (t: Tab) => void
  setSide: (s: SideKey) => void
  select: (id: string | null) => void
  selectEl: (id: string | null) => void
  say: (msg: string) => void
  addPhotos: (files: File[]) => Promise<void>
  removePhoto: (id: string) => Promise<void>
  movePhoto: (id: string, dir: -1 | 1) => void
  assignPhoto: (slotId: string, photoId: string) => void
  autoArrange: () => void
  setLogo: (f: File | null) => Promise<void>
  newProj: () => Promise<void>
  openProj: (id: string) => Promise<void>
  dupProj: (id: string) => Promise<void>
  delProj: (id: string) => Promise<void>
  renameProj: (id: string, name: string) => Promise<void>
  fillSample: () => Promise<void>
  /* design */
  setPreset: (id: string) => void
  startCustom: () => void
  setMode: (m: 'preset' | 'custom') => void
  resetDesign: () => void
  freshFromPreset: () => void
  mutDesign: (fn: (d: Design) => void) => void
  mutEl: (id: string, fn: (e: El) => void) => void
  /* user templates */
  saveAsTemplate: (name: string) => Promise<void>
  useTemplate: (id: string) => void
  dupTemplate: (id: string) => Promise<void>
  renameTemplate: (id: string, name: string) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  importTemplates: (text: string) => Promise<number>
  updateTemplate: (id: string) => Promise<void>
}

let saveTimer: number | undefined
const PREVIEW_MAX = 1600

async function decode(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob, { imageOrientation: 'from-image' })
}
function shrink(bmp: ImageBitmap, max: number): ImageBitmap | Promise<ImageBitmap> {
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  if (k >= 1) return bmp
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
  const g = c.getContext('2d')!
  g.imageSmoothingQuality = 'high'
  g.drawImage(bmp, 0, 0, c.width, c.height)
  return createImageBitmap(c)
}
async function toImg(blob: Blob, max = PREVIEW_MAX): Promise<{ img: Img; w: number; h: number; full: ImageBitmap; closeFull: () => void }> {
  const full = await decode(blob)
  const small = await shrink(full, max)
  return { img: { src: small, w: small.width, h: small.height }, w: full.width, h: full.height, full, closeFull: () => { if ((small as unknown) !== (full as unknown)) full.close?.() } }
}

const sampleSvgs = (): { name: string; color: [string, string]; pose: number }[] => [
  { name: 'sample-1.jpg', color: ['#d9cfc0', '#8a7b66'], pose: 0 },
  { name: 'sample-2.jpg', color: ['#c9d3d8', '#6b7f8a'], pose: 1 },
  { name: 'sample-3.jpg', color: ['#e0d0d0', '#9b6f6f'], pose: 2 },
  { name: 'sample-4.jpg', color: ['#d2d8c8', '#7c8a6b'], pose: 0 },
  { name: 'sample-5.jpg', color: ['#d8d0e0', '#7a6b9b'], pose: 1 },
  { name: 'sample-6.jpg', color: ['#e0dcc8', '#9b8f5a'], pose: 2 },
]
export async function makeSampleFile(i: number, w = 1200, h = 1600): Promise<File> {
  const s = sampleSvgs()[i % 6]
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d')!
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, s.color[0]); gr.addColorStop(1, s.color[1])
  g.fillStyle = gr; g.fillRect(0, 0, w, h)
  g.fillStyle = 'rgba(255,255,255,0.10)'
  for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(w * (0.1 + 0.18 * k), h * (0.9 - 0.12 * k), w * 0.22, 0, 7); g.fill() }
  // generic silhouette placeholder (not a real person)
  g.fillStyle = 'rgba(30,30,30,0.55)'
  const cx = w * (s.pose === 1 ? 0.45 : s.pose === 2 ? 0.56 : 0.5)
  g.beginPath(); g.ellipse(cx, h * 0.26, w * 0.1, h * 0.075, 0, 0, 7); g.fill()
  g.beginPath(); g.moveTo(cx - w * 0.04, h * 0.32); g.lineTo(cx + w * 0.04, h * 0.32); g.lineTo(cx + w * 0.3, h * 0.55); g.lineTo(cx + w * 0.2, h * 1.02); g.lineTo(cx - w * 0.2, h * 1.02); g.lineTo(cx - w * 0.3, h * 0.55); g.closePath(); g.fill()
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.font = `600 ${w * 0.05}px sans-serif`; g.textAlign = 'center'
  g.fillText(`SAMPLE ${i + 1}`, w / 2, h * 0.07)
  const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.9))
  return new File([blob], s.name, { type: 'image/jpeg' })
}

export const useStore = create<State>()((set, get) => {
  const scheduleSave = () => {
    set({ saved: 'saving' })
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(async () => {
      try {
        const p = { ...get().p, updated: Date.now() }
        await db.saveProject(p)
        await db.kvSet('last', p.id)
        set((s) => ({ saved: 'saved', projects: [p, ...s.projects.filter((x) => x.id !== p.id)].sort((a, b) => b.updated - a.updated) }))
      } catch (e) { console.error(e); set({ saved: 'error' }) }
    }, 450)
  }
  const flush = async () => {
    window.clearTimeout(saveTimer)
    const p = { ...get().p, updated: Date.now() }
    await db.saveProject(p)
  }
  const loadImgs = async (p: Project) => {
    const imgs = new Map<string, Img>()
    for (const m of p.photos) {
      const r = await db.getPhoto(m.id)
      if (!r) continue
      try { const t = await toImg(r.blob); imgs.set(m.id, t.img); t.closeFull() } catch (e) { console.warn(e) }
    }
    let logo: Img | null = null
    if (p.hasLogo) {
      const r = await db.getPhoto(`logo:${p.id}`)
      if (r) { try { const t = await toImg(r.blob, 800); logo = t.img } catch { /* ignore */ } }
    }
    set({ imgs, logo })
  }
  const useProject = async (p: Project) => {
    set({ p, selSlot: null, selEl: null, sideKey: p.sides === 2 ? 'front' : 'single', imgs: new Map(), logo: null })
    await loadImgs(p)
    set((s) => ({ rev: s.rev + 1 }))
  }

  return {
    ready: false, p: newProject(), projects: [], templates: [], imgs: new Map(), logo: null,
    tab: 'model', sideKey: 'front', selSlot: null, selEl: null, saved: 'saved', face: 'idle', busy: '', toast: '', rev: 0, expDpi: 300, expScale: 1, expBusy: false, expMsg: '',

    setExp: (v) => set(v),

    say: (msg) => { set({ toast: msg }); window.setTimeout(() => { if (get().toast === msg) set({ toast: '' }) }, 3500) },

    init: async () => {
      await loadFonts()
      faceListeners.add(() => set({ face: faceStatus }))
      const [projects, templates, last, ag] = await Promise.all([db.listProjects(), db.listTemplates(), db.kvGet<string>('last'), db.kvGet<Agency>('agency')])
      if (ag) DEFAULT_AGENCY.name = ag.name, DEFAULT_AGENCY.email = ag.email, DEFAULT_AGENCY.fax = ag.fax
      projects.sort((a, b) => b.updated - a.updated)
      let p = projects.find((x) => x.id === last) ?? projects[0]
      if (!p) { p = newProject('새 모델 1'); await db.saveProject(p); projects.unshift(p) }
      set({ projects, templates: templates.sort((a, b) => b.updated - a.updated), ready: true })
      await useProject(p)
      preloadFace()
    },

    mut: (fn, opts) => {
      const p = clone(get().p) as Project
      fn(p)
      if (opts?.arrange) arrangeInto(p, false)
      set({ p })
      scheduleSave()
    },
    setTab: (t) => set({ tab: t, selEl: t === 'design' ? get().selEl : null }),
    setSide: (s) => set({ sideKey: s, selSlot: null, selEl: null }),
    select: (id) => set({ selSlot: id }),
    selectEl: (id) => set({ selEl: id }),

    addPhotos: async (files) => {
      const imgsFiles = files.filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|avif)$/i.test(f.name))
      if (!imgsFiles.length) { get().say('이미지 파일만 추가할 수 있어요'); return }
      set({ busy: `사진 ${imgsFiles.length}장 처리 중…` })
      const pid = get().p.id
      const metas: PhotoMeta[] = []
      const newImgs = new Map(get().imgs)
      for (const f of imgsFiles) {
        try {
          let blob: Blob = f
          const t = await toImg(f)
          let { w, h } = t
          if (Math.max(w, h) > 4096) { // keep storage reasonable
            const big = await shrink(t.full, 4096)
            const c = document.createElement('canvas'); c.width = big.width; c.height = big.height
            c.getContext('2d')!.drawImage(big, 0, 0)
            blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.93))
            w = big.width; h = big.height
          }
          const id = uid('ph')
          await db.putPhoto({ id, projectId: pid, blob })
          const face = await detectFace(t.full)
          t.closeFull()
          metas.push({ id, name: f.name, w, h, face })
          newImgs.set(id, t.img)
        } catch (e) {
          console.warn(e)
          get().say(`${f.name}: 읽을 수 없는 사진이에요`)
        }
      }
      set({ imgs: newImgs, busy: '' })
      if (get().p.id === pid) get().mut((p) => { p.photos.push(...metas); arrangeInto(p, false) })
    },
    removePhoto: async (id) => {
      await db.delPhoto(id)
      const imgs = new Map(get().imgs); imgs.delete(id); set({ imgs })
      get().mut((p) => {
        p.photos = p.photos.filter((x) => x.id !== id)
        for (const k of Object.keys(p.assign)) if (p.assign[k].photoId === id) delete p.assign[k]
        arrangeInto(p, false)
      })
    },
    movePhoto: (id, dir) => get().mut((p) => {
      const i = p.photos.findIndex((x) => x.id === id), j = i + dir
      if (i < 0 || j < 0 || j >= p.photos.length) return
      ;[p.photos[i], p.photos[j]] = [p.photos[j], p.photos[i]]
      // 순서를 바꾸면 직접 지정한 칸도 풀고, 목록 순서(#1 → 대표 칸 …)대로 다시 배치한다
      arrangeInto(p, true)
    }),
    assignPhoto: (slotId, photoId) => get().mut((p) => {
      const slots = photoSlots(p).map((s) => s.id)
      const cur = p.assign[slotId]
      const other = slots.find((id) => id !== slotId && p.assign[id]?.photoId === photoId)
      const keep: Assign = { photoId, zoom: 1, pinned: true }
      if (other) { // swap with the slot that currently shows this photo
        if (cur) p.assign[other] = { photoId: cur.photoId, zoom: 1, pinned: true }
        else delete p.assign[other]
      }
      p.assign[slotId] = keep
    }),
    autoArrange: () => { get().mut((p) => arrangeInto(p, true)); get().say('사진을 자동으로 다시 배치했어요') },

    setLogo: async (f) => {
      const pid = get().p.id
      if (!f) {
        await db.delPhoto(`logo:${pid}`)
        set({ logo: null }); get().mut((p) => { p.hasLogo = false }); return
      }
      try {
        const t = await toImg(f, 1200)
        t.closeFull()
        await db.putPhoto({ id: `logo:${pid}`, projectId: pid, blob: f })
        set({ logo: t.img }); get().mut((p) => { p.hasLogo = true; p.show.logo = true })
      } catch { get().say('로고 이미지를 읽을 수 없어요') }
    },

    newProj: async () => {
      await flush()
      const p = newProject(`새 모델 ${get().projects.length + 1}`, { ...DEFAULT_AGENCY })
      // inherit the card size/design choice of the current project for convenience
      const cur = get().p
      p.size = { ...cur.size }; p.sides = cur.sides; p.presetId = cur.presetId
      await db.saveProject(p); await db.kvSet('last', p.id)
      set((s) => ({ projects: [p, ...s.projects] }))
      await useProject(p)
      get().setTab('model')
    },
    openProj: async (id) => {
      await flush()
      const p = await db.getProject(id)
      if (!p) return
      await db.kvSet('last', id)
      await useProject(p)
    },
    dupProj: async (id) => {
      await flush()
      const src = await db.getProject(id); if (!src) return
      const p = clone(src) as Project
      p.id = uid('p'); p.name = `${src.name} 복사본`; p.updated = Date.now()
      const idMap = new Map<string, string>()
      p.photos = p.photos.map((m) => { const nid = uid('ph'); idMap.set(m.id, nid); return { ...m, id: nid } })
      for (const k of Object.keys(p.assign)) p.assign[k].photoId = idMap.get(p.assign[k].photoId) ?? p.assign[k].photoId
      if (p.hasLogo) idMap.set(`logo:${src.id}`, `logo:${p.id}`)
      await db.copyPhotos(src.id, p.id, idMap)
      await db.saveProject(p)
      set((s) => ({ projects: [p, ...s.projects] }))
      get().say('모델을 복제했어요')
    },
    delProj: async (id) => {
      await db.deleteProject(id)
      let rest = get().projects.filter((x) => x.id !== id)
      if (!rest.length) { const p = newProject('새 모델 1', { ...DEFAULT_AGENCY }); await db.saveProject(p); rest = [p] }
      set({ projects: rest })
      if (get().p.id === id) { await db.kvSet('last', rest[0].id); await useProject(rest[0]) }
    },
    renameProj: async (id, name) => {
      const nm = name.trim() || '이름 없음'
      if (get().p.id === id) { get().mut((p) => { p.name = nm }) }
      else { const p = await db.getProject(id); if (p) { p.name = nm; await db.saveProject(p); set((s) => ({ projects: s.projects.map((x) => (x.id === id ? p : x)) })) } }
    },
    fillSample: async () => {
      get().mut((p) => {
        p.model = { nameKo: '김하니', nameEn: 'Hani Kim', birth: '2001', height: '174', weight: '48', top: '55', bottom: '26', shoe: '245',
          comment: '자연스러운 표정 연기와 다양한 포즈가 강점입니다.\n화보·룩북·쇼핑몰 촬영 다수 경험.',
          career: '2025 S/S 서울패션위크 런웨이\n2025 룩북 다수 촬영\n뷰티 브랜드 온라인 광고' }
      })
      const files: File[] = []
      for (let i = 0; i < 6; i++) files.push(await makeSampleFile(i))
      await get().addPhotos(files)
    },

    /* ---- design ---- */
    setPreset: (id) => { get().mut((p) => { p.mode = 'preset'; p.presetId = id; arrangeInto(p, true) }); set({ selEl: null }) },
    startCustom: () => get().mut((p) => {
      const base = presetDesign(p.presetId.startsWith('user:') ? 'classic' : p.presetId, aspectOf(p))
      p.design = base; p.designBase = clone(base); p.mode = 'custom'; arrangeInto(p, true)
    }),
    freshFromPreset: () => get().mut((p) => {
      const base = presetDesign(p.presetId.startsWith('user:') ? 'classic' : p.presetId, aspectOf(p))
      p.design = base; p.designBase = clone(base); p.mode = 'custom'; arrangeInto(p, true)
    }),
    setMode: (m) => {
      const p = get().p
      if (m === 'custom' && !p.design) { get().startCustom(); return }
      get().mut((q) => { q.mode = m; if (m === 'preset' && q.presetId.startsWith('user:')) q.presetId = 'classic'; arrangeInto(q, false) })
      if (m === 'preset') set({ selEl: null })
    },
    resetDesign: () => { get().mut((p) => { if (p.designBase) { p.design = clone(p.designBase); arrangeInto(p, false) } }); set({ selEl: null }); get().say('기본값으로 되돌렸어요') },
    mutDesign: (fn) => get().mut((p) => { if (p.design) fn(p.design) }, { arrange: true }),
    mutEl: (id, fn) => get().mut((p) => {
      if (!p.design) return
      for (const k of activeSides(p).concat(['single', 'front', 'back'] as SideKey[])) {
        const e = p.design.sides[k].els.find((x) => x.id === id)
        if (e) { fn(e); return }
      }
    }, { arrange: true }),

    /* ---- user templates ---- */
    saveAsTemplate: async (name) => {
      const p = get().p; if (!p.design) return
      const t: UserTemplate = { id: uid('t'), name: name.trim() || '내 템플릿', design: { ...clone(p.design), id: uid('d'), name: name.trim() || '내 템플릿' }, updated: Date.now() }
      await db.saveTemplate(t)
      set((s) => ({ templates: [t, ...s.templates] }))
      get().mut((q) => { q.presetId = `user:${t.id}`; if (q.design) q.designBase = clone(q.design) })
      get().say(`'${t.name}' 템플릿으로 저장했어요`)
    },
    updateTemplate: async (id) => {
      const p = get().p; const t = get().templates.find((x) => x.id === id); if (!p.design || !t) return
      const nt: UserTemplate = { ...t, design: { ...clone(p.design), id: t.design.id, name: t.name }, updated: Date.now() }
      await db.saveTemplate(nt)
      set((s) => ({ templates: s.templates.map((x) => (x.id === id ? nt : x)) }))
      get().mut((q) => { if (q.design) q.designBase = clone(q.design) })
      get().say(`'${t.name}' 템플릿을 현재 디자인으로 덮어썼어요`)
    },
    useTemplate: (id) => {
      const t = get().templates.find((x) => x.id === id); if (!t) return
      get().mut((p) => {
        p.design = clone(t.design); p.designBase = clone(t.design); p.mode = 'custom'; p.presetId = `user:${id}`
        arrangeInto(p, true)
      })
      set({ selEl: null })
    },
    dupTemplate: async (id) => {
      const t = get().templates.find((x) => x.id === id); if (!t) return
      const nt: UserTemplate = { id: uid('t'), name: `${t.name} 복사본`, design: { ...clone(t.design), id: uid('d') }, updated: Date.now() }
      nt.design.name = nt.name
      await db.saveTemplate(nt)
      set((s) => ({ templates: [nt, ...s.templates] }))
    },
    renameTemplate: async (id, name) => {
      const t = get().templates.find((x) => x.id === id); if (!t) return
      const nt = { ...t, name: name.trim() || t.name, updated: Date.now() }
      nt.design = { ...nt.design, name: nt.name }
      await db.saveTemplate(nt)
      set((s) => ({ templates: s.templates.map((x) => (x.id === id ? nt : x)) }))
    },
    deleteTemplate: async (id) => {
      await db.deleteTemplate(id)
      set((s) => ({ templates: s.templates.filter((x) => x.id !== id) }))
      if (get().p.presetId === `user:${id}`) get().mut((p) => { p.presetId = 'classic'; if (p.mode === 'preset') arrangeInto(p, true) })
    },
    importTemplates: async (text) => {
      let raw: any
      try { raw = JSON.parse(text) } catch { throw new Error('JSON 파일을 읽을 수 없어요') }
      if (!raw || raw.format !== 'hm-compcard-template' || !Array.isArray(raw.templates)) throw new Error('HM 컴카드 템플릿 파일이 아니에요')
      const added: UserTemplate[] = []
      for (const r of raw.templates) {
        const design = sanitizeDesign(r.design, r.name)
        const name = typeof r.name === 'string' && r.name.trim() ? r.name.trim().slice(0, 60) : design.name
        design.name = name
        const t: UserTemplate = { id: uid('t'), name, design, updated: Date.now() }
        await db.saveTemplate(t); added.push(t)
      }
      if (!added.length) throw new Error('가져올 템플릿이 없어요')
      set((s) => ({ templates: [...added, ...s.templates] }))
      return added.length
    },
  }
})

export function userTemplateId(presetId: string): string | null { return presetId.startsWith('user:') ? presetId.slice(5) : null }
export { designOf, activeSides }
