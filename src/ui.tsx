import { useEffect, useRef, useState } from 'react'
import type { Theme } from './types'

export function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="row">
      <span className="rl">{label}</span>
      <span className="rc">{children}</span>
      {hint && <span className="hint">{hint}</span>}
    </label>
  )
}
export function Num({ value, onChange, min, max, step = 1, suffix, slider = true, testid }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string; slider?: boolean; testid?: string }) {
  const [txt, setTxt] = useState(String(round(value)))
  useEffect(() => setTxt(String(round(value))), [value])
  return (
    <span className="num">
      {slider && <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />}
      <input type="number" data-testid={testid} value={txt} min={min} max={max} step={step}
        onChange={(e) => { setTxt(e.target.value); const v = parseFloat(e.target.value); if (isFinite(v)) onChange(Math.min(max, Math.max(min, v))) }}
        onBlur={() => setTxt(String(round(value)))} />
      {suffix && <em>{suffix}</em>}
    </span>
  )
}
const round = (v: number) => Math.round(v * 100) / 100

export const TOKENS: [string, string][] = [['bg', '배경'], ['bg2', '보조 배경'], ['text', '글자'], ['muted', '보조 글자'], ['accent', '강조(골드)']]
export function ColorPick({ value, onChange, theme, testid }: { value: string; onChange: (v: string) => void; theme?: Theme; testid?: string }) {
  const isTok = TOKENS.some(([k]) => k === value)
  const hex = isTok && theme ? (theme as unknown as Record<string, string>)[value] : value
  return (
    <span className="colorpick">
      {theme && (
        <select data-testid={testid} value={isTok ? value : 'custom'} onChange={(e) => onChange(e.target.value === 'custom' ? hex || '#000000' : e.target.value)}>
          {TOKENS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          <option value="custom">직접 지정</option>
        </select>
      )}
      {(!theme || !isTok) && <input type="color" value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000'} onChange={(e) => onChange(e.target.value)} />}
      {theme && isTok && <i className="swatch" style={{ background: hex }} />}
    </span>
  )
}
export function Section({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="sec" open={open}>
      <summary>{title}</summary>
      <div className="secbody">{children}</div>
    </details>
  )
}
export function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <span className="seg">
      {options.map(([v, l]) => <button type="button" key={String(v)} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}
    </span>
  )
}
export function Thumb({ src, w, h, size = 64, ratio = 0.8 }: { src?: CanvasImageSource; w: number; h: number; size?: number; ratio?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!
    const cw = size, ch = Math.round(size / ratio)
    c.width = cw * 2; c.height = ch * 2
    const g = c.getContext('2d')!
    g.fillStyle = '#ddd'; g.fillRect(0, 0, c.width, c.height)
    if (!src) return
    const sc = Math.max(c.width / w, c.height / h)
    const vw = c.width / sc, vh = c.height / sc
    g.drawImage(src, (w - vw) / 2, 0, vw, vh, 0, 0, c.width, c.height)
  }, [src, w, h, size, ratio])
  return <canvas ref={ref} style={{ width: size, height: Math.round(size / ratio) }} />
}
