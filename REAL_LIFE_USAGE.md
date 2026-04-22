# 🛡️ UltraShield WAF - Real Life Usage Guide

This guide explains how to deploy and use UltraShield WAF in a real production environment.

## 🏗️ Architecture Options

### 1. Reverse Proxy Mode (Recommended)
In this mode, UltraShield sits in front of your application. All traffic goes to UltraShield first, which filters it and then forwards clean requests to your app.

**Flow:**
`User -> Internet -> UltraShield WAF (Nginx + Python) -> Your Application`

**Setup:**
1. Point your domain's A record to the UltraShield server.
2. Configure `PROXY_TARGET` in `.env` to your application's internal URL.
3. Use `backend/proxy.py` (via Nginx) to handle the routing.

### 2. Middleware Mode (Direct Integration)
If you have a Python/FastAPI application, you can integrate UltraShield's logic directly as middleware.

**Setup:**
Copy `backend/firewall/` and `backend/models/` into your project and add the `waf_middleware` to your FastAPI app.

---

## 🚀 Step-by-Step Production Deployment

### 1. Hardening the Server
- Use a dedicated Ubuntu 22.04+ server.
- Close all ports except 80, 443, and 5173 (for dashboard).
- Disable root SSH login.

### 2. Setting up SSL (Real & Free)
Use **Certbot (Let's Encrypt)** for free, automated SSL:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 3. Running the WAF
Use the provided ultra-script for the initial setup:
```bash
./scripts/ultra_run.sh
```

### 4. Nginx Configuration
Update `/etc/nginx/sites-available/default` to route traffic through the WAF:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8000; # Points to UltraShield Backend/Proxy
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /dashboard {
        proxy_pass http://localhost:5173; # Points to WAF Dashboard
    }
}
```

---

## 🤖 Using the AI Features (Real & Free)

UltraShield supports multiple AI providers. For a **100% free** real-world setup:

1. **Groq**: Extremely fast, has a generous free tier. Get an API key at `console.groq.com`.
2. **OpenRouter**: Access many free models (like Llama 3) via a single API.
3. **Ollama**: Run your own AI locally on the same server (no API keys needed, 100% private).

**To Configure:**
1. Log in to the Dashboard (`/login`).
2. Go to **AI Settings**.
3. Select your provider and enter the key.
4. Enable "AI Threat Analysis".

---

## 🛡️ Best Practices for Real-Life WAF

1. **Learning Mode First**: Run the WAF with `BLOCK_MODE=false` for the first 24-48 hours. Monitor the logs to see if any legitimate traffic is being flagged (False Positives).
2. **IP Reputation**: Enable the "IP Intelligence" feature. This automatically blocks known malicious IPs, Tor exit nodes, and suspicious VPNs using free databases.
3. **Geo-Blocking**: If your business only operates in specific countries, block all other countries in the **GeoIP** tab to reduce 90% of automated bot attacks.
4. **Regular Updates**: Run `./scripts/ultra_run.sh` whenever you update the rules or code to ensure dependencies and database schemas stay in sync.

---

## 🧪 Testing your WAF
Once running, try a simple SQL injection to test it:
`curl "http://yourdomain.com/?id=1' OR '1'='1"`

If working, you should see a **403 Forbidden** response and a new entry in your **Threat Monitor** dashboard.
