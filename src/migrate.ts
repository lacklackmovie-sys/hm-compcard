import type { ModelInfo, Project, ShowMap } from './types'
import { arrangeInto } from './arrange'

const s = (v: unknown) => (typeof v === 'string' ? v : '')

/** 예전 저장 데이터(키/가슴/허리/엉덩이/신발/머리색/눈색)를 새 항목(년생/키/상의/하의/신발)으로 옮긴다. 몇 번을 돌려도 같은 결과. */
export function migrateProject(p: Project): Project {
  const m: any = p.model ?? {}
  const model: ModelInfo = {
    nameKo: s(m.nameKo), nameEn: s(m.nameEn),
    birth: s(m.birth), height: s(m.height), weight: s(m.weight), top: s(m.top), bottom: s(m.bottom), shoe: s(m.shoe),
    comment: s(m.comment), career: s(m.career),
  }
  const o: any = p.show ?? {}
  const b = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)
  const show: ShowMap = {
    birth: b(o.birth, true), height: b(o.height, true), weight: b(o.weight, true), top: b(o.top, true), bottom: b(o.bottom, true), shoe: b(o.shoe, true),
    comment: b(o.comment, true), career: b(o.career, true), agencyName: b(o.agencyName, true), email: b(o.email, true), fax: b(o.fax, true), logo: b(o.logo, true),
  }
  const q: Project = { ...p, model, show, assign: { ...(p.assign ?? {}) }, photos: p.photos ?? [] }
  // 사진 순서가 곧 배치 순서: 불러올 때마다 목록 순서대로 다시 맞춘다(확대/위치 조정과 직접 지정 칸은 유지)
  try { arrangeInto(q, false) } catch (e) { console.warn('arrange on load failed', e) }
  return q
}
