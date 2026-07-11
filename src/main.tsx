// iOS Safari 15.4 未満向けの crypto.randomUUID ポリフィル（他のどの import より先に読み込む）
import './lib/polyfills'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
