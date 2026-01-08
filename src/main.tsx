import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { DarkModeProvider } from './context/DarkModeContext'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <DarkModeProvider>
            <AuthProvider>
                <App />
            </AuthProvider>
        </DarkModeProvider>
    </StrictMode>,
)
