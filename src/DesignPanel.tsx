import { useEffect, useRef, useState } from 'react'
import { useStore, userTemplateId } from './store'
import { aspectOf, designOf, presetDesign, uid } from './design'
import { ColorPick, Num, Row, Section, Seg } from './ui'
import { FONTS } from './fonts'
import { PRESETS, lineEl, logoEl, photoEl, rectEl, textEl, photoGrid } from './templates'
import { drawSide } from './render'
import type { Scene } from './render'
import type { Design, El, PhotoEl, SideKey, TextEl } from './types'
import { elLabel } from './Preview'
import { download, safeName, templateJson } from './export'

function PresetThumb({ id, active, onClick, name, desc }: { id: string; active: boolean; onClick: () => void; name: string; desc: string }) {
  const { p, imgs, logo } = useStore()
  const ref = useRef<HTMLCanvasElement>(null)
  const asp = aspectOf(p)
  useEffect(() => {
    const c = ref.current!
    const W = 150, H = Math.round(150 / asp)
    c.width = W * 2; c.height = H * 2
    const d = presetDesign(id, asp)
    // use the current project's own photos/text, assigned in preset order
    const q = { ...p, assign: {} as Record<string, { photoId: string; zoom: number }> }
    const slots = d.sides.front.els.filter((e) => e.type === 'photo')
    slots.forEach((e, i) => { if (p.photos[i]) q.assign[e.id] = { photoId: p.photos[i].id, zoom: 1 } })
    const scene: Scene = { project: q, design: d, imgs, logo, placeholders: false }
    drawSide(c.getContext('2d')!, scene, p.sides === 2 ? 'front' : 'single', c.width, c.height)
  }, [id, p.model, p.show, p.photos, p.size, p.sides, p.agency, imgs, asp])
  return (
    <button className={`preset ${active ? 'on' : ''}`} onClick={onClick} data-testid={`preset-${id}`}>
      <canvas ref={ref} style={{ width: 150, height: Math.round(150 / asp) }} />
      <b>{name}</b><span>{desc}</span>
    </button>
  )
}

