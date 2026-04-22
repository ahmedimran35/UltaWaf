import React, { useState, useEffect, useRef } from 'react'
import Globe from 'react-globe.gl'
import axios from 'axios'
import { Globe as GlobeIcon, Maximize2, Minimize2, RefreshCw, Shield, AlertTriangle, Activity } from 'lucide-react'
import { useApp } from '../hooks/useApp'

const API_URL = import.meta.env.VITE_API_URL || ''

const COUNTRY_COORDS = {
  US: { lat: 37.0902, lng: -95.7129, name: 'United States' },
  CN: { lat: 35.8617, lng: 104.1954, name: 'China' },
  RU: { lat: 61.5240, lng: 105.3188, name: 'Russia' },
  IR: { lat: 32.4279, lng: 53.6880, name: 'Iran' },
  KR: { lat: 35.9078, lng: 127.7669, name: 'South Korea' },
  IN: { lat: 20.5937, lng: 78.9629, name: 'India' },
  DE: { lat: 51.1657, lng: 10.4515, name: 'Germany' },
  BR: { lat: -14.2350, lng: -51.9253, name: 'Brazil' },
  UA: { lat: 48.3794, lng: 31.1656, name: 'Ukraine' },
  VN: { lat: 14.0583, lng: 108.2772, name: 'Vietnam' },
  TR: { lat: 38.9637, lng: 35.2433, name: 'Turkey' },
  FR: { lat: 46.2276, lng: 2.2137, name: 'France' },
  GB: { lat: 55.3781, lng: -3.4360, name: 'United Kingdom' },
  JP: { lat: 36.2048, lng: 138.2529, name: 'Japan' },
  NL: { lat: 52.1326, lng: 5.2913, name: 'Netherlands' },
  CA: { lat: 56.1304, lng: -106.3468, name: 'Canada' },
  AU: { lat: -25.2744, lng: 133.7751, name: 'Australia' },
  IT: { lat: 41.8719, lng: 12.5674, name: 'Italy' },
  ES: { lat: 40.4637, lng: -3.7492, name: 'Spain' },
  PL: { lat: 51.9194, lng: 19.1451, name: 'Poland' },
  RO: { lat: 45.9423, lng: 24.9974, name: 'Romania' },
  CL: { lat: -35.6751, lng: -71.5430, name: 'Chile' },
  CO: { lat: 4.5709, lng: -74.2973, name: 'Colombia' },
  ID: { lat: -0.7893, lng: 113.9213, name: 'Indonesia' },
  TH: { lat: 15.8700, lng: 100.9925, name: 'Thailand' },
  MY: { lat: 4.2105, lng: 101.9758, name: 'Malaysia' },
  SG: { lat: 1.3521, lng: 103.8198, name: 'Singapore' },
  TW: { lat: 23.6978, lng: 120.9605, name: 'Taiwan' },
  PK: { lat: 30.3753, lng: 69.3451, name: 'Pakistan' },
  BD: { lat: 23.6850, lng: 90.3563, name: 'Bangladesh' },
  EG: { lat: 26.8206, lng: 30.8025, name: 'Egypt' },
  ZA: { lat: -30.5595, lng: 22.9375, name: 'South Africa' },
  NG: { lat: 9.0820, lng: 8.6753, name: 'Nigeria' },
  KE: { lat: -0.0236, lng: 37.9062, name: 'Kenya' },
  AR: { lat: -38.4161, lng: -63.6167, name: 'Argentina' },
  MX: { lat: 23.6345, lng: -102.5528, name: 'Mexico' },
  PE: { lat: -9.1900, lng: -75.0152, name: 'Peru' },
  VE: { lat: 6.4238, lng: -66.5897, name: 'Venezuela' },
  EC: { lat: -1.8312, lng: -78.1834, name: 'Ecuador' },
  CU: { lat: 21.5218, lng: -77.7812, name: 'Cuba' },
  PH: { lat: 12.8797, lng: 121.7740, name: 'Philippines' },
  SA: { lat: 23.8859, lng: 45.0792, name: 'Saudi Arabia' },
  AE: { lat: 23.4241, lng: 53.8478, name: 'United Arab Emirates' },
  IL: { lat: 31.0461, lng: 34.8516, name: 'Israel' },
  SE: { lat: 60.1282, lng: 18.6435, name: 'Sweden' },
  NO: { lat: 60.4720, lng: 8.4689, name: 'Norway' },
  FI: { lat: 61.9241, lng: 25.7482, name: 'Finland' },
  DK: { lat: 56.2639, lng: 9.5018, name: 'Denmark' },
  CH: { lat: 46.8182, lng: 8.2275, name: 'Switzerland' },
  BE: { lat: 50.5039, lng: 4.4699, name: 'Belgium' },
  AT: { lat: 47.5162, lng: 14.5501, name: 'Austria' },
  PT: { lat: 39.3999, lng: -8.2243, name: 'Portugal' },
  GR: { lat: 39.0742, lng: 21.8243, name: 'Greece' },
  CZ: { lat: 49.8175, lng: 15.4730, name: 'Czech Republic' },
  HU: { lat: 47.1625, lng: 19.5033, name: 'Hungary' },
  IE: { lat: 53.1424, lng: -7.6921, name: 'Ireland' },
  NZ: { lat: -40.9006, lng: 174.8860, name: 'New Zealand' },
  SC: { lat: -4.6796, lng: 55.4920, name: 'Seychelles' },
  PA: { lat: 8.5380, lng: -80.7821, name: 'Panama' },
  CR: { lat: 9.7489, lng: -83.7534, name: 'Costa Rica' },
  DO: { lat: 18.7357, lng: -70.1627, name: 'Dominican Republic' },
  GT: { lat: 15.7835, lng: -90.2308, name: 'Guatemala' },
  HN: { lat: 15.2000, lng: -86.2419, name: 'Honduras' },
  SV: { lat: 13.7942, lng: -88.8953, name: 'El Salvador' },
  NI: { lat: 12.8654, lng: -85.2072, name: 'Nicaragua' },
  BO: { lat: -16.2902, lng: -63.5887, name: 'Bolivia' },
  PY: { lat: -23.4425, lng: -58.4438, name: 'Paraguay' },
  UY: { lat: -32.5228, lng: -55.7658, name: 'Uruguay' },
  RS: { lat: 44.0165, lng: 21.0059, name: 'Serbia' },
  BG: { lat: 42.7339, lng: 25.4858, name: 'Bulgaria' },
  HR: { lat: 45.1000, lng: 15.2000, name: 'Croatia' },
  SK: { lat: 48.6690, lng: 19.6990, name: 'Slovakia' },
  SI: { lat: 46.1512, lng: 14.9954, name: 'Slovenia' },
  BA: { lat: 43.8563, lng: 18.4131, name: 'Bosnia and Herzegovina' },
  AL: { lat: 41.1533, lng: 20.1683, name: 'Albania' },
  MK: { lat: 41.5124, lng: 21.7465, name: 'North Macedonia' },
  ME: { lat: 42.7087, lng: 19.3744, name: 'Montenegro' },
  GE: { lat: 42.3154, lng: 43.3569, name: 'Georgia' },
  AM: { lat: 40.0691, lng: 45.0382, name: 'Armenia' },
  AZ: { lat: 40.1431, lng: 47.5769, name: 'Azerbaijan' },
  KZ: { lat: 48.0196, lng: 66.9237, name: 'Kazakhstan' },
  UZ: { lat: 41.3775, lng: 64.5853, name: 'Uzbekistan' },
  TM: { lat: 39.0590, lng: 59.6493, name: 'Turkmenistan' },
  KG: { lat: 41.2044, lng: 74.7661, name: 'Kyrgyzstan' },
  TJ: { lat: 38.5598, lng: 71.4779, name: 'Tajikistan' },
  MN: { lat: 46.8625, lng: 103.8467, name: 'Mongolia' },
  NP: { lat: 28.3949, lng: 84.1240, name: 'Nepal' },
  LK: { lat: 7.8731, lng: 80.7718, name: 'Sri Lanka' },
  MM: { lat: 21.9162, lng: 95.9560, name: 'Myanmar' },
  KH: { lat: 12.5657, lng: 104.9910, name: 'Cambodia' },
  LA: { lat: 19.8563, lng: 102.4955, name: 'Laos' },
  BN: { lat: 4.5353, lng: 114.7277, name: 'Brunei' },
  BT: { lat: 27.5145, lng: 90.4336, name: 'Bhutan' },
  MV: { lat: 3.2028, lng: 73.2207, name: 'Maldives' },
  QA: { lat: 25.3548, lng: 51.1839, name: 'Qatar' },
  KW: { lat: 29.3117, lng: 47.4818, name: 'Kuwait' },
  BH: { lat: 26.0667, lng: 50.5577, name: 'Bahrain' },
  OM: { lat: 21.4735, lng: 55.9238, name: 'Oman' },
  JO: { lat: 30.5852, lng: 36.2384, name: 'Jordan' },
  LB: { lat: 33.8547, lng: 35.8433, name: 'Lebanon' },
  SY: { lat: 34.8021, lng: 38.9968, name: 'Syria' },
  IQ: { lat: 33.2232, lng: 43.6793, name: 'Iraq' },
  YE: { lat: 15.5527, lng: 48.5164, name: 'Yemen' },
  LY: { lat: 26.3351, lng: 17.2283, name: 'Libya' },
  TN: { lat: 33.8869, lng: 9.5375, name: 'Tunisia' },
  DZ: { lat: 28.0339, lng: 1.6596, name: 'Algeria' },
  MA: { lat: 31.7917, lng: -7.0926, name: 'Morocco' },
  SD: { lat: 12.8628, lng: 30.2176, name: 'Sudan' },
  ET: { lat: 9.1450, lng: 40.4897, name: 'Ethiopia' },
  TZ: { lat: -6.3690, lng: 34.8888, name: 'Tanzania' },
  UG: { lat: 1.3733, lng: 32.2903, name: 'Uganda' },
  GH: { lat: 7.9465, lng: -1.0232, name: 'Ghana' },
  CI: { lat: 7.5400, lng: -5.5471, name: 'Ivory Coast' },
  SN: { lat: 14.4974, lng: -14.4524, name: 'Senegal' },
  ML: { lat: 17.5707, lng: -3.9962, name: 'Mali' },
  BF: { lat: 12.2383, lng: -1.5616, name: 'Burkina Faso' },
  NE: { lat: 17.6078, lng: 8.0817, name: 'Niger' },
  TD: { lat: 15.4544, lng: 18.7322, name: 'Chad' },
  CM: { lat: 7.3699, lng: 12.3547, name: 'Cameroon' },
  GA: { lat: -0.8037, lng: 11.6094, name: 'Gabon' },
  CG: { lat: -0.228, lng: 15.8277, name: 'Republic of the Congo' },
  CD: { lat: -4.0383, lng: 21.7587, name: 'DR Congo' },
  AO: { lat: -11.2027, lng: 17.8739, name: 'Angola' },
  ZM: { lat: -13.1339, lng: 27.8493, name: 'Zambia' },
  ZW: { lat: -19.0154, lng: 29.1549, name: 'Zimbabwe' },
  BW: { lat: -22.3285, lng: 24.6849, name: 'Botswana' },
  NA: { lat: -22.9576, lng: 18.4904, name: 'Namibia' },
  MZ: { lat: -17.3026, lng: 35.5296, name: 'Mozambique' },
  MG: { lat: -18.7669, lng: 46.8691, name: 'Madagascar' },
  MU: { lat: -20.3484, lng: 57.5522, name: 'Mauritius' },
  RE: { lat: -21.1151, lng: 55.5365, name: 'Reunion' },
  CV: { lat: 16.5388, lng: -22.9375, name: 'Cape Verde' },
  ST: { lat: 0.1864, lng: 6.6131, name: 'Sao Tome and Principe' },
  GW: { lat: 11.8037, lng: -15.1804, name: 'Guinea-Bissau' },
  GN: { lat: 9.9456, lng: -9.6966, name: 'Guinea' },
  SL: { lat: 8.4606, lng: -11.7799, name: 'Sierra Leone' },
  LR: { lat: 6.4281, lng: -9.4295, name: 'Liberia' },
  MR: { lat: 20.2505, lng: -10.9408, name: 'Mauritania' },
  GM: { lat: 13.4432, lng: -15.3101, name: 'Gambia' },
  TG: { lat: 8.6195, lng: 0.8248, name: 'Togo' },
  BJ: { lat: 9.3077, lng: 2.3158, name: 'Benin' },
  SS: { lat: 6.8770, lng: 31.3070, name: 'South Sudan' },
  RW: { lat: -1.9403, lng: 29.8739, name: 'Rwanda' },
  BI: { lat: -3.3731, lng: 29.9186, name: 'Burundi' },
  MW: { lat: -13.2543, lng: 34.3015, name: 'Malawi' },
  LOCAL: { lat: 40.7128, lng: -74.0060, name: 'New York (Target)' }
}

