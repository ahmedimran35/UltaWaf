import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import axios from 'axios'
import { 
  Shield, LayoutDashboard, FileText, Shield as ShieldRule, 
  Globe, Settings, Menu, X, Bell, Activity,
  BarChart3, Brain, Sparkles, AlertTriangle, Search, Network,
  Sun, Moon, Book, LogOut
} from 'lucide-react'
import { useApp } from '../hooks/useApp'

const API_URL = import.meta.env.VITE_API_URL || ''

function Layout({ children, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [stats, setStats] = useState({ total_requests: 0, blocked_requests: 0 })
  const { theme, toggleTheme } = useApp()
  const location = useLocation()

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/stats/overview`)
      setStats(res.data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/docs', icon: Book, label: 'Documentation' },
    { path: '/monitor', icon: Activity, label: 'Live Monitor' },
    { path: '/logs', icon: FileText, label: 'Attack Logs' },
    { path: '/threat-globe', icon: Globe, label: 'Threat Globe' },
    { path: '/rules', icon: ShieldRule, label: 'WAF Rules' },
    { path: '/ip', icon: Search, label: 'IP Manager' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/ml', icon: Brain, label: 'ML Engine' },
    { path: '/ai', icon: Sparkles, label: 'AI Assistant' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ]

  const currentPage = navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-dark-950 text-gray-900 dark:text-dark-100 transition-colors duration-300">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-dark-900 border-r border-gray-200 dark:border-dark-800 
                      transform transition-transform duration-300 ease-in-out
                      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                      lg:relative lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-800">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary-600 dark:text-primary-500" />
              <div>
                <div className="font-bold text-gray-900 text-primary-600">UltraShield</div>
                <div className="text-xs text-gray-500">Web Application Firewall</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200
                          ${location.pathname === item.path 
                            ? 'bg-primary-50 text-primary-600 border border-primary-200 shadow-sm' 
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-dark-800">
            <div className="card p-3 mb-4">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <Activity className="w-4 h-4" />
                <span>Live Statistics</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.total_requests.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Total Requests (24h)</div>
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-dark-700">
                <span className="text-sm text-red-600 dark:text-red-400 font-medium">{stats.blocked_requests.toLocaleString()} Blocked</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-800 bg-white dark:bg-dark-900 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden btn btn-secondary p-2"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-xl font-semibold text-gray-900">{currentPage}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="btn btn-secondary p-2 group"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-primary-600" />}
            </button>
            <button
              onClick={onLogout}
              className="btn btn-secondary p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button className="btn btn-secondary p-2 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-dark-900"></span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default Layout