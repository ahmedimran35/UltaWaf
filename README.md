# 🛡️ UltraShield WAF

A production-grade, open-source Web Application Firewall built with FastAPI, React, and machine learning.

![GitHub stars](https://img.shields.io/github/stars/ahmedimran35/UltaWaf?style=social)
![License](https://img.shields.io/badge/License-MIT-green)
![Python](https://img.shields.io/badge/Python-3.12+-blue)
![React](https://img.shields.io/badge/React-18+-cyan)

## Features

### 🔍 Attack Detection
- **SQL Injection (SQLi)** - Keyword, boolean, UNION, time-based blind injection
- **Cross-Site Scripting (XSS)** - Stored, reflected, DOM-based
- **Command Injection** - Shell commands, environment variables
- **LFI/RFI** - Local and remote file inclusion
- **XXE** - XML external entity attacks
- **SSRF** - Server-side request forgery
- **HTTP Request Smuggling** - CL.TE and TE.CL attacks
- **Path Traversal** - Directory traversal attempts
- **DDoS Protection** - Rate limiting and connection limiting

### 🤖 AI-Powered Security
- **Machine Learning Anomaly Detection** - Isolation Forest algorithm
- **Behavioral Analysis** - Session-based threat scoring
- **Bot Detection** - User-agent fingerprinting, headless browser detection
- **Tor/VPN Detection** - Exit node identification
- **Honeypot Traps** - Automated IP blocking

### 📊 Dashboard & Monitoring
- **Real-time WebSocket** - Live attack feed
- **Interactive Charts** - Traffic analysis, attack vectors
- **3D Attack Globe** - Geographic threat visualization
- **Request Logs** - Searchable inspection logs
- **Rule Management** - Custom WAF rules
- **IP Manager** - Blacklist/whitelist management
- **AI Assistant** - Natural language threat analysis

### 🏗️ Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────▶│   Nginx     │────▶│   WAF       │
│   Request   │     │   (Proxy)   │     │   Backend   │
└─────────────┘     └─────────────┘     └─────────────┘
                                                │
                    ┌─────────────┐             ▼
                    │   Target    │◀────  ┌─────────────┐
                    │   App       │      │   PostgreSQL │
                    └─────────────┘      └─────────────┘
                                            │
                                            ▼
                                       ┌─────────────┐
                                       │   Redis     │
                                       │   (Cache)  │
                                       └─────────────┘
```

## Quick Start

### Prerequisites
- Ubuntu 22.04+ or Debian-based system
- Python 3.12+
- PostgreSQL 14+
- Redis 6+
- Node.js 18+ (for frontend)

### Installation

```bash
# Clone the repository
git clone https://github.com/ahmedimran35/UltaWaf.git
cd UltaWaf

# Run the setup script
chmod +x scripts/ultra_run.sh
./scripts/ultra_run.sh
```

### Manual Setup

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

## Configuration

### Environment Variables (.env)

```env
# Database
POSTGRES_USER=waf
POSTGRES_PASSWORD=your_secure_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ultrashield_waf

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
SECRET_KEY=your-super-secret-key-change-in-production
DEBUG=false

# WAF Settings
WAF_ENABLED=true
BLOCK_MODE=true

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# DDoS Protection
DDoS_THRESHOLD=1000
DDoS_WINDOW=60
```

### Default Credentials
- **Username**: `admin`
- **Password**: `admin`

> ⚠️ **Change immediately in production!**

## API Endpoints

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/login` | POST | Admin login |
| `/api/auth/csrf` | GET | Get CSRF token |

### Statistics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/stats/overview` | GET | Overview stats |
| `/api/admin/stats/attacks` | GET | Attack statistics |
| `/api/admin/stats/timeline` | GET | Traffic timeline |
| `/api/admin/stats/top-ips` | GET | Top attacker IPs |

### Logs & Rules
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/logs` | GET | Request logs |
| `/api/admin/rules` | GET | WAF rules |
| `/api/admin/ip` | GET | IP blacklist/whitelist |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `/ws` | Real-time attack feed |

## Testing the WAF

```bash
# SQL Injection Test
curl "http://localhost:8000/?id=1' OR '1'='1"

# XSS Test
curl "http://localhost:8000/?q=<script>alert(1)</script>"

# Command Injection
curl "http://localhost:8000/?file=test;ls -la"

# Path Traversal
curl "http://localhost:8000/?path=../../../etc/passwd"
```

Expected response: `403 Forbidden`

## Free AI Options

### Option 1: Ollama (Recommended - 100% Free)
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama serve
ollama pull llama3

# Configure in Dashboard → AI Settings
# Base URL: http://localhost:11434
```

### Option 2: Groq
1. Get free API key at https://console.groq.com
2. Configure in Dashboard → AI Settings

### Option 3: OpenRouter
1. Get free API key at https://openrouter.ai
2. Configure in Dashboard → AI Settings

## Project Structure

```
UltaWaf/
├── backend/
│   ├── api/           # REST API endpoints
│   ├── firewall/      # WAF detection engines
│   ├── models/        # Database models
│   ├── utils/         # Helper functions
│   ├── config.py      # Configuration
│   ├── main.py        # FastAPI application
│   └── proxy.py       # Reverse proxy
├── frontend/
│   ├── src/
│   │   ├── pages/    # Dashboard pages
│   │   ├── components/ # UI components
│   │   └── hooks/    # React hooks
│   └── package.json
├── nginx/            # Nginx configurations
├── scripts/          # Deployment scripts
├── rules/            # WAF rules (YAML)
└── docker-compose.yml
```

## Security Best Practices

1. **Learning Mode First**: Run with `BLOCK_MODE=false` for 24-48 hours
2. **Monitor Logs**: Check for false positives before blocking
3. **Geo-Blocking**: Block irrelevant countries
4. **IP Reputation**: Enable malicious IP blocking
5. **Regular Updates**: Keep rules and dependencies updated

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI, Python 3.12 |
| Database | PostgreSQL, SQLAlchemy |
| Cache | Redis |
| ML | scikit-learn, NumPy |
| Frontend | React 18, Tailwind CSS |
| Charts | Chart.js |
| Maps | Leaflet, React-GL |
| WebSocket | websockets |

## License

MIT License - See [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to GitHub (`git push origin feature/amazing`)
5. Create Pull Request

## Support

- 📧 Email: ahmedimran35@gmail.com
- 🐛 Issues: https://github.com/ahmedimran35/UltaWaf/issues
- 💬 Discussions: https://github.com/ahmedimran35/UltaWaf/discussions

---

<p align="center">
  Made with ❤️ for a safer internet
</p>