const getCountryCoords = (countryCode) => {
  if (COUNTRY_COORDS[countryCode]) {
    return COUNTRY_COORDS[countryCode]
  }
  console.warn(`Unknown country code: ${countryCode}, using default location`)
  return { lat: 20.0, lng: 0.0, name: countryCode }
}

const ATTACK_COLORS = {
  sqli: '#ef4444',
  xss: '#f97316',
  cmdi: '#a855f7',
  lfi: '#eab308',
  rfi: '#3b82f6',
  xxe: '#ec4899',
  ssrf: '#06b6d4',
  ssh_brute: '#22c55e',
  telnet_brute: '#84cc16',
  smtp_spam: '#14b8a6',
  dns_amp: '#0ea5e9',
  web_scan: '#8b5cf6',
  smb_exploit: '#f43f5e',
  mssql_brute: '#ff6b6b',
  mysql_brute: '#fb923c',
  rdp_brute: '#a78bfa',
  postgres_brute: '#38bdf8',
  proxy_scan: '#f472b6',
  https_alt: '#2dd4bf',
  iot_scan: '#a3e635',
  telnet_mirai: '#fb7185',
  bot_scan: '#60a5fa',
  unknown: '#6b7280',
}

const GLOBAL_ATTACK_GRADIENTS = [
  '#ff6b6b', '#fb923c', '#fbbf24', '#a3e635', 
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#8b5cf6', '#a855f7', '#ec4899',
  '#f43f5e', '#f97316', '#eab308', '#84cc16'
]

