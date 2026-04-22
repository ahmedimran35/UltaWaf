import { useState, useEffect } from 'react'
import axios from 'axios'
import { Shield, Activity, AlertTriangle, ShieldAlert, ShieldCheck, Globe } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('username', username)
      formData.append('password', password)

      const res = await axios.post(`${API_URL}/api/admin/login`, 
        new URLSearchParams({ username, password }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )

      onLogin(res.data.access_token)
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-primary-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400">UltraShield WAF</h1>
          <p className="text-gray-500 mt-2">Advanced Web Application Firewall</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-100 mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full py-3"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-dark-700 text-center">
            <p className="text-gray-500 dark:text-dark-500 text-sm">
              Default credentials: admin / admin
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-gray-100 dark:bg-dark-900/50 rounded-lg">
            <ShieldAlert className="w-6 h-6 text-primary-500 mx-auto mb-2" />
            <div className="text-sm text-gray-600 dark:text-dark-400">SQLi Protection</div>
          </div>
          <div className="p-4 bg-gray-100 dark:bg-dark-900/50 rounded-lg">
            <ShieldAlert className="w-6 h-6 text-primary-500 mx-auto mb-2" />
            <div className="text-sm text-gray-600 dark:text-dark-400">XSS Prevention</div>
          </div>
          <div className="p-4 bg-gray-100 dark:bg-dark-900/50 rounded-lg">
            <ShieldAlert className="w-6 h-6 text-primary-500 mx-auto mb-2" />
            <div className="text-sm text-gray-600 dark:text-dark-400">DDoS Mitigation</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login