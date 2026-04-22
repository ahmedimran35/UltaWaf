import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  Brain, Play, RotateCcw, Activity, AlertTriangle, 
  CheckCircle, XCircle, BarChart2, Database, Settings,
  RefreshCw, ArrowUp, ArrowDown, Info, Loader2
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

function MLSettings() {
  const [status, setStatus] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [featureImportance, setFeatureImportance] = useState([])
  const [datasetStats, setDatasetStats] = useState(null)
  const [training, setTraining] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [statusRes, metricsRes, featuresRes, datasetRes] = await Promise.all([
        axios.get(`${API_URL}/api/ml/status`),
        axios.get(`${API_URL}/api/ml/metrics`),
        axios.get(`${API_URL}/api/ml/features`),
        axios.get(`${API_URL}/api/ml/dataset/stats`),
      ])
      setStatus(statusRes.data)
      setMetrics(metricsRes.data)
      setFeatureImportance(featuresRes.data.features || [])
      setDatasetStats(datasetRes.data)
    } catch (err) {
      console.error('Failed to fetch ML data:', err)
    } finally {
      setLoading(false)
    }
  }

  const trainModel = async () => {
    setTraining(true)
    try {
      await axios.post(`${API_URL}/api/ml/train`, {})
      fetchData()
    } catch (err) {
      console.error('Training failed:', err)
    } finally {
      setTraining(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
        <span className="text-xs font-black text-gray-400 dark:text-dark-500 uppercase tracking-widest">Querying Neural Core</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">NEURAL INTELLIGENCE</h1>
          <p className="text-sm text-gray-500 dark:text-dark-400 font-bold uppercase tracking-widest">Autonomous Behavioral Analysis & Anomaly Detection</p>
        </div>
        <button 
          onClick={trainModel} 
          disabled={training || !datasetStats?.ready_for_training}
          className="btn btn-primary px-10 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-500/20"
        >
          {training ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              Recalibrating Models
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Train Neural Ensemble
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Isolation Forest"
          enabled={status?.models?.isolation_forest}
          label="Unsupervised Anomaly"
          icon={Brain}
        />
        <StatusCard
          title="Random Forest"
          enabled={status?.models?.random_forest}
          label="Supervised Classification"
          icon={Database}
        />
        <StatusCard
          title="Ensemble Consensus"
          enabled={status?.is_trained}
          label="Unified Detection Layer"
          icon={Activity}
        />
        <DatasetStatus stats={datasetStats} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-8 border-t-4 border-primary-500">
           <div className="flex items-center justify-between mb-8">
             <div>
               <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Neural Performance</h2>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Statistical Accuracy Benchmarks</p>
             </div>
             {metrics?.random_forest && (
               <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-full border border-green-100 dark:border-green-500/20">
                  <CheckCircle className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase">Verified Precise</span>
               </div>
             )}
           </div>
           
           {metrics?.random_forest ? (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
               <MetricItem
                 label="Validation Accuracy"
                 value={(metrics.random_forest.accuracy * 100).toFixed(1) + '%'}
               />
               <MetricItem
                 label="Detection Precision"
                 value={(metrics.random_forest.precision * 100).toFixed(1) + '%'}
               />
               <MetricItem
                 label="Recall Efficiency"
                 value={(metrics.random_forest.recall * 100).toFixed(1) + '%'}
               />
               <MetricItem
                 label="Harmonic F1 Score"
                 value={(metrics.random_forest.f1 * 100).toFixed(1) + '%'}
               />
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50/50 dark:bg-dark-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-dark-800">
                <AlertTriangle className="w-12 h-12 text-gray-300 dark:text-dark-800 mb-4" />
                <h3 className="text-sm font-black text-gray-400 dark:text-dark-600 uppercase tracking-widest">Model Training Required</h3>
                <p className="text-xs text-gray-400 dark:text-dark-500 font-medium mt-2 max-w-xs px-6">Dataset requires at least 100 high-entropy samples to initialize statistical performance metrics.</p>
             </div>
           )}
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase mb-8">Inspection Stack</h2>
          <div className="space-y-4">
            <LayerItem
              name="Deterministic Signatures"
              description="Pattern matching for static vectors"
              status={status?.layers?.signature}
            />
            <LayerItem
              name="Structural OWASP"
              description="Schema and standard evaluation"
              status={status?.layers?.rule}
            />
            <LayerItem
              name="Neural Behavioral"
              description="Unsupervised anomaly detection"
              status={status?.layers?.ml}
            />
            <LayerItem
              name="Cognitive AI"
              description="Large Language Model reasoning"
              status={status?.layers?.ai}
            />
          </div>
        </div>
      </div>

      <div className="card p-8">
        <div className="flex items-center justify-between mb-8">
           <div>
             <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Feature Weights</h2>
             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Neural Network Attribution Map</p>
           </div>
           <Info className="w-5 h-5 text-gray-300" />
        </div>
        
        {featureImportance.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {featureImportance.slice(0, 10).map((feature, idx) => (
              <div key={idx} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-300 dark:text-dark-800 w-4 font-mono">{idx + 1}</span>
                    <span className="text-xs font-black text-gray-600 dark:text-dark-200 uppercase tracking-widest group-hover:text-primary-500 transition-colors">{feature.name}</span>
                  </div>
                  <span className="text-xs font-black text-gray-900 dark:text-white font-mono">{feature.importance.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-gray-50 dark:bg-dark-950 rounded-full overflow-hidden border border-gray-100 dark:border-dark-800">
                  <div 
                    className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full shadow-[0_0_8px_rgba(14,165,233,0.2)] transition-all duration-1000 ease-out"
                    style={{ width: `${feature.importance}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50/50 dark:bg-dark-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-dark-800">
            <BarChart2 className="w-10 h-10 text-gray-300 dark:text-dark-800 mx-auto mb-4" />
            <p className="text-xs font-black text-gray-400 dark:text-dark-600 uppercase tracking-widest">Weight Data UNINITIALIZED</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusCard({ title, enabled, label, icon: Icon }) {
  return (
    <div className="card p-6 group hover:border-primary-500/30 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-dark-800 border border-gray-100 dark:border-dark-700 group-hover:scale-110 transition-transform">
          <Icon className={`w-5 h-5 ${enabled ? 'text-primary-500' : 'text-gray-400 dark:text-dark-600'}`} />
        </div>
        {enabled ? (
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
        ) : (
          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-dark-800"></div>
        )}
      </div>
      <h3 className="font-black text-gray-900 dark:text-white text-sm tracking-tight uppercase">{title}</h3>
      <p className="text-[10px] text-gray-500 dark:text-dark-500 font-bold uppercase tracking-widest mt-1">{label}</p>
    </div>
  )
}

function DatasetStatus({ stats }) {
  const ready = stats?.ready_for_training
  
  return (
    <div className="card p-6 border-t-4 border-indigo-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-gray-900 dark:text-white text-sm tracking-tight uppercase">Training Corpus</h3>
        {ready ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-yellow-500 animate-pulse" />
        )}
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{stats?.total_samples || 0}</span>
        <span className="text-[10px] font-black text-gray-400 dark:text-dark-600 uppercase">Entropy Nodes</span>
      </div>
      <div className="mt-4 w-full h-1.5 bg-gray-50 dark:bg-dark-950 rounded-full overflow-hidden border border-gray-100 dark:border-dark-800">
         <div 
           className={`h-full transition-all duration-1000 ${ready ? 'bg-green-500' : 'bg-yellow-500'}`}
           style={{ width: `${Math.min(100, (stats?.total_samples / (stats?.min_required || 100)) * 100)}%` }}
         ></div>
      </div>
      <p className="text-[9px] font-black text-gray-400 dark:text-dark-500 uppercase tracking-widest mt-2 leading-relaxed">
        {ready ? 'CRITICAL MASS REACHED: READY FOR RECALIBRATION' : `SYNCHRONIZING: ${stats?.min_required || 100} SAMPLES REQUIRED`}
      </p>
    </div>
  )
}

function MetricItem({ label, value }) {
  return (
    <div className="text-center md:text-left group">
      <div className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter group-hover:text-primary-500 transition-colors">{value}</div>
      <div className="text-[10px] font-black text-gray-400 dark:text-dark-500 uppercase tracking-widest mt-2">{label}</div>
    </div>
  )
}

function LayerItem({ name, description, status }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-dark-950 rounded-2xl border border-gray-100 dark:border-dark-800 group hover:border-primary-500/20 transition-all shadow-sm">
      <div className="max-w-[70%]">
        <h4 className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-tight">{name}</h4>
        <p className="text-[10px] text-gray-500 dark:text-dark-500 font-medium leading-relaxed mt-0.5">{description}</p>
      </div>
      <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
        status ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' : 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-dark-900 dark:text-dark-700 dark:border-dark-800'
      }`}>
        {status ? 'ACTIVE' : 'STANDBY'}
      </div>
    </div>
  )
}

export default MLSettings