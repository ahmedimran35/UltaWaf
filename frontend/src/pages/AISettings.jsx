import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  Settings, Check, X, Loader2, Plus, Trash2, RefreshCw,
  ChevronRight, Eye, EyeOff, Zap, Bot, MessageSquare, 
  FileText, Shield, Sparkles, Key, Globe, Cpu, Server,
  ChevronDown, AlertCircle, CheckCircle
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', icon: Sparkles, free: false, color: 'from-green-500 to-emerald-500' },
  { id: 'anthropic', name: 'Anthropic Claude', icon: Bot, free: false, color: 'from-orange-500 to-amber-500' },
  { id: 'openrouter', name: 'OpenRouter', icon: Globe, free: true, color: 'from-purple-500 to-pink-500' },
  { id: 'kilocode', name: 'KiloCode AI', icon: Cpu, free: true, color: 'from-blue-500 to-cyan-500' },
  { id: 'opencode', name: 'OpenCode AI', icon: Code, free: true, color: 'from-violet-500 to-purple-500' },
  { id: 'ollama', name: 'Ollama (Local)', icon: Server, free: true, color: 'from-teal-500 to-green-500' },
  { id: 'lmstudio', name: 'LM Studio', icon: Server, free: true, color: 'from-slate-500 to-zinc-500' },
  { id: 'groq', name: 'Groq', icon: Zap, free: true, color: 'from-red-500 to-orange-500' },
  { id: 'custom', name: 'Custom Endpoint', icon: Settings, free: false, color: 'from-gray-500 to-slate-500' },
]

function Code(props) {
  return <Sparkles {...props} />
}

