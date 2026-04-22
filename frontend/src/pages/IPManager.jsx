import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Search, Trash2, RefreshCw, Shield, Globe, Ban, Loader2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

function IPManager() {
  const [activeTab, setActiveTab] = useState('blacklist')
  const [blacklist, setBlacklist] = useState([])
  const [whitelist, setWhitelist] = useState([])
  const [geoBlocks, setGeoBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    ip_address: '',
    reason: '',
    description: ''
  })

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [blRes, wlRes, geoRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/ip/blacklist`),
        axios.get(`${API_URL}/api/admin/ip/whitelist`),
        axios.get(`${API_URL}/api/admin/ip/geo`),
      ])
      setBlacklist(blRes.data)
      setWhitelist(wlRes.data)
      setGeoBlocks(geoRes.data)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const addBlacklist = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API_URL}/api/admin/ip/blacklist`, formData)
      setShowModal(false)
      setFormData({ ip_address: '', reason: '', description: '' })
      fetchAll()
    } catch (err) {
      console.error('Failed to add to blacklist:', err)
    }
  }

  const addWhitelist = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API_URL}/api/admin/ip/whitelist`, formData)
      setShowModal(false)
      setFormData({ ip_address: '', reason: '', description: '' })
      fetchAll()
    } catch (err) {
      console.error('Failed to add to whitelist:', err)
    }
  }

  const removeBlacklist = async (ip) => {
    try {
      await axios.delete(`${API_URL}/api/admin/ip/blacklist/${ip}`)
      fetchAll()
    } catch (err) {
      console.error('Failed to remove from blacklist:', err)
    }
  }

  const removeWhitelist = async (ip) => {
    try {
      await axios.delete(`${API_URL}/api/admin/ip/whitelist/${ip}`)
      fetchAll()
    } catch (err) {
      console.error('Failed to remove from whitelist:', err)
    }
  }

  const tabs = [
    { id: 'blacklist', label: 'Reputation Blocklist', count: blacklist.length, icon: Ban, color: 'text-red-500' },
    { id: 'whitelist', label: 'Trusted Vectors', count: whitelist.length, icon: Shield, color: 'text-green-500' },
    { id: 'geo', label: 'Geographic Perimeter', count: geoBlocks.length, icon: Globe, color: 'text-primary-500' },
  ]

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase tracking-tighter">Traffic Control</h2>
          <p className="text-sm text-gray-500 dark:text-dark-400 font-bold uppercase tracking-widest">Global IP Intelligence & Perimeter Management</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100 dark:bg-dark-900 rounded-2xl w-fit border border-gray-200 dark:border-dark-800 shadow-inner">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 font-black text-xs uppercase tracking-widest ${
              activeTab === tab.id
                ? 'bg-white dark:bg-dark-800 text-gray-900 dark:text-white shadow-xl scale-100 border border-gray-100 dark:border-dark-700'
                : 'text-gray-400 dark:text-dark-500 hover:text-gray-600 dark:hover:text-dark-300 scale-95 hover:scale-100'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ''}`} />
            {tab.label}
            <span className={`ml-2 px-2 py-0.5 rounded-lg text-[10px] ${
              activeTab === tab.id ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-dark-950 text-gray-400 dark:text-dark-600'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-8">
        {activeTab === 'blacklist' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Blacklisted Nodes</h3>
              <button onClick={() => setShowModal(true)} className="btn btn-primary px-8 font-black uppercase tracking-widest text-xs shadow-xl shadow-red-500/20 bg-red-600 hover:bg-red-500 border-none">
                <Plus className="w-4 h-4" />
                Add Host
              </button>
            </div>
            <div className="grid gap-4">
              {loading ? (
                <div className="card p-12 text-center border-dashed border-gray-200 dark:border-dark-800">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Synchronizing Blocklist</span>
                </div>
              ) : blacklist.length === 0 ? (
                <div className="card p-12 text-center text-gray-400 font-bold uppercase tracking-widest italic border-dashed border-gray-200 dark:border-dark-800">
                  Perimeter secure - zero identified hostile nodes
                </div>
              ) : (
                blacklist.map((entry) => (
                  <div key={entry.id} className="card p-6 flex items-center justify-between group hover:border-red-500/50 transition-all duration-300 shadow-sm hover:shadow-xl">
                    <div className="flex items-center gap-6">
                       <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-100 dark:border-red-500/20">
                          <Ban className="w-6 h-6 text-red-600 dark:text-red-400" />
                       </div>
                       <div>
                         <span className="font-black text-xl text-gray-900 dark:text-dark-100 font-mono tracking-tighter">{entry.ip_address}</span>
                         <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-lg border border-red-100 dark:border-red-500/20">{entry.reason || 'No Reason Provided'}</span>
                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter italic">Source: {entry.source}</span>
                         </div>
                       </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden md:block">
                         <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Node Provisioned</div>
                         <div className="text-xs font-bold text-gray-900 dark:text-white">{new Date(entry.created_at).toLocaleDateString()}</div>
                      </div>
                      <button onClick={() => removeBlacklist(entry.ip_address)} className="btn btn-danger p-3 rounded-xl hover:bg-red-600 hover:text-white transition-colors shadow-lg shadow-red-500/10">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'whitelist' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Trusted Infrastructure</h3>
              <button onClick={() => setShowModal(true)} className="btn btn-primary px-8 font-black uppercase tracking-widest text-xs shadow-xl shadow-green-500/20 bg-green-600 hover:bg-green-500 border-none">
                <Plus className="w-4 h-4" />
                Whitelist IP
              </button>
            </div>
            <div className="grid gap-4">
              {loading ? (
                <div className="card p-12 text-center border-dashed border-gray-200 dark:border-dark-800">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto text-green-500 mb-4" />
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Verifying Trusted Nodes</span>
                </div>
              ) : whitelist.length === 0 ? (
                <div className="card p-12 text-center text-gray-400 font-bold uppercase tracking-widest italic border-dashed border-gray-200 dark:border-dark-800">
                  Zero manually whitelisted nodes detected
                </div>
              ) : (
                whitelist.map((entry) => (
                  <div key={entry.id} className="card p-6 flex items-center justify-between group hover:border-green-500/50 transition-all duration-300 shadow-sm hover:shadow-xl">
                    <div className="flex items-center gap-6">
                       <div className="w-12 h-12 bg-green-50 dark:bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-100 dark:border-green-500/20">
                          <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                       </div>
                       <div>
                         <span className="font-black text-xl text-gray-900 dark:text-dark-100 font-mono tracking-tighter">{entry.ip_address}</span>
                         <p className="text-xs font-bold text-gray-500 dark:text-dark-400 mt-1 uppercase tracking-widest">{entry.description || 'Verified Infrastructure Node'}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden md:block text-xs font-bold text-gray-400 font-mono uppercase tracking-tighter">
                         {new Date(entry.created_at).toLocaleDateString()}
                      </div>
                      <button onClick={() => removeWhitelist(entry.ip_address)} className="btn btn-danger p-3 rounded-xl">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'geo' && (
          <div className="space-y-4">
            <GeoBlocker geoBlocks={geoBlocks} onRefresh={fetchAll} loading={loading} />
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in duration-200">
          <div className="card w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100 dark:border-dark-800 bg-gray-50/50 dark:bg-dark-800/50">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase tracking-tighter">
                Add IP to {activeTab}
              </h2>
              <p className="text-[10px] text-gray-500 dark:text-dark-500 font-bold uppercase tracking-widest mt-1">Infrastructure Provisioning</p>
            </div>
            <form
              onSubmit={activeTab === 'blacklist' ? addBlacklist : addWhitelist}
              className="p-8 space-y-6"
            >
              <div>
                <label className="label uppercase text-[10px] font-black tracking-widest text-gray-500">Host IP Address</label>
                <input
                  type="text"
                  className="input font-mono font-black text-lg focus:ring-primary-500/50"
                  placeholder="0.0.0.0"
                  value={formData.ip_address}
                  onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label uppercase text-[10px] font-black tracking-widest text-gray-500">
                  {activeTab === 'blacklist' ? 'Hostility Rationale' : 'Trusted Description'}
                </label>
                <textarea
                  className="input font-bold text-sm"
                  rows={3}
                  placeholder="Define why this node is being processed..."
                  value={activeTab === 'blacklist' ? formData.reason : formData.description}
                  onChange={(e) => setFormData({
                    ...formData,
                    [activeTab === 'blacklist' ? 'reason' : 'description']: e.target.value
                  })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-dark-800">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary px-6 font-bold uppercase tracking-widest text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary px-8 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-500/30">
                  Provision Host
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function GeoBlocker({ geoBlocks, onRefresh, loading }) {
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    country_code: '',
    country_name: ''
  })

  const countryList = [
    { code: 'CN', name: 'China' },
    { code: 'RU', name: 'Russia' },
    { code: 'IR', name: 'Iran' },
    { code: 'KP', name: 'North Korea' },
    { code: 'SY', name: 'Syria' },
    { code: 'CU', name: 'Cuba' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'BY', name: 'Belarus' },
  ]

  const addGeoBlock = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API_URL}/api/admin/ip/geo`, formData)
      setShowModal(false)
      setFormData({ country_code: '', country_name: '' })
      onRefresh()
    } catch (err) {
      console.error('Failed to add geo block:', err)
    }
  }

  const removeGeoBlock = async (code) => {
    try {
      await axios.delete(`${API_URL}/api/admin/ip/geo/${code}`)
      onRefresh()
    } catch (err) {
      console.error('Failed to remove geo block:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter uppercase tracking-tighter">Geographic Perimeters</h3>
        <button onClick={() => setShowModal(true)} className="btn btn-primary px-8 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-500/20 bg-primary-600 border-none">
          <Plus className="w-4 h-4" />
          Add Perimeter
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {geoBlocks.map((block) => (
          <div key={block.id} className="card p-6 flex flex-col gap-4 group hover:border-red-500/50 transition-all duration-300 shadow-sm hover:shadow-xl relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Globe className="w-24 h-24 text-gray-900 dark:text-white" />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center justify-center font-black text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20">
                {block.country_code}
              </div>
              <div>
                <span className="font-black text-gray-900 dark:text-dark-100 uppercase tracking-tight">{block.country_name}</span>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Blocked Territory</p>
              </div>
            </div>
            <button onClick={() => removeGeoBlock(block.country_code)} className="btn btn-danger w-full py-2 font-black text-[10px] uppercase tracking-widest rounded-xl">
              Remove Perimeter
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in duration-200">
          <div className="card w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100 dark:border-dark-800 bg-gray-50/50 dark:bg-dark-800/50 text-center">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase tracking-tighter">Block Geographic Zone</h2>
              <p className="text-[10px] text-gray-500 dark:text-dark-500 font-bold uppercase tracking-widest mt-1">Geofencing Subsystem</p>
            </div>
            <form onSubmit={addGeoBlock} className="p-8 space-y-6">
              <div>
                <label className="label uppercase text-[10px] font-black tracking-widest text-gray-500">Target Territory</label>
                <select
                  className="input font-black uppercase tracking-widest text-sm focus:ring-red-500/50 bg-white dark:bg-dark-800"
                  value={formData.country_code}
                  onChange={(e) => {
                    const country = countryList.find(c => c.code === e.target.value)
                    setFormData({
                      country_code: e.target.value,
                      country_name: country?.name || ''
                    })
                  }}
                >
                  <option value="">Select Target...</option>
                  {countryList.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-dark-800">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary font-bold text-xs uppercase tracking-widest px-6">
                  Abort
                </button>
                <button type="submit" className="btn btn-primary bg-red-600 hover:bg-red-500 font-black text-xs uppercase tracking-widest px-8 shadow-xl shadow-red-500/20 border-none">
                  Activate Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default IPManager