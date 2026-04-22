import re
import json
import logging
import signal
import threading
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
import hashlib

logger = logging.getLogger(__name__)


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AttackType(str, Enum):
    SQL_INJECTION = "sqli"
    XSS = "xss"
    COMMAND_INJECTION = "cmdi"
    LFI = "lfi"
    RFI = "rfi"
    XXE = "xxe"
    SSRF = "ssrf"
    HTTP_SMUGGLING = "http_smuggling"
    PATH_TRAVERSAL = "path_traversal"
    UNKNOWN = "unknown"


class RegexTimeout(Exception):
    pass


@dataclass
class ThreatMatch:
    rule_id: int
    rule_name: str
    attack_type: AttackType
    severity: Severity
    matched_value: str
    location: str
    pattern: str
    confidence: float = 1.0


@dataclass
class WAFResult:
    blocked: bool
    threat_score: float
    attack_type: Optional[AttackType]
    severity: Optional[Severity]
    matches: List[ThreatMatch]
    block_reason: Optional[str] = None

def timeout_handler(signum, frame):
    raise RegexTimeout("Regex execution timeout")

class RegexGuard:
    DEFAULT_TIMEOUT = 2.0

    @classmethod
    def search(cls, pattern: str, text: str, flags: int = re.IGNORECASE | re.DOTALL, timeout: float = None) -> List:
        timeout = timeout or cls.DEFAULT_TIMEOUT

        if not pattern or not text:
            return []

        try:
            compiled = re.compile(pattern, flags)
            return list(re.finditer(pattern, text, flags))
        except re.error as e:
            logger.error(f"Invalid regex pattern: {e}")
            return []
        except RegexTimeout:
            logger.warning(f"Regex timeout for pattern: {pattern}")
            return []

class BaseDetector:
    def __init__(self, attack_type: AttackType = AttackType.UNKNOWN):
        self.name = self.__class__.__name__
        self.patterns: List[Tuple[str, str, Severity]] = []
        self.attack_type = attack_type

    def detect(self, value: str, location: str = "unknown") -> List[ThreatMatch]:
        matches = []
        for pattern, rule_name, severity in self.patterns:
            try:
                for match in RegexGuard.search(pattern, value):
                    matches.append(ThreatMatch(
                        rule_id=0,
                        rule_name=rule_name,
                        attack_type=self.attack_type,
                        severity=severity,
                        matched_value=match.group(0)[:200],
                        location=location,
                        pattern=pattern
                    ))
            except RegexTimeout:
                logger.error(f"Regex timeout in {self.name} for pattern: {pattern}")
            except re.error as e:
                logger.error(f"Invalid regex pattern in {self.name}: {e}")
        return matches


class SQLInjectionDetector(BaseDetector):
    def __init__(self):
        super().__init__(AttackType.SQL_INJECTION)
        self.patterns = [
            # Classic SQL Injection
            (r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION)\b)", "SQL Injection - Keyword", Severity.HIGH),
            (r"(--|;|/\*|\*/|@@)", "SQL Injection - Comment/Separator", Severity.MEDIUM),
            (r"(\bOR\b.*\b=\b|\bAND\b.*\b=\b)", "SQL Injection - Boolean", Severity.HIGH),
            (r"(\bUNION\s+ALL\s+SELECT\b)", "SQL Injection - UNION", Severity.CRITICAL),
            (r"('\s*(OR|AND)\s*['\"]?\d)", "SQL Injection - Tautology", Severity.CRITICAL),
            (r"('\s*(OR|AND)\s*['\"]?\w+)", "SQL Injection - Tautology", Severity.HIGH),
            (r"(EXEC\s*\(|EXECUTE\s*\()", "SQL Injection - Stored Procedure", Severity.CRITICAL),
            (r"(WAITFOR\s+DELAY|pg_sleep|BENCHMARK)", "SQL Injection - Time-based", Severity.HIGH),
            (r"(LOAD_FILE|INTO\s+(OUT|DUMP)FILE)", "SQL Injection - File Operation", Severity.CRITICAL),
            (r"(0x[0-9a-fA-F]+)", "SQL Injection - Hex Encoding", Severity.MEDIUM),
            (r"CHAR\s*\(\d+\)", "SQL Injection - Char Encoding", Severity.MEDIUM),
            # Error-based
            (r"(SQL\s*syntax|mysql_fetch|ORA-\d+|Microsoft SQL)", "SQL Injection - Error Message", Severity.MEDIUM),
            # Boolean-based blind
            (r"(\bSLEEP\s*\(\s*\d+\s*\))", "SQL Injection - Sleep", Severity.HIGH),
            # Advanced bypass techniques
            (r"(\/\*!\d{5}.*?\*\/)", "SQL Injection - MySQL Comment", Severity.HIGH),
            (r"(\bIF\s*\([^)]+\))", "SQL Injection - IF Statement", Severity.MEDIUM),
        ]


class XSSDetector(BaseDetector):
    def __init__(self):
        super().__init__(AttackType.XSS)
        self.patterns = [
            # Script tags
            (r"<script[^>]*>.*?</script>", "XSS - Script Tag", Severity.CRITICAL),
            (r"<script[^>]*>", "XSS - Script Tag Open", Severity.HIGH),
            (r"javascript:", "XSS - JavaScript Protocol", Severity.CRITICAL),
            (r"on\w+\s*=", "XSS - Event Handler", Severity.HIGH),
            # DOM-based XSS
            (r"(eval|setTimeout|setInterval)\s*\(", "XSS - Dangerous Function", Severity.HIGH),
            (r"innerHTML\s*=|outerHTML\s*=", "XSS - DOM Manipulation", Severity.HIGH),
            (r"document\.cookie|document\.location|document\.URL", "XSS - Document Access", Severity.MEDIUM),
            # Encoding bypasses
            (r"<img[^>]*src\s*=\s*[\"']?x", "XSS - IMG Onerror", Severity.CRITICAL),
            (r"<svg[^>]*onload[^>]*>", "XSS - SVG Onload", Severity.CRITICAL),
            (r"<body[^>]*onload[^>]*>", "XSS - Body Onload", Severity.CRITICAL),
            (r"<iframe[^>]*src[^>]*>", "XSS - Iframe", Severity.HIGH),
            (r"data:text/html", "XSS - Data URI", Severity.HIGH),
            # Flash and other vectors
            (r"<embed[^>]*>|<object[^>]*>", "XSS - Object/Embed", Severity.HIGH),
            (r"<applet[^>]*>|<meta[^>]*http-equiv", "XSS - Applet/Meta", Severity.MEDIUM),
            # Base64 encoded
            (r"data:text/html;base64", "XSS - Base64 Data URI", Severity.HIGH),
        ]


class CommandInjectionDetector(BaseDetector):
    def __init__(self):
        super().__init__(AttackType.COMMAND_INJECTION)
        self.patterns = [
            # Command separators
            (r"[;&|`$]", "Command Injection - Separator", Severity.HIGH),
            # Dangerous commands
            (r"\b(cat|ls|dir|rm|del|mkdir|rmdir|touch|chmod|chown)\b.*", "Command Injection - File Operation", Severity.HIGH),
            (r"\b(wget|curl|ftp|tftp)\b.*", "Command Injection - Network", Severity.HIGH),
            (r"\b(nc|netcat|telnet|ssh|scp)\b.*", "Command Injection - Remote", Severity.CRITICAL),
            (r"\b(bash|sh|cmd|powershell|python|perl|ruby)\b.*", "Command Injection - Interpreter", Severity.CRITICAL),
            # Environment variables
            (r"\$\{?\w+\}?", "Command Injection - Variable", Severity.MEDIUM),
            (r"%COMSPEC%", "Command Injection - Windows Variable", Severity.HIGH),
            # Special characters
            (r"\|\s*\w+", "Command Injection - Pipe", Severity.HIGH),
            (r">\s*\/dev\/null", "Command Injection - Redirect", Severity.MEDIUM),
            (r"2>&1", "Command Injection - Redirect stderr", Severity.MEDIUM),
            # Subshell
            (r"\(\s*.*\s*\)", "Command Injection - Subshell", Severity.HIGH),
        ]


class LFI_RFIDetector(BaseDetector):
    def __init__(self):
        super().__init__(AttackType.LFI) # Can be LFI or RFI, using LFI as base
        self.patterns = [
            # Path traversal
            (r"\.\.[\/\\]", "LFI - Path Traversal", Severity.HIGH),
            (r"\.\.%2[fF]", "LFI - URL Encoded Traversal", Severity.HIGH),
            (r"%2e%2e%2f", "LFI - Double Encoded", Severity.HIGH),
            (r"\.\./", "LFI - Parent Directory", Severity.MEDIUM),
            (r"etc\/passwd", "LFI - /etc/passwd", Severity.CRITICAL),
            (r"etc\/shadow", "LFI - /etc/shadow", Severity.CRITICAL),
            (r"windows\/system32", "LFI - Windows System", Severity.HIGH),
            (r"\/proc\/self", "LFI - ProcFS", Severity.HIGH),
            (r"\/proc\/environ", "LFI - Proc Environment", Severity.HIGH),
            (r"\/etc\/hostname", "LFI - Hostname", Severity.MEDIUM),
            (r"\/var\/log", "LFI - Log Files", Severity.HIGH),
            # Null byte bypass
            (r"%00", "LFI - Null Byte", Severity.MEDIUM),
            # Wrapper protocols
            (r"php:\/\/filter", "LFI - PHP Filter", Severity.HIGH),
            (r"expect:\/\/", "LFI - Expect Wrapper", Severity.CRITICAL),
            (r"data:\/\/", "LFI - Data Wrapper", Severity.HIGH),
            # Remote File Inclusion patterns
            (r"http(s)?:\/\/[^\s<>\"']+", "RFI - HTTP URL", Severity.HIGH),
            (r"ftp:\/\/[^\s<>\"']+", "RFI - FTP URL", Severity.HIGH),
            (r"php:\/\/input", "RFI - PHP Input", Severity.CRITICAL),
            (r"\?.*=http(s)?:\/\/", "RFI - URL Parameter", Severity.CRITICAL),
        ]


class XXEDetector(BaseDetector):
    def __init__(self):
        super().__init__(AttackType.XXE)
        self.patterns = [
            # XXE patterns
            (r"<!DOCTYPE[^>]*\[", "XXE - DOCTYPE", Severity.CRITICAL),
            (r"<!ENTITY", "XXE - ENTITY Declaration", Severity.CRITICAL),
            (r"<!ENTITY\s+\w+\s+SYSTEM", "XXE - External Entity", Severity.CRITICAL),
            (r"<!ENTITY\s+\w+\s+PUBLIC", "XXE - Public Entity", Severity.CRITICAL),
            (r"SYSTEM\s+[\"']file:", "XXE - File Protocol", Severity.CRITICAL),
            (r"SYSTEM\s+[\"']http:", "XXE - HTTP Protocol", Severity.CRITICAL),
            (r"xinclude", "XXE - XInclude", Severity.HIGH),
            (r"xmlns:xinclude", "XXE - XInclude Namespace", Severity.HIGH),
            (r"CDATA", "XXE - CDATA", Severity.MEDIUM),
            # Parameter entities
            (r"%\w+;", "XXE - Parameter Entity", Severity.HIGH),
        ]


class SSRFDetector(BaseDetector):
    def __init__(self):
        super().__init__(AttackType.SSRF)
        self.patterns = [
            # SSRF patterns
            (r"http(s)?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)", "SSRF - Localhost", Severity.CRITICAL),
            (r"http(s)?:\/\/169\.254\.169\.254", "SSRF - AWS Metadata", Severity.CRITICAL),
            (r"http(s)?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", "SSRF - IP Address", Severity.HIGH),
            (r"http(s)?:\/\/[a-zA-Z0-9\-\.]+\.internal", "SSRF - Internal Domain", Severity.HIGH),
            (r"http(s)?:\/\/metadata\.google", "SSRF - GCP Metadata", Severity.CRITICAL),
            (r"file:\/\/", "SSRF - File Protocol", Severity.CRITICAL),
            (r"gopher:\/\/", "SSRF - Gopher Protocol", Severity.CRITICAL),
            (r"dict:\/\/", "SSRF - Dict Protocol", Severity.HIGH),
            (r"sftp:\/\/", "SSRF - SFTP Protocol", Severity.HIGH),
            (r"ldap:\/\/", "SSRF - LDAP Protocol", Severity.HIGH),
        ]


class HTTPSmugglingDetector(BaseDetector):
    def __init__(self):
        super().__init__(AttackType.HTTP_SMUGGLING)
        self.patterns = [
            # HTTP Request Smuggling
            (r"Transfer-Encoding:\s*chunked", "HTTP Smuggling - Chunked TE", Severity.HIGH),
            (r"Content-Length:\s*\d+.*Content-Length:", "HTTP Smuggling - CL.CL", Severity.CRITICAL),
            (r"Transfer-Encoding.*chunked.*Transfer-Encoding", "HTTP Smuggling - TE.TE", Severity.CRITICAL),
            (r"Content-Length.*Transfer-Encoding", "HTTP Smuggling - CL.TE", Severity.HIGH),
            (r"Transfer-Encoding.*Content-Length", "HTTP Smuggling - TE.CL", Severity.HIGH),
            # HTTP Desync
            (r"\r\n\r\n(GET|POST|PUT|DELETE)", "HTTP Desync - Request", Severity.HIGH),
            # Hop-by-hop headers
            (r"Proxy-Connection:", "HTTP Smuggling - Proxy Connection", Severity.MEDIUM),
            (r"Keep-Alive:", "HTTP Smuggling - Keep Alive", Severity.MEDIUM),
        ]


class PathTraversalDetector(BaseDetector):
    def __init__(self):
        super().__init__(AttackType.PATH_TRAVERSAL)
        self.patterns = [
            # Path Traversal
            (r"\.\.[\/\\]", "Path Traversal", Severity.HIGH),
            (r"\.\.%2[fF]", "Path Traversal - Encoded", Severity.HIGH),
            (r"%2e%2e%2f", "Path Traversal - Double Encoded", Severity.HIGH),
            (r"%252e%252e%252f", "Path Traversal - Double Encoded v2", Severity.HIGH),
            (r"\.\.\/", "Path Traversal - Unix", Severity.MEDIUM),
            (r"\.\.\\", "Path Traversal - Windows", Severity.MEDIUM),
            (r"\.\.\.\/", "Path Traversal - Double", Severity.HIGH),
            (r"\.\.\\\.\.\\", "Path Traversal - Mixed", Severity.HIGH),
            # Unicode variations
            (r"%c0%af", "Path Traversal - Unicode", Severity.HIGH),
            (r"%c1%9c", "Path Traversal - Unicode", Severity.HIGH),
        ]


class WAFEngine:
    def __init__(self, db_session=None, redis_client=None):
        self.db = db_session
        self.redis = redis_client
        self.sql_detector = SQLInjectionDetector()
        self.xss_detector = XSSDetector()
        self.cmd_detector = CommandInjectionDetector()
        self.lfi_rfi_detector = LFI_RFIDetector()
        self.xxe_detector = XXEDetector()
        self.ssrf_detector = SSRFDetector()
        self.http_smuggling_detector = HTTPSmugglingDetector()
        self.path_traversal_detector = PathTraversalDetector()

        self.severity_weights = {
            Severity.CRITICAL: 100,
            Severity.HIGH: 75,
            Severity.MEDIUM: 50,
            Severity.LOW: 25,
            Severity.INFO: 10,
        }

    async def inspect_request(
        self,
        method: str,
        path: str,
        query_params: Dict,
        headers: Dict,
        body: Optional[str],
        client_ip: str,
        user_agent: str
    ) -> WAFResult:
        all_matches = []
        
        # Virtual Patching - Dynamic Rules from DB
        if self.db:
            from backend.models.database import WAFRule
            from sqlalchemy import select

            result = await self.db.execute(select(WAFRule).where(WAFRule.is_enabled == True))
            db_rules = result.scalars().all()

            for rule in db_rules:
                search_space = f"{path} {str(query_params)} {str(headers)} {body or ''}"
                try:
                    if RegexGuard.search(rule.pattern, search_space):
                        all_matches.append(ThreatMatch(
                            rule_id=rule.id,
                            rule_name=f"Virtual Patch: {rule.name}",
                            attack_type=AttackType.UNKNOWN,
                            severity=Severity(rule.severity),
                            matched_value="Dynamic Match",
                            location="any",
                            pattern=rule.pattern
                        ))
                except RegexTimeout:
                    logger.error(f"Virtual patch regex timeout: {rule.pattern}")
                except Exception as e:
                    logger.error(f"Virtual patch error: {e}")

        threat_score = 0.0
        primary_attack_type = None
        primary_severity = None

        # Check query parameters
        for key, value in query_params.items():
            if value:
                value_str = str(value)
                all_matches.extend(self._check_value(value_str, f"query:{key}"))

        # Check body
        if body:
            body_str = body.decode('utf-8', errors='ignore') if isinstance(body, bytes) else str(body)
            all_matches.extend(self._check_value(body_str, "body"))

        # Check headers (important ones)
        important_headers = ['User-Agent', 'Referer', 'Cookie', 'Authorization', 'X-Forwarded-For']
        for header in important_headers:
            if header in headers:
                all_matches.extend(self._check_value(str(headers[header]), f"header:{header}"))

        # Check path
        all_matches.extend(self._check_value(path, "path"))

        # Calculate threat score
        if all_matches:
            for match in all_matches:
                threat_score += self.severity_weights.get(match.severity, 0) * match.confidence

            # Get highest severity
            max_severity_match = max(all_matches, key=lambda m: self.severity_weights[m.severity])
            primary_severity = max_severity_match.severity
            primary_attack_type = max_severity_match.attack_type

            # Cap threat score at 100
            threat_score = min(threat_score, 100)

        blocked = threat_score >= 50
        block_reason = f"Threat score {threat_score:.1f} exceeded threshold" if blocked else None

        return WAFResult(
            blocked=blocked,
            threat_score=threat_score,
            attack_type=primary_attack_type,
            severity=primary_severity,
            matches=all_matches,
            block_reason=block_reason
        )

    def _check_value(self, value: str, location: str) -> List[ThreatMatch]:
        matches = []

        # SQL Injection
        matches.extend(self.sql_detector.detect(value, location))
        # XSS
        matches.extend(self.xss_detector.detect(value, location))
        # Command Injection
        matches.extend(self.cmd_detector.detect(value, location))
        # LFI/RFI
        matches.extend(self.lfi_rfi_detector.detect(value, location))
        # XXE
        matches.extend(self.xxe_detector.detect(value, location))
        # SSRF
        matches.extend(self.ssrf_detector.detect(value, location))
        # HTTP Smuggling
        matches.extend(self.http_smuggling_detector.detect(value, location))
        # Path Traversal
        matches.extend(self.path_traversal_detector.detect(value, location))

        return matches
