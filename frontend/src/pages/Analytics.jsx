import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { 
  FileText, Download, Calendar, RefreshCw,
  TrendingUp, TrendingDown, Activity, Shield,
  AlertTriangle, Clock, Globe
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

function Analytics() {
  const [period, setPeriod] = useState(7)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [attackData, setAttackData] = useState([])
  const [topData, setTopData] = useState({ ips: [], endpoints: [] })

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [overviewRes, attacksRes, timelineRes, ipsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/stats/overview?hours=${period * 24}`),
        axios.get(`${API_URL}/api/admin/stats/attacks?hours=${period * 24}`),
        axios.get(`${API_URL}/api/admin/stats/timeline?hours=${period * 24}`),
        axios.get(`${API_URL}/api/admin/stats/top-ips?hours=${period * 24}&limit=10`),
      ])
      
      setStats(overviewRes.data)
      setAttackData(attacksRes.data.attacks || [])
      setTopData({
        ips: ipsRes.data.ips || [],
        endpoints: []
      })
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#8b5cf6', '#ec4899', '#06b6d4']

  const exportReport = () => {
    const report = {
      generated: new Date().toISOString(),
      period_days: period,
      overview: stats,
      attacks: attackData,
      top_ips: topData.ips,
    }
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `waf-report-${period}-days.json`
    a.click()
  }

  return (
    <div className="space-y-6 animate-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">ANALYTICS ENGINE</h1>
          <p className="text-sm text-gray-500 dark:text-dark-400 font-bold uppercase tracking-widest">Historical Intelligence & Trend Synthesis</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-dark-900 p-1.5 rounded-2xl border border-gray-100 dark:border-dark-800 shadow-sm">
          <Calendar className="w-4 h-4 text-gray-400 ml-3" />
          <select
            className="input w-48 bg-transparent border-none font-bold text-xs uppercase tracking-widest focus:ring-0"
            value={period}
            onChange={(e) => setPeriod(parseInt(e.target.value))}
          >
            <option value={1}>Last 24 Hours</option>
            <option value={7}>Last 7 Cycles</option>
            <option value={30}>Last 30 Cycles</option>
            <option value={90}>Full Quarter</option>
          </select>
          <button onClick={exportReport} className="btn btn-primary px-6 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary-500/20">
            <Download className="w-4 h-4" />
            Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Aggregated Requests"
          value={stats?.total_requests?.toLocaleString() || '0'}
          icon={Activity}
          color="#0ea5e9"
          description="Total throughput in period"
        />
        <MetricCard
          title="Mitigated Threats"
          value={stats?.blocked_requests?.toLocaleString() || '0'}
          subValue={`${stats?.block_rate || 0}% Effectiveness`}
          icon={Shield}
          color="#ef4444"
          description="Terminated malicious packets"
        />
        <MetricCard
          title="Unique Origins"
          value={stats?.unique_ips?.toLocaleString() || '0'}
          icon={Globe}
          color="#8b5cf6"
          description="Distinct IP sources"
        />
        <MetricCard
          title="Mean Latency"
          value={`${stats?.avg_response_time || 0}ms`}
          icon={Clock}
          color="#22c55e"
          description="Average processing delay"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-8 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
             <BarChart className="w-24 h-24" />
          </div>
          <div className="w-full mb-8 text-center">
            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Attack Distribution</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Vector Class Breakdown</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attackData}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  label={false}
                >
                  {attackData.map((entry, index) => (
                    <Cell key={entry.type} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                    color: '#fff'
                  }}
                  itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-full">
             {attackData.slice(0, 4).map((entry, index) => (
               <div key={index} className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                 <span className="text-[10px] font-black text-gray-400 uppercase truncate">{entry.type}</span>
               </div>
             ))}
          </div>
        </div>

        <div className="lg:col-span-2 card p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Hostile Entity Hierarchy</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Persistent Attacking Nodes</p>
            </div>
            <button className="text-[10px] font-black text-primary-500 uppercase tracking-widest hover:underline">Full Intel Map</button>
          </div>
          <div className="space-y-4">
            {topData.ips.slice(0, 7).map((ip, idx) => (
              <div key={idx} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-gray-300 dark:text-dark-700 w-4 font-mono">{idx + 1}</span>
                    <span className="font-mono text-sm font-black text-gray-700 dark:text-dark-100 group-hover:text-primary-500 transition-colors tracking-tighter">{ip.ip}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Requests</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white">{ip.total_requests.toLocaleString()}</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-50 dark:bg-dark-800/50 rounded-full overflow-hidden border border-gray-100 dark:border-dark-800">
                  <div 
                    className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full shadow-[0_0_8px_rgba(14,165,233,0.3)] transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${(ip.total_requests / topData.ips[0]?.total_requests) * 100}%` 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-8 border-b border-gray-100 dark:border-dark-800 bg-gray-50/30 dark:bg-dark-900/30">
          <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Attack Methodology breakdown</h3>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Structural Analysis of Filtered Traffic</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] font-black text-gray-400 dark:text-dark-500 uppercase tracking-widest border-b border-gray-100 dark:border-dark-800">
                <th className="px-8 py-4 text-left">Vector Class</th>
                <th className="px-8 py-4">Event Count</th>
                <th className="px-8 py-4">Percentage</th>
                <th className="px-8 py-4 w-1/3">Intensity Visualization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-800">
              {attackData.map((attack, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-dark-800/30 transition-colors">
                  <td className="px-8 py-5">
                    <span className="font-black text-gray-900 dark:text-dark-100 uppercase tracking-tighter">
                      {attack.type?.toUpperCase() || 'UNKNOWN_VECTOR'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-gray-600 dark:text-dark-400 font-mono font-bold">{attack.count.toLocaleString()}</td>
                  <td className="px-8 py-5 text-gray-600 dark:text-dark-400 font-black">
                    {((attack.count / attackData.reduce((a, b) => a + b.count, 0)) * 100).toFixed(1)}%
                  </td>
                  <td className="px-8 py-5">
                    <div className="h-3 bg-gray-100 dark:bg-dark-950 rounded-lg overflow-hidden border border-gray-200 dark:border-dark-800 relative">
                      <div 
                        className="h-full rounded-lg shadow-sm transition-all duration-1000"
                        style={{ 
                          width: `${(attack.count / attackData[0]?.count) * 100}%`,
                          backgroundColor: COLORS[idx % COLORS.length]
                        }}
                      />
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

function MetricCard({ title, value, subValue, icon: Icon, color, description }) {
  return (
    <div className="card p-6 group hover:border-primary-500/30 transition-all duration-300 relative overflow-hidden">
      <div className="absolute -right-2 -bottom-2 opacity-5 scale-150 transform -rotate-12 group-hover:scale-125 transition-transform duration-500">
         <Icon className="w-16 h-16" style={{ color }} />
      </div>
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-dark-800 border border-gray-100 dark:border-dark-700">
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {subValue && (
           <span className="text-[10px] font-black px-2 py-0.5 rounded-lg border border-red-100 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 uppercase tracking-widest">{subValue}</span>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-gray-400 dark:text-dark-500 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{value}</p>
        <p className="text-[10px] text-gray-400 font-bold uppercase mt-2 opacity-0 group-hover:opacity-100 transition-opacity">{description}</p>
      </div>
    </div>
  )
}

function InsightCard({ title, value, description, icon: Icon }) {
  return (
    <div className="card p-4">
      <p className="text-dark-400 text-sm">{title}</p>
      <p className="text-xl font-bold text-dark-100 mt-1">{value}</p>
      <p className="text-dark-500 text-xs mt-1">{description}</p>
    </div>
  )
}

export default Analytics