function AISettings() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [testing, setTesting] = useState(false)
  const [usage, setUsage] = useState(null)
  const [models, setModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [showKey, setShowKey] = useState({})
  
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    api_key: '',
    base_url: '',
    selected_model: '',
    custom_headers: {},
    is_active: false,
    is_fallback: false,
    response_timeout: 30,
    retry_attempts: 3,
    max_tokens: 2048,
    temperature: 0.7,
  })

  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/ai/providers`)
      setProviders(res.data)
    } catch (err) {
      console.error('Failed to fetch providers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (selectedProvider) {
        await axios.put(`${API_URL}/api/ai/providers/${selectedProvider.id}`, formData)
      } else {
        await axios.post(`${API_URL}/api/ai/providers`, formData)
      }
      setShowModal(false)
      fetchProviders()
    } catch (err) {
      console.error('Failed to save provider:', err)
    }
  }

  const handleTest = async (providerId) => {
    setTesting(true)
    try {
      await axios.post(`${API_URL}/api/ai/test`, { provider_id: providerId })
      fetchProviders()
    } catch (err) {
      console.error('Failed to test connection:', err)
    } finally {
      setTesting(false)
    }
  }

  const handleDelete = async (providerId) => {
    if (!confirm('Are you sure you want to delete this provider?')) return
    try {
      await axios.delete(`${API_URL}/api/ai/providers/${providerId}`)
      fetchProviders()
    } catch (err) {
      console.error('Failed to delete provider:', err)
    }
  }

  const loadModels = async (providerId) => {
    setLoadingModels(true)
    setModels([])
    try {
      const res = await axios.get(`${API_URL}/api/ai/models/${providerId}`)
      setModels(res.data)
    } catch (err) {
      console.error('Failed to load models:', err)
    } finally {
      setLoadingModels(false)
    }
  }

  const openProviderModal = (provider = null) => {
    if (provider) {
      setSelectedProvider(provider)
      setFormData({
        name: provider.name,
        display_name: provider.display_name,
        api_key: '',
        base_url: provider.base_url || '',
        selected_model: provider.selected_model || '',
        custom_headers: provider.custom_headers || {},
        is_active: provider.is_active,
        is_fallback: provider.is_fallback,
        response_timeout: provider.response_timeout,
        retry_attempts: provider.retry_attempts,
        max_tokens: provider.max_tokens,
        temperature: provider.temperature,
      })
    } else {
      setSelectedProvider(null)
      setFormData({
        name: '',
        display_name: '',
        api_key: '',
        base_url: '',
        selected_model: '',
        custom_headers: {},
        is_active: false,
        is_fallback: false,
        response_timeout: 30,
        retry_attempts: 3,
        max_tokens: 2048,
        temperature: 0.7,
      })
    }
    setShowModal(true)
  }

  const getProviderConfig = (providerId) => PROVIDERS.find(p => p.id === providerId)

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">AI Orchestration</h2>
          <p className="text-gray-500 dark:text-dark-400 font-medium">Power your WAF with state-of-the-art LLMs for autonomous defense</p>
        </div>
        <button onClick={() => openProviderModal(null)} className="btn btn-primary shadow-lg shadow-primary-500/20">
          <Plus className="w-5 h-5" />
          Provision Provider
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 flex flex-col items-center justify-center h-64 bg-white/50 dark:bg-dark-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-dark-800">
            <Loader2 className="w-12 h-12 animate-spin text-primary-500 mb-4" />
            <span className="text-gray-500 dark:text-dark-400 font-bold uppercase tracking-widest text-xs">Synchronizing AI Node</span>
          </div>
        ) : providers.length === 0 ? (
          <div className="col-span-3 card p-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-dark-800 rounded-3xl flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-gray-400 dark:text-dark-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No AI Engines Configured</h3>
            <p className="text-gray-500 dark:text-dark-400 mb-8 max-w-sm">Enable autonomous threat hunting and log analysis by connecting an AI provider.</p>
            <button onClick={() => openProviderModal(null)} className="btn btn-secondary px-8 font-bold">
              Deploy First Provider
            </button>
          </div>
        ) : (
          providers.map((provider) => {
            const config = getProviderConfig(provider.name)
            const Icon = config?.icon || Settings
            
            return (
              <div key={provider.id} className="card p-5 group hover:border-primary-500/50 transition-all duration-300">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${config?.color || 'from-gray-500 to-slate-500'} shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg">{provider.display_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {provider.is_active ? (
                          <span className="badge badge-success px-2 py-0.5 text-[10px] uppercase font-black tracking-tighter">Primary Node</span>
                        ) : (
                          <span className="badge badge-secondary px-2 py-0.5 text-[10px] uppercase font-black tracking-tighter bg-gray-100 text-gray-500 dark:bg-dark-800 dark:text-dark-500">Standby</span>
                        )}
                        {provider.is_fallback && (
                          <span className="badge badge-info px-2 py-0.5 text-[10px] uppercase font-black tracking-tighter">Fallback</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-dark-800/50 rounded-xl border border-gray-100 dark:border-dark-800">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-dark-500 uppercase">Deployed Model</span>
                    <span className="text-xs font-black text-gray-900 dark:text-dark-100 font-mono">{provider.selected_model || 'UNASSIGNED'}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-dark-800/50 rounded-xl border border-gray-100 dark:border-dark-800">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-dark-500 uppercase">Inspection Status</span>
                    <span className={`text-xs font-black uppercase tracking-tighter flex items-center gap-1.5 ${provider.test_status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                      {provider.test_status === 'success' && <CheckCircle className="w-3 h-3" />}
                      {provider.test_status || 'NOT INITIALIZED'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { openProviderModal(provider); loadModels(provider.id) }}
                    className="btn btn-secondary flex-1 font-bold text-xs"
                  >
                    Configure Node
                  </button>
                  <button
                    onClick={() => handleTest(provider.id)}
                    className={`btn btn-secondary p-2.5 ${testing ? 'opacity-50' : ''}`}
                    disabled={testing}
                  >
                    <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleDelete(provider.id)}
                    className="btn btn-danger p-2.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in duration-200">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl scale-100 transition-transform">
            <div className="p-6 border-b border-gray-100 dark:border-dark-800 bg-gray-50/50 dark:bg-dark-800/50 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">
                  {selectedProvider ? 'RECONFIGURE ENGINE' : 'PROVISION NEW ENGINE'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-dark-500 font-bold uppercase tracking-widest mt-1">Autonomous Security Node Setup</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-dark-700 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label uppercase text-[10px] font-black tracking-widest text-gray-500">LLM Provider</label>
                  <select
                    className="input font-bold"
                    value={formData.name}
                    onChange={(e) => {
                      const config = getProviderConfig(e.target.value)
                      setFormData({
                        ...formData,
                        name: e.target.value,
                        display_name: config?.name || e.target.value,
                        base_url: config?.id === 'custom' ? '' : config?.base_url || '',
                      })
                    }}
                    disabled={selectedProvider}
                  >
                    <option value="">Select Engine...</option>
                    {PROVIDERS.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.free && '(Free Tier Available)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label uppercase text-[10px] font-black tracking-widest text-gray-500">Credentials</label>
                  <div className="relative">
                    <input
                      type={showKey[formData.name] ? 'text' : 'password'}
                      className="input pr-12 font-mono text-sm"
                      value={formData.api_key}
                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                      placeholder={
                        formData.name === 'ollama' 
                          ? 'Not required for local node' 
                          : 'API Secret Key'
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey({ ...showKey, [formData.name]: !showKey[formData.name] })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-500 hover:text-primary-500"
                    >
                      {showKey[formData.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {(formData.name === 'custom' || formData.name === 'ollama' || formData.name === 'lmstudio') && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="label uppercase text-[10px] font-black tracking-widest text-gray-500">Service Endpoint (Local/Custom)</label>
                  <input
                    type="text"
                    className="input font-mono text-sm"
                    value={formData.base_url}
                    onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                    placeholder={
                      formData.name === 'ollama' 
                        ? 'http://localhost:11434'
                        : 'http://localhost:1234/v1'
                    }
                  />
                </div>
              )}

              <div>
                <label className="label uppercase text-[10px] font-black tracking-widest text-gray-500">Model Architecture</label>
                {loadingModels ? (
                  <div className="input flex items-center gap-3 italic text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                    Querying available architectures...
                  </div>
                ) : models.length > 0 ? (
                  <select
                    className="input font-bold"
                    value={formData.selected_model}
                    onChange={(e) => setFormData({ ...formData, selected_model: e.target.value })}
                  >
                    <option value="">Select Architecture...</option>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.is_free && '(Free)'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="input font-bold"
                    value={formData.selected_model}
                    onChange={(e) => setFormData({ ...formData, selected_model: e.target.value })}
                    placeholder="e.g. gpt-4o-security"
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-6 bg-gray-50 dark:bg-dark-800/30 p-4 rounded-2xl border border-gray-100 dark:border-dark-800">
                <div>
                  <label className="label uppercase text-[10px] font-black tracking-widest text-gray-500">Timeout (s)</label>
                  <input
                    type="number"
                    className="input font-bold"
                    value={formData.response_timeout}
                    onChange={(e) => setFormData({ ...formData, response_timeout: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label uppercase text-[10px] font-black tracking-widest text-gray-500">Context Window</label>
                  <input
                    type="number"
                    className="input font-bold"
                    value={formData.max_tokens}
                    onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label uppercase text-[10px] font-black tracking-widest text-gray-500">Creativity</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input font-bold"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 bg-primary-50/30 dark:bg-primary-500/5 rounded-2xl border border-primary-100/50 dark:border-primary-500/10">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="peer sr-only"
                    />
                    <div className="w-10 h-6 bg-gray-300 rounded-full peer peer-checked:bg-primary-600 transition-colors"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-transform shadow-sm"></div>
                  </div>
                  <span className="text-sm font-bold text-gray-700 dark:text-dark-200 uppercase tracking-tighter">Activate Primary Node</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_fallback}
                      onChange={(e) => setFormData({ ...formData, is_fallback: e.target.checked })}
                      className="peer sr-only"
                    />
                    <div className="w-10 h-6 bg-gray-300 rounded-full peer peer-checked:bg-primary-600 transition-colors"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-transform shadow-sm"></div>
                  </div>
                  <span className="text-sm font-bold text-gray-700 dark:text-dark-200 uppercase tracking-tighter">Enable High-Availability Fallback</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-dark-800">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary px-6 font-bold uppercase tracking-widest text-xs">
                  Abort
                </button>
                <button type="submit" className="btn btn-primary px-8 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-500/30">
                  {selectedProvider ? 'SYNC RECONFIGURATION' : 'INITIALIZE ENGINE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AISettings