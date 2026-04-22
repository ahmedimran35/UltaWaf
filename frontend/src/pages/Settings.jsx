import { useState, useEffect } from 'react'
import axios from 'axios'
import { Save, RefreshCw, Shield, Zap, Brain, Lock, MousePointer2, Code2, Database } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

function Settings() {
  const [settings, setSettings] = useState(null)
  const [advancedSettings, setAdvancedSettings] = useState({
    honeypot_paths: [],
    api_shield_enabled: true,
    virtual_patching_enabled: true,
    siem_logging_enabled: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
    fetchAdvancedSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/settings`)
      setSettings(res.data)
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAdvancedSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/settings/advanced`)
      setAdvancedSettings(res.data)
    } catch (err) {
      console.error('Failed to fetch advanced settings:', err)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      await Promise.all([
        axios.post(`${API_URL}/api/admin/settings`, settings),
        axios.post(`${API_URL}/api/admin/settings/advanced`, advancedSettings)
      ])
      alert('Security parameters synchronized successfully.')
    } catch (err) {
      console.error('Failed to save settings:', err)
      alert('Error during parameter synchronization.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <RefreshCw className="w-10 h-10 text-primary-500 animate-spin mb-4" />
        <span className="text-xs font-black text-gray-400 dark:text-dark-500 uppercase tracking-widest">Querying System Registry</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in max-w-5xl pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">SYSTEM PARAMETERS</h2>
          <p className="text-sm text-gray-500 dark:text-dark-400 font-bold uppercase tracking-widest">Engine Configuration & Subsystem Control</p>
        </div>
        <button onClick={saveSettings} className="btn btn-primary px-10 py-3 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-500/20" disabled={saving}>
          <Save className="w-4 h-4" />
          {saving ? 'Synchronizing...' : 'Deploy Global Configuration'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="card p-8 group border-t-4 border-primary-500 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 rounded-2xl bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20">
                <Shield className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Core Inspection</h2>
                <p className="text-[10px] text-gray-400 dark:text-dark-500 font-bold uppercase tracking-widest">Traffic Filtering Engine</p>
              </div>
            </div>
            <div className="space-y-6">
              <Toggle
                label="Primary Protection Engine"
                description="Enable real-time packet inspection and traffic filtering"
                checked={settings?.waf_enabled}
                onChange={(v) => setSettings({ ...settings, waf_enabled: v })}
              />
              <div className="h-px bg-gray-100 dark:bg-dark-800"></div>
              <Toggle
                label="Active Termination (Block Mode)"
                description="Instantly drop malicious packets (Log-only if disabled)"
                checked={settings?.block_mode}
                onChange={(v) => setSettings({ ...settings, block_mode: v })}
              />
            </div>
          </div>

          <div className="card p-8 group border-t-4 border-yellow-500 shadow-lg">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 rounded-2xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-100 dark:border-yellow-500/20">
                <Zap className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Flood Control</h2>
                <p className="text-[10px] text-gray-400 dark:text-dark-500 font-bold uppercase tracking-widest">Anti-DDoS & Rate Limiting</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Temporal Window (SEC)"
                type="number"
                value={settings?.rate_limit_window}
                onChange={(v) => setSettings({ ...settings, rate_limit_window: parseInt(v) })}
                placeholder="60"
              />
              <Input
                label="Mitigation Threshold"
                type="number"
                value={settings?.ddos_threshold}
                onChange={(v) => setSettings({ ...settings, ddos_threshold: parseInt(v) })}
                placeholder="100"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-8 group border-t-4 border-indigo-500 shadow-lg">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                <Lock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Advanced Defense</h2>
                <p className="text-[10px] text-gray-400 dark:text-dark-500 font-bold uppercase tracking-widest">Extended Security Modules</p>
              </div>
            </div>
            <div className="space-y-6">
              <Toggle
                label="Dynamic Virtual Patching"
                description="Apply hot-fixes for known vulnerabilities without code changes"
                checked={advancedSettings.virtual_patching_enabled}
                onChange={(v) => setAdvancedSettings({ ...advancedSettings, virtual_patching_enabled: v })}
              />
              <div className="h-px bg-gray-100 dark:bg-dark-800"></div>
              <Toggle
                label="API Structural Validation"
                description="Enforce JSON schemas and sanitize all endpoint payloads"
                checked={advancedSettings.api_shield_enabled}
                onChange={(v) => setAdvancedSettings({ ...advancedSettings, api_shield_enabled: v })}
              />
              <div className="h-px bg-gray-100 dark:bg-dark-800"></div>
              <Toggle
                label="SIEM Data Pipeline"
                description="Synchronize security events with external telemetry systems"
                checked={advancedSettings.siem_logging_enabled}
                onChange={(v) => setAdvancedSettings({ ...advancedSettings, siem_logging_enabled: v })}
              />
              
              <div className="pt-6 mt-6 border-t border-gray-100 dark:border-dark-800">
                <div className="flex items-center gap-2 mb-4">
                  <MousePointer2 className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Honeypot Decoy Paths</h3>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {advancedSettings.honeypot_paths.map((path, idx) => (
                    <span key={idx} className="bg-gray-100 dark:bg-dark-800 text-gray-700 dark:text-dark-200 pl-3 pr-1 py-1 rounded-xl text-[10px] font-black font-mono border border-gray-200 dark:border-dark-700 flex items-center gap-2 group/tag hover:border-red-500/50 transition-colors">
                      {path}
                      <button 
                        onClick={() => setAdvancedSettings({
                          ...advancedSettings, 
                          honeypot_paths: advancedSettings.honeypot_paths.filter((_, i) => i !== idx)
                        })}
                        className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >&times;</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    id="new_honeypot"
                    type="text" 
                    placeholder="ENTER_SENSITIVE_PATH..."
                    className="input py-2 text-xs font-mono flex-1 bg-gray-50 dark:bg-dark-950 border-gray-100 dark:border-dark-800"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.target.value;
                        if (val && !advancedSettings.honeypot_paths.includes(val)) {
                          setAdvancedSettings({
                            ...advancedSettings,
                            honeypot_paths: [...advancedSettings.honeypot_paths, val]
                          });
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                  <button 
                    onClick={() => {
                      const el = document.getElementById('new_honeypot');
                      if (el.value && !advancedSettings.honeypot_paths.includes(el.value)) {
                        setAdvancedSettings({
                          ...advancedSettings,
                          honeypot_paths: [...advancedSettings.honeypot_paths, el.value]
                        });
                        el.value = '';
                      }
                    }}
                    className="btn btn-secondary py-2 px-4 text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-dark-800"
                  >DEPLOY</button>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-8 group border-t-4 border-purple-500 shadow-lg">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20">
                <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Neural Analysis</h2>
                <p className="text-[10px] text-gray-400 dark:text-dark-500 font-bold uppercase tracking-widest">Behavioral Intelligence</p>
              </div>
            </div>
            <div className="space-y-6">
              <Toggle
                label="Autonomous ML Classifier"
                description="Utilize deep learning to identify zero-day anomalies and bot patterns"
                checked={settings?.ml_enabled}
                onChange={(v) => setSettings({ ...settings, ml_enabled: v })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between group/toggle">
      <div className="max-w-[80%]">
        <p className="text-gray-900 dark:text-white font-black text-sm uppercase tracking-tight">{label}</p>
        <p className="text-xs text-gray-500 dark:text-dark-400 font-medium leading-relaxed mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-dark-950 ${
          checked ? 'bg-primary-600 shadow-[0_0_12px_rgba(14,165,233,0.4)]' : 'bg-gray-200 dark:bg-dark-800'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

function Input({ label, type = 'text', value, onChange, ...props }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-gray-400 dark:text-dark-500 uppercase tracking-widest block pl-1">{label}</label>
      <input
        type={type}
        className="input font-black text-lg bg-gray-50 dark:bg-dark-950 border-gray-100 dark:border-dark-800 focus:bg-white dark:focus:bg-dark-900 transition-all"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </div>
  )
}

export default Settings