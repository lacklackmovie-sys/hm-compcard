import { createRoot } from 'react-dom/client'
import App from './App'
import { useStore } from './store'
import './styles.css'

// small hook used by automated self-tests (read-only access to app state)
;(window as unknown as { __hm: unknown }).__hm = { state: () => useStore.getState() }
createRoot(document.getElementById('root')!).render(<App />)