export default function DesignPanel() {
  const s = useStore()
  const { p, sideKey, selEl, templates } = s
  const d = designOf(p)
  const custom = p.mode === 'custom' && !!p.design
  const [tname, setTname] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const uTid = userTemplateId(p.presetId)

  return (
    <div className="panel">
      <div className="modebar" role="tablist">
        <button role="tab" aria-selected={p.mode === 'preset'} className={p.mode === 'preset' ? 'on' : ''} data-testid="mode-preset" onClick={() => s.setMode('preset')}>기본<small>템플릿 그대로</small></button>
        <button role="tab" aria-selected={p.mode === 'custom'} className={p.mode === 'custom' ? 'on' : ''} data-testid="mode-custom" onClick={() => s.setMode('custom')}>커스텀<small>디자인 직접 편집</small></button>
      </div>

      {p.mode === 'preset' && (
        <>
          <div className="hint">마음에 드는 템플릿을 고르면 사진과 정보가 자동으로 들어가요. 디자인을 바꾸고 싶으면 위의 ‘커스텀’을 누르세요.</div>
          <div className="presets">
            {PRESETS.map((pr) => <PresetThumb key={pr.id} id={pr.id} name={pr.name} desc={pr.desc} active={p.presetId === pr.id} onClick={() => s.setPreset(pr.id)} />)}
          </div>
          <button className="ghost wide" onClick={() => s.startCustom()} data-testid="start-custom">이 템플릿으로 커스텀 시작하기</button>
        </>
      )}

      {p.mode === 'custom' && custom && (
        <>
          <Section title="내 템플릿 (저장·불러오기)">
            <div className="hint">지금 편집 중인 디자인: <b>{uTid ? templates.find((t) => t.id === uTid)?.name ?? '내 템플릿' : `${PRESETS.find((x) => x.id === p.presetId)?.name ?? '템플릿'} 기반`}</b></div>
            <div className="frow">
              <input data-testid="tpl-name" placeholder="템플릿 이름" value={tname} onChange={(e) => setTname(e.target.value)} />
              <button className="primary sm" data-testid="tpl-save" onClick={() => { void s.saveAsTemplate(tname || `내 템플릿 ${templates.length + 1}`); setTname('') }}>새 템플릿으로 저장</button>
            </div>
            {uTid && <button className="ghost sm wide" data-testid="tpl-update" onClick={() => void s.updateTemplate(uTid)}>‘{templates.find((t) => t.id === uTid)?.name}’ 템플릿에 현재 디자인 덮어쓰기</button>}
            <div className="tpllist" data-testid="tpl-list">
              {templates.length === 0 && <div className="hint">저장된 템플릿이 없어요.</div>}
              {templates.map((t) => (
                <div className={`tpl ${uTid === t.id ? 'on' : ''}`} key={t.id} data-testid={`tpl-${t.name}`}>
                  <span className="tn">{t.name}</span>
                  <button className="sm" onClick={() => s.useTemplate(t.id)}>불러오기</button>
                  <button className="sm" onClick={() => { const n = prompt('새 이름', t.name); if (n !== null) void s.renameTemplate(t.id, n) }}>이름 변경</button>
                  <button className="sm" onClick={() => void s.dupTemplate(t.id)}>복제</button>
                  <button className="sm" onClick={() => download(new Blob([templateJson([{ name: t.name, design: t.design }])], { type: 'application/json' }), `${safeName(t.name)}.hmtemplate.json`)}>내보내기</button>
                  <button className="sm danger" onClick={() => { if (confirm(`'${t.name}' 템플릿을 삭제할까요?`)) void s.deleteTemplate(t.id) }}>삭제</button>
                </div>
              ))}
            </div>
            <div className="btnrow">
              <button className="ghost sm" onClick={() => importRef.current?.click()} data-testid="tpl-import">JSON 가져오기</button>
              <button className="ghost sm" disabled={!templates.length} onClick={() => download(new Blob([templateJson(templates.map((t) => ({ name: t.name, design: t.design })))], { type: 'application/json' }), 'hm-compcard-templates.json')} data-testid="tpl-export-all">전체 내보내기</button>
              <input ref={importRef} type="file" accept=".json,application/json" hidden data-testid="tpl-import-input" onChange={async (e) => {
                const f = e.target.files?.[0]; e.target.value = ''
                if (!f) return
                try { const n = await s.importTemplates(await f.text()); setMsg(`${n}개 템플릿을 가져왔어요`) } catch (err) { setMsg(`가져오기 실패: ${(err as Error).message}`) }
              }} />
            </div>
            {msg && <div className="note" data-testid="tpl-msg">{msg}</div>}
            <div className="btnrow">
              <button className="ghost sm" data-testid="reset-design" onClick={() => { if (confirm('편집한 디자인을 처음 상태로 되돌릴까요?')) s.resetDesign() }}>기본값으로 초기화</button>
              <select value="" data-testid="fresh-preset" onChange={(e) => { if (!e.target.value) return; if (confirm('현재 편집 내용이 사라지고 선택한 템플릿에서 새로 시작해요. 계속할까요?')) { s.mut((q) => { q.presetId = e.target.value }); s.freshFromPreset() } }}>
                <option value="">다른 템플릿에서 새로 시작…</option>
                {PRESETS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </div>
          </Section>

          <GlobalDesign d={d} />
          <LayoutTools d={d} sideKey={sideKey} />
          <Layers d={d} sideKey={sideKey} />
          <ElementProps d={d} sideKey={sideKey} selEl={selEl} />
        </>
      )}
    </div>
  )
}

/* ---------------- global theme / side ---------------- */
function GlobalDesign({ d }: { d: Design }) {
  const s = useStore()
  const sideKey = s.sideKey
  const side = d.sides[sideKey]
  const th = d.theme
  const setTheme = (k: keyof Design['theme'], v: string) => s.mutDesign((x) => { (x.theme as any)[k] = v })
  const setSide = (fn: (sd: Design['sides']['front']) => void) => s.mutDesign((x) => fn(x.sides[sideKey]))
  return (
    <Section title="색상 · 글꼴 (전체)">
      <Row label="배경색"><ColorPick value={th.bg} onChange={(v) => setTheme('bg', v)} testid="c-bg" /></Row>
      <Row label="보조 배경"><ColorPick value={th.bg2} onChange={(v) => setTheme('bg2', v)} /></Row>
      <Row label="글자색"><ColorPick value={th.text} onChange={(v) => setTheme('text', v)} testid="c-text" /></Row>
      <Row label="보조 글자색"><ColorPick value={th.muted} onChange={(v) => setTheme('muted', v)} /></Row>
      <Row label="강조색 (골드)"><ColorPick value={th.accent} onChange={(v) => setTheme('accent', v)} testid="c-accent" /></Row>
      <Row label="제목 글꼴">
        <select data-testid="font-display" value={th.fontDisplay} onChange={(e) => setTheme('fontDisplay', e.target.value)}>{FONTS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select>
      </Row>
      <Row label="본문 글꼴">
        <select data-testid="font-body" value={th.fontBody} onChange={(e) => setTheme('fontBody', e.target.value)}>{FONTS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select>
      </Row>
      <div className="hint">‘{sideKey === 'front' ? '앞면' : sideKey === 'back' ? '뒷면' : '단면'}’ 설정</div>
      <Row label="이 면 배경색">
        <span className="inl">
          <input type="checkbox" checked={!!side.bg} onChange={(e) => setSide((sd) => { sd.bg = e.target.checked ? th.bg2 : '' })} aria-label="이 면 배경색 따로 지정" />
          {side.bg && <ColorPick value={side.bg} theme={th} onChange={(v) => setSide((sd) => { sd.bg = v })} />}
          {!side.bg && <em>전체 배경색 사용</em>}
        </span>
      </Row>
      <Row label="카드 테두리"><input type="checkbox" data-testid="border-on" checked={side.border.on} onChange={(e) => setSide((sd) => { sd.border.on = e.target.checked })} /></Row>
      {side.border.on && (
        <>
          <Row label="테두리 색"><ColorPick value={side.border.color} theme={th} onChange={(v) => setSide((sd) => { sd.border.color = v })} /></Row>
          <Row label="테두리 두께"><Num value={side.border.w} min={0.05} max={2} step={0.05} onChange={(v) => setSide((sd) => { sd.border.w = v })} /></Row>
          <Row label="테두리 여백"><Num value={side.border.inset} min={0} max={10} step={0.1} onChange={(v) => setSide((sd) => { sd.border.inset = v })} /></Row>
        </>
      )}
    </Section>
  )
}

/* ---------------- photo layout tools ---------------- */
function LayoutTools({ d, sideKey }: { d: Design; sideKey: SideKey }) {
  const s = useStore()
  const [cols, setCols] = useState(3), [rows, setRows] = useState(2)
  const [mx, setMx] = useState(5), [my, setMy] = useState(5)
  const [gap, setGap] = useState(1.6)
  const [hh, setHh] = useState(70)
  const side = d.sides[sideKey]
  const count = side.els.filter((e) => e.type === 'photo').length
  const add = (el: El) => { s.mutDesign((x) => { x.sides[sideKey].els.push(el) }); s.selectEl(el.id) }
  return (
    <Section title="사진 칸 · 요소 추가" open>
      <div className="hint">이 면의 사진 칸 {count}개. 미리보기에서 칸을 끌어 옮기고 모서리를 끌어 크기를 바꿔요. (Alt를 누르면 자석 정렬 해제)</div>
      <div className="btnrow wrapx">
        <button className="sm" data-testid="add-photo" onClick={() => add(photoEl(uid('ph'), 0.3, 0.3, 0.3, 0.3))}>＋ 사진 칸</button>
        {(['name', 'stats', 'comment', 'career', 'agency', 'free'] as const).map((k) => (
          <button className="sm" key={k} onClick={() => add(textEl(uid('tx'), k, 0.1, 0.1, 0.5, k === 'name' ? 0.08 : 0.15, { sz: k === 'name' ? 5 : 2.2, text: k === 'free' ? '문구를 입력하세요' : '', font: k === 'name' ? 'display' : 'body', color: 'text', color2: 'accent' }))}>
            ＋ {k === 'name' ? '이름' : k === 'stats' ? '신체정보' : k === 'comment' ? '코멘트' : k === 'career' ? '경력' : k === 'agency' ? '에이전시' : '문구'}
          </button>
        ))}
        <button className="sm" onClick={() => add(rectEl(uid('rc'), 0.1, 0.1, 0.3, 0.2, { fill: 'bg2' }))}>＋ 색 블록</button>
        <button className="sm" onClick={() => add(lineEl(uid('ln'), 0.1, 0.5, 0.8, { dir: 'h' }))}>＋ 가로선</button>
        <button className="sm" onClick={() => add(lineEl(uid('ln'), 0.5, 0.1, 0.8, { dir: 'v' }))}>＋ 세로선</button>
        <button className="sm" onClick={() => add(logoEl(uid('lg'), 0.1, 0.05, 0.3, 0.03))}>＋ 로고</button>
      </div>
      <div className="hint" style={{ marginTop: 10 }}><b>격자로 사진 칸 다시 만들기</b> (이 면의 기존 사진 칸이 교체돼요)</div>
      <Row label="열 × 행"><span className="inl"><Num slider={false} value={cols} min={1} max={6} onChange={setCols} testid="g-cols" /><em>×</em><Num slider={false} value={rows} min={1} max={6} onChange={setRows} testid="g-rows" /></span></Row>
      <Row label="좌우 여백"><Num value={mx} min={0} max={30} step={0.5} suffix="%" onChange={setMx} /></Row>
      <Row label="상하 여백"><Num value={my} min={0} max={30} step={0.5} suffix="%" onChange={setMy} /></Row>
      <Row label="칸 사이 간격"><Num value={gap} min={0} max={10} step={0.1} suffix="%" onChange={setGap} /></Row>
      <Row label="격자 높이"><Num value={hh} min={20} max={100} step={1} suffix="%" onChange={setHh} /></Row>
      <button className="ghost wide" data-testid="grid-build" onClick={() => {
        s.mutDesign((x) => {
          const sd = x.sides[sideKey]
          const grid = photoGrid(uid('pg'), mx / 100, my / 100, 1 - 2 * mx / 100, Math.min(1 - 2 * my / 100, hh / 100), cols, rows, gap / 100, gap / 100 * (1 / (s.p.size.h / s.p.size.w)))
          const firstIdx = sd.els.findIndex((e) => e.type === 'photo')
          sd.els = sd.els.filter((e) => e.type !== 'photo')
          sd.els.splice(firstIdx < 0 ? 0 : Math.min(firstIdx, sd.els.length), 0, ...(grid as PhotoEl[]))
        })
        s.mut((q) => { const ids = new Set(photoIds(q.design!)); for (const k of Object.keys(q.assign)) if (!ids.has(k)) delete q.assign[k] }, { arrange: true })
        s.selectEl(null)
      }}>격자 만들기 ({cols * rows}칸)</button>
    </Section>
  )
}
const photoIds = (d: Design) => (['front', 'back', 'single'] as const).flatMap((k) => d.sides[k].els.filter((e) => e.type === 'photo').map((e) => e.id))

/* ---------------- layers ---------------- */
function Layers({ d, sideKey }: { d: Design; sideKey: SideKey }) {
  const s = useStore()
  const side = d.sides[sideKey]
  const move = (i: number, dir: -1 | 1) => s.mutDesign((x) => { const a = x.sides[sideKey].els; const j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]] })
  return (
    <Section title="요소 목록 (겹침 순서)" open={false}>
      <div className="layers" data-testid="layers">
        {[...side.els].map((e, i) => ({ e, i })).reverse().map(({ e, i }) => (
          <div key={e.id} className={`layer ${s.selEl === e.id ? 'on' : ''} ${e.hidden ? 'off' : ''}`} onClick={() => s.selectEl(e.id)}>
            <span className="ln">{elLabel(e)}</span>
            <button className="sm" aria-label="보이기/숨기기" onClick={(ev) => { ev.stopPropagation(); s.mutEl(e.id, (t) => { t.hidden = !t.hidden }) }}>{e.hidden ? '숨김' : '표시'}</button>
            <button className="sm" aria-label="위로" onClick={(ev) => { ev.stopPropagation(); move(i, 1) }}>▲</button>
            <button className="sm" aria-label="아래로" onClick={(ev) => { ev.stopPropagation(); move(i, -1) }}>▼</button>
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ---------------- selected element ---------------- */
function ElementProps({ d, sideKey, selEl }: { d: Design; sideKey: SideKey; selEl: string | null }) {
  const s = useStore()
  const th = d.theme
  const el = d.sides[sideKey].els.find((e) => e.id === selEl)
  if (!el) return <Section title="선택한 요소"><div className="hint">미리보기에서 요소를 클릭하거나 요소 목록에서 고르세요.</div></Section>
  const set = (fn: (e: any) => void) => s.mutEl(el.id, fn)
  const pct = (k: 'x' | 'y' | 'w' | 'h', label: string) => (
    <Row label={label}><Num slider={false} value={Math.round((el as any)[k] * 1000) / 10} min={-20} max={150} step={0.1} suffix="%" onChange={(v) => set((e) => { e[k] = v / 100 })} testid={`el-${k}`} /></Row>
  )
  const remove = () => { s.mutDesign((x) => { for (const k of ['front', 'back', 'single'] as const) x.sides[k].els = x.sides[k].els.filter((e) => e.id !== el.id) }); s.mut((q) => { delete q.assign[el.id] }); s.selectEl(null) }
  const dup = () => {
    const c = { ...JSON.parse(JSON.stringify(el)), id: uid('e'), x: Math.min(0.9, el.x + 0.03), y: Math.min(0.9, el.y + 0.03) } as El
    s.mutDesign((x) => { x.sides[sideKey].els.push(c) }); s.selectEl(c.id)
  }
  return (
    <Section title={`선택한 요소: ${elLabel(el)}`}>
      <div className="grid2">{pct('x', '왼쪽')}{pct('y', '위')}{pct('w', '너비')}{pct('h', '높이')}</div>
      <div className="btnrow">
        <button className="sm" onClick={dup} data-testid="el-dup">복제</button>
        <button className="sm danger" onClick={remove} data-testid="el-delete">삭제</button>
        <button className="sm" onClick={() => set((e) => { e.hidden = !e.hidden })}>{el.hidden ? '다시 표시' : '숨기기'}</button>
      </div>
      {el.type === 'photo' && (
        <>
          <Row label="모서리 둥글기"><Num value={el.radius} min={0} max={20} step={0.1} onChange={(v) => set((e) => { e.radius = v })} /></Row>
          <Row label="테두리 두께"><Num value={el.bw} min={0} max={3} step={0.05} onChange={(v) => set((e) => { e.bw = v })} /></Row>
          {el.bw > 0 && <Row label="테두리 색"><ColorPick value={el.bc} theme={th} onChange={(v) => set((e) => { e.bc = v })} /></Row>}
        </>
      )}
      {el.type === 'rect' && (
        <>
          <Row label="채우기"><ColorPick value={el.fill} theme={th} onChange={(v) => set((e) => { e.fill = v })} /></Row>
          <Row label="투명도"><Num value={el.op} min={0} max={1} step={0.05} onChange={(v) => set((e) => { e.op = v })} /></Row>
          <Row label="테두리 두께"><Num value={el.sw} min={0} max={3} step={0.05} onChange={(v) => set((e) => { e.sw = v })} /></Row>
          {el.sw > 0 && <Row label="테두리 색"><ColorPick value={el.sc} theme={th} onChange={(v) => set((e) => { e.sc = v })} /></Row>}
        </>
      )}
      {el.type === 'line' && (
        <>
          <Row label="색"><ColorPick value={el.color} theme={th} onChange={(v) => set((e) => { e.color = v })} /></Row>
          <Row label="두께"><Num value={el.t} min={0.03} max={3} step={0.01} onChange={(v) => set((e) => { e.t = v })} /></Row>
        </>
      )}
      {el.type === 'logo' && (
        <>
          <Row label="글자 로고 색"><ColorPick value={el.color} theme={th} onChange={(v) => set((e) => { e.color = v })} /></Row>
          <Row label="정렬"><Seg value={el.align} options={[['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']]} onChange={(v) => set((e) => { e.align = v })} /></Row>
          <div className="hint">로고 표시/숨김과 이미지는 ‘모델’ 탭의 에이전시 정보에서 바꿔요.</div>
        </>
      )}
      {el.type === 'text' && <TextProps el={el} set={set} th={th} />}
    </Section>
  )
}

function TextProps({ el, set, th }: { el: TextEl; set: (fn: (e: any) => void) => void; th: Design['theme'] }) {
  const fontOpts = [['display', '제목 글꼴(전체 설정)'], ['body', '본문 글꼴(전체 설정)'], ...FONTS.map((f) => [f.key, f.label])]
  return (
    <>
      {el.kind === 'free' && <Row label="문구"><textarea rows={3} value={el.text} onChange={(e) => set((t) => { t.text = e.target.value })} data-testid="el-text" /></Row>}
      <Row label={el.kind === 'name' ? '글자 크기 (첫 줄)' : '글자 크기'}><Num value={el.sz} min={0.5} max={15} step={0.1} onChange={(v) => set((t) => { t.sz = v })} testid="el-sz" /></Row>
      {(el.kind === 'name' || el.kind === 'stats' || el.kind === 'comment' || el.kind === 'career') && (
        <Row label={el.kind === 'name' ? '글자 크기 (둘째 줄)' : '라벨 크기'}><Num value={el.sz2} min={0.5} max={15} step={0.1} onChange={(v) => set((t) => { t.sz2 = v })} /></Row>
      )}
      <Row label="글꼴"><select value={el.font} onChange={(e) => set((t) => { t.font = e.target.value })} data-testid="el-font">{fontOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Row>
      <Row label="굵기"><Seg value={el.weight <= 300 ? 300 : el.weight >= 600 ? 600 : 400} options={[[300, '얇게'], [400, '보통'], [600, '굵게']]} onChange={(v) => set((t) => { t.weight = v })} /></Row>
      <Row label="글자색"><ColorPick value={el.color} theme={th} onChange={(v) => set((t) => { t.color = v })} /></Row>
      <Row label="라벨/보조색"><ColorPick value={el.color2} theme={th} onChange={(v) => set((t) => { t.color2 = v })} /></Row>
      <Row label="가로 정렬"><Seg value={el.align} options={[['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']]} onChange={(v) => set((t) => { t.align = v })} /></Row>
      <Row label="세로 정렬"><Seg value={el.valign} options={[['top', '위'], ['middle', '가운데'], ['bottom', '아래']]} onChange={(v) => set((t) => { t.valign = v })} /></Row>
      <Row label="자간"><Num value={el.ls} min={-5} max={40} step={0.5} onChange={(v) => set((t) => { t.ls = v })} /></Row>
      <Row label="줄 간격"><Num value={el.lh} min={0.9} max={2.5} step={0.05} onChange={(v) => set((t) => { t.lh = v })} /></Row>
      <Row label="영문 대문자"><input type="checkbox" checked={el.upper} onChange={(e) => set((t) => { t.upper = e.target.checked })} /></Row>
      <Row label="박스에 맞춰 줄이기"><input type="checkbox" checked={el.fit} onChange={(e) => set((t) => { t.fit = e.target.checked })} /></Row>
      {el.kind === 'name' && (
        <>
          <Row label="한글 이름 표시"><input type="checkbox" checked={el.showKo} onChange={(e) => set((t) => { t.showKo = e.target.checked })} /></Row>
          <Row label="영문 이름 표시"><input type="checkbox" checked={el.showEn} onChange={(e) => set((t) => { t.showEn = e.target.checked })} /></Row>
          <Row label="첫 줄"><Seg value={el.nameOrder} options={[['en-first', '영문'], ['ko-first', '한글']]} onChange={(v) => set((t) => { t.nameOrder = v })} /></Row>
        </>
      )}
      {el.kind === 'stats' && (
        <>
          <Row label="배열"><Seg value={el.rowStyle === 'stack' ? 'rows' : el.rowStyle} options={[['rows', '세로 표'], ['inline', '가로 나열'], ['grid', '격자']]} onChange={(v) => set((t) => { t.rowStyle = v })} /></Row>
          {el.rowStyle === 'grid' && <Row label="열 개수"><Num slider={false} value={el.cols} min={1} max={6} onChange={(v) => set((t) => { t.cols = Math.round(v) })} /></Row>}
          <Row label="라벨"><Seg value={el.labelMode} options={[['en', 'HEIGHT'], ['ko', '키']]} onChange={(v) => set((t) => { t.labelMode = v })} /></Row>
        </>
      )}
      {(el.kind === 'comment' || el.kind === 'career') && (
        <>
          <Row label="제목 줄 표시"><input type="checkbox" checked={el.heading} onChange={(e) => set((t) => { t.heading = e.target.checked })} /></Row>
          <Row label="제목 언어"><Seg value={el.labelMode} options={[['en', 'COMMENT'], ['ko', '코멘트']]} onChange={(v) => set((t) => { t.labelMode = v })} /></Row>
        </>
      )}
      {el.kind === 'agency' && (
        <>
          <Row label="배열"><Seg value={el.rowStyle === 'inline' ? 'inline' : 'stack'} options={[['stack', '세로'], ['inline', '한 줄']]} onChange={(v) => set((t) => { t.rowStyle = v })} /></Row>
          <Row label="회사명 줄"><input type="checkbox" checked={el.lines.name} onChange={(e) => set((t) => { t.lines.name = e.target.checked })} /></Row>
          <Row label="이메일 줄"><input type="checkbox" checked={el.lines.email} onChange={(e) => set((t) => { t.lines.email = e.target.checked })} /></Row>
          <Row label="FAX 줄"><input type="checkbox" checked={el.lines.fax} onChange={(e) => set((t) => { t.lines.fax = e.target.checked })} /></Row>
        </>
      )}
    </>
  )
}
