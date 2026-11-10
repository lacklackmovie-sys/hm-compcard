import type { Project, SideKey } from './types'
import { designOf, photoSlots } from './design'

/**
 * 사진 칸 순서: 앞면(단면) 칸 → 뒷면 칸, 각 면 안에서는 큰 칸부터(같으면 디자인에 정의된 순서).
 * 사진 목록 #1 → 첫 번째(가장 큰 앞면) 칸, #2 → 두 번째 칸 … 순서 그대로 들어간다.
 */
export function orderedSlots(p: Project) {
  const rank = (k: SideKey) => (k === 'back' ? 1 : 0)
  return photoSlots(p, designOf(p)).map((s, i) => ({ ...s, i })).sort((a, b) => rank(a.side) - rank(b.side) || b.w * b.h - a.w * a.h || a.i - b.i)
}

/**
 * 사진 목록 순서대로 칸에 배정한다.
 * - 직접 지정(pinned)한 칸은 그 사진을 유지(reset=false일 때)하고, 나머지 칸이 목록 순서대로 남은 사진을 받는다.
 * - 같은 칸에 같은 사진이 계속 있으면 확대/위치 조정값도 유지한다.
 * - reset=true: 직접 지정·확대/위치를 모두 버리고 순수하게 목록 순서대로 배치한다.
 */
export function arrangeInto(p: Project, reset: boolean) {
  const slots = orderedSlots(p)
  const photoIds = new Set(p.photos.map((x) => x.id))
  const prev = p.assign
  const next: Project['assign'] = {}
  const pinnedPhotos = new Set<string>()
  if (!reset) {
    for (const s of slots) {
      const a = prev[s.id]
      if (a?.pinned && photoIds.has(a.photoId) && !pinnedPhotos.has(a.photoId)) { next[s.id] = a; pinnedPhotos.add(a.photoId) }
    }
  }
  const pool = p.photos.filter((m) => !pinnedPhotos.has(m.id))
  for (const s of slots) {
    if (next[s.id]) continue
    const m = pool.shift()
    if (!m) break
    const a = prev[s.id]
    next[s.id] = !reset && a && a.photoId === m.id ? { ...a, pinned: false } : { photoId: m.id, zoom: 1 }
  }
  p.assign = next
}
