import { useState, useEffect } from 'react'
import axios from 'axios'
import { Search, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

const API_URL = import.meta.env.VITE_API_URL || ''

function Logs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    blocked: '',
    attack_type: '',
    search: ''
  })

  useEffect(() => {
    fetchLogs()
  }, [page, filters])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page)
      params.append('limit', 50)
      if (filters.blocked) params.append('blocked', filters.blocked)
      if (filters.attack_type) params.append('attack_type', filters.attack_type)
      if (filters.search) params.append('search', filters.search)

      const res = await axios.get(`${API_URL}/api/admin/logs?${params}`)
      setLogs(res.data)
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const exportLogs = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/logs?limit=1000`)
      const csv = convertToCSV(res.data)
      downloadCSV(csv, 'waf-logs.csv')
    } catch (err) {
      console.error('Failed to export logs:', err)
    }
  }

  const convertToCSV = (data) => {
    const headers = ['ID', 'Timestamp', 'IP', 'Method', 'Path', 'Blocked', 'Attack Type', 'Threat Score']
    const rows = data.map(log => [
      log.id,
      log.timestamp,
      log.client_ip,
      log.method,
      log.path,
      log.blocked,
      log.attack_type || '',
      log.threat_score
    ])
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">INSPECTION LOGS</h2>
          <p className="text-sm text-gray-500 dark:text-dark-400 font-bold uppercase tracking-widest">Deep Request Intelligence Feed</p>
        </div>
        <button onClick={exportLogs} className="btn btn-primary px-8 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-500/20">
          <Download className="w-4 h-4" />
          Export Datastore
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 p-6 bg-white dark:bg-dark-900 rounded-2xl border border-gray-100 dark:border-dark-800 shadow-sm">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by IP, Path, or Content..."
            className="input pl-12 bg-gray-50 dark:bg-dark-800/50 border-transparent focus:bg-white dark:focus:bg-dark-800 font-bold"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <div className="flex gap-3">
          <select
            className="input w-44 bg-gray-50 dark:bg-dark-800/50 border-transparent font-bold"
            value={filters.blocked}
            onChange={(e) => setFilters({ ...filters, blocked: e.target.value })}
          >
            <option value="">Status: ALL</option>
            <option value="true">BLOCKED ONLY</option>
            <option value="false">ALLOWED ONLY</option>
          </select>
          <select
            className="input w-44 bg-gray-50 dark:bg-dark-800/50 border-transparent font-bold"
            value={filters.attack_type}
            onChange={(e) => setFilters({ ...filters, attack_type: e.target.value })}
          >
            <option value="">Vectors: ALL</option>
            <option value="sqli">SQL INJECTION</option>
            <option value="xss">XSS VECTORS</option>
            <option value="cmdi">COMMAND INJ</option>
            <option value="lfi">LFI/RFI</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-dark-800/50 border-b border-gray-100 dark:border-dark-800">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-dark-500 uppercase tracking-widest">Temporal Node</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-dark-500 uppercase tracking-widest">Origin Vector</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-dark-500 uppercase tracking-widest">Methodology</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-dark-500 uppercase tracking-widest">Payload Path</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-dark-500 uppercase tracking-widest">Enforcement</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-dark-500 uppercase tracking-widest">Classification</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 dark:text-dark-500 uppercase tracking-widest">Risk Factor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-4" />
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Fetching Encrypted Datastore</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center font-bold text-gray-400 uppercase italic">
                    Zero log events matching current filter parameters
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-dark-800/30 transition-colors group">
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-dark-400 font-mono whitespace-nowrap">
                      {format(new Date(log.timestamp), 'HH:mm:ss:SS')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900 dark:text-dark-100 font-mono tracking-tighter">{log.client_ip}</span>
                        <span className="text-[9px] text-gray-400 font-black uppercase tracking-tighter">{log.country || 'GLOBAL_NET'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                        log.method === 'POST' ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20' :
                        log.method === 'GET' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' :
                        'bg-gray-100 text-gray-500 border-gray-200 dark:bg-dark-800 dark:text-dark-500'
                      }`}>{log.method}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600 dark:text-dark-300 max-w-xs truncate font-bold font-mono group-hover:text-primary-500" title={log.path}>
                        {log.path}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.blocked ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-100 dark:border-red-500/20 rounded-lg">
                          Terminated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-black uppercase tracking-widest border border-green-100 dark:border-green-500/20 rounded-lg">
                          Filtered
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {log.attack_type ? (
                        <span className="px-2 py-1 rounded bg-red-500 text-white text-[9px] font-black uppercase tracking-widest shadow-sm shadow-red-500/20">
                          {log.attack_type}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 dark:text-dark-600 font-bold uppercase tracking-widest">Safe_Stream</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-xs font-black font-mono ${
                        log.threat_score >= 75 ? 'text-red-600 dark:text-red-400' :
                        log.threat_score >= 50 ? 'text-orange-600 dark:text-orange-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {log.threat_score?.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-6 bg-gray-50/30 dark:bg-dark-900 border-t border-gray-100 dark:border-dark-800">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary px-6 font-bold uppercase tracking-widest text-[10px]"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Previous Shift
          </button>
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Timeline Segment</span>
             <span className="w-10 h-10 flex items-center justify-center bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl font-black text-sm text-primary-500">{page}</span>
          </div>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={logs.length < 50}
            className="btn btn-secondary px-6 font-bold uppercase tracking-widest text-[10px]"
          >
            Next Shift <ChevronRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Logs