const MAJOR_COUNTRIES = ['US', 'CN', 'RU', 'IN', 'BR', 'DE', 'FR', 'GB', 'JP', 'AU']

function AttackGlobe() {
  const { theme } = useApp()
  const [arcsData, setArcsData] = useState([])
  const [pointsData, setPointsData] = useState([])
  const [labelsData, setLabelsData] = useState([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [latestAttack, setLatestAttack] = useState(null)
  const [stats, setStats] = useState({ local: 0, global: 0, cve: 0 })
  const [latestCve, setLatestCve] = useState(null)
  const [wsStatus, setWsStatus] = useState('connecting')
  const globeRef = useRef()

  const targetLocation = [40.7128, -74.0060]

  useEffect(() => {
    setLabelsData(MAJOR_COUNTRIES.map(code => COUNTRY_COORDS[code]).filter(Boolean))
    fetchHistory()
    initWebSocket()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`/api/admin/logs?limit=100&blocked=true`)
      const logs = res.data
      const historyPoints = logs
        .filter(l => l.country)
        .map(l => {
          const info = getCountryCoords(l.country)
          return {
            lat: info.lat,
            lng: info.lng,
            size: 0.3,
            color: ATTACK_COLORS[l.attack_type] || '#ef4444',
            label: `${l.attack_type?.toUpperCase()} from ${info.name}`
          }
        })
      setPointsData(historyPoints)
      setStats(prev => ({ ...prev, local: logs.length }))
    } catch (err) {
      console.error("Failed to fetch history:", err)
    }
  }

  const initWebSocket = () => {
    setWsStatus('connecting')
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws`
    const socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      console.log('Globe connected to WebSocket')
      setWsStatus('connected')
      socket.send(JSON.stringify({ type: 'subscribe', channels: ['alerts'] }))
    }

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === 'alert' && message.data) {
          handleNewAttack(message.data, true)
        } else if (message.type === 'global_attack' && message.data) {
          handleNewAttack(message.data, false)
        } else if (message.type === 'cve_alert' && message.data) {
          handleCveAlert(message.data)
        }
      } catch (err) {
        console.error("Failed to parse socket message:", err)
      }
    }

    socket.onerror = (err) => {
      console.error('Globe WebSocket error:', err)
      setWsStatus('error')
    }
    socket.onclose = () => {
      console.log('Globe WebSocket closed, reconnecting...')
      setWsStatus('disconnected')
      setTimeout(initWebSocket, 5000)
    }
  }

  const handleCveAlert = (cve) => {
    setLatestCve(cve)
    setStats(prev => ({ ...prev, cve: prev.cve + 1 }))
  }

  const handleNewAttack = (attack, isLocal = true) => {
    const countryInfo = getCountryCoords(attack.country)

    if (isLocal) {
      setLatestAttack({ ...attack, countryName: countryInfo.name })
      setStats(prev => ({ ...prev, local: prev.local + 1 }))
    } else {
      setStats(prev => ({ ...prev, global: prev.global + 1 }))
    }

    const color = isLocal 
      ? (ATTACK_COLORS[attack.attack_type] || '#ef4444') 
      : GLOBAL_ATTACK_GRADIENTS[Math.floor(Math.random() * GLOBAL_ATTACK_GRADIENTS.length)]
    const attackName = attack.attack_type?.toUpperCase() || 'ATTACK'
    const countryName = countryInfo.name

    const newArc = {
      startLat: countryInfo.lat,
      startLng: countryInfo.lng,
      endLat: targetLocation[0],
      endLng: targetLocation[1],
      color: color,
      name: `${attackName} from ${countryName}`
    }

    setArcsData(prev => [...prev, newArc].slice(-50))

    const newPoint = {
      lat: countryInfo.lat,
      lng: countryInfo.lng,
      size: isLocal ? 0.5 : 0.25,
      color: color,
      label: isLocal ? `${attackName} - ${countryName}!` : `${attackName} - ${countryName}`
    }
    setPointsData(prev => [...prev, newPoint].slice(-150))

    if (isLocal && globeRef.current) {
      globeRef.current.pointOfView({ lat: countryInfo.lat, lng: countryInfo.lng, altitude: 2 }, 1000)
    }
  }

  return (
    <div className={`relative w-full ${isFullscreen ? 'fixed inset-0 z-[100] bg-black' : 'h-[700px] card overflow-hidden'}`}>
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-dark-900/80 backdrop-blur-md p-3 rounded-lg border border-dark-700 flex items-center gap-3">
          <GlobeIcon className="w-5 h-5 text-primary-500 animate-spin-slow" />
          <div>
            <div className="text-xs text-dark-400 uppercase font-bold tracking-wider">Live Attack Globe</div>
            <div className="text-sm font-semibold text-dark-100">Global Threat Visualization</div>
          </div>
        </div>

        <div className="bg-dark-900/80 backdrop-blur-md p-3 rounded-lg border border-dark-700">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-dark-300">WAF: <span className="text-white font-bold">{stats.local}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 via-yellow-500 to-green-500" />
              <span className="text-dark-300">Global: <span className="text-white font-bold">{stats.global}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-dark-300">CVE: <span className="text-white font-bold">{stats.cve}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-green-500 animate-pulse' : wsStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-dark-400 capitalize">WS: {wsStatus}</span>
          </div>
        </div>

        {latestAttack && (
          <div className="bg-red-500/20 backdrop-blur-md p-3 rounded-lg border border-red-500/30 animate-in fade-in slide-in-from-left">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-red-400 uppercase">Attack Detected</span>
            </div>
            <div className="text-sm font-bold text-white">
              {latestAttack.attack_type?.toUpperCase()} from {latestAttack.countryName}
            </div>
            <div className="text-xs text-red-300/70">{latestAttack.client_ip || latestAttack.source || 'Global'}</div>
          </div>
        )}

        {latestCve && (
          <div className="bg-purple-500/20 backdrop-blur-md p-3 rounded-lg border border-purple-500/30 animate-in fade-in slide-in-from-left">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-bold text-purple-400 uppercase">Exploited CVE</span>
            </div>
            <div className="text-sm font-bold text-white">{latestCve.cve_id}</div>
            <div className="text-xs text-purple-300/70">{latestCve.vendor} - {latestCve.product}</div>
            <div className="text-[10px] text-purple-200/50 mt-1">{latestCve.description}</div>
          </div>
        )}
      </div>

      <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        className="absolute top-4 right-4 z-10 btn btn-secondary p-2 bg-dark-900/80 backdrop-blur-md"
      >
        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </button>

      <Globe
        ref={globeRef}
        globeImageUrl={theme === 'dark' ? "//unpkg.com/three-globe/example/img/earth-night.jpg" : "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"}
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl={theme === 'dark' ? "//unpkg.com/three-globe/example/img/night-sky.png" : undefined}
        backgroundColor={theme === 'dark' ? "rgba(0,0,0,0)" : "rgba(255,255,255,0)"}
        showAtmosphere={true}
        atmosphereColor={theme === 'dark' ? "#3a228a" : "#0ea5e9"}
        atmosphereAltitude={0.15}
        arcsData={arcsData}
        arcColor={'color'}
        arcDashLength={0.4}
        arcDashGap={4}
        arcDashAnimateTime={1000}
        arcLabel={d => `<div style="background:${theme === 'dark' ? '#0f172a' : '#ffffff'};padding:8px;border-radius:8px;border:1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'};color:${theme === 'dark' ? '#f8fafc' : '#1e293b'};font-size:12px;box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1)"><b>${d.name}</b></div>`}
        pointsData={pointsData}
        pointColor={'color'}
        pointRadius={'size'}
        pointLabel={'label'}
        labelsData={labelsData}
        labelText={'name'}
        labelColor={() => theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'}
        labelSize={0.4}
        labelDotRadius={0.2}
        labelLabel={d => `<div style="background:${theme === 'dark' ? '#0f172a' : '#ffffff'};padding:4px 8px;border-radius:6px;border:1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'};color:${theme === 'dark' ? '#f8fafc' : '#1e293b'};font-size:11px"><b>${d.name}</b></div>`}
        width={isFullscreen ? window.innerWidth : undefined}
        height={isFullscreen ? window.innerHeight : 700}
      />

      <div className={`absolute bottom-4 left-4 z-10 ${theme === 'dark' ? 'bg-dark-900/80' : 'bg-white/80'} backdrop-blur-md p-4 rounded-xl border ${theme === 'dark' ? 'border-dark-700' : 'border-gray-200'} max-w-xs shadow-2xl`}>
        <h4 className="text-xs uppercase font-bold text-gray-500 dark:text-dark-400 mb-2 flex items-center gap-2">
          <Shield className="w-3 h-3 text-primary-500" /> Attack Vector Class
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
          {Object.entries(ATTACK_COLORS).slice(0, 16).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5 text-gray-600 dark:text-dark-400">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="capitalize">{type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`absolute bottom-4 right-4 z-10 ${theme === 'dark' ? 'bg-dark-900/80' : 'bg-white/80'} backdrop-blur-md p-3 rounded-xl border ${theme === 'dark' ? 'border-dark-700' : 'border-gray-200'} shadow-2xl`}>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-gray-900 dark:text-dark-100 font-bold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Active WAF
          </span>
          <span className="text-gray-500 dark:text-dark-300 font-medium flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500" />
            Global Threat Intel
          </span>
        </div>
      </div>
    </div>
  )
}

export default AttackGlobe