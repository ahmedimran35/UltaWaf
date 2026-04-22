import re
import logging
import yaml
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class RuleAction(Enum):
    BLOCK = "block"
    LOG = "log"
    ALLOW = "allow"
    REDIRECT = "redirect"
    DROP = "drop"
    CHALLENGE = "challenge"


class RuleSeverity(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class RuleType(Enum):
    SQLI = "sqli"
    XSS = "xss"
    LFI = "lfi"
    RFI = "rfi"
    CMDI = "cmdi"
    XXE = "xxe"
    SSRF = "ssrf"
    HTTP_SMUGGLING = "http_smuggling"
    PATH_TRAVERSAL = "path_traversal"
    DOS = "dos"
    SCANNER = "scanner"
    PROTOCOL = "protocol"
    CUSTOM = "custom"


@dataclass
class OWASPRule:
    id: str
    name: str
    description: str
    rule_type: RuleType
    pattern: str
    pattern_type: str = "regex"
    severity: RuleSeverity = RuleSeverity.MEDIUM
    action: RuleAction = RuleAction.BLOCK
    message: str = ""
    transformation: List[str] = field(default_factory=list)
    chain: bool = False
    chain_rules: List[str] = field(default_factory=list)
    score: int = 0
    tags: List[str] = field(default_factory=list)
    skip_after_match: bool = False
    ctl: Dict = field(default_factory=dict)
    meta: Dict = field(default_factory=dict)

    def __post_init__(self):
        self._compiled_pattern = None
        if self.pattern and self.pattern_type == "regex":
            try:
                self._compiled_pattern = re.compile(self.pattern, re.IGNORECASE | re.DOTALL)
            except re.error as e:
                logger.error(f"Invalid regex in rule {self.id}: {e}")

    def match(self, value: str) -> Optional[Dict]:
        if not self._compiled_pattern:
            return None

        match = self._compiled_pattern.search(value)
        if match:
            return {
                "rule_id": self.id,
                "rule_name": self.name,
                "matched": match.group(0)[:200],
                "matched_value": match.group(0)[:200],
                "severity": self.severity.value,
                "action": self.action.value,
                "message": self.message or self.name,
                "score": self.score,
                "tags": self.tags,
            }
        return None


class OWASPCRSCategories:
    REQUEST_901 = "Initialization"
    REQUEST_905 = "Common Exceptions"
    REQUEST_910 = "IP Reputation"
    REQUEST_911 = "Method Enforcement"
    REQUEST_912 = "DoS Protection"
    REQUEST_913 = "Scanner Detection"
    REQUEST_920 = "Protocol Enforcement"
    REQUEST_921 = "Protocol Attack"
    REQUEST_930 = "LFI Attack"
    REQUEST_931 = "RFI Attack"
    REQUEST_932 = "RCE Attack"
    REQUEST_933 = "PHP Injection"
    REQUEST_934 = "Node.js Injection"
    REQUEST_941 = "XSS Attack"
    REQUEST_942 = "SQLi Attack"
    REQUEST_943 = "Session Fixation"
    REQUEST_944 = "Java Attack"
    REQUEST_949 = "Blocking Evaluation"


class OWASPRuleEngine:
    def __init__(self):
        self.rules: Dict[str, OWASPRule] = {}
        self.rules_by_type: Dict[RuleType, List[OWASPRule]] = {}
        self.rules_by_severity: Dict[RuleSeverity, List[OWASPRule]] = {}
        self.enabled = True
        self.paranoia_level = 1
        self._load_default_rules()

    def _load_default_rules(self):
        default_rules = self._get_default_owasp_rules()
        
        for rule_data in default_rules:
            rule = self._create_rule_from_dict(rule_data)
            self.add_rule(rule)

        logger.info(f"Loaded {len(self.rules)} OWASP rules")

    def _get_default_owasp_rules(self) -> List[Dict]:
        return [
            # SQL Injection Rules (REQUEST-942)
            {
                "id": "942100",
                "name": "SQL Injection Attack",
                "description": "Detects basic SQL injection",
                "rule_type": "sqli",
                "pattern": r"\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION)\b",
                "severity": "critical",
                "action": "block",
                "message": "SQL Injection Attack Detected",
                "score": 100,
                "tags": ["OWASP_CRS", "SQLi", "REQUEST-942"]
            },
            {
                "id": "942110",
                "name": "SQL Injection - Common Attack",
                "description": "Detects common SQL injection patterns",
                "rule_type": "sqli",
                "pattern": r"(\bOR\b.*\b=\b|\bAND\b.*\b=\b|'.*('|(\%27)|\')\s*(OR|AND)\s*)",
                "severity": "critical",
                "action": "block",
                "message": "SQL Injection Attack Detected",
                "score": 100,
                "tags": ["OWASP_CRS", "SQLi", "REQUEST-942"]
            },
            {
                "id": "942190",
                "name": "SQL Injection - Blind",
                "description": "Detects time-based blind SQL injection",
                "rule_type": "sqli",
                "pattern": r"(WAITFOR\s+DELAY|pg_sleep|BENCHMARK|SLEEP\s*\(|AND\s+\d+=\d+)",
                "severity": "high",
                "action": "block",
                "message": "SQL Injection Blind Attack Detected",
                "score": 80,
                "tags": ["OWASP_CRS", "SQLi", "REQUEST-942"]
            },
            {
                "id": "942200",
                "name": "SQL Injection - UNION",
                "description": "Detects UNION-based SQL injection",
                "rule_type": "sqli",
                "pattern": r"\bUNION\s+(ALL\s+)?SELECT\b",
                "severity": "critical",
                "action": "block",
                "message": "SQL Injection UNION Attack Detected",
                "score": 100,
                "tags": ["OWASP_CRS", "SQLi", "REQUEST-942"]
            },
            # XSS Rules (REQUEST-941)
            {
                "id": "941100",
                "name": "XSS Attack",
                "description": "Detects basic XSS attacks",
                "rule_type": "xss",
                "pattern": r"<script[^>]*>.*?</script>",
                "severity": "critical",
                "action": "block",
                "message": "XSS Attack Detected",
                "score": 100,
                "tags": ["OWASP_CRS", "XSS", "REQUEST-941"]
            },
            {
                "id": "941110",
                "name": "XSS - Event Handler",
                "description": "Detects XSS event handlers",
                "rule_type": "xss",
                "pattern": r"\bon\w+\s*=",
                "severity": "high",
                "action": "block",
                "message": "XSS Event Handler Detected",
                "score": 85,
                "tags": ["OWASP_CRS", "XSS", "REQUEST-941"]
            },
            {
                "id": "941130",
                "name": "XSS - JavaScript URI",
                "description": "Detects javascript: URI XSS",
                "rule_type": "xss",
                "pattern": r"javascript:",
                "severity": "critical",
                "action": "block",
                "message": "XSS JavaScript URI Detected",
                "score": 100,
                "tags": ["OWASP_CRS", "XSS", "REQUEST-941"]
            },
            {
                "id": "941160",
                "name": "XSS - ng/on",
                "description": "Detects Angular/AngularJS XSS",
                "rule_type": "xss",
                "pattern": r"\bng-(on|bind|init|nonbind)|on\w+:",
                "severity": "high",
                "action": "block",
                "message": "Angular XSS Detected",
                "score": 85,
                "tags": ["OWASP_CRS", "XSS", "REQUEST-941"]
            },
            # Command Injection Rules (REQUEST-932)
            {
                "id": "932100",
                "name": "Command Injection",
                "description": "Detects command injection attempts",
                "rule_type": "cmdi",
                "pattern": r"[;&|`$]",
                "severity": "high",
                "action": "block",
                "message": "Command Injection Detected",
                "score": 80,
                "tags": ["OWASP_CRS", "RCE", "REQUEST-932"]
            },
            {
                "id": "932105",
                "name": "Command Injection - Unix",
                "description": "Detects Unix command execution",
                "rule_type": "cmdi",
                "pattern": r"\b(cat|ls|dir|rm|del|mkdir|wget|curl|nc|netcat)\b",
                "severity": "high",
                "action": "block",
                "message": "Unix Command Execution Detected",
                "score": 85,
                "tags": ["OWASP_CRS", "RCE", "REQUEST-932"]
            },
            {
                "id": "932130",
                "name": "Command Injection - Windows",
                "description": "Detects Windows command execution",
                "rule_type": "cmdi",
                "pattern": r"\b(cmd|powershell|net|attrib|reg|type)\b",
                "severity": "high",
                "action": "block",
                "message": "Windows Command Execution Detected",
                "score": 85,
                "tags": ["OWASP_CRS", "RCE", "REQUEST-932"]
            },
            # LFI Rules (REQUEST-930)
            {
                "id": "930100",
                "name": "Path Traversal",
                "description": "Detects path traversal attempts",
                "rule_type": "lfi",
                "pattern": r"\.\.[\/\\]",
                "severity": "high",
                "action": "block",
                "message": "Path Traversal Attack Detected",
                "score": 80,
                "tags": ["OWASP_CRS", "LFI", "REQUEST-930"]
            },
            {
                "id": "930110",
                "name": "Path Traversal - Sensitive Files",
                "description": "Detects access to sensitive files",
                "rule_type": "lfi",
                "pattern": r"(etc/passwd|etc/shadow|windows/system32|proc/self)",
                "severity": "critical",
                "action": "block",
                "message": "Sensitive File Access Detected",
                "score": 100,
                "tags": ["OWASP_CRS", "LFI", "REQUEST-930"]
            },
            # RFI Rules (REQUEST-931)
            {
                "id": "931100",
                "name": "RFI Attack",
                "description": "Detects remote file inclusion",
                "rule_type": "rfi",
                "pattern": r"(https?|ftp)://[^\s<>\"']+",
                "severity": "high",
                "action": "block",
                "message": "RFI Attack Detected",
                "score": 85,
                "tags": ["OWASP_CRS", "RFI", "REQUEST-931"]
            },
            # SSRF Rules
            {
                "id": "934100",
                "name": "SSRF - Localhost",
                "description": "Detects localhost access attempts",
                "rule_type": "ssrf",
                "pattern": r"(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)",
                "severity": "critical",
                "action": "block",
                "message": "SSRF Localhost Access Detected",
                "score": 100,
                "tags": ["OWASP_CRS", "SSRF"]
            },
            {
                "id": "934110",
                "name": "SSRF - Cloud Metadata",
                "description": "Detects cloud metadata service access",
                "rule_type": "ssrf",
                "pattern": r"169\.254\.169\.254",
                "severity": "critical",
                "action": "block",
                "message": "Cloud Metadata Access Detected",
                "score": 100,
                "tags": ["OWASP_CRS", "SSRF"]
            },
            # XXE Rules
            {
                "id": "944100",
                "name": "XXE Attack",
                "description": "Detects XML external entity attacks",
                "rule_type": "xxe",
                "pattern": r"(<!DOCTYPE|<!ENTITY|<!ENTITY\s+\w+\s+SYSTEM)",
                "severity": "critical",
                "action": "block",
                "message": "XXE Attack Detected",
                "score": 100,
                "tags": ["OWASP_CRS", "XXE"]
            },
            # HTTP Smuggling
            {
                "id": "920100",
                "name": "HTTP Request Smuggling",
                "description": "Detects HTTP request smuggling",
                "rule_type": "http_smuggling",
                "pattern": r"(Content-Length:\s*\d+.*Content-Length:|Transfer-Encoding.*chunked.*Transfer-Encoding)",
                "severity": "high",
                "action": "block",
                "message": "HTTP Request Smuggling Detected",
                "score": 85,
                "tags": ["OWASP_CRS", "HTTP_SMUGGLING"]
            },
            # Scanner Detection (REQUEST-913)
            {
                "id": "913100",
                "name": "Scanner Detection - SQLMap",
                "description": "Detects SQLMap scanner",
                "rule_type": "scanner",
                "pattern": r"sqlmap",
                "severity": "medium",
                "action": "block",
                "message": "SQLMap Scanner Detected",
                "score": 60,
                "tags": ["OWASP_CRS", "SCANNER", "REQUEST-913"]
            },
            {
                "id": "913110",
                "name": "Scanner Detection - Nikto",
                "description": "Detects Nikto scanner",
                "rule_type": "scanner",
                "pattern": r"(nikto|nikto\.pl)",
                "severity": "medium",
                "action": "block",
                "message": "Nikto Scanner Detected",
                "score": 60,
                "tags": ["OWASP_CRS", "SCANNER", "REQUEST-913"]
            },
            {
                "id": "913120",
                "name": "Scanner Detection - General",
                "description": "Detects common scanning tools",
                "rule_type": "scanner",
                "pattern": r"(nmap|masscan|gobuster|dirb|wfuzz)",
                "severity": "medium",
                "action": "log",
                "message": "Scanner Detected",
                "score": 50,
                "tags": ["OWASP_CRS", "SCANNER", "REQUEST-913"]
            },
        ]

    def _create_rule_from_dict(self, rule_data: Dict) -> OWASPRule:
        return OWASPRule(
            id=rule_data.get("id", ""),
            name=rule_data.get("name", ""),
            description=rule_data.get("description", ""),
            rule_type=RuleType(rule_data.get("rule_type", "custom")),
            pattern=rule_data.get("pattern", ""),
            pattern_type=rule_data.get("pattern_type", "regex"),
            severity=RuleSeverity(rule_data.get("severity", "medium")),
            action=RuleAction(rule_data.get("action", "block")),
            message=rule_data.get("message", ""),
            score=rule_data.get("score", 0),
            tags=rule_data.get("tags", []),
            transformation=rule_data.get("transformation", []),
        )

    def add_rule(self, rule: OWASPRule):
        self.rules[rule.id] = rule

        if rule.rule_type not in self.rules_by_type:
            self.rules_by_type[rule.rule_type] = []
        self.rules_by_type[rule.rule_type].append(rule)

        if rule.severity not in self.rules_by_severity:
            self.rules_by_severity[rule.severity] = []
        self.rules_by_severity[rule.severity].append(rule)

    def remove_rule(self, rule_id: str) -> bool:
        if rule_id not in self.rules:
            return False

        rule = self.rules[rule_id]
        self.rules_by_type[rule.rule_type].remove(rule)
        self.rules_by_severity[rule.severity].remove(rule)
        del self.rules[rule_id]
        return True

    def evaluate(self, request_data: Dict) -> Dict[str, Any]:
        if not self.enabled:
            return {"blocked": False, "matches": [], "score": 0}

        matches = []
        total_score = 0
        matched_rules = set()

        url = request_data.get("path", "")
        query = request_data.get("query", "")
        body = request_data.get("body", "")
        headers = request_data.get("headers", {})

        for key, value in request_data.items():
            if isinstance(value, str) and value:
                for rule_id, rule in self.rules.items():
                    if rule_id in matched_rules:
                        continue

                    match = rule.match(value)
                    if match:
                        matches.append(match)
                        matched_rules.add(rule_id)
                        total_score += rule.score

        blocked = total_score >= (100 - (self.paranoia_level * 10))

        return {
            "blocked": blocked,
            "matches": matches,
            "score": total_score,
            "severity": self._get_severity_from_score(total_score),
            "action": "block" if blocked else "allow"
        }

    def _get_severity_from_score(self, score: int) -> str:
        if score >= 100:
            return "critical"
        elif score >= 75:
            return "high"
        elif score >= 50:
            return "medium"
        elif score >= 25:
            return "low"
        return "info"

    def get_rules_by_type(self, rule_type: RuleType) -> List[OWASPRule]:
        return self.rules_by_type.get(rule_type, [])

    def get_rules_by_severity(self, severity: RuleSeverity) -> List[OWASPRule]:
        return self.rules_by_severity.get(severity, [])

    def import_rules_from_yaml(self, yaml_path: str) -> int:
        try:
            with open(yaml_path, 'r') as f:
                rules_data = yaml.safe_load(f)

            count = 0
            for rule_data in rules_data.get("rules", []):
                rule = self._create_rule_from_dict(rule_data)
                self.add_rule(rule)
                count += 1

            logger.info(f"Imported {count} rules from {yaml_path}")
            return count

        except Exception as e:
            logger.error(f"Error importing rules: {e}")
            return 0


rule_engine = OWASPRuleEngine()