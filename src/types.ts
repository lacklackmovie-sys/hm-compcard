export type Unit = 'mm' | 'px'
export interface CardSize { w: number; h: number; unit: Unit }
export type SideKey = 'front' | 'back' | 'single'
export type Align = 'left' | 'center' | 'right'
export type VAlign = 'top' | 'middle' | 'bottom'

export interface Theme {
  bg: string
  bg2: string
  text: string
  muted: string
  accent: string
  fontDisplay: string // font key
  fontBody: string // font key
}

interface Base {
  id: string
  x: number
  y: number
  w: number
  h: number
  hidden?: boolean
}
export interface PhotoEl extends Base {
  type: 'photo'
  radius: number // % of u
  bw: number // border width, % of u
  bc: string
}
export type TextKind = 'name' | 'stats' | 'comment' | 'career' | 'agency' | 'free'
export interface TextEl extends Base {
  type: 'text'
  kind: TextKind
  sz: number // main size, % of u
  sz2: number // secondary size, % of u
  font: string // 'display' | 'body' | font key
  weight: number
  color: string
  color2: string // label / secondary color
  align: Align
  valign: VAlign
  ls: number // letter spacing in 1/100 em
  upper: boolean
  lh: number
  fit: boolean
  showKo: boolean
  showEn: boolean
  nameOrder: 'en-first' | 'ko-first'
  labelMode: 'en' | 'ko'
  rowStyle: 'rows' | 'inline' | 'grid' | 'stack'
  cols: number
  heading: boolean
  lines: { name: boolean; email: boolean; fax: boolean }
  text: string
}
export interface RectEl extends Base {
  type: 'rect'
  fill: string
  op: number
  sc: string
  sw: number // % of u
}
export interface LineEl extends Base {
  type: 'line'
  dir: 'h' | 'v'
  t: number // % of u
  color: string
}
export interface LogoEl extends Base {
  type: 'logo'
  color: string
  align: Align
}
export type El = PhotoEl | TextEl | RectEl | LineEl | LogoEl

export interface Side {
  bg: string // '' = theme.bg
  border: { on: boolean; inset: number; w: number; color: string } // % of u
  els: El[]
}
export interface Design {
  id: string
  name: string
  theme: Theme
  sides: { front: Side; back: Side; single: Side }
}

export interface ModelInfo {
  nameKo: string
  nameEn: string
  birth: string // 년생 (e.g. 2001)
  height: string // 키 (cm)
  weight: string // 몸무게 (kg)
  top: string // 상의 사이즈 (free text)
  bottom: string // 하의 사이즈 (free text)
  shoe: string // 신발 (mm)
  comment: string
  career: string
}
export type ShowKey =
  | 'birth' | 'height' | 'weight' | 'top' | 'bottom' | 'shoe'
  | 'comment' | 'career' | 'agencyName' | 'email' | 'fax' | 'logo'
export type ShowMap = Record<ShowKey, boolean>
export interface Agency { name: string; email: string; fax: string }

export interface FaceInfo { cx: number; cy: number; fw: number; fh: number }
export interface PhotoMeta {
  id: string
  name: string
  w: number
  h: number
  face: FaceInfo | null | undefined // undefined = not yet analysed
}
export interface Assign { photoId: string; zoom: number; ox?: number; oy?: number; pinned?: boolean } // pinned = user put this photo in this slot by hand

export interface Project {
  id: string
  name: string
  updated: number
  model: ModelInfo
  show: ShowMap
  agency: Agency
  hasLogo: boolean
  size: CardSize
  sides: 1 | 2
  mode: 'preset' | 'custom'
  presetId: string
  design: Design | null // custom working copy
  designBase: Design | null // snapshot for "reset to default"
  photos: PhotoMeta[]
  assign: Record<string, Assign>
}

export interface UserTemplate { id: string; name: string; design: Design; updated: number }
