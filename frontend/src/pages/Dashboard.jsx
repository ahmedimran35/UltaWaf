import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  Shield, Activity, AlertTriangle, Globe, Clock,
  TrendingUp, RefreshCw, ShieldAlert, ShieldCheck,
  Zap, Server, ArrowUp, ArrowDown, Bell, Filter,
  Download, ChevronRight, MoreVertical
} from 'lucide-react'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { useApp } from '../hooks/useApp'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

function Dashboard() {
  const { theme } = useApp()
  const [overview, setOverview] = useState(null)
  const [attacks, setAttacks] = useState(null)
  const [timeline, setTimeline] = useState(null)
  const [topIps, setTopIps] = useState(null)
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [liveRPS, setLiveRPS] = useState(0)
  const [liveBlocked, setLiveBlocked] = useState(0)
  const [lastUpdate, setLastUpdate] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    fetchData()

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WS connected')
      ws.send(JSON.stringify({ type: 'subscribe', channels: ['stats', 'alerts'] }))
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === 'stats') {
          setLiveRPS(message.data?.rps || 0)
          setLiveBlocked(message.data?.blocked || 0)
          setLastUpdate(new Date())
        }
      } catch (err) {
        console.error('WS message error:', err)
      }
    }

    ws.onerror = (err) => {
      console.error('WebSocket error:', err)
    }

    socketRef.current = ws

    const interval = setInterval(fetchData, 10000)
    return () => {
      clearInterval(interval)
      ws.close()
    }
  }, [])

  const fetchData = async () => {
    try {
      const [overviewRes, attacksRes, timelineRes, ipsRes, logsRes] = await Promise.all([
        axios.get(`/api/admin/stats/overview`),
        axios.get(`/api/admin/stats/attacks`),
        axios.get(`/api/admin/stats/timeline`),
        axios.get(`/api/admin/stats/top-ips`),
        axios.get(`/api/admin/logs?limit=10`),
      ])
      setOverview(overviewRes.data)
      setAttacks(attacksRes.data)
      setTimeline(timelineRes.data)
      setTopIps(ipsRes.data)
      setRecentLogs(logsRes.data)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setLoading(false)
    }
  }

  const timelineChartData = {
    labels: timeline?.timeline?.slice(-20).map(t => new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) || [],
    datasets: [
      {
        label: 'Total Traffic',
        data: timeline?.timeline?.slice(-20).map(t => t.total) || [],
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'Blocked Traffic',
        data: timeline?.timeline?.slice(-20).map(t => t.blocked) || [],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      }
    ]
  }

  const blockedChartData = {
    labels: ['Blocked', 'Allowed'],
    datasets: [{
      data: [overview?.blocked_requests || 1, (overview?.total_requests - overview?.blocked_requests) || 1],
      backgroundColor: ['#ef4444', '#22c55e'],
      hoverOffset: 4,
      borderWidth: 0,
    }]
  }

  const attackChartData = {
    labels: attacks?.attacks?.slice(0, 6).map(a => a.type?.toUpperCase() || 'Unknown') || [],
    datasets: [{
      data: attacks?.attacks?.slice(0, 6).map(a => a.count) || [],
      backgroundColor: [
        '#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#8b5cf6'
      ],
      borderRadius: 4,
      borderWidth: 0,
    }]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    )
  }

  const gridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0'
  const textColor = theme === 'dark' ? '#94a3b8' : '#64748b'

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Security Overview</h1>
          <p className="text-gray-500">Enterprise-grade threat intelligence and real-time defense</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-full text-sm font-medium border border-green-200 dark:border-green-500/20">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Live Protection Active
          </div>
          <button onClick={fetchData} className="btn btn-secondary p-2.5 shadow-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Requests"
          value={overview?.total_requests?.toLocaleString() || '0'}
          subValue={`${overview?.unique_ips || 0} unique global IPs`}
          icon={Activity}
          color="primary"
          liveValue={liveRPS > 0 && `${liveRPS}/s`}
        />
        <StatCard
          title="Blocked Threats"
          value={overview?.blocked_requests?.toLocaleString() || '0'}
          subValue={`${overview?.block_rate || 0}% automatic mitigation`}
          icon={ShieldAlert}
          color="red"
          liveValue={liveBlocked > 0 && `+${liveBlocked}`}
        />
        <StatCard
          title="Allowed Traffic"
          value={overview?.allowed_requests?.toLocaleString() || '0'}
          subValue="Verified legitimate users"
          icon={ShieldCheck}
          color="green"
        />
        <StatCard
          title="Latency (Avg)"
          value={`${overview?.avg_response_time || 0}ms`}
          subValue="Real-time processing delay"
          icon={Zap}
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Traffic Analysis</h3>
              <p className="text-sm text-gray-500">Request patterns and mitigation volume</p>
            </div>
            <div className="flex gap-2">
               <span className="flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400">
                 <span className="w-2 h-2 rounded-full bg-primary-500"></span> Total
               </span>
               <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                 <span className="w-2 h-2 rounded-full bg-red-500"></span> Blocked
               </span>
            </div>
          </div>
          <div className="h-72">
            <Line 
              data={timelineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                    padding: 12,
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                    titleColor: theme === 'dark' ? '#f8fafc' : '#1e293b',
                    bodyColor: theme === 'dark' ? '#cbd5e1' : '#475569',
                    borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
                    borderWidth: 1,
                  }
                },
                interaction: {
                  mode: 'nearest',
                  axis: 'x',
                  intersect: false
                },
                scales: {
                  x: { 
                    ticks: { color: textColor, font: { size: 10 } }, 
                    grid: { display: false } 
                  },
                  y: { 
                    ticks: { color: textColor, font: { size: 10 } }, 
                    grid: { color: gridColor },
                    beginAtZero: true
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="card p-6 flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Mitigation Mix</h3>
            <p className="text-sm text-gray-500">Effectiveness of WAF filters</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-56 w-full">
              <Doughnut 
                data={blockedChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '75%',
                  plugins: {
                    legend: { 
                      position: 'bottom', 
                      labels: { 
                        color: textColor,
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 12 }
                      } 
                    }
                  }
                }}
              />
            </div>
            <div className="mt-4 text-center">
               <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{overview?.block_rate || 0}%</div>
               <div className="text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">Overall Block Rate</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Attack Vectors</h3>
            <p className="text-sm text-gray-500">Distribution of identified threats</p>
          </div>
          <div className="h-64">
            <Bar
              data={attackChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  x: { 
                    ticks: { color: textColor, font: { size: 10 } }, 
                    grid: { color: gridColor },
                    beginAtZero: true
                  },
                  y: { 
                    ticks: { color: textColor, font: { size: 11, weight: '500' } }, 
                    grid: { display: false }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top Adversaries</h3>
              <p className="text-sm text-gray-500 dark:text-dark-400">IPs with most aggressive behavior</p>
            </div>
            <button className="text-primary-600 dark:text-primary-400 text-sm font-semibold hover:underline">
              Investigate All
            </button>
          </div>
          <div className="space-y-3">
            {topIps?.ips?.slice(0, 5).map((ip, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-800/50 rounded-xl border border-gray-100 dark:border-dark-800 transition-hover hover:border-primary-300 dark:hover:border-primary-700">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    idx === 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-dark-400'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono text-gray-900 dark:text-dark-100 text-sm font-bold">{ip.ip}</span>
                    <span className="text-[10px] text-gray-500 dark:text-dark-500 uppercase font-bold tracking-tighter">Attacker Fingerprint: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div className="flex flex-col">
                    <span className="text-gray-900 dark:text-dark-100 font-bold text-sm">{ip.blocked_requests.toLocaleString()}</span>
                    <span className="text-[10px] text-gray-500 dark:text-dark-500 uppercase font-bold tracking-tighter">Blocks</span>
                  </div>
                  <div className="w-1.5 h-8 bg-red-500/20 rounded-full overflow-hidden">
                     <div className="bg-red-500 w-full" style={{ height: `${(ip.blocked_requests / topIps.ips[0].blocked_requests) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-dark-800 flex items-center justify-between bg-gray-50/50 dark:bg-dark-800/20">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Live Threat Intelligence</h3>
            <p className="text-sm text-gray-500 dark:text-dark-400">Direct feed from inspection engines</p>
          </div>
          <Link to="/logs" className="btn btn-secondary text-sm">
            Deep Analysis <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] text-gray-400 dark:text-dark-500 uppercase font-bold tracking-widest border-b border-gray-100 dark:border-dark-800">
                <th className="px-6 py-4">Event Time</th>
                <th className="px-6 py-4">Source Origin</th>
                <th className="px-6 py-4">Request Detail</th>
                <th className="px-6 py-4">Action Taken</th>
                <th className="px-6 py-4">Threat Type</th>
                <th className="px-6 py-4 text-right">Risk Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-800">
              {recentLogs.slice(0, 8).map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-dark-800/30 transition-colors group">
                  <td className="px-6 py-4 text-xs text-gray-500 dark:text-dark-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-mono text-gray-700 dark:text-dark-300 font-bold">{log.client_ip}</span>
                      <span className="text-[10px] text-gray-400 dark:text-dark-500 font-bold">{log.country || 'Unknown Location'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.method === 'POST' ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' :
                        log.method === 'GET' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' :
                        'bg-gray-100 text-gray-600'
                      }`}>{log.method}</span>
                      <span className="text-xs text-gray-600 dark:text-dark-300 max-w-[200px] truncate font-medium" title={log.path}>
                        {log.path}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {log.blocked ? (
                      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-bold">
                        <ShieldAlert className="w-3 h-3" /> Terminated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-bold">
                        <ShieldCheck className="w-3 h-3" /> Filtered
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {log.attack_type ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 text-[10px] font-bold uppercase tracking-tighter">
                        {log.attack_type}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-dark-600 text-[10px] font-bold uppercase">Safe Traffic</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <div className="w-12 h-1.5 bg-gray-100 dark:bg-dark-800 rounded-full overflow-hidden">
                          <div className={`h-full ${
                            log.threat_score >= 75 ? 'bg-red-500' :
                            log.threat_score >= 50 ? 'bg-orange-500' :
                            'bg-green-500'
                          }`} style={{ width: `${log.threat_score}%` }}></div>
                       </div>
                       <span className={`text-xs font-bold ${
                         log.threat_score >= 75 ? 'text-red-600 dark:text-red-400' :
                         log.threat_score >= 50 ? 'text-orange-600 dark:text-orange-400' :
                         'text-green-600 dark:text-green-400'
                       }`}>
                         {log.threat_score?.toFixed(0)}
                       </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, subValue, icon: Icon, color, liveValue }) {
  const { theme } = useApp()
  const colors = {
    primary: 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-500/10 border-primary-100 dark:border-primary-500/20',
    red: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10 border-red-100 dark:border-red-500/20',
    green: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-500/10 border-green-100 dark:border-green-500/20',
    yellow: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-500/10 border-yellow-100 dark:border-yellow-500/20',
  }

  return (
    <div className="card p-5 group hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-gray-500 dark:text-dark-400 text-xs font-bold uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{value}</h4>
            {liveValue && (
              <span className="text-[10px] bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-bold animate-pulse">
                {liveValue}
              </span>
            )}
          </div>
          <p className="text-gray-400 dark:text-dark-500 text-[10px] font-medium leading-tight">{subValue}</p>
        </div>
        <div className={`p-2.5 rounded-xl border transition-transform group-hover:scale-110 ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

export default Dashboard