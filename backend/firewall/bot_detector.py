import re
import logging
import hashlib
from typing import Dict, List, Optional, Set
from datetime import datetime, timedelta
import random

logger = logging.getLogger(__name__)


class BotSignature:
    def __init__(self):
        self.patterns = [
            # Common bot user agents
            (r"googlebot", 100, "GoogleBot"),
            (r"bingbot", 100, "BingBot"),
            (r"slurp", 100, "YahooSlurp"),
            (r"duckduckbot", 100, "DuckDuckBot"),
            (r"baiduspider", 100, "BaiduSpider"),
            (r"yandexbot", 100, "YandexBot"),
            (r"facebookexternalhit", 100, "FacebookBot"),
            (r"twitterbot", 100, "TwitterBot"),
            (r"linkedinbot", 100, "LinkedInBot"),
            (r"applebot", 100, "AppleBot"),
            (r"python-requests", 70, "PythonBot"),
            (r"curl", 70, "cURL"),
            (r"wget", 70, "Wget"),
            (r"httpie", 60, "HTTPie"),
            (r"go-http-client", 60, "GoBot"),
            (r"okhttp", 60, "OkHttp"),
            (r"unirest", 60, "Unirest"),
            (r"node-fetch", 60, "NodeFetch"),
            (r"axios", 60, "Axios"),
            # Scraping tools
            (r"scrapy", 90, "Scrapy"),
            (r"beautifulsoup", 90, "BeautifulSoup"),
            (r"selenium", 70, "Selenium"),
            (r"playwright", 70, "Playwright"),
            (r"puppeteer", 70, "Puppeteer"),
            # Attack tools
            (r"sqlmap", 100, "SQLMap"),
            (r"nikto", 100, "Nikto"),
            (r"nmap", 100, "Nmap"),
            (r"masscan", 100, "Masscan"),
            (r"hydra", 100, "Hydra"),
            (r"burp", 100, "BurpSuite"),
            (r"zap", 100, "OWASPZAP"),
        ]

        # Known malicious patterns
        self.malicious_patterns = [
            (r"sqlmap", "SQL Injection Scanner"),
            (r"nikto", "Web Vulnerability Scanner"),
            (r"dirb", "Directory Scanner"),
            (r"gobuster", "Directory Scanner"),
            (r"wfuzz", "Fuzzing Tool"),
        ]

    def identify(self, user_agent: str) -> tuple[str, int]:
        if not user_agent:
            return "Unknown", 0

        user_agent_lower = user_agent.lower()

        for pattern, score, name in self.patterns:
            if re.search(pattern, user_agent_lower):
                return name, score

        return "Unknown", 0


class BotDetector:
    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.signature = BotSignature()
        self.headless_patterns = [
            r"HeadlessChrome",
            r"HeadlessFirefox",
            r"PhantomJS",
        ]
        self.automation_patterns = [
            r"__puppeteer_",
            r"__selenium_",
            r"webdriver",
        ]

    def detect(
        self,
        user_agent: str,
        headers: Dict,
        client_ip: str
    ) -> tuple[bool, str, int]:
        if not user_agent:
            return True, "No User-Agent", 100

        name, signature_score = self.signature.identify(user_agent)
        if signature_score >= 100:
            return True, name, signature_score

        # Check for headless browser
        for pattern in self.headless_patterns:
            if re.search(pattern, user_agent, re.IGNORECASE):
                return True, "Headless Browser", 80

        # Check for automation tools
        for pattern in self.automation_patterns:
            if re.search(pattern, user_agent, re.IGNORECASE):
                return True, "Automation Tool", 90

        # Check headers for automation
        if self._check_automation_headers(headers):
            return True, "Automation Detected", 85

        return False, name, signature_score

    def _check_automation_headers(self, headers: Dict) -> bool:
        automation_headers = [
            'X-Keep-Alive',
            'X-Seed-Hash',
            'X-Webdrive',
            '__webdriver',
            '__client__',
        ]

        for header in automation_headers:
            if header in headers:
                return True

        return False


class Honeypot:
    def __init__(self):
        self.honeypot_paths = [
            "/admin.php",
            "/administrator",
            "/wp-admin",
            "/phpmyadmin",
            "/.git/config",
            "/.env",
            "/server-status",
            "/cgi-bin/test",
            "/api/internal",
            "/__debug",
        ]

        self.fingerprint_cookies = ["honeypot_token", "bot_trap", "csrf_token"]

    def check_honeypot(self, path: str) -> Optional[str]:
        for honey_path in self.honeypot_paths:
            if honey_path in path.lower():
                return honey_path
        return None

    def check_cookie(self, cookies: Dict) -> Optional[str]:
        for cookie_name in self.fingerprint_cookies:
            if cookie_name in cookies:
                return cookie_name
        return None


class TorDetector:
    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.tor_exit_nodes: Set[str] = set()

    async def check_tor(self, ip: str) -> tuple[bool, float]:
        if self.redis:
            try:
                is_tor = await self.redis.sismember("tor_exit_nodes", ip)
                return bool(is_tor), 0.9 if is_tor else 0.0
            except Exception as e:
                logger.error(f"Error checking Tor: {e}")

        return False, 0.0


class VPNDetector:
    def __init__(self):
        self.known_vpn_ips: Set[str] = set()

    def check_vpn(self, ip: str) -> tuple[bool, float]:
        # Simple check - in production would use external service
        vpn_indicators = [
            "185.220.",  # ProtonVPN
            "185.244.",  # NordVPN
            "91.132.",   # Private Internet Access
        ]

        for indicator in vpn_indicators:
            if ip.startswith(indicator):
                return True, 0.8

        return False, 0.0


class IPIntelligence:
    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.bot_detector = BotDetector(redis_client)
        self.tor_detector = TorDetector(redis_client)
        self.vpn_detector = VPNDetector()
        self.honeypot = Honeypot()

    async def analyze_ip(
        self,
        client_ip: str,
        user_agent: str,
        headers: Dict,
        path: str,
        cookies: Dict
    ) -> Dict:
        result = {
            "is_bot": False,
            "bot_name": "",
            "bot_score": 0,
            "is_tor": False,
            "is_vpn": False,
            "is_proxy": False,
            "is_datacenter": False,
            "honeypot_triggered": False,
            "risk_score": 0,
        }

        # Check for bot
        is_bot, bot_name, bot_score = self.bot_detector.detect(user_agent, headers, client_ip)
        if is_bot:
            result["is_bot"] = True
            result["bot_name"] = bot_name
            result["bot_score"] = bot_score
            result["risk_score"] += bot_score

        # Check for Tor
        is_tor, tor_confidence = await self.tor_detector.check_tor(client_ip)
        if is_tor:
            result["is_tor"] = True
            result["risk_score"] += int(tor_confidence * 50)

        # Check for VPN
        is_vpn, vpn_confidence = self.vpn_detector.check_vpn(client_ip)
        if is_vpn:
            result["is_vpn"] = True
            result["risk_score"] += int(vpn_confidence * 50)

        # Check honeypot
        honey_path = self.honeypot.check_honeypot(path)
        if honey_path:
            result["honeypot_triggered"] = True
            result["risk_score"] = 100

        honey_cookie = self.honeypot.check_cookie(cookies or {})
        if honey_cookie:
            result["honeypot_triggered"] = True
            result["risk_score"] = 100

        return result