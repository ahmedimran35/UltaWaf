import { useState } from 'react'
import {
  Book, ChevronDown, Search, Shield, Activity, FileText, Globe, Settings, Brain, Sparkles,
  Lock, Database, AlertTriangle, CheckCircle, Play, AlertCircle, Server, Key
} from 'lucide-react'

const SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Play,
    color: 'text-green-600 dark:text-green-400',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">Welcome to <strong className="text-primary-600 dark:text-primary-400">UltraShield WAF</strong> — your intelligent Web Application Firewall with ML-powered threat detection.</p>
        <div className="bg-gray-50 dark:bg-dark-800/50 rounded-xl p-4 border border-gray-200 dark:border-dark-700">
          <h4 className="text-primary-600 dark:text-primary-400 font-bold mb-2">Quick Start</h4>
          <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300">
            <li>Login with your admin credentials</li>
            <li>Navigate to <strong className="text-gray-900 dark:text-white">Settings</strong> to configure your WAF</li>
            <li>Go to <strong className="text-gray-900 dark:text-white">Rules</strong> to customize detection rules</li>
            <li>Monitor threats in real-time from the <strong className="text-gray-900 dark:text-white">Dashboard</strong></li>
            <li>Check the <strong className="text-gray-900 dark:text-white">Threat Globe</strong> for global attack visualization</li>
            <li>Review <strong className="text-gray-900 dark:text-white">Attack Logs</strong> for detailed security events</li>
          </ol>
        </div>
        <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-200 dark:border-red-500/30">
          <h4 className="text-red-600 dark:text-red-400 font-bold mb-1">⚠️ Security First</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
            <li>Change your password immediately after first login</li>
            <li>Enable <strong className="text-gray-900 dark:text-white">Block Mode</strong> in Settings for active protection</li>
            <li>Review and customize WAF rules for your application</li>
            <li>Set up IP whitelisting for trusted services</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: Activity,
    color: 'text-primary-600 dark:text-primary-400',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">The <strong className="text-primary-600 dark:text-primary-400">Dashboard</strong> provides a real-time overview of your WAF protection status.</p>
        <div className="bg-gray-50 dark:bg-dark-800/50 rounded-xl p-4 border border-gray-200 dark:border-dark-700">
          <h4 className="text-primary-600 dark:text-primary-400 font-bold mb-2">Key Metrics</h4>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li><span className="text-gray-900 dark:text-white font-semibold">Total Requests</span> — All HTTP requests processed</li>
            <li><span className="text-gray-900 dark:text-white font-semibold">Blocked</span> — Malicious requests prevented</li>
            <li><span className="text-gray-900 dark:text-white font-semibold">Allowed</span> — Safe requests that passed through</li>
            <li><span className="text-gray-900 dark:text-white font-semibold">Avg Response</span> — Average server response time</li>
          </ul>
        </div>
        <div className="bg-gray-50 dark:bg-dark-800/50 rounded-xl p-4 border border-gray-200 dark:border-dark-700">
          <h4 className="text-primary-600 dark:text-primary-400 font-bold mb-2">Charts</h4>
          <ul className="space-y-1 text-gray-700 dark:text-gray-300">
            <li><span className="text-gray-900 dark:text-white font-semibold">Traffic Overview</span> — Request volume over time</li>
            <li><span className="text-gray-900 dark:text-white font-semibold">Block Status</span> — Pie chart of blocked vs allowed</li>
            <li><span className="text-gray-900 dark:text-white font-semibold">Attack Types</span> — Bar chart of attack categories</li>
            <li><span className="text-gray-900 dark:text-white font-semibold">Top Attacking IPs</span> — Most active attackers</li>
          </ul>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm italic">The dashboard auto-refreshes every 10 seconds with real-time WebSocket stats.</p>
      </div>
    )
  },
  {
    id: 'live-monitor',
    title: 'Live Threat Monitor',
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">Monitor incoming threats in real-time with detailed attack information.</p>
        <div className="bg-gray-50 dark:bg-dark-800/50 rounded-xl p-4 border border-gray-200 dark:border-dark-700">
          <h4 className="text-red-600 dark:text-red-400 font-bold mb-2">Features</h4>
          <ul className="space-y-1 text-gray-700 dark:text-gray-300">
            <li>Real-time log stream with auto-scroll</li>
            <li>Sound alerts for new threats (toggle with speaker icon)</li>
            <li>Filter by attack type, IP, or status</li>
            <li>Color-coded severity indicators</li>
          </ul>
        </div>
        <div className="bg-gray-50 dark:bg-dark-800/50 rounded-xl p-4 border border-gray-200 dark:border-dark-700">
          <h4 className="text-red-600 dark:text-red-400 font-bold mb-2">Attack Types</h4>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-red-600 dark:text-red-400">SQLi</span><span className="text-gray-500 dark:text-gray-400">SQL Injection</span>
            <span className="text-orange-600 dark:text-orange-400">XSS</span><span className="text-gray-500 dark:text-gray-400">Cross-Site Scripting</span>
            <span className="text-purple-600 dark:text-purple-400">CMDi</span><span className="text-gray-500 dark:text-gray-400">Command Injection</span>
            <span className="text-yellow-600 dark:text-yellow-400">LFI</span><span className="text-gray-500 dark:text-gray-400">Local File Inclusion</span>
            <span className="text-blue-600 dark:text-blue-400">RFI</span><span className="text-gray-500 dark:text-gray-400">Remote File Inclusion</span>
            <span className="text-pink-600 dark:text-pink-400">XXE</span><span className="text-gray-500 dark:text-gray-400">XML External Entity</span>
            <span className="text-cyan-600 dark:text-cyan-400">SSRF</span><span className="text-gray-500 dark:text-gray-400">Server-Side Request Forgery</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'attack-logs',
    title: 'Attack Logs',
    icon: FileText,
    color: 'text-yellow-600 dark:text-yellow-400',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">View, search, and export all WAF security events.</p>
        <div className="bg-gray-50 dark:bg-dark-800/50 rounded-xl p-4 border border-gray-200 dark:border-dark-700">
          <h4 className="text-yellow-600 dark:text-yellow-400 font-bold mb-2">Filtering Options</h4>
          <ul className="space-y-1 text-gray-700 dark:text-gray-300">
            <li><span className="text-gray-900 dark:text-white font-semibold">Search</span> — Find by IP, path, or attack type</li>
            <li><span className="text-gray-900 dark:text-white font-semibold">Status</span> — Filter by blocked/allowed</li>
            <li><span className="text-gray-900 dark:text-white font-semibold">Attack Type</span> — Filter specific categories</li>
          </ul>
        </div>
        <div className="bg-gray-50 dark:bg-dark-800/50 rounded-xl p-4 border border-gray-200 dark:border-dark-700">
          <h4 className="text-yellow-600 dark:text-yellow-400 font-bold mb-2">Understanding Logs</h4>
          <ul className="space-y-1 text-gray-700 dark:text-gray-300">
            <li><span className="text-gray-900 dark:text-white font-semibold">Timestamp</span> — When the request occurred</li>
            <li><span className="text-gray-900 dark:text-white font-semibold">IP Address</span> — Source of the request</li>
            <li><span className="text-gray-900 dark:text-white font-semibold">Method</span> — HTTP method (GET, POST, etc.)</li>
            <li><span className="text-gray-900 dark:text-white font-semibold">Path</span> — Requested URL path</li>
            <li><span className="text-gray-900 dark:text-white font-semibold">Status</span> — Blocked or Allowed</li>
            <li><span className="text-gray-900 dark:text-white font-semibold">Score</span> — Threat score (0-100)</li>
          </ul>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Click <strong className="text-gray-900 dark:text-white">Export CSV</strong> to download logs for external analysis.</p>
      </div>
    )
  },
  {
    id: 'threat-globe',
    title: 'Threat Globe',
    icon: Globe,
    color: 'text-blue-600 dark:text-blue-400',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">Interactive 3D visualization of global attack sources targeting your WAF.</p>
        <div className="bg-gray-50 dark:bg-dark-800/50 rounded-xl p-4 border border-gray-200 dark:border-dark-700">
          <h4 className="text-blue-600 dark:text-blue-400 font-bold mb-2">How It Works</h4>
          <ul className="space-y-1 text-gray-700 dark:text-gray-300">
            <li>Globe shows Earth with attack source locations</li>
            <li>Arcs animate from attack origin to your server</li>
            <li>Colors indicate different attack types</li>
            <li>Points mark countries with active attackers</li>
          </ul>
        </div>
        <div className="bg-gray-50 dark:bg-dark-800/50 rounded-xl p-4 border border-gray-200 dark:border-dark-700">
          <h4 className="text-blue-600 dark:text-blue-400 font-bold mb-2">Attack Colors</h4>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-red-600 dark:text-red-400">●</span><span className="text-gray-700 dark:text-gray-300">SQL Injection</span>
            <span className="text-orange-600 dark:text-orange-400">●</span><span className="text-gray-700 dark:text-gray-300">XSS</span>
            <span className="text-purple-600 dark:text-purple-400">●</span><span className="text-gray-700 dark:text-gray-300">Command Injection</span>
            <span className="text-yellow-600 dark:text-yellow-400">●</span><span className="text-gray-700 dark:text-gray-300">LFI</span>
            <span className="text-blue-600 dark:text-blue-400">●</span><span className="text-gray-700 dark:text-gray-300">RFI</span>
            <span className="text-pink-600 dark:text-pink-400">●</span><span className="text-gray-700 dark:text-gray-300">XXE</span>
            <span className="text-cyan-600 dark:text-cyan-400">●</span><span className="text-gray-700 dark:text-gray-300">SSRF</span>
            <span className="text-green-600 dark:text-green-400">●</span><span className="text-gray-700 dark:text-gray-300">Brute Force</span>
          </div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Click the <strong className="text-gray-900 dark:text-white">maximize button</strong> for fullscreen visualization.</p>
      </div>
    )
  },
  {
    id: 'waf-rules',
    title: 'WAF Rules',
    icon: Shield,
    color: 'text-purple-400',
    content: (
      <div className="space-y-4">
        <p className="text-gray-300 leading-relaxed">Create, edit, and manage security rules that detect and block threats.</p>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <h4 className="text-purple-400 font-bold mb-2">Rule Properties</h4>
          <ul className="space-y-1 text-gray-300">
            <li><span className="text-white font-semibold">Name</span> — Descriptive rule name</li>
            <li><span className="text-white font-semibold">Type</span> — Attack category (SQLi, XSS, LFI, etc.)</li>
            <li><span className="text-white font-semibold">Pattern</span> — Regex pattern to match</li>
            <li><span className="text-white font-semibold">Severity</span> — Critical / High / Medium / Low / Info</li>
            <li><span className="text-white font-semibold">Action</span> — Block / Log Only / Allow</li>
            <li><span className="text-white font-semibold">Priority</span> — Higher = checked first (1-1000)</li>
          </ul>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <h4 className="text-purple-400 font-bold mb-2">Rule Types</h4>
          <div className="grid grid-cols-2 gap-1 text-gray-300">
            <span className="font-mono text-sm">sqli</span><span>SQL Injection</span>
            <span className="font-mono text-sm">xss</span><span>Cross-Site Scripting</span>
            <span className="font-mono text-sm">lfi</span><span>Local File Inclusion</span>
            <span className="font-mono text-sm">rfi</span><span>Remote File Inclusion</span>
            <span className="font-mono text-sm">cmdi</span><span>Command Injection</span>
            <span className="font-mono text-sm">xxe</span><span>XML External Entity</span>
            <span className="font-mono text-sm">ssrf</span><span>Server-Side Request Forgery</span>
            <span className="font-mono text-sm">path_traversal</span><span>Path Traversal</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'ip-manager',
    title: 'IP Manager',
    icon: Search,
    color: 'text-cyan-400',
    content: (
      <div className="space-y-4">
        <p className="text-gray-300 leading-relaxed">Manage IP addresses, countries, and access control lists.</p>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <h4 className="text-cyan-400 font-bold mb-2">Blacklist</h4>
          <ul className="space-y-1 text-gray-300">
            <li>Block specific IP addresses from accessing your server</li>
            <li>Add IPs manually with reason</li>
            <li>View source of block (manual, honeypot, etc.)</li>
          </ul>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <h4 className="text-cyan-400 font-bold mb-2">Whitelist</h4>
          <ul className="space-y-1 text-gray-300">
            <li>Allow trusted IPs that bypass WAF inspection</li>
            <li>Use for trusted internal services</li>
            <li>Add description for reference</li>
          </ul>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <h4 className="text-cyan-400 font-bold mb-2">Geo Blocking</h4>
          <ul className="space-y-1 text-gray-300">
            <li>Block entire countries from accessing your server</li>
            <li>Visual grid of blocked countries</li>
            <li>Instant protection from specific regions</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'analytics',
    title: 'Analytics & Reports',
    icon: Database,
    color: 'text-indigo-400',
    content: (
      <div className="space-y-4">
        <p className="text-gray-300 leading-relaxed">Comprehensive security analytics and reporting tools.</p>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <h4 className="text-indigo-400 font-bold mb-2">Time Periods</h4>
          <ul className="space-y-1 text-gray-300">
            <li>Last 24 hours</li>
            <li>Last 7 days</li>
            <li>Last 30 days</li>
            <li>Last 90 days</li>
          </ul>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <h4 className="text-indigo-400 font-bold mb-2">Metrics Tracked</h4>
          <ul className="space-y-1 text-gray-300">
            <li><span className="text-white font-semibold">Total Requests</span> — Volume over period</li>
            <li><span className="text-white font-semibold">Blocked Requests</span> — Threats prevented</li>
            <li><span className="text-white font-semibold">Unique IPs</span> — Distinct attackers</li>
            <li><span className="text-white font-semibold">Avg Response Time</span> — Performance metric</li>
          </ul>
        </div>
        <p className="text-gray-400 text-sm">Click <strong className="text-white">Export</strong> to download JSON reports for compliance and analysis.</p>
      </div>
    )
  },
  {
    id: 'ml-settings',
    title: 'ML Engine',
    icon: Brain,
    color: 'text-pink-400',
    content: (
      <div className="space-y-4">
        <p className="text-gray-300 leading-relaxed">Machine Learning-powered threat detection with anomaly analysis.</p>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <h4 className="text-pink-400 font-bold mb-2">Detection Models</h4>
          <ul className="space-y-2 text-gray-300">
            <li><span className="text-white font-semibold">Isolation Forest</span> — Anomaly detection, no labeled data needed</li>
            <li><span className="text-white font-semibold">Random Forest</span> — Classification of malicious/safe requests</li>
            <li><span className="text-white font-semibold">Ensemble Model</span> — Combines multiple approaches for higher accuracy</li>
          </ul>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <h4 className="text-pink-400 font-bold mb-2">Detection Layers</h4>
          <ol className="list-decimal list-inside space-y-1 text-gray-300">
            <li>Signature Detection — Regex patterns</li>
            <li>OWASP Rules — Core Rule Set</li>
            <li>ML Anomaly — Machine learning</li>
            <li>AI Deep Analysis — Advanced LLM analysis</li>
          </ol>
        </div>
        <p className="text-gray-400 text-sm">Click <strong className="text-white">Train Model</strong> to update ML. Requires minimum 100 samples.</p>
      </div>
    )
  },
  {
    id: 'ai-settings',
    title: 'AI Integration',
    icon: Sparkles,
    color: 'text-violet-400',
    content: (
      <div className="space-y-4">
        <p className="text-gray-300 leading-relaxed">Connect powerful AI providers for advanced threat analysis.</p>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <h4 className="text-violet-400 font-bold mb-2">Supported Providers</h4>
          <div className="grid grid-cols-2 gap-2 text-gray-300">
            <div className="font-semibold text-white">OpenAI</div><div>GPT-4, GPT-3.5 Turbo</div>
            <div className="font-semibold text-white">Anthropic</div><div>Opus, Sonnet, Haiku</div>
            <div className="font-semibold text-white">OpenRouter</div><div>100+ models, free tier</div>
            <div className="font-semibold text-white">Ollama</div><div>Local models, no API key</div>
            <div className="font-semibold text-white">Groq</div><div>Fast inference, Llama models</div>
          </div>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <h4 className="text-violet-400 font-bold mb-2">Configuration Steps</h4>
          <ol className="list-decimal list-inside space-y-1 text-gray-300">
            <li>Select provider from dropdown</li>
            <li>Enter API key (not needed for Ollama)</li>
            <li>Choose model or auto-detect</li>
            <li>Set as active provider</li>
            <li>Test connection</li>
          </ol>
        </div>
      </div>
    )
  },
  {
    id: 'settings',
    title: 'Core Settings',
    icon: Settings,
    color: 'text-gray-400',
    content: (
      <div className="space-y-4">
        <p className="text-gray-300 leading-relaxed">Configure your WAF core protection settings.</p>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <h4 className="text-gray-300 font-bold mb-2">WAF Controls</h4>
          <ul className="space-y-1 text-gray-300">
            <li><span className="text-white font-semibold">Enable WAF</span> — Turn protection on/off</li>
            <li><span className="text-white font-semibold">Block Mode</span> — Block or just log threats</li>
          </ul>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <h4 className="text-gray-300 font-bold mb-2">Performance</h4>
          <ul className="space-y-1 text-gray-300">
            <li><span className="text-white font-semibold">Rate Limit Window</span> — Time period for rate limits</li>
            <li><span className="text-white font-semibold">DDoS Threshold</span> — Max requests per window</li>
          </ul>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <h4 className="text-gray-300 font-bold mb-2">Advanced Features</h4>
          <ul className="space-y-1 text-gray-300">
            <li><span className="text-white font-semibold">Virtual Patching</span> — Dynamic rules without restart</li>
            <li><span className="text-white font-semibold">API Shielding</span> — JSON validation & REST API protection</li>
            <li><span className="text-white font-semibold">SIEM Export</span> — Send events in JSON format</li>
            <li><span className="text-white font-semibold">Honeypot Traps</span> — Secret paths that trigger instant IP ban</li>
            <li><span className="text-white font-semibold">ML Engine</span> — Enable/disable machine learning</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'threat-scores',
    title: 'Threat Scoring',
    icon: AlertCircle,
    color: 'text-orange-400',
    content: (
      <div className="space-y-4">
        <p className="text-gray-300 leading-relaxed">Understanding the <strong className="text-orange-400">0-100 threat score</strong> system.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
            <div className="text-green-400 font-bold text-lg">0-25</div>
            <div className="text-green-300 text-sm font-semibold">Safe</div>
            <p className="text-gray-400 text-xs mt-1">Normal traffic, no action needed</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
            <div className="text-yellow-400 font-bold text-lg">26-50</div>
            <div className="text-yellow-300 text-sm font-semibold">Suspicious</div>
            <p className="text-gray-400 text-xs mt-1">Unusual patterns, monitor closely</p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
            <div className="text-orange-400 font-bold text-lg">51-75</div>
            <div className="text-orange-300 text-sm font-semibold">Threat Likely</div>
            <p className="text-gray-400 text-xs mt-1">Consider blocking, review logs</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <div className="text-red-400 font-bold text-lg">76-100</div>
            <div className="text-red-300 text-sm font-semibold">High Threat</div>
            <p className="text-gray-400 text-xs mt-1">Immediate block, add to blacklist</p>
          </div>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <h4 className="text-orange-400 font-bold mb-2">Scoring Factors</h4>
          <ul className="space-y-1 text-gray-300">
            <li>Pattern matches (regex rules)</li>
            <li>ML anomaly score</li>
            <li>IP reputation</li>
            <li>Geographic location</li>
            <li>Request frequency</li>
            <li>Historical data</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'architecture',
    title: 'System Architecture',
    icon: Lock,
    color: 'text-teal-400',
    content: (
      <div className="space-y-4">
        <p className="text-gray-300 leading-relaxed">How UltraShield WAF components work together.</p>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <h4 className="text-teal-400 font-bold mb-2">Request Flow</h4>
          <ol className="list-decimal list-inside space-y-1 text-gray-300">
            <li>Client makes HTTP request</li>
            <li>Nginx reverse proxy & rate limiting</li>
            <li>Request forwarded to WAF backend</li>
            <li>Rules engine checks patterns</li>
            <li>ML engine analyzes anomalies</li>
            <li>Optional: AI deep analysis</li>
            <li>Log to database</li>
            <li>Return response (blocked or allowed)</li>
          </ol>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <h4 className="text-teal-400 font-bold mb-2">Services & Ports</h4>
          <div className="grid grid-cols-2 gap-2 text-gray-300 font-mono text-sm">
            <span className="text-teal-400">Nginx</span><span>:80, :443</span>
            <span className="text-teal-400">Backend</span><span>:8000</span>
            <span className="text-teal-400">Frontend</span><span>:5173</span>
            <span className="text-teal-400">PostgreSQL</span><span>:5432</span>
            <span className="text-teal-400">Redis</span><span>:6379</span>
          </div>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <h4 className="text-teal-400 font-bold mb-2">Security</h4>
          <ul className="space-y-1 text-gray-300">
            <li>JWT authentication (15 min expiry)</li>
            <li>Encrypted API keys (Fernet/AES-256)</li>
            <li>Non-root containers</li>
            <li>HSTS headers</li>
            <li>Request size limits</li>
          </ul>
        </div>
      </div>
    )
  }
]

function Documentation() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSection, setExpandedSection] = useState('getting-started')

  const filteredSections = SECTIONS.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Documentation</h1>
          <p className="text-dark-400 text-sm mt-1">UltraShield WAF Reference Guide</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            placeholder="Search documentation..."
            className="input pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        {filteredSections.map((section) => (
          <div key={section.id} className="card overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-dark-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <section.icon className={`w-5 h-5 ${section.color}`} />
                <span className="font-semibold text-white">{section.title}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-dark-500 transition-transform ${expandedSection === section.id ? 'rotate-180' : ''}`} />
            </button>

            {expandedSection === section.id && (
              <div className="px-4 pb-4">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Documentation