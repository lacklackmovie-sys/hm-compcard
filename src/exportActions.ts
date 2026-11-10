import { useStore } from './store'
import { exportAllImages, exportImage, exportPDF } from './export'

export type ExportKind = 'pdf' | 'jpg' | 'png' | 'jpg-front' | 'jpg-back'
const LABEL: Record<ExportKind, string> = { pdf: 'PDF', jpg: 'JPG', png: 'PNG', 'jpg-front': '앞면 JPG', 'jpg-back': '뒷면 JPG' }

/** 상단 저장 메뉴와 ④ 패널이 함께 쓰는 저장 실행기 (해상도 설정 공유) */
export async function runExport(kind: ExportKind): Promise<void> {
  const st = useStore.getState()
  if (st.expBusy) return
  const p = st.p
  const q = p.size.unit === 'mm' ? st.expDpi : st.expScale
  st.setExp({ expBusy: true, expMsg: `${LABEL[kind]} 만드는 중…` })
  try {
    let msg = ''
    if (kind === 'pdf') {
      const r = await exportPDF(p, q)
      msg = `PDF 저장 완료: ${r.name} (${r.pages}쪽, ${r.mm.w.toFixed(1)}×${r.mm.h.toFixed(1)}mm, ${r.w}×${r.h}px, ${(r.bytes / 1e6).toFixed(1)}MB)`
    } else if (kind === 'jpg' || kind === 'png') {
      const r = await exportAllImages(p, kind, q)
      msg = `${kind.toUpperCase()} 저장 완료: ${r.map((x) => `${x.name} (${x.w}×${x.h})`).join(', ')}`
    } else {
      const r = await exportImage(p, kind === 'jpg-front' ? 'front' : 'back', 'jpg', q)
      msg = `저장 완료: ${r.name}`
    }
    useStore.getState().setExp({ expMsg: msg })
    useStore.getState().say(msg)
  } catch (e) {
    const msg = `저장 실패: ${(e as Error).message}`
    useStore.getState().setExp({ expMsg: msg }); useStore.getState().say(msg)
  } finally {
    useStore.getState().setExp({ expBusy: false })
  }
}
