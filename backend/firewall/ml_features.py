import re
import math
import hashlib
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from collections import Counter

logger = logging.getLogger(__name__)


class FeatureExtractor:
    def __init__(self):
        self.sql_keywords = [
            'select', 'insert', 'update', 'delete', 'drop', 'create', 'alter',
            'exec', 'execute', 'union', 'where', 'from', 'table', 'database'
        ]
        self.xss_patterns = [
            '<script', 'javascript:', 'onerror', 'onload', 'innerhtml',
            'eval(', 'document.cookie', 'alert(', 'src='
        ]
        self.path_keywords = [
            '../', '..\\', '/etc/passwd', '/etc/shadow',
            'windows/system32', 'proc/self'
        ]
        self.dangerous_funcs = [
            'system(', 'exec(', 'shell_exec', 'passthru',
            'proc_open', 'popen', 'curl_exec'
        ]

    def extract_features(self, request_data: Dict, ip_data: Optional[Dict] = None) -> List[float]:
        features = []
        
        url = request_data.get('path', '')
        query = request_data.get('query', '')
        body = request_data.get('body', '')
        headers = request_data.get('headers', {})
        method = request_data.get('method', 'GET')
        client_ip = request_data.get('client_ip', '')
        user_agent = request_data.get('user_agent', '')
        timestamp = request_data.get('timestamp', datetime.utcnow())

        features.append(len(url))
        features.append(self._entropy(url))
        features.append(self._special_char_ratio(url))
        features.append(len(query))
        features.append(self._entropy(query))
        features.append(len(body) if body else 0)
        features.append(self._entropy(body) if body else 0)
        features.append(len(headers) if headers else 0)
        features.append(self._unusual_headers_ratio(headers))
        features.append(self._method_risk(method))
        features.append(self._request_rate_score(ip_data))
        features.append(self._geo_risk_score(ip_data))
        features.append(self._ua_entropy(user_agent))
        features.append(self._hour_of_day(timestamp))
        features.append(self._reputation_score(ip_data))
        features.append(len(query.split('&')) if query else 0)
        features.append(self._sql_keyword_count(query, body))
        features.append(self._xss_pattern_count(query, body))
        features.append(self._path_traversal_count(query, body))
        features.append(self._cmd_injection_count(query, body))
        features.append(self._encoded_char_count(url, query))
        features.append(self._digit_ratio(url, query, body))
        features.append(self._upper_ratio(url))
        features.append(self._null_byte_count(body))
        features.append(self._param_count(query))
        features.append(self._base64_ratio(body))
        features.append(self._javascript_ratio(body))
        features.append(self._html_tag_count(body))
        features.append(self._json_depth(body))

        return self._normalize_features(features)

    def _normalize_features(self, features: List[float]) -> List[float]:
        normalized = []
        for i, f in enumerate(features):
            if f > 1000:
                normalized.append(math.log1p(f) / 10)
            elif f < 0:
                normalized.append(0)
            else:
                normalized.append(min(f / 100, 1))
        return normalized

    def _entropy(self, text: str) -> float:
        if not text:
            return 0.0
        counter = Counter(text)
        length = len(text)
        entropy = 0.0
        for count in counter.values():
            probability = count / length
            if probability > 0:
                entropy -= probability * math.log2(probability)
        return entropy

    def _special_char_ratio(self, text: str) -> float:
        if not text:
            return 0.0
        special = sum(1 for c in text if not c.isalnum() and not c.isspace())
        return special / max(len(text), 1)

    def _unusual_headers_ratio(self, headers: Dict) -> float:
        if not headers:
            return 0.0
        unusual = ['X-Keep-Alive', 'X-Seed-Hash', 'X-Webdrive', '__webdriver']
        return sum(1 for h in unusual if h in headers) / max(len(headers), 1)

    def _method_risk(self, method: str) -> float:
        risk = {'GET': 0.1, 'POST': 0.2, 'PUT': 0.5, 'DELETE': 0.5, 'PATCH': 0.4}
        return risk.get(method.upper(), 0.3)

    def _request_rate_score(self, ip_data: Optional[Dict]) -> float:
        if not ip_data:
            return 0.5
        rate = ip_data.get('requests_per_minute', 0)
        if rate > 100:
            return 1.0
        elif rate > 50:
            return 0.8
        elif rate > 10:
            return 0.5
        return 0.2

    def _geo_risk_score(self, ip_data: Optional[Dict]) -> float:
        if not ip_data:
            return 0.5
        high_risk_countries = ['CN', 'RU', 'IR', 'KP', 'SY']
        country = ip_data.get('country', '')
        if country in high_risk_countries:
            return 0.8
        return 0.3

    def _ua_entropy(self, user_agent: str) -> float:
        return self._entropy(user_agent)

    def _hour_of_day(self, timestamp: Any) -> float:
        if hasattr(timestamp, 'hour'):
            return timestamp.hour / 24.0
        return 0.5

    def _reputation_score(self, ip_data: Optional[Dict]) -> float:
        if not ip_data:
            return 0.5
        score = ip_data.get('reputation_score', 50)
        return 1 - (score / 100)

    def _sql_keyword_count(self, query: str, body: str) -> int:
        text = f"{query} {body}".lower()
        return sum(1 for kw in self.sql_keywords if kw in text)

    def _xss_pattern_count(self, query: str, body: str) -> int:
        text = f"{query} {body}".lower()
        return sum(1 for pattern in self.xss_patterns if pattern in text)

    def _path_traversal_count(self, query: str, body: str) -> int:
        text = f"{query} {body}"
        count = text.count('../')
        count += text.count('..\\')
        return count

    def _cmd_injection_count(self, query: str, body: str) -> int:
        separators = ['|', ';', '&', '$', '`', '()']
        text = f"{query} {body}"
        return sum(text.count(s) for s in separators)

    def _encoded_char_count(self, url: str, query: str) -> int:
        text = f"{url} {query}"
        return text.count('%')

    def _digit_ratio(self, url: str, query: str, body: str) -> float:
        text = f"{url} {query} {body}"
        if not text:
            return 0.0
        digits = sum(1 for c in text if c.isdigit())
        return digits / max(len(text), 1)

    def _upper_ratio(self, text: str) -> float:
        if not text:
            return 0.0
        upper = sum(1 for c in text if c.isupper())
        return upper / max(len(text), 1)

    def _null_byte_count(self, body: str) -> int:
        return body.count('\x00') if body else 0

    def _param_count(self, query: str) -> int:
        return len(query.split('&')) if query else 0

    def _base64_ratio(self, body: str) -> float:
        if not body:
            return 0.0
        base64_pattern = re.compile(r'^[A-Za-z0-9+/]+={0,2}$')
        words = body.split()
        matches = sum(1 for w in words if len(w) > 20 and base64_pattern.match(w))
        return matches / max(len(words), 1)

    def _javascript_ratio(self, body: str) -> float:
        if not body:
            return 0.0
        js_keywords = ['function', 'var ', 'let ', 'const ', '=>', 'async', 'await']
        text = body.lower()
        return sum(1 for kw in js_keywords if kw in text) / max(len(body), 1)

    def _html_tag_count(self, body: str) -> int:
        if not body:
            return 0
        return len(re.findall(r'<[^>]+>', body))


