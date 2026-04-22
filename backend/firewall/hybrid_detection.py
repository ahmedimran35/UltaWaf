import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from dataclasses import dataclass, field

from .ml_features import extract_request_features, FeatureExtractor
from .ml_models import ensemble_model, ml_pipeline
from .owasp_rules import rule_engine, OWASPRuleEngine
from ..config import settings

logger = logging.getLogger(__name__)


@dataclass
class DetectionResult:
    blocked: bool = False
    threat_score: float = 0.0
    attack_type: Optional[str] = None
    severity: str = "info"
    confidence: float = 0.0
    matches: List[Dict] = field(default_factory=list)
    block_reason: str = ""
    layers_passed: List[str] = field(default_factory=list)
    layer_details: Dict[str, Any] = field(default_factory=dict)


class HybridDetectionEngine:
    def __init__(self):
        self.enabled = True
        self.ml_enabled = settings.ML_ENABLED
        self.rule_engine = rule_engine
        self.ml_engine = ensemble_model
        self.feature_extractor = FeatureExtractor()
        
        self.layer_config = {
            "signature": {"enabled": True, "timeout_ms": 1},
            "rule": {"enabled": True, "timeout_ms": 2},
            "ml": {"enabled": self.ml_enabled, "timeout_ms": 10},
            "ai": {"enabled": False, "timeout_ms": 5000},
        }

    async def analyze(
        self,
        request_data: Dict,
        ip_data: Optional[Dict] = None,
        skip_layers: Optional[List[str]] = None
    ) -> DetectionResult:
        if not self.enabled:
            return DetectionResult()

        skip_layers = skip_layers or []
        result = DetectionResult()

        features = self.feature_extractor.extract_features(request_data, ip_data)
        result.layer_details["features"] = {
            "url_length": features[0],
            "url_entropy": features[1],
            "sql_keywords": features[16],
            "xss_patterns": features[17],
        }

        layer_tasks = []

        if "signature" not in skip_layers and self.layer_config["signature"]["enabled"]:
            layer_tasks.append(self._detect_signatures(request_data))

        if "rule" not in skip_layers and self.layer_config["rule"]["enabled"]:
            layer_tasks.append(self._detect_rules(request_data))

        if "ml" not in skip_layers and self.layer_config["ml"]["enabled"]:
            layer_tasks.append(self._detect_ml(request_data, features))

        if "ai" not in skip_layers and self.layer_config["ai"]["enabled"]:
            layer_tasks.append(self._detect_ai(request_data))

        layer_results = await asyncio.gather(*layer_tasks, return_exceptions=True)

        total_score = 0
        for i, layer_result in enumerate(layer_results):
            if isinstance(layer_result, Exception):
                logger.error(f"Layer error: {layer_result}")
                continue

            if layer_result:
                if "signature" not in skip_layers and i == 0:
                    result.layer_details["signature"] = layer_result
                    if layer_result.get("detected"):
                        result.layers_passed.append("signature")
                        total_score += layer_result.get("score", 30)
                        result.matches.extend(layer_result.get("matches", []))

                elif "rule" not in skip_layers and i == 1:
                    result.layer_details["rule"] = layer_result
                    if layer_result.get("blocked"):
                        result.layers_passed.append("rule")
                        total_score += layer_result.get("score", 50)
                        result.matches.extend(layer_result.get("matches", []))

                elif "ml" not in skip_layers and i == 2:
                    result.layer_details["ml"] = layer_result
                    if layer_result.get("detected"):
                        result.layers_passed.append("ml")
                        total_score += layer_result.get("score", 40)

                elif "ai" not in skip_layers and i == 3:
                    result.layer_details["ai"] = layer_result
                    if layer_result.get("detected"):
                        result.layers_passed.append("ai")
                        total_score += layer_result.get("score", 60)
                        result.matches.extend(layer_result.get("matches", []))

        result.threat_score = min(100, total_score)
        
        if result.threat_score >= 80:
            result.blocked = True
            result.severity = "critical"
            result.block_reason = "High threat score detected"
        elif result.threat_score >= 60:
            result.blocked = True
            result.severity = "high"
            result.block_reason = "Elevated threat detected"
        elif result.threat_score >= 40:
            result.severity = "medium"
        elif result.threat_score >= 20:
            result.severity = "low"
        else:
            result.severity = "info"

        if result.matches:
            match = result.matches[0]
            result.attack_type = match.get("attack_type") or match.get("rule_type", "unknown")

        result.confidence = min(100, result.threat_score + 10)

        return result

    async def _detect_signatures(self, request_data: Dict) -> Dict:
        try:
            matches = []
            detected = False
            score = 0

            url = request_data.get("path", "")
            query = request_data.get("query", "")
            body = request_data.get("body", "")
            
            sql_patterns = [
                (r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)", "SQLi", 30),
                (r"(<script|javascript:|on\w+\s*=)", "XSS", 25),
                (r"(\.\.[\/\\]|etc/passwd)", "LFI", 25),
                (r"(;|\||`|\$)", "CMDi", 20),
            ]

            for pattern, attack_type, s in sql_patterns:
                import re
                if re.search(pattern, f"{url} {query} {body}", re.IGNORECASE):
                    detected = True
                    score = max(score, s)
                    matches.append({
                        "attack_type": attack_type,
                        "layer": "signature",
                        "score": s
                    })

            return {
                "detected": detected,
                "score": score,
                "matches": matches
            }
        except Exception as e:
            logger.error(f"Signature detection error: {e}")
            return {"detected": False, "score": 0, "matches": []}

    async def _detect_rules(self, request_data: Dict) -> Dict:
        try:
            result = self.rule_engine.evaluate(request_data)
            return result
        except Exception as e:
            logger.error(f"Rule detection error: {e}")
            return {"blocked": False, "score": 0, "matches": []}

    async def _detect_ml(self, request_data: Dict, features: List) -> Dict:
        try:
            import numpy as np
            
            if not self.ml_engine.is_trained:
                return {"detected": False, "score": 0}

            X = np.array([features])
            ml_result = await self.ml_engine.predict(X)

            return {
                "detected": ml_result.get("final_decision") in ["block", "challenge"],
                "score": ml_result.get("ensemble_score", 0) * 100,
                "details": ml_result
            }
        except Exception as e:
            logger.error(f"ML detection error: {e}")
            return {"detected": False, "score": 0}

    async def _detect_ai(self, request_data: Dict) -> Dict:
        try:
            from ..api.ai import get_active_provider
            from ..firewall.ai_client import UniversalAIClient, get_encryption_key, EncryptionHelper
            from ..models.database import async_session
            from sqlalchemy import select
            from ..models.database import AIProvider

            async with async_session() as session:
                result = await session.execute(
                    select(AIProvider).where(AIProvider.is_active == True)
                )
                provider = result.scalar_one_or_none()

                if not provider:
                    return {"detected": False, "score": 0}

                encryption_key = get_encryption_key()
                api_key = EncryptionHelper.decrypt(provider.api_key_encrypted, encryption_key)

                client = UniversalAIClient(
                    provider=provider.name,
                    api_key=api_key,
                    base_url=provider.base_url,
                    model=provider.selected_model,
                )

                ai_result = await client.analyze_threat(request_data)
                await client.close()

                return {
                    "detected": ai_result.get("is_threat", False),
                    "score": ai_result.get("confidence", 0),
                    "matches": [{
                        "attack_type": ai_result.get("threat_type"),
                        "explanation": ai_result.get("explanation"),
                        "recommendation": ai_result.get("recommendation")
                    }]
                }

        except Exception as e:
            logger.error(f"AI detection error: {e}")
            return {"detected": False, "score": 0}

    def get_status(self) -> Dict:
        return {
            "enabled": self.enabled,
            "layers": {
                "signature": self.layer_config["signature"]["enabled"],
                "rule": self.layer_config["rule"]["enabled"],
                "ml": self.layer_config["ml"]["enabled"],
                "ai": self.layer_config["ai"]["enabled"],
            },
            "ml_trained": self.ml_engine.is_trained,
            "rules_count": len(self.rule_engine.rules),
        }


detection_engine = HybridDetectionEngine()