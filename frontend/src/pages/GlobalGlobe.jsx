import React, { useState, useEffect, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import axios from 'axios';
import { Activity, Shield, AlertTriangle, Globe as GlobeIcon, Maximize2, Minimize2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

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
  CA: [56.1304, -106.3468],
  AU: [-25.2744, 133.7751],
  IT: [41.8719, 12.5674],
  ES: [40.4637, -3.7492],
  LOCAL: [0, 0]
};

const ATTACK_COLORS = {
  sqli: '#ef4444',
  xss: '#f97316',
  cmdi: '#a855f7',
  lfi: '#eab308',
  rfi: '#3b82f6',
  xxe: '#ec4899',
  ssrf: '#06b6d4',
  unknown: '#6b7280',
};

function GlobalGlobe() {
  const [arcsData, setArcsData] = useState([]);
  const [pointsData, setPointsData] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [latestAttack, setLatestAttack] = useState(null);
  const globeRef = useRef();

  // Your server's location (Target)
  const targetLocation = [40.7128, -74.0060]; // NYC as example target

  useEffect(() => {
    fetchHistory();
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('Globe connected to WebSocket');
      socket.send(JSON.stringify({ type: 'subscribe', channels: ['alerts'] }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'alert' && message.data) {
          handleNewAttack(message.data, true);
        } else if (message.type === 'global_attack' && message.data) {
          handleNewAttack(message.data, false);
        }
      } catch (err) {
        console.error("Failed to parse socket message:", err);
      }
    };

    socket.onerror = (err) => console.error('Globe WebSocket error:', err);
    socket.onclose = () => console.log('Globe WebSocket closed');

    return () => socket.close();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`/api/admin/logs?limit=50&blocked=true`);
      const logs = res.data;
      const historyPoints = logs
        .filter(l => COUNTRY_COORDS[l.country])
        .map(l => ({
          lat: COUNTRY_COORDS[l.country][0],
          lng: COUNTRY_COORDS[l.country][1],
          size: 0.1,
          color: ATTACK_COLORS[l.attack_type] || '#ef4444',
          label: `${l.attack_type} from ${l.country}`
        }));
      setPointsData(historyPoints);
    } catch (err) {
      console.error("Failed to fetch globe history:", err);
    }
  };

  const handleNewAttack = (attack, isLocal = true) => {
    const startCoords = COUNTRY_COORDS[attack.country];
    if (!startCoords) return;

    if (isLocal) {
        setLatestAttack(attack);
    }

    const color = isLocal ? (ATTACK_COLORS[attack.attack_type] || '#ef4444') : '#3b82f6';

    // Add arc
    const newArc = {
      startLat: startCoords[0],
      startLng: startCoords[1],
      endLat: targetLocation[0],
      endLng: targetLocation[1],
      color: color,
      name: isLocal ? `${attack.attack_type} detected` : 'Global Bot Scan'
    };

    setArcsData(prev => [...prev, newArc].slice(-50));

    // Add ripple point
    const newPoint = {
      lat: startCoords[0],
      lng: startCoords[1],
      size: isLocal ? 0.5 : 0.2,
      color: color,
      label: isLocal ? `Incoming ${attack.attack_type}!` : 'Global Network Activity'
    };
    setPointsData(prev => [...prev, newPoint].slice(-150));

    // Auto-rotate globe only for local attacks
    if (isLocal && globeRef.current) {
        globeRef.current.pointOfView({ lat: startCoords[0], lng: startCoords[1], altitude: 2 }, 1000);
    }
  };

  return (
    <div className={`relative w-full ${isFullscreen ? 'fixed inset-0 z-[100] bg-black' : 'h-[600px] card overflow-hidden'}`}>
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-dark-900/80 backdrop-blur-md p-3 rounded-lg border border-dark-700 flex items-center gap-3">
          <GlobeIcon className="w-5 h-5 text-primary-500 animate-spin-slow" />
          <div>
            <div className="text-xs text-dark-400 uppercase font-bold tracking-wider">Live Global Threat Map</div>
            <div className="text-sm font-semibold text-dark-100">Synchronized with WAF Engine</div>
          </div>
        </div>
        
        {latestAttack && (
            <div className="bg-red-500/20 backdrop-blur-md p-3 rounded-lg border border-red-500/30 animate-in fade-in slide-in-from-left">
                <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-bold text-red-400 uppercase">Detection Active</span>
                </div>
                <div className="text-sm font-bold text-white">
                    {latestAttack.attack_type.toUpperCase()} from {latestAttack.country}
                </div>
                <div className="text-xs text-red-300/70">{latestAttack.client_ip}</div>
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
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        arcsData={arcsData}
        arcColor={'color'}
        arcDashLength={0.4}
        arcDashGap={4}
        arcDashAnimateTime={1000}
        pointsData={pointsData}
        pointColor={'color'}
        pointRadius={'size'}
        pointLabel={'label'}
        width={isFullscreen ? window.innerWidth : undefined}
        height={isFullscreen ? window.innerHeight : 600}
      />

      <div className="absolute bottom-4 right-4 z-10 bg-dark-900/80 backdrop-blur-md p-4 rounded-lg border border-dark-700">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[10px] uppercase font-bold">
            <div className="col-span-2 flex items-center justify-between border-b border-dark-700 pb-2 mb-1">
                <span className="text-dark-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /> Your WAF</span>
                <span className="text-blue-400 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> Global Scans</span>
            </div>
            {Object.entries(ATTACK_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1.5 text-dark-400">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                    {type}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default GlobalGlobe;