class FeatureImportance:
    FEATURE_NAMES = [
        'url_length', 'url_entropy', 'url_special_chars', 'query_length',
        'query_entropy', 'body_length', 'body_entropy', 'header_count',
        'unusual_headers', 'method_risk', 'request_rate', 'geo_risk',
        'ua_entropy', 'hour_of_day', 'reputation_score', 'param_count',
        'sql_keywords', 'xss_patterns', 'path_traversal', 'cmd_injection',
        'encoded_chars', 'digit_ratio', 'upper_ratio', 'null_bytes',
        'param_count_2', 'base64_ratio', 'javascript_ratio', 'html_tags'
    ]

    @staticmethod
    def get_name(index: int) -> str:
        return FeatureImportance.FEATURE_NAMES[index] if index < len(FeatureImportance.FEATURE_NAMES) else f"feature_{index}"


def extract_request_features(request_data: Dict) -> Dict[str, float]:
    extractor = FeatureExtractor()
    features = extractor.extract_features(request_data)
    return {FeatureImportance.FEATURE_NAMES[i]: features[i] for i in range(len(features))}


def calculate_risk_score(features: List[float], weights: Optional[List[float]] = None) -> float:
    if weights is None:
        weights = [1.0] * len(features)
    
    total_weight = sum(weights)
    weighted_sum = sum(f * w for f, w in zip(features, weights))
    
    return min(100, (weighted_sum / total_weight) * 100)