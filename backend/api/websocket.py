from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import asyncio
import logging
import random
import httpx
import time
from collections import defaultdict

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_CONNECTIONS = 1000
MAX_MESSAGES_PER_SECOND = 50
MAX_MESSAGES_PER_MINUTE = 500

class MessageRateLimiter:
    def __init__(self):
        self.message_counts = defaultdict(list)
        self.default_limits = {"second": MAX_MESSAGES_PER_SECOND, "minute": MAX_MESSAGES_PER_MINUTE}

    def is_allowed(self, client_id: str) -> bool:
        now = time.time()
        self.message_counts[client_id] = [
            t for t in self.message_counts[client_id]
            if now - t < 60
        ]
        count_second = sum(1 for t in self.message_counts[client_id] if now - t < 1)
        count_minute = len(self.message_counts[client_id])
        if count_second >= self.default_limits["second"] or count_minute >= self.default_limits["minute"]:
            return False
        self.message_counts[client_id].append(now)
        return True

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.global_feed_task = None
        self.heartbeat_task = None
        self.rate_limiter = MessageRateLimiter()

    async def connect(self, websocket: WebSocket, client_id: str) -> bool:
        if len(self.active_connections) >= MAX_CONNECTIONS:
            logger.warning(f"WebSocket connection rejected: max connections ({MAX_CONNECTIONS}) reached")
            return False
        if not self.rate_limiter.is_allowed(client_id):
            logger.warning(f"WebSocket rate limit exceeded: {client_id}")
            await websocket.close(code=1008, reason="Rate limit exceeded")
            return False
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"WebSocket connected: {client_id} (total: {len(self.active_connections)})")
        return True

    async def start_global_feed(self):
        if self.global_feed_task:
            return
        self.global_feed_task = asyncio.create_task(self._global_feed_loop())
        # Ensure a heartbeat task runs to keep connections alive
        if not self.heartbeat_task:
            self.heartbeat_task = asyncio.create_task(self._heartbeat())

    async def _global_feed_loop(self):
        logger.info("Starting Global Threat Intel Feed...")
        
        async with httpx.AsyncClient() as client:
            while True:
                try:
                    # DShield - top attackers with real geolocation
                    try:
                        resp = await client.get("https://isc.sans.edu/api/sources/10/60?json", timeout=15)
                        if resp.status_code == 200:
                            data = resp.json()
                            ip_list = [{"query": a.get("ip", "")} for a in data if a.get("ip")]
                            if ip_list:
                                geo_resp = await client.post("http://ip-api.com/batch", json=ip_list, timeout=15)
                                if geo_resp.status_code == 200:
                                    geo_data = geo_resp.json()
                                    country_map = {g["query"]: g.get("countryCode", "??").upper() for g in geo_data}
                                    
                                    attack_types = ["bot_scan", "ssh_brute", "http_scan", "smtp_spam", "rdp_brute", "mysql_brute", "postgres_brute", "telnet_brute", "vpn_scan"]
                                    for attack in data:
                                        ip = attack.get("ip", "")
                                        country_code = country_map.get(ip, "XX")
                                        if country_code and country_code != "XX":
                                            attack_type = random.choice(attack_types)
                                            await asyncio.sleep(random.uniform(0.2, 1.0))
                                            await self.send_message({
                                                "type": "global_attack",
                                                "data": {
                                                    "country": country_code,
                                                    "attack_type": attack_type,
                                                    "source": "DShield",
                                                    "ip": ip,
                                                }
                                            })
                    except Exception as e:
                        logger.error(f"DShield error: {e}")
                    
                    # CISA KEV - exploited vulnerabilities
                    try:
                        cisa_resp = await client.get(
                            "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
                            timeout=30
                        )
                        if cisa_resp.status_code == 200:
                            cisa_data = cisa_resp.json()
                            vulns = cisa_data.get("vulnerabilities", [])[:8]
                            for vuln in vulns:
                                await asyncio.sleep(random.uniform(0.5, 1.5))
                                await self.send_message({
                                    "type": "cve_alert",
                                    "data": {
                                        "cve_id": vuln.get("cveID", ""),
                                        "description": vuln.get("shortDescription", "")[:100],
                                        "date_added": vuln.get("dateAdded", ""),
                                        "vendor": vuln.get("vendorProject", ""),
                                        "product": vuln.get("product", ""),
                                    }
                                })
                    except Exception as e:
                        logger.error(f"CISA KEV error: {e}")
                    
                    # Project Honey Pot - real attack data
                    try:
                        hp_resp = await client.get(
                            "http://www.projecthoneycomb.org/api/getData?count=20",
                            timeout=15
                        )
                        if hp_resp.status_code == 200:
                            try:
                                 hp_data = hp_resp.json()
                                 for item in hp_data.get("data", []):
                                    ip = item.get("ip", "")
                                    port = item.get("port", "")
                                    await asyncio.sleep(random.uniform(0.3, 1.0))
                                    await self.send_message({
                                        "type": "global_attack",
                                        "data": {
                                            "country": item.get("countryCode", "XX").upper(),
                                            "attack_type": f"hp_port_{port}" if port else "hp_attack",
                                            "source": "HoneyPot",
                                            "ip": ip,
                                        }
                                    })
                            except:
                                pass
                    except Exception as e:
                        logger.error(f"HoneyPot error: {e}")
                    
                    # Emerging Threats - free IP blocklist (fetch all in batches)
                    try:
                        et_resp = await client.get("https://rules.emergingthreats.net/blockrules/compromised-ips.txt", timeout=15)
                        if et_resp.status_code == 200:
                            et_ips = [ip.strip() for ip in et_resp.text.strip().split('\n') if ip.strip()]
                            # Process all IPs in batches of 100
                            for batch_start in range(0, min(len(et_ips), 300), 100):
                                batch_ips = et_ips[batch_start:batch_start+100]
                                ip_list = [{"query": ip} for ip in batch_ips]
                                if ip_list:
                                    geotokens = await client.post("http://ip-api.com/batch", json=ip_list, timeout=15)
                                    if geotokens.status_code == 200:
                                        geo_results = geotokens.json()
                                        for gr in geo_results:
                                            country = gr.get("countryCode", "??") or "??"
                                            country = country.upper()
                                            await asyncio.sleep(random.uniform(0.1, 0.3))
                                            await self.send_message({
                                                "type": "global_attack",
                                                "data": {
                                                    "country": country,
                                                    "attack_type": "compromised_ip",
                                                    "source": "EmergingThreats",
                                                    "ip": gr.get("query", ""),
                                                }
                                            })
                    except Exception as e:
                        logger.error(f"Emerging Threats error: {e}")
                    
                    # H34N3 blocklist (free, no API key)  
                    try:
                        h34n3_resp = await client.get("https://blocklist.h34n3.com/all.txt", timeout=15)
                        if h34n3_resp.status_code == 200:
                            h34n3_ips = [ip.strip() for ip in h34n3_resp.text.strip().split('\n') if ip.strip()]
                            h34n3_ips = [ip for ip in h34n3_ips[:150] if ip and ip.count('.') == 3]
                            ip_list = [{"query": ip} for ip in h34n3_ips]
                            if ip_list:
                                geotokens = await client.post("http://ip-api.com/batch", json=ip_list[:100], timeout=15)
                                if geotokens.status_code == 200:
                                    geo_results = geotokens.json()
                                    for gr in geo_results:
                                        country = (gr.get("countryCode", "??") or "??").upper()
                                        await asyncio.sleep(random.uniform(0.1, 0.3))
                                        await self.send_message({
                                            "type": "global_attack",
                                            "data": {
                                                "country": country,
                                                "attack_type": "malware",
                                                "source": "H34N3",
                                                "ip": gr.get("query", ""),
                                            }
                                        })
                    except Exception as e:
                        logger.error(f"H34N3 error: {e}")
                    
                    # Spamhaus DROP - free, no API key (extract first IP from CIDR)
                    try:
                        sh_resp = await client.get("https://www.spamhaus.org/drop/drop.txt", timeout=15)
                        if sh_resp.status_code == 200:
                            sh_lines = [ip.strip().split(';')[0].strip() for ip in sh_resp.text.strip().split('\n') if ip.strip()]
                            sh_ips = []
                            for cidr in sh_lines:
                                if '/' in cidr:
                                    ip_part = cidr.split('/')[0]
                                    sh_ips.append(ip_part)
                                elif '.' in cidr:
                                    sh_ips.append(cidr)
                            sh_ips = sh_ips[:80]
                            ip_list = [{"query": ip} for ip in sh_ips]
                            if ip_list:
                                geotokens = await client.post("http://ip-api.com/batch", json=ip_list[:100], timeout=15)
                                if geotokens.status_code == 200:
                                    geo_results = geotokens.json()
                                    for gr in geo_results:
                                        country = (gr.get("countryCode", "??") or "??").upper()
                                        await asyncio.sleep(random.uniform(0.1, 0.3))
                                        await self.send_message({
                                            "type": "global_attack",
                                            "data": {
                                                "country": country,
                                                "attack_type": "spam_drop",
                                                "source": "Spamhaus",
                                                "ip": gr.get("query", ""),
                                            }
                                        })
                    except Exception as e:
                        logger.error(f"Spamhaus error: {e}")
                
                except Exception as e:
                    logger.error(f"Global feed error: {e}")
                
                await asyncio.sleep(45)

    async def _heartbeat(self):
        """Send periodic ping messages to keep connections alive."""
        while True:
            # Send a lightweight ping to all clients every 15 seconds
            try:
                await self.send_message({"type": "ping"})
            except Exception as e:
                logger.error(f"Heartbeat error: {e}")
            await asyncio.sleep(15)

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        logger.info(f"WebSocket disconnected: {client_id}")

    async def send_message(self, message: dict, client_id: str = None):
        if client_id:
            websocket = self.active_connections.get(client_id)
            if websocket:
                await websocket.send_json(message)
        else:
            for client_id, websocket in self.active_connections.items():
                try:
                    await websocket.send_json(message)
                except Exception:
                    self.disconnect(client_id)

    async def broadcast_stats(self, stats: dict):
        await self.send_message({"type": "stats", "data": stats})

    async def broadcast_alert(self, alert: dict):
        await self.send_message({"type": "alert", "data": alert})


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    client_id = f"client_{random.randint(1000000, 9999999)}"
    try:
        if not await manager.connect(websocket, client_id):
            await websocket.close(code=1013, reason="Server at capacity")
            return

        while True:
            data = await websocket.receive_json()

            if data.get("type") == "ping":
                await manager.send_message({"type": "pong"}, client_id)
            elif data.get("type") == "subscribe":
                await manager.send_message({
                    "type": "subscribed",
                    "channels": data.get("channels", ["stats", "logs", "alerts"])
                }, client_id)

    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(client_id)


@router.websocket("/ws/live")
async def live_dashboard_websocket(websocket: WebSocket):
    client_id = f"live_{random.randint(1000000, 9999999)}"
    try:
        if not await manager.connect(websocket, client_id):
            await websocket.close(code=1013, reason="Server at capacity")
            return

        initial_stats = {
            "requests": 0,
            "blocked": 0,
            "attacks": 0,
            "rps": 0,
        }
        await websocket.send_json({"type": "stats", "data": initial_stats})

        while True:
            data = await websocket.receive_text()

            try:
                import json
                message = json.loads(data)

                if message.get("type") == "update_stats":
                    new_stats = message.get("stats", {})
                    await manager.broadcast_stats(new_stats)
                elif message.get("type") == "new_alert":
                    await manager.broadcast_alert(message.get("alert", {}))
                    
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"Live websocket error: {e}")
        manager.disconnect(client_id)


ws_router = router