import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import { 
  MapContainer, TileLayer, Marker, Popup, CircleMarker,
  useMapEvents, useMap
} from 'react-leaflet'
import { 
  Shield, Globe, RefreshCw, Filter, Download,
  AlertTriangle, Info, Layers
} from 'lucide-react'
import L from 'leaflet'

import 'leaflet/dist/leaflet.css'

const API_URL = import.meta.env.VITE_API_URL || ''
const WS_URL = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`

const COUNTRY_COORDS = {
  US: [37.0902, -95.7129],
  CN: [35.8617, 104.1954],
  RU: [61.5240, 105.3188],
  IR: [32.4279, 53.6880],
  KR: [35.9078, 127.7669],
  IN: [20.5937, 78.9629],
  DE: [51.1657, 10.4515],
  BR: [-14.2350, -51.9253],
  UA: [48.3794, 31.1656],
  VN: [14.0583, 108.2772],
  TR: [38.9637, 35.2433],
  FR: [46.2276, 2.2137],
  GB: [55.3781, -3.4360],
  JP: [36.2048, 138.2529],
  NL: [52.1326, 5.2913],
}

const ATTACK_COLORS = {
  sqli: '#ef4444',
  xss: '#f97316',
  cmdi: '#a855f7',
  lfi: '#eab308',
  rfi: '#3b82f6',
  xxe: '#ec4899',
  ssrf: '#06b6d4',
  unknown: '#6b7280',
}

function AttackMap() {
  const [attacks, setAttacks] = useState([])
  const [countryStats, setCountryStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [viewMode, setViewMode] = useState('attacks')
  const socketRef = useRef(null)

  useEffect(() => {
    fetchData()

    const ws = io(WS_URL, { transports: ['websocket'] })
    ws.on('connect', () => console.log('Map WS connected'))
    ws.on('alert', (alert) => {
      if (alert.country) {
        setCountryStats(prev => ({
          ...prev,
          [alert.country]: (prev[alert.country] || 0) + 1
        }))
        setAttacks(prev => [alert, ...prev].slice(0, 100))
      }
    })
    socketRef.current = ws

    return () => ws.disconnect()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/admin/logs?limit=200`)
      const logs = res.data
      
      const stats = {}
      logs.forEach(log => {
        if (log.country && log.country !== 'XX') {
          stats[log.country] = (stats[log.country] || 0) + 1
        }
      })
      setCountryStats(stats)
      setAttacks(logs)
    } catch (err) {
      console.error('Failed to fetch attacks:', err)
    } finally {
      setLoading(false)
    }
  }

  const getMarkerSize = (count) => {
    if (count > 100) return 20
    if (count > 50) return 15
    if (count > 10) return 12
    return 8
  }

  const getMarkerColor = (attackType, isBlocked) => {
    if (!isBlocked) return '#22c55e'
    return ATTACK_COLORS[attackType] || ATTACK_COLORS.unknown
  }

  const totalAttacks = Object.values(countryStats).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Global Attack Map</h1>
          <p className="text-dark-400">Geographic distribution of attacks</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="card px-3 py-2 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary-400" />
            <span className="text-dark-100 font-semibold">{totalAttacks}</span>
            <span className="text-dark-400 text-sm">attacks detected</span>
          </div>
          <button onClick={fetchData} className="btn btn-secondary p-2">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 card overflow-hidden" style={{ height: '600px' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : (
            <MapContainer
              center={[20, 0]}
              zoom={2}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {Object.entries(countryStats).map(([country, count]) => {
                const coords = COUNTRY_COORDS[country]
                if (!coords) return null
                
                return (
                  <CircleMarker
                    key={country}
                    center={coords}
                    radius={getMarkerSize(count)}
                    pathOptions={{
                      fillColor: '#ef4444',
                      fillOpacity: 0.7,
                      color: '#fff',
                      weight: 1,
                    }}
                    eventHandlers={{
                      click: () => setSelectedCountry({ country, count }),
                    }}
                  >
                    <Popup>
                      <div className="text-dark-900">
                        <div className="font-bold">{country}</div>
                        <div>{count} attacks</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
            </MapContainer>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-dark-100 mb-3">Attack Statistics</h3>
            <div className="space-y-2">
              {Object.entries(countryStats)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([country, count]) => (
                  <div key={country} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-dark-500" />
                      <span className="text-dark-300">{country}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-dark-100 font-medium">{count}</span>
                      <div className="w-16 h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${(count / totalAttacks) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="font-semibold text-dark-100 mb-3">Attack Types</h3>
            <div className="space-y-2">
              {Object.entries(ATTACK_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-dark-300 capitalize">{type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedCountry && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-dark-100">{selectedCountry.country}</h3>
                <button onClick={() => setSelectedCountry(null)}>×</button>
              </div>
              <div className="text-dark-400 text-sm">
                {selectedCountry.count} attacks from this country
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AttackMap