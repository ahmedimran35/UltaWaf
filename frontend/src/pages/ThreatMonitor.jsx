import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import { 
  Shield, AlertTriangle, Clock, Filter, RefreshCw,
  Play, Pause, Volume2, Bell, Search,
  ArrowRight, X, AlertCircle, CheckCircle
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''
const WS_URL = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`

function ThreatMonitor() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [autoScroll, setAutoScroll] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [filters, setFilters] = useState({
    attack_type: '',
    blocked: '',
    search: ''
  })
  const [stats, setStats] = useState({
    total: 0,
    blocked: 0,
    attacks: 0
  })
  const logContainerRef = useRef(null)
  const audioRef = useRef(null)
  const socketRef = useRef(null)

  useEffect(() => {
    fetchLogs()

    const ws = io(WS_URL, { transports: ['websocket'] })
    ws.on('connect', () => console.log('Monitor WS connected'))
    ws.on('alert', (alert) => {
      setLogs(prev => [alert, ...prev].slice(0, 200))
      if (soundEnabled && audioRef.current) {
        audioRef.current.play().catch(() => {})
      }
    })
    socketRef.current = ws

    return () => ws.disconnect()
  }, [filters, soundEnabled])

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0
    }
  }, [logs, autoScroll])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: 100, ...filters })
      const res = await axios.get(`${API_URL}/api/admin/logs?${params}`)
      setLogs(res.data)
      
      const blocked = res.data.filter(l => l.blocked).length
      setStats({
        total: res.data.length,
        blocked: blocked,
        attacks: res.data.filter(l => l.attack_type).length
      })
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (attackType) => {
    const colors = {
      sqli: 'border-l-red-500',
      xss: 'border-l-orange-500',
      cmdi: 'border-l-purple-500',
      lfi: 'border-l-yellow-500',
      rfi: 'border-l-blue-500',
      xxe: 'border-l-pink-500',
      ssrf: 'border-l-cyan-500',
    }
    return colors[attackType] || 'border-l-dark-600'
  }

  const getAttackBadge = (attackType) => {
    const badges = {
      sqli: 'badge-danger',
      xss: 'badge-warning',
      cmdi: 'bg-purple-500/20 text-purple-400',
      lfi: 'bg-yellow-500/20 text-yellow-400',
      rfi: 'bg-blue-500/20 text-blue-400',
      xxe: 'bg-pink-500/20 text-pink-400',
      ssrf: 'bg-cyan-500/20 text-cyan-400',
    }
    return badges[attackType] || 'badge-info'
  }

  return (
    <div className="space-y-4 animate-in">
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAT+7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u" preload="auto" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Live Threat Monitor</h1>
          <p className="text-dark-400">Real-time attack detection and blocking</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`btn p-2 ${soundEnabled ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`btn p-2 ${autoScroll ? 'btn-primary' : 'btn-secondary'}`}
          >
            {autoScroll ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button onClick={fetchLogs} className="btn btn-secondary p-2">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-dark-400 text-sm">Total Requests</div>
          <div className="text-2xl font-bold text-dark-100">{stats.total}</div>
        </div>
        <div className="card p-4">
          <div className="text-dark-400 text-sm">Blocked</div>
          <div className="text-2xl font-bold text-red-400">{stats.blocked}</div>
        </div>
        <div className="card p-4">
          <div className="text-dark-400 text-sm">Attack Types</div>
          <div className="text-2xl font-bold text-orange-400">{stats.attacks}</div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="text"
              placeholder="Filter by IP, path, or attack type..."
              className="input pl-10"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <select
            className="input w-40"
            value={filters.attack_type}
            onChange={(e) => setFilters({ ...filters, attack_type: e.target.value })}
          >
            <option value="">All Types</option>
            <option value="sqli">SQL Injection</option>
            <option value="xss">XSS</option>
            <option value="cmdi">Command Injection</option>
            <option value="lfi">LFI</option>
            <option value="rfi">RFI</option>
          </select>
          <select
            className="input w-32"
            value={filters.blocked}
            onChange={(e) => setFilters({ ...filters, blocked: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="true">Blocked</option>
            <option value="false">Allowed</option>
          </select>
        </div>
      </div>

      <div 
        ref={logContainerRef}
        className="card max-h-[600px] overflow-y-auto space-y-2 p-4"
      >
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center text-dark-400 py-8">
            No threats detected
          </div>
        ) : (
          logs.map((log, idx) => (
            <div
              key={log.id || idx}
              className={`p-3 bg-dark-800 rounded-lg border-l-4 ${getSeverityColor(log.attack_type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {log.blocked ? (
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-dark-100">{log.client_ip}</span>
                      {log.attack_type && (
                        <span className={`badge ${getAttackBadge(log.attack_type)}`}>
                          {log.attack_type.toUpperCase()}
                        </span>
                      )}
                      {log.blocked && (
                        <span className="badge badge-danger">BLOCKED</span>
                      )}
                    </div>
                    <div className="text-sm text-dark-400 mt-1">
                      <span className="badge badge-info text-xs">{log.method}</span>
                      <span className="ml-2 text-dark-300">{log.path}</span>
                    </div>
                    <div className="text-xs text-dark-500 mt-1 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleString()}
                      <span className="ml-2">Score: {log.threat_score?.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ThreatMonitor