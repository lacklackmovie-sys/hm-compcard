import { createRoot } from 'react-dom/client'
import App from './App'
import { useStore } from './store'
import { modelFieldItems } from './render'
import './styles.css'

// small hook used by automated self-tests (read-only access to app state)
;(window as unknown as { __hm: unknown }).__hm = { state: () => useStore.getState(), items: (ko: boolean) => modelFieldItems(useStore.getState().p, { labelMode: ko ? 'ko' : 'en' } as never) }
createRoot(document.getElementById('root')!).render(<App />)
