import type { Project, SideKey } from './types'
import { activeSides, designOf } from './design'
import { drawSide, sizeToMm } from './render'
import type { Img, Scene } from './render'
import { loadFonts } from './fonts'
import * as db from './db'

export type Dpi = 150 | 300 | 600
export interface ExportSpec { dpi: number } // mm cards: dpi, px cards: scale (1,2,3)

export function pixelSize(p: Project, q: number): { w: number; h: number } {
  if (p.size.unit === 'mm') return { w: Math.round((p.size.w / 25.4) * q), h: Math.round((p.size.h / 25.4) * q) }
  return { w: Math.round(p.size.w * q), h: Math.round(p.size.h * q) }
}

async function bitmapOf(id: string): Promise<Img | null> {
  const r = await db.getPhoto(id)
  if (!r) return null
  const b = await createImageBitmap(r.blob, { imageOrientation: 'from-image' })
  return { src: b, w: b.width, h: b.height }
}

export async function renderToCanvas(p: Project, key: SideKey, q: number): Promise<HTMLCanvasElement> {
  await loadFonts()
  const { w, h } = pixelSize(p, q)
  if (w > 12000 || h > 12000 || w * h > 1.2e8) throw new Error(`이미지가 너무 큽니다 (${w}×${h}px). 해상도를 낮춰 주세요.`)
  const design = designOf(p)
  const imgs = new Map<string, Img>()
  for (const e of design.sides[key].els) {
    if (e.type !== 'photo' || e.hidden) continue
    const a = p.assign[e.id]
    if (a && !imgs.has(a.photoId)) { const i = await bitmapOf(a.photoId); if (i) imgs.set(a.photoId, i) }
  }
  const logo = p.hasLogo ? await bitmapOf(`logo:${p.id}`) : null
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const scene: Scene = { project: p, design, imgs, logo, placeholders: false }
  drawSide(c.getContext('2d')!, scene, key, w, h)
  for (const i of imgs.values()) (i.src as ImageBitmap).close?.()
  ;(logo?.src as ImageBitmap | undefined)?.close?.()
  return c
}

const blobOf = (c: HTMLCanvasElement, type: string, quality?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('이미지 변환 실패'))), type, quality))

export function safeName(s: string) { return (s.trim() || 'compcard').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60) }
export function download(blob: Blob, name: string) {
  const a = document.createElement('a')
  const url = URL.createObjectURL(blob)
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
const fileBase = (p: Project) => safeName(p.model.nameEn || p.model.nameKo || p.name)
const sideName = (k: SideKey) => (k === 'front' ? 'front' : k === 'back' ? 'back' : 'card')

export async function exportImage(p: Project, key: SideKey, fmt: 'jpg' | 'png', q: number) {
  const c = await renderToCanvas(p, key, q)
  const blob = fmt === 'jpg' ? await blobOf(c, 'image/jpeg', 0.95) : await blobOf(c, 'image/png')
  const name = `${fileBase(p)}_${sideName(key)}.${fmt}`
  download(blob, name)
  return { name, w: c.width, h: c.height, bytes: blob.size }
}
export async function exportAllImages(p: Project, fmt: 'jpg' | 'png', q: number) {
  const out = []
  for (const k of activeSides(p)) out.push(await exportImage(p, k, fmt, q))
  return out
}

export async function exportPDF(p: Project, q: number) {
  const { jsPDF } = await import('jspdf')
  const mm = sizeToMm(p.size)
  const w = Math.round(mm.w * 100) / 100, h = Math.round(mm.h * 100) / 100
  const orient = w > h ? 'l' : 'p'
  const doc = new jsPDF({ unit: 'mm', format: [Math.min(w, h), Math.max(w, h)], orientation: orient, compress: true })
  doc.setProperties({ title: `${p.model.nameEn || p.model.nameKo || p.name} comp card`, creator: 'HM Comp Card Maker' })
  const sides = activeSides(p)
  let info = { w: 0, h: 0 }
  for (let i = 0; i < sides.length; i++) {
    const c = await renderToCanvas(p, sides[i], q)
    info = { w: c.width, h: c.height }
    const blob = await blobOf(c, 'image/jpeg', 0.95)
    const data = new Uint8Array(await blob.arrayBuffer())
    if (i > 0) doc.addPage([Math.min(w, h), Math.max(w, h)], orient)
    doc.addImage(data, 'JPEG', 0, 0, w, h, undefined, 'NONE')
  }
  const out = doc.output('blob')
  const name = `${fileBase(p)}_compcard.pdf`
  download(out, name)
  return { name, pages: sides.length, w: info.w, h: info.h, bytes: out.size, mm: { w, h } }
}

export function templateJson(list: { name: string; design: unknown }[]): string {
  return JSON.stringify({ format: 'hm-compcard-template', version: 1, templates: list }, null, 2)
}
