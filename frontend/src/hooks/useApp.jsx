import { useState, useEffect, createContext, useContext } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export const AppContext = createContext()

export function AppProvider({ children }) {
  const [theme, setTheme] = useState('dark')
  const [socket, setSocket] = useState(null)
  const [liveStats, setLiveStats] = useState({
    requests: 0,
    blocked: 0,
    attacks: 0,
    rps: 0,
  })
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.hostname}:8000/ws`)
    let pingInterval;

    ws.onopen = () => {
      console.log('WebSocket connected')
      ws.send(JSON.stringify({ type: 'subscribe', channels: ['stats', 'alerts'] }))
      // Send a lightweight ping every 30 seconds to keep the socket alive
      pingInterval = setInterval(() => {
        ws.send(JSON.stringify({ type: 'ping' }))
      }, 30000)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === 'stats') {
          setLiveStats(message.data)
        } else if (message.type === 'alert') {
          setAlerts(prev => [message.data, ...prev].slice(0, 50))
        }
      } catch (err) {
        console.error('WebSocket message error:', err)
      }
    }

    ws.onerror = (err) => {
      console.error('WebSocket error:', err)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
    }

    setSocket(ws)

    return () => {
      if (pingInterval) clearInterval(pingInterval)
      ws.close()
    }
  }, [])


  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <AppContext.Provider value={{ theme, toggleTheme, socket, liveStats, alerts }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}

export function useStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/stats/overview`)
      setStats(res.data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    } finally {
      setLoading(false)
    }
  }

  return { stats, loading, refetch: fetchStats }
}

export function useLogs(page = 1, filters = {}) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [page, JSON.stringify(filters)])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 50, ...filters })
      const res = await axios.get(`${API_URL}/api/admin/logs?${params}`)
      setLogs(res.data)
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    } finally {
      setLoading(false)
    }
  }

  return { logs, loading, refetch: fetchLogs }
}

export { API_URL }