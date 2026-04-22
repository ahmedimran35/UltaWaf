from typing import Dict, Any, Optional
from fastapi import Request
import json
import ipaddress
import re
import os


TRUSTED_PROXIES = os.environ.get("TRUSTED_PROXY_CHAINS", "").split(",") if hasattr(os, 'environ') else []


def validate_ip(ip: str) -> bool:
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False


def is_private_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
        return addr.is_private or addr.is_loopback or addr.is_reserved
    except ValueError:
        return True


async def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        candidate = forwarded.split(",")[0].strip()
        if validate_ip(candidate) and not is_private_ip(candidate):
            return candidate

    real_ip = request.headers.get("X-Real-IP")
    if real_ip and validate_ip(real_ip) and not is_private_ip(real_ip):
        return real_ip

    return request.client.host if request.client else "unknown"


def sanitize_for_log(data: str, max_length: int = 10000) -> str:
    if not data:
        return ""
    sanitized = data[:max_length]
    sanitized = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', sanitized)
    sanitized = sanitized.replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')
    sensitive = ["password", "token", "secret", "key", "authorization", "cookie", "passwd", "pwd"]
    for s in sensitive:
        pattern = re.compile(re.escape(s), re.IGNORECASE)
        sanitized = pattern.sub(f"[REDACTED]", sanitized)
    return sanitized


def parse_query_params(request: Request) -> Dict[str, Any]:
    params = {}
    for key, value in request.query_params.items():
        params[key] = value
    return params


def parse_json_body(body: bytes) -> Optional[Dict]:
    if not body:
        return None
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        return None


def sanitize_for_log(data: str, max_length: int = 10000) -> str:
    if not data:
        return ""
    sanitized = data[:max_length]
    sensitive = ["password", "token", "secret", "key", "authorization", "cookie"]
    for s in sensitive:
        sanitized = sanitized.replace(s, f"[{s.upper()}]")
    return sanitized


def calculate_entropy(text: str) -> float:
    if not text:
        return 0.0

    from collections import Counter
    import math

    counts = Counter(text)
    length = len(text)

    entropy = 0.0
    for count in counts.values():
        probability = count / length
        entropy -= probability * math.log2(probability)

    return entropy


def detect_encoding(text: str) -> str:
    try:
        text.encode('utf-8')
        return 'utf-8'
    except UnicodeEncodeError:
        pass

    try:
        text.encode('latin-1')
        return 'latin-1'
    except UnicodeEncodeError:
        pass

    return 'unknown'


async def get_geo_info(ip: str) -> Dict[str, str]:
    if ip in ["127.0.0.1", "localhost", "::1", "unknown"]:
        return {"country": "LOCAL", "city": "Internal"}
        
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get(f"http://ip-api.com/json/{ip}") as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("status") == "success":
                        return {
                            "country": data.get("countryCode", "XX"),
                            "city": data.get("city", "Unknown")
                        }
    except Exception:
        pass
        
    return {"country": "XX", "city": "Unknown"}


async def get_ip_reputation(ip: str) -> Dict[str, Any]:
    """Fetch IP reputation from a public intelligence source."""
    if ip in ["127.0.0.1", "localhost", "::1", "unknown"]:
        return {"score": 0, "is_known_attacker": False}
        
    try:
        import aiohttp
        # Using a free API for demonstration (Real ones like AbuseIPDB need keys)
        async with aiohttp.ClientSession() as session:
            # Placeholder for a real intelligence API
            async with session.get(f"https://ipapi.co/{ip}/json/") as response:
                if response.status == 200:
                    data = await response.json()
                    # We simulate a score based on some fields for now
                    # In a real app, you'd use a dedicated security API
                    is_vpn = data.get("vpn", False)
                    is_proxy = data.get("proxy", False)
                    score = 20 if is_vpn else 0
                    score += 30 if is_proxy else 0
                    
                    return {
                        "score": score,
                        "is_known_attacker": score > 40,
                        "org": data.get("org", "Unknown"),
                        "asn": data.get("asn", "Unknown")
                    }
    except Exception:
        pass
        
    return {"score": 0, "is_known_attacker": False}

def validate_cors(origin: str, allowed_origins: list) -> bool:
    if "*" in allowed_origins:
        return True

    for allowed in allowed_origins:
        if origin.startswith(allowed.rstrip("*")):
            return True

    return False