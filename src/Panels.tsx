import { runExport } from './exportActions'
import { useRef, useState } from 'react'
import { useStore, SIZE_PRESETS, DEFAULT_AGENCY } from './store'
import { designOf, photoSlots, activeSides } from './design'
import { Num, Row, Section, Seg, Thumb } from './ui'
import { pixelSize } from './export'
import * as db from './db'
import type { ModelInfo, ShowKey } from './types'
import { px2mm } from './render'

/* ================= 모델 정보 ================= */
const STAT_FIELDS: { k: keyof ModelInfo & ShowKey; label: string; ph: string; unit: string; inputMode?: 'numeric' | 'text' }[] = [
  { k: 'birth', label: '년생', ph: '2001', unit: '', inputMode: 'numeric' },
  { k: 'height', label: '키', ph: '174', unit: 'cm' },
  { k: 'weight', label: '몸무게', ph: '48', unit: 'kg' },
  { k: 'top', label: '상의', ph: '55 / S / 90', unit: '' },
  { k: 'bottom', label: '하의', ph: '26 / M', unit: '' },
  { k: 'shoe', label: '신발', ph: '245', unit: 'mm' },
]
export function ModelPanel() {
  const { p, mut, setLogo, fillSample } = useStore()
  const logoRef = useRef<HTMLInputElement>(null)
  const setM = (k: keyof ModelInfo, v: string) => mut((q) => { q.model[k] = v })
  const tog = (k: ShowKey, v: boolean) => mut((q) => { q.show[k] = v })
  const setAgency = (k: 'name' | 'email' | 'fax', v: string) => {
    mut((q) => { q.agency[k] = v })
    const a = { ...useStore.getState().p.agency, [k]: v }
    Object.assign(DEFAULT_AGENCY, a)
    void db.kvSet('agency', a)
  }
  return (
    <div className="panel">
      <div className="note">입력한 내용은 이 기기에 자동 저장돼요. 체크를 끄면 컴카드에서 그 항목이 사라져요.</div>
      <button className="ghost wide" onClick={() => void fillSample()} data-testid="fill-sample">샘플 데이터로 체험하기 (이름·사진 예시 채우기)</button>
      <Section title="이름">
        <Row label="이름 (한글)"><input data-testid="nameKo" value={p.model.nameKo} onChange={(e) => setM('nameKo', e.target.value)} placeholder="김하니" /></Row>
        <Row label="이름 (영문)"><input data-testid="nameEn" value={p.model.nameEn} onChange={(e) => setM('nameEn', e.target.value)} placeholder="Hani Kim" /></Row>
      </Section>
      <Section title="프로필 정보 (이름 아래 줄)">
        {STAT_FIELDS.map((f) => (
          <div className="frow" key={f.k}>
            <input type="checkbox" aria-label={`${f.label} 표시`} checked={p.show[f.k]} onChange={(e) => tog(f.k, e.target.checked)} />
            <span className="fl">{f.label}</span>
            <input data-testid={`f-${f.k}`} inputMode={f.inputMode} value={p.model[f.k]} placeholder={f.ph} onChange={(e) => setM(f.k, e.target.value)} />
            {f.unit && <em>{f.unit}</em>}
          </div>
        ))}
        <div className="hint">키·몸무게·신발은 숫자만 입력하면 단위(cm, kg, mm)가 자동으로 붙어요. 상의·하의는 55, S, 90처럼 적은 그대로 나와요. 비워두거나 체크를 끄면 카드에서 사라져요.</div>
      </Section>
      <Section title="코멘트 · 경력">
        <div className="frow top"><input type="checkbox" aria-label="코멘트 표시" checked={p.show.comment} onChange={(e) => tog('comment', e.target.checked)} /><span className="fl">코멘트</span></div>
        <textarea data-testid="comment" rows={3} value={p.model.comment} onChange={(e) => setM('comment', e.target.value)} placeholder="모델 소개, 강점, 촬영 가능 분야…" />
        <div className="frow top"><input type="checkbox" aria-label="경력 표시" checked={p.show.career} onChange={(e) => tog('career', e.target.checked)} /><span className="fl">경력</span></div>
        <textarea data-testid="career" rows={4} value={p.model.career} onChange={(e) => setM('career', e.target.value)} placeholder="한 줄에 하나씩 적어 주세요" />
      </Section>
      <Section title="에이전시 정보">
        <div className="frow"><input type="checkbox" aria-label="회사명 표시" checked={p.show.agencyName} onChange={(e) => tog('agencyName', e.target.checked)} /><span className="fl">회사명</span><input value={p.agency.name} onChange={(e) => setAgency('name', e.target.value)} /></div>
        <div className="frow"><input type="checkbox" aria-label="이메일 표시" checked={p.show.email} onChange={(e) => tog('email', e.target.checked)} /><span className="fl">이메일</span><input value={p.agency.email} onChange={(e) => setAgency('email', e.target.value)} /></div>
        <div className="frow"><input type="checkbox" aria-label="팩스 표시" checked={p.show.fax} onChange={(e) => tog('fax', e.target.checked)} /><span className="fl">FAX</span><input value={p.agency.fax} onChange={(e) => setAgency('fax', e.target.value)} /></div>
        <div className="frow"><input type="checkbox" aria-label="로고 표시" checked={p.show.logo} onChange={(e) => tog('logo', e.target.checked)} /><span className="fl">로고</span>
          <span className="logobtns">
            <button className="ghost sm" onClick={() => logoRef.current?.click()}>{p.hasLogo ? '로고 바꾸기' : '로고 올리기'}</button>
            {p.hasLogo && <button className="ghost sm" onClick={() => void setLogo(null)}>삭제</button>}
            <input ref={logoRef} type="file" accept="image/*" hidden data-testid="logo-input" onChange={(e) => { const f = e.target.files?.[0]; if (f) void setLogo(f); e.target.value = '' }} />
          </span>
        </div>
        <div className="hint">로고를 올리지 않으면 회사명이 글자 로고로 들어가요. 에이전시 정보는 새 모델을 만들 때 기본값으로 쓰여요.</div>
      </Section>
    </div>
  )
}

/* ================= 사진 ================= */
export function PhotoPanel() {
  const s = useStore()
  const { p, imgs, selSlot, face } = s
  const fileRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const slots = photoSlots(p)
  const slotIdx = (id: string) => slots.findIndex((x) => x.id === id) + 1
  const a = selSlot ? p.assign[selSlot] : undefined
  const selMeta = a && p.photos.find((m) => m.id === a.photoId)
  const picks = (files: FileList | File[] | null) => { if (files && files.length) void s.addPhotos(Array.from(files)) }
  return (
    <div className="panel"
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOver(true) } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); setOver(false); picks(e.dataTransfer.files) } }}>
      <div className={`drop ${over ? 'over' : ''}`} onClick={() => fileRef.current?.click()} role="button" tabIndex={0} data-testid="dropzone">
        <b>사진을 끌어다 놓거나 클릭해서 선택</b>
        <span>여러 장 한 번에 가능 · JPG / PNG / WEBP</span>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden data-testid="photo-input" onChange={(e) => { picks(e.target.files); e.target.value = '' }} />
      </div>
      {s.busy && <div className="note">{s.busy}</div>}
      <div className="hint">
        사진은 아래 목록 순서 그대로 칸에 들어가요: 1번 → 가장 큰 대표 칸, 2번 → 두 번째 칸 … ◀ ▶로 순서를 바꾸면 카드도 바로 바뀌어요(직접 지정했던 칸도 순서대로 다시 배치돼요). 카드에서 사진을 끌어다 놓아 직접 지정하면 그 칸은 고정되고, 나머지는 순서대로 채워져요.
        {face === 'ready' ? ' 얼굴 인식 켜짐: 얼굴이 잘리지 않게 자동으로 맞춰요.' : face === 'failed' ? ' 얼굴 인식을 불러오지 못해 사진 위쪽 중심으로 맞춰요.' : ' 얼굴 인식 불러오는 중…'}
      </div>
      <div className="trayhead">
        <b>사진 {p.photos.length}장</b>
        <button className="ghost sm" onClick={() => s.autoArrange()} disabled={!p.photos.length} data-testid="auto-arrange">자동 배치</button>
      </div>
      <div className="tray">
        {p.photos.map((m, i) => {
          const im = imgs.get(m.id)
          const used = Object.values(p.assign).some((x) => x.photoId === m.id)
          return (
            <div key={m.id} className={`ph ${used ? 'used' : ''}`} draggable data-testid={`photo-${i}`}
              onDragStart={(e) => { e.dataTransfer.setData('text/photo-id', m.id); e.dataTransfer.effectAllowed = 'move' }}
              onClick={() => { if (selSlot) s.assignPhoto(selSlot, m.id) }} title={selSlot ? '선택한 칸에 넣기' : '칸을 먼저 선택하거나 사진을 카드로 끌어다 놓으세요'}>
              <Thumb src={im?.src} w={im?.w ?? 1} h={im?.h ?? 1} size={72} />
              <span className="badge">{i === 0 ? '1 · 대표' : i + 1}</span>
              <span className="face">{m.face ? '얼굴✓' : m.face === null ? '얼굴 없음' : '—'}</span>
              <div className="phbtn">
                <button aria-label="앞으로" disabled={i === 0} onClick={(e) => { e.stopPropagation(); s.movePhoto(m.id, -1) }}>◀</button>
                <button aria-label="뒤로" disabled={i === p.photos.length - 1} onClick={(e) => { e.stopPropagation(); s.movePhoto(m.id, 1) }}>▶</button>
                <button aria-label="삭제" onClick={(e) => { e.stopPropagation(); void s.removePhoto(m.id) }}>✕</button>
              </div>
            </div>
          )
        })}
      </div>
      <Section title={selSlot ? `선택한 칸 #${slotIdx(selSlot)} 조정` : '사진 칸 조정'}>
        {!selSlot && <div className="hint">미리보기에서 사진 칸을 클릭하면 여기서 확대·교체할 수 있어요. 칸 안에서 드래그하면 사진 위치가 움직여요.</div>}
        {selSlot && !a && <div className="hint">빈 칸이에요. 아래 사진을 클릭하면 이 칸에 들어가요.</div>}
        {selSlot && a && selMeta && (
          <>
            <Row label="확대"><Num value={a.zoom} min={1} max={4} step={0.01} suffix="배" onChange={(v) => s.mut((q) => { const x = q.assign[selSlot]; if (x) x.zoom = v })} testid="zoom" /></Row>
            <div className="btnrow">
              <button className="ghost sm" onClick={() => s.mut((q) => { const x = q.assign[selSlot]; if (x) { delete x.ox; delete x.oy; x.zoom = 1 } })}>위치 자동 맞춤</button>
            </div>
            <Row label="다른 칸과 교체">
              <select value="" onChange={(e) => {
                const other = e.target.value; if (!other) return
                s.mut((q) => { const x = q.assign[selSlot], y = q.assign[other]; if (y) q.assign[selSlot] = { ...y, pinned: true }; else delete q.assign[selSlot]; if (x) q.assign[other] = { ...x, pinned: true } })
              }} data-testid="swap">
                <option value="">선택…</option>
                {slots.filter((x) => x.id !== selSlot).map((x) => <option key={x.id} value={x.id}>{x.side === 'back' ? '뒷면' : x.side === 'front' ? '앞면' : ''} 칸 #{slotIdx(x.id)}</option>)}
              </select>
            </Row>
          </>
        )}
      </Section>
    </div>
  )
}

