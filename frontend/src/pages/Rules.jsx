import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

function Rules() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [search, setSearch] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rule_type: 'sqli',
    pattern: '',
    pattern_type: 'regex',
    severity: 'medium',
    action: 'block',
    priority: 100,
    is_enabled: true,
    tags: []
  })

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/admin/rules`)
      setRules(res.data)
    } catch (err) {
      console.error('Failed to fetch rules:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingRule) {
        await axios.put(`${API_URL}/api/admin/rules/${editingRule.id}`, formData)
      } else {
        await axios.post(`${API_URL}/api/admin/rules`, formData)
      }
      setShowModal(false)
      setEditingRule(null)
      resetForm()
      fetchRules()
    } catch (err) {
      console.error('Failed to save rule:', err)
    }
  }

  const handleEdit = (rule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      description: rule.description || '',
      rule_type: rule.rule_type,
      pattern: rule.pattern,
      pattern_type: rule.pattern_type,
      severity: rule.severity,
      action: rule.action,
      priority: rule.priority,
      is_enabled: rule.is_enabled,
      tags: rule.tags || []
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this rule?')) return
    try {
      await axios.delete(`${API_URL}/api/admin/rules/${id}`)
      fetchRules()
    } catch (err) {
      console.error('Failed to delete rule:', err)
    }
  }

  const handleToggle = async (id) => {
    try {
      await axios.post(`${API_URL}/api/admin/rules/${id}/toggle`)
      fetchRules()
    } catch (err) {
      console.error('Failed to toggle rule:', err)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      rule_type: 'sqli',
      pattern: '',
      pattern_type: 'regex',
      severity: 'medium',
      action: 'block',
      priority: 100,
      is_enabled: true,
      tags: []
    })
  }

  const filteredRules = rules.filter(rule => 
    rule.name.toLowerCase().includes(search.toLowerCase()) ||
    rule.rule_type.toLowerCase().includes(search.toLowerCase())
  )

  const severityColors = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
    info: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400 border-gray-200 dark:border-gray-500/30'
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">ENFORCEMENT POLICIES</h2>
          <p className="text-sm text-gray-500 dark:text-dark-400 font-bold uppercase tracking-widest">Active Inspection Logic & Virtual Patching</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingRule(null); setShowModal(true); }}
          className="btn btn-primary px-8 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-500/20"
        >
          <Plus className="w-4 h-4" />
          Provision Rule
        </button>
      </div>

      <div className="relative group max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
        <input
          type="text"
          placeholder="Filter enforcement nodes by name or vector..."
          className="input pl-12 bg-white dark:bg-dark-900 border-gray-200 dark:border-dark-800 font-bold shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="card p-12 text-center bg-white/50 dark:bg-dark-900/50 border-dashed">
            <RefreshCw className="w-10 h-10 animate-spin mx-auto text-primary-500 mb-4" />
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Synchronizing Policy Datastore</span>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="card p-12 text-center text-gray-400 font-bold uppercase tracking-widest italic">
            Zero active enforcement nodes matching criteria
          </div>
        ) : (
          filteredRules.map((rule) => (
            <div key={rule.id} className="card p-6 group hover:border-primary-500/50 transition-all duration-300 shadow-sm hover:shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => handleToggle(rule.id)}
                    className="transform transition-transform active:scale-95"
                  >
                    {rule.is_enabled ? (
                      <ToggleRight className="w-10 h-10 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-gray-300 dark:text-dark-700" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-black text-gray-900 dark:text-white text-lg tracking-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{rule.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${severityColors[rule.severity]}`}>
                        {rule.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-dark-400 font-medium">{rule.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-16 lg:ml-0">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Vector Class</span>
                    <span className="text-xs font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">{rule.rule_type}</span>
                  </div>
                  <div className="w-px h-8 bg-gray-100 dark:bg-dark-800 hidden lg:block"></div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Priority Index</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white">{rule.priority}</span>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => handleEdit(rule)} className="btn btn-secondary p-2.5 rounded-xl hover:text-primary-600">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(rule.id)} className="btn btn-danger p-2.5 rounded-xl">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-gray-50 dark:bg-dark-950 rounded-2xl border border-gray-100 dark:border-dark-800 font-mono relative overflow-hidden group-hover:border-primary-500/20">
                <div className="absolute top-0 right-0 p-2 text-[9px] font-black text-gray-300 dark:text-dark-800 uppercase tracking-widest">Regex_Payload</div>
                <code className="text-xs text-primary-700 dark:text-primary-400 break-all leading-relaxed font-bold">
                  {rule.pattern}
                </code>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in duration-200">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-100 dark:border-dark-800 bg-gray-50/50 dark:bg-dark-800/50">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">
                {editingRule ? 'Modify Enforcement Node' : 'Initialize Policy Node'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-dark-500 font-bold uppercase tracking-widest mt-1">Rule Engine Configuration</p>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label uppercase text-[10px] font-black tracking-widest text-gray-500">Node Identifier</label>
                  <input
                    type="text"
                    className="input font-bold"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g. BLOCK_XSS_V3"
                  />
                </div>
                <div>
                  <label className="label uppercase text-[10px] font-black tracking-widest text-gray-500">Threat Classification</label>
                  <select
                    className="input font-bold"
                    value={formData.rule_type}
                    onChange={(e) => setFormData({ ...formData, rule_type: e.target.value })}
                  >
                    <option value="sqli">SQL INJECTION</option>
                    <option value="xss">XSS VECTORS</option>
                    <option value="lfi">LOCAL FILE INC</option>
                    <option value="rfi">REMOTE FILE INC</option>
                    <option value="cmdi">COMMAND EXEC</option>
                    <option value="xxe">XXE VULNS</option>
                    <option value="ssrf">SSRF VECTORS</option>
                    <option value="http_smuggling">HTTP SMUGGLING</option>
                    <option value="path_traversal">PATH TRAVERSAL</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label uppercase text-[10px] font-black tracking-widest text-gray-500">Functional Description</label>
                <input
                  type="text"
                  className="input font-medium"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Define the scope and purpose of this enforcement node..."
                />
              </div>
              <div>
                <label className="label uppercase text-[10px] font-black tracking-widest text-gray-500">Detection Logic (PCRE Regex)</label>
                <textarea
                  className="input font-mono text-sm leading-relaxed min-h-[120px] focus:ring-primary-500/50"
                  value={formData.pattern}
                  onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                  required
                  placeholder="Enter high-performance regular expression..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 dark:bg-dark-800/30 rounded-2xl border border-gray-100 dark:border-dark-800">
                <div>
                  <label className="label uppercase text-[10px] font-black tracking-widest text-gray-500">Risk Severity</label>
                  <select
                    className="input font-bold text-xs"
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  >
                    <option value="critical text-red-600">CRITICAL</option>
                    <option value="high">HIGH_RISK</option>
                    <option value="medium">MEDIUM_PRIORITY</option>
                    <option value="low">LOW_IMPACT</option>
                    <option value="info">INFO_ONLY</option>
                  </select>
                </div>
                <div>
                  <label className="label uppercase text-[10px] font-black tracking-widest text-gray-500">Enforcement Action</label>
                  <select
                    className="input font-bold text-xs"
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  >
                    <option value="block">TERMINATE REQ</option>
                    <option value="log">PASSIVE MONITOR</option>
                    <option value="allow">WHITELISTED</option>
                  </select>
                </div>
                <div>
                  <label className="label uppercase text-[10px] font-black tracking-widest text-gray-500">Priority Tier</label>
                  <input
                    type="number"
                    className="input font-black"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-dark-800">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary px-8 font-bold uppercase tracking-widest text-xs">
                  Abort
                </button>
                <button type="submit" className="btn btn-primary px-10 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-500/30">
                  {editingRule ? 'COMMIT CHANGES' : 'DEPLOY POLICY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Rules