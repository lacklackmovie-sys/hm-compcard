import './fonts.css'

export interface FontDef { key: string; label: string; family: string; weights: number[]; note: string }
export const FONTS: FontDef[] = [
  { key: 'pretendard', label: 'Pretendard (한글·영문 고딕)', family: 'Pretendard Variable', weights: [300, 400, 500, 600, 700], note: '깔끔한 산세리프' },
  { key: 'playfair', label: 'Playfair Display (영문 세리프)', family: 'Playfair Display', weights: [400, 600], note: '우아한 에디토리얼' },
  { key: 'bodoni', label: 'Bodoni Moda (영문 패션 세리프)', family: 'Bodoni Moda', weights: [400, 600], note: '하이패션 매거진' },
  { key: 'cormorant', label: 'Cormorant Garamond (영문 세리프)', family: 'Cormorant Garamond', weights: [500, 600], note: '가늘고 세련된' },
  { key: 'montserrat', label: 'Montserrat (영문 산세리프)', family: 'Montserrat', weights: [300, 400, 600], note: '모던 지오메트릭' },
]
const byKey = new Map(FONTS.map((f) => [f.key, f]))

export function fontStack(key: string): string {
  const f = byKey.get(key) ?? byKey.get('pretendard')!
  // Hangul always falls back to Pretendard (bundled)
  return f.key === 'pretendard' ? `"Pretendard Variable", sans-serif` : `"${f.family}", "Pretendard Variable", sans-serif`
}

let loading: Promise<void> | null = null
export function loadFonts(): Promise<void> {
  if (loading) return loading
  loading = (async () => {
    const jobs: Promise<unknown>[] = []
    for (const f of FONTS) for (const w of f.weights) jobs.push(document.fonts.load(`${w} 24px "${f.family}"`, 'Aa가나다 0123'))
    jobs.push(document.fonts.load(`italic 400 24px "Playfair Display"`, 'Aa'))
    await Promise.all(jobs)
    await document.fonts.ready
  })()
  return loading
}
