import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Dashboard from './pages/Dashboard'
import Documentation from './pages/Documentation'
import ThreatMonitor from './pages/ThreatMonitor'
import Logs from './pages/Logs'
import AttackGlobe from './pages/AttackGlobe'
import Rules from './pages/Rules'
import IPManager from './pages/IPManager'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import AISettings from './pages/AISettings'
import MLSettings from './pages/MLSettings'
import Login from './pages/Login'
import Layout from './components/Layout'
import { Shield } from 'lucide-react'
import { AppProvider } from './hooks/useApp'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      localStorage.setItem('token', token)
    } else {
      delete axios.defaults.headers.common['Authorization']
      localStorage.removeItem('token')
    }
  }, [token])

  const handleLogin = (newToken) => {
    setToken(newToken)
  }

  const handleLogout = () => {
    setToken(null)
  }

  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <AppProvider>
      <BrowserRouter>
        <Layout onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/docs" element={<Documentation />} />
            <Route path="/monitor" element={<ThreatMonitor />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/threat-globe" element={<AttackGlobe />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/ip" element={<IPManager />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/ml" element={<MLSettings />} />
            <Route path="/ai" element={<AISettings />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  )
}

export default App