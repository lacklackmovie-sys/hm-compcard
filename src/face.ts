import type { FaceInfo } from './types'

type FL = { detect: (img: ImageBitmap | HTMLCanvasElement) => { faceLandmarks: { x: number; y: number }[][] } }
let lm: Promise<FL | null> | null = null
export let faceStatus: 'idle' | 'loading' | 'ready' | 'failed' = 'idle'
export const faceListeners = new Set<() => void>()
const emit = () => faceListeners.forEach((f) => f())

function getLandmarker(): Promise<FL | null> {
  if (lm) return lm
  faceStatus = 'loading'; emit()
  lm = (async () => {
    try {
      const { FilesetResolver, FaceLandmarker } = await import('@mediapipe/tasks-vision')
      const base = import.meta.env.BASE_URL
      const fileset = await FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`)
      const l = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${base}models/face_landmarker.task`, delegate: 'CPU' },
        runningMode: 'IMAGE',
        numFaces: 4,
      })
      faceStatus = 'ready'; emit()
      return l as unknown as FL
    } catch (e) {
      console.warn('face detector unavailable', e)
      faceStatus = 'failed'; emit()
      return null
    }
  })()
  return lm
}

/** Detect the most prominent face. Returns null when none found, undefined when the detector is unavailable. */
export async function detectFace(bmp: ImageBitmap): Promise<FaceInfo | null | undefined> {
  const l = await getLandmarker()
  if (!l) return undefined
  const max = 1024
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  try {
    const r = l.detect(c)
    let best: FaceInfo | null = null
    for (const f of r.faceLandmarks) {
      let x0 = 1, y0 = 1, x1 = 0, y1 = 0
      for (const p of f) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y) }
      const fi = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, fw: x1 - x0, fh: y1 - y0 }
      if (!best || fi.fw * fi.fh > best.fw * best.fh) best = fi
    }
    return best
  } catch (e) {
    console.warn('face detect failed', e)
    return undefined
  }
}
export const preloadFace = () => { void getLandmarker() }
