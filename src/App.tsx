import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useStore } from './store'
import type { Tab } from './store'
import Preview from './Preview'
import { ModelPanel, PhotoPanel, SizePanel } from './Panels'
import DesignPanel from './DesignPanel'
import { uid } from './design'
import type { El } from './types'

const TABS: [Tab, string][] = [['model', '① 모델 정보'], ['photo', '② 사진'], ['design', '③ 디자인'], ['size', '④ 크기 · 저장']]

export default function App() {
  const s = useStore()
  const [list, setList] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const [installEvt, setInstallEvt] = useState<any>(null)
  const [online, setOnline] = useState(navigator.onLine)
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({ onOfflineReady() { setOfflineReady(true) } })

  useEffect(() => { void s.init() }, [])
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setInstallEvt(e) }
    const inst = () => setInstallEvt(null)
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('beforeinstallprompt', h); window.addEventListener('appinstalled', inst)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('beforeinstallprompt', h); window.removeEventListener('appinstalled', inst); window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  useEffect(() => { if (navigator.serviceWorker?.controller) setOfflineReady(true) }, [])

  // keyboard shortcuts in custom design mode
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const st = useStore.getState()
      if (st.tab !== 'design' || st.p.mode !== 'custom' || !st.selEl) return
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return
      const step = e.shiftKey ? 0.01 : 0.002
      const mv = (dx: number, dy: number) => { e.preventDefault(); st.mutEl(st.selEl!, (el) => { el.x = Math.min(1 - el.w, Math.max(0, el.x + dx)); el.y = Math.min(1 - el.h, Math.max(0, el.y + dy)) }) }
      if (e.key === 'ArrowLeft') mv(-step, 0)
      else if (e.key === 'ArrowRight') mv(step, 0)
      else if (e.key === 'ArrowUp') mv(0, -step)
      else if (e.key === 'ArrowDown') mv(0, step)
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        const id = st.selEl!
        st.mutDesign((d) => { for (const k of ['front', 'back', 'single'] as const) d.sides[k].els = d.sides[k].els.filter((x) => x.id !== id) })
        st.mut((q) => { delete q.assign[id] }); st.selectEl(null)
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        const d = st.p.design!; const side = d.sides[st.sideKey]; const el = side.els.find((x) => x.id === st.selEl)
        if (el) { const c = { ...JSON.parse(JSON.stringify(el)), id: uid('e'), x: Math.min(0.9, el.x + 0.03), y: Math.min(0.9, el.y + 0.03) } as El; st.mutDesign((dd) => { dd.sides[st.sideKey].els.push(c) }); st.selectEl(c.id) }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  if (!s.ready) return <div className="boot">불러오는 중…</div>
  const { p } = s
  return (
    <div className="app">
      <header className="top">
        <div className="brand"><b>HM</b><span>컴카드 메이커</span><small>HONEY MEDIA</small></div>
        <input className="pname" aria-label="모델 이름(프로젝트 이름)" data-testid="project-name" value={p.name} onChange={(e) => s.mut((q) => { q.name = e.target.value })} />
        <button onClick={() => setList(true)} data-testid="open-list">모델 목록 ({s.projects.length})</button>
        <button onClick={() => void s.newProj()} data-testid="new-project">＋ 새 모델</button>
        <span className="sp" />
        <span className={`status ${s.saved}`} data-testid="save-status">{s.saved === 'saved' ? '✓ 자동 저장됨' : s.saved === 'saving' ? '저장 중…' : '⚠ 저장 실패'}</span>
        <span className={`pill ${online ? '' : 'off'}`}>{online ? '온라인' : '오프라인 모드'}</span>
        {offlineReady && <span className="pill ok" data-testid="offline-ready">오프라인 사용 준비됨</span>}
        {installEvt && <button className="primary" onClick={async () => { installEvt.prompt(); await installEvt.userChoice; setInstallEvt(null) }}>앱 설치</button>}
        {needRefresh && <button className="primary" onClick={() => void updateServiceWorker(true)}>새 버전 적용</button>}
      </header>
      <div className="main">
        <aside className="side">
          <nav className="tabs">
            {TABS.map(([k, l]) => <button key={k} className={s.tab === k ? 'on' : ''} onClick={() => s.setTab(k)} data-testid={`tab-${k}`}>{l}</button>)}
          </nav>
          <div className="scroll">
            {s.tab === 'model' && <ModelPanel />}
            {s.tab === 'photo' && <PhotoPanel />}
            {s.tab === 'design' && <DesignPanel />}
            {s.tab === 'size' && <SizePanel />}
          </div>
        </aside>
        <Preview />
      </div>
      {s.toast && <div className="toast">{s.toast}</div>}
      {list && <ProjectList onClose={() => setList(false)} />}
    </div>
  )
}

function ProjectList({ onClose }: { onClose: () => void }) {
  const s = useStore()
  return (
    <div className="modal" onClick={onClose}>
      <div className="dlg" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="모델 목록">
        <div className="dh"><b>모델 목록</b><button onClick={onClose} aria-label="닫기">✕</button></div>
        <div className="dl" data-testid="project-list">
          {s.projects.map((pr) => (
            <div className={`pr ${pr.id === s.p.id ? 'on' : ''}`} key={pr.id}>
              <div className="pi">
                <b>{pr.name}</b>
                <small>{pr.model.nameKo || pr.model.nameEn || '이름 미입력'} · 사진 {pr.photos.length}장 · {new Date(pr.updated).toLocaleString('ko-KR')}</small>
              </div>
              <button className="sm" onClick={async () => { await s.openProj(pr.id); onClose() }}>열기</button>
              <button className="sm" onClick={() => { const n = prompt('프로젝트 이름', pr.name); if (n !== null) void s.renameProj(pr.id, n) }}>이름 변경</button>
              <button className="sm" onClick={() => void s.dupProj(pr.id)}>복제</button>
              <button className="sm danger" onClick={() => { if (confirm(`'${pr.name}'을(를) 삭제할까요? 사진도 함께 지워져요.`)) void s.delProj(pr.id) }}>삭제</button>
            </div>
          ))}
        </div>
        <div className="df"><button className="primary" onClick={async () => { await s.newProj(); onClose() }}>＋ 새 모델 만들기</button></div>
      </div>
    </div>
  )
}