/* ================= 크기 · 저장 ================= */
export function SizePanel() {
  const s = useStore()
  const { p } = s
  const dpi = s.expDpi, setDpi = (v: number) => s.setExp({ expDpi: v })
  const pxScale = s.expScale, setPxScale = (v: number) => s.setExp({ expScale: v })
  const msg = s.expMsg, busy = s.expBusy
  const presetId = SIZE_PRESETS.find((x) => x.size.w === p.size.w && x.size.h === p.size.h && x.size.unit === p.size.unit)?.id ?? 'custom'
  const q = p.size.unit === 'mm' ? dpi : pxScale
  const px = pixelSize(p, q)
  const mm = p.size.unit === 'mm' ? p.size : { w: px2mm(p.size.w), h: px2mm(p.size.h) }
  const setSize = (w: number, h: number, unit: 'mm' | 'px') => s.mut((x) => { x.size = { w, h, unit } }, { arrange: true })
  return (
    <div className="panel">
      <Section title="카드 크기">
        <Row label="규격">
          <select data-testid="size-preset" value={presetId} onChange={(e) => { const sp = SIZE_PRESETS.find((x) => x.id === e.target.value); if (sp) setSize(sp.size.w, sp.size.h, sp.size.unit) }}>
            {SIZE_PRESETS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            <option value="custom">직접 입력</option>
          </select>
        </Row>
        <Row label="단위"><Seg value={p.size.unit} options={[['mm', 'mm'], ['px', 'px']]} onChange={(u) => {
          if (u === p.size.unit) return
          if (u === 'px') setSize(Math.round((p.size.w / 25.4) * 96), Math.round((p.size.h / 25.4) * 96), 'px')
          else setSize(Math.round(px2mm(p.size.w) * 10) / 10, Math.round(px2mm(p.size.h) * 10) / 10, 'mm')
        }} /></Row>
        <Row label="가로"><Num slider={false} value={p.size.w} min={20} max={p.size.unit === 'mm' ? 1000 : 8000} step={p.size.unit === 'mm' ? 0.1 : 1} suffix={p.size.unit} onChange={(v) => setSize(v, p.size.h, p.size.unit)} testid="size-w" /></Row>
        <Row label="세로"><Num slider={false} value={p.size.h} min={20} max={p.size.unit === 'mm' ? 1000 : 8000} step={p.size.unit === 'mm' ? 0.1 : 1} suffix={p.size.unit} onChange={(v) => setSize(p.size.w, v, p.size.unit)} testid="size-h" /></Row>
        <div className="btnrow"><button className="ghost sm" data-testid="rotate" onClick={() => setSize(p.size.h, p.size.w, p.size.unit)}>가로 ↔ 세로 바꾸기</button></div>
        <div className="hint">약 {mm.w.toFixed(1)} × {mm.h.toFixed(1)} mm ({(mm.w / 25.4).toFixed(2)} × {(mm.h / 25.4).toFixed(2)} inch). 크기를 바꾸면 템플릿이 새 비율에 맞춰 다시 배치돼요.</div>
      </Section>
      <Section title="면 구성">
        <Seg value={p.sides} options={[[2, '앞면 + 뒷면'], [1, '단면']]} onChange={(v) => { s.mut((x) => { x.sides = v; }, { arrange: true }); s.setSide(v === 2 ? 'front' : 'single') }} />
      </Section>
      <Section title="내보내기">
        {p.size.unit === 'mm' ? (
          <Row label="해상도"><Seg value={dpi} options={[[150, '150dpi'], [300, '300dpi 인쇄'], [600, '600dpi']]} onChange={setDpi} /></Row>
        ) : (
          <Row label="배율"><Seg value={pxScale} options={[[1, '1배(원본 px)'], [2, '2배'], [3, '3배']]} onChange={setPxScale} /></Row>
        )}
        <div className="hint">저장 크기: {px.w} × {px.h} px</div>
        <div className="btnrow col">
          <button className="primary" disabled={busy} data-testid="export-pdf" onClick={() => void runExport('pdf')}>인쇄용 PDF 저장 (앞·뒤 {p.sides === 2 ? '2쪽' : '1쪽'})</button>
          <div className="two">
            <button disabled={busy} data-testid="export-jpg" onClick={() => void runExport('jpg')}>JPG 전체</button>
            <button disabled={busy} data-testid="export-png" onClick={() => void runExport('png')}>PNG 전체</button>
          </div>
          {p.sides === 2 && (
            <div className="two">
              <button className="ghost" disabled={busy} data-testid="export-jpg-front" onClick={() => void runExport('jpg-front')}>앞면 JPG만</button>
              <button className="ghost" disabled={busy} data-testid="export-jpg-back" onClick={() => void runExport('jpg-back')}>뒷면 JPG만</button>
            </div>
          )}
        </div>
        {msg && <div className="note" data-testid="export-msg">{msg}</div>}
        <div className="hint">PDF는 카드 실제 크기(mm)에 맞춰 이미지로 저장돼요(글자는 이미지로 포함). 도련(재단 여유)은 포함되지 않아요.</div>
      </Section>
    </div>
  )
}
export { designOf, activeSides }
