import logging
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import joblib
import os
import hashlib

logger = logging.getLogger(__name__)

try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler, LabelEncoder
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report, precision_score, recall_score, f1_score
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    logger.warning("scikit-learn not available, ML features disabled")


class FeatureExtractor:
    def __init__(self):
        self.feature_names = [
            "request_length",
            "query_length",
            "body_length",
            "header_count",
            "special_char_ratio",
            "digit_ratio",
            "upper_ratio",
            "lower_ratio",
            "punctuation_ratio",
            "sql_keywords",
            "xss_patterns",
            "path_traversal",
            "command_chars",
            "encoded_chars",
            "entropy",
        ]

    def extract(self, method: str, path: str, query: str, body: str, headers: Dict) -> np.ndarray:
        features = []

        # Length features
        features.append(len(path))
        features.append(len(query))
        features.append(len(body) if body else 0)
        features.append(len(headers) if headers else 0)

        # Composition features
        text = f"{path} {query} {body or ''}"
        features.append(self._count_special_chars(text))
        features.append(self._count_digits(text))
        features.append(self._count_upper(text))
        features.append(self._count_lower(text))
        features.append(self._count_punctuation(text))

        # Attack pattern features
        features.append(self._count_sql_keywords(text))
        features.append(self._count_xss_patterns(text))
        features.append(self._count_path_traversal(text))
        features.append(self._count_command_chars(text))
        features.append(self._count_encoded_chars(text))

        # Entropy
        features.append(self._calculate_entropy(text))

        return np.array(features).reshape(1, -1)

    def _count_special_chars(self, text: str) -> float:
        special = 0
        for c in text:
            if not c.isalnum() and not c.isspace():
                special += 1
        return special / max(len(text), 1)

    def _count_digits(self, text: str) -> float:
        digits = sum(1 for c in text if c.isdigit())
        return digits / max(len(text), 1)

    def _count_upper(self, text: str) -> float:
        upper = sum(1 for c in text if c.isupper())
        return upper / max(len(text), 1)

    def _count_lower(self, text: str) -> float:
        lower = sum(1 for c in text if c.islower())
        return lower / max(len(text), 1)

    def _count_punctuation(self, text: str) -> float:
        punct = sum(1 for c in text if c in '.,;:!?()[]{}\'"')
        return punct / max(len(text), 1)

    def _count_sql_keywords(self, text: str) -> int:
        keywords = ['select', 'insert', 'update', 'delete', 'drop', 'union', 'where', 'from']
        return sum(1 for kw in keywords if kw in text.lower())

    def _count_xss_patterns(self, text: str) -> int:
        patterns = ['<script', 'javascript:', 'onerror', 'onload', 'innerhtml']
        return sum(1 for p in patterns if p.lower() in text.lower())

    def _count_path_traversal(self, text: str) -> int:
        return text.count('../') + text.count('..\\')

    def _count_command_chars(self, text: str) -> int:
        return text.count('|') + text.count(';') + text.count('`')

    def _count_encoded_chars(self, text: str) -> int:
        return text.count('%')

    def _calculate_entropy(self, text: str) -> float:
        if not text:
            return 0.0
        prob = [float(text.count(c)) / len(text) for c in set(text)]
        return -sum(p * np.log2(p) for p in prob if p > 0)


class AnomalyDetector:
    def __init__(self, model_path: str = "/app/ml_models/anomaly_model.pkl"):
        self.model_path = model_path
        self.model = None
        self.scaler = None
        self.threshold = 0.75
        self.is_trained = False
        self.ml_available = ML_AVAILABLE

    def train(self, X: np.ndarray, contamination: float = 0.01) -> Dict:
        if not self.ml_available:
            return {"error": "ML not available"}

        try:
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)

            self.model = IsolationForest(
                n_estimators=100,
                contamination=contamination,
                random_state=42,
                n_jobs=-1
            )

            self.model.fit(X_scaled)
            self.is_trained = True

            # Save model
            self._save_model()

            return {
                "status": "trained",
                "samples": len(X),
                "features": X.shape[1]
            }

        except Exception as e:
            logger.error(f"Error training model: {e}")
            return {"error": str(e)}

    def predict(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        if not self.is_trained or self.model is None:
            return np.array([0]), np.array([0.0])

        try:
            X_scaled = self.scaler.transform(X)
            predictions = self.model.predict(X_scaled)
            scores = self.model.score_samples(X_scaled)

            # Convert to binary: 1 = anomaly, 0 = normal
            binary = np.where(predictions == -1, 1, 0)

            return binary, scores

        except Exception as e:
            logger.error(f"Error predicting: {e}")
            return np.array([0]), np.array([0.0])

    def predict_proba(self, X: np.ndarray) -> float:
        if not self.is_trained or self.model is None:
            return 0.0

        try:
            _, scores = self.predict(X)
            # Convert scores to probability
            probs = 1 / (1 + np.exp(-scores))
            return float(np.mean(probs))

        except Exception:
            return 0.0

    def _save_model(self):
        if not self.ml_available:
            return

        try:
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            model_data = {
                'model': self.model,
                'scaler': self.scaler,
                'threshold': self.threshold
            }
            joblib.dump(model_data, self.model_path)
            with open(f"{self.model_path}.sha256", 'w') as f:
                f.write(hashlib.sha256(open(self.model_path, 'rb').read()).hexdigest())
            logger.info(f"Model saved to {self.model_path}")
        except Exception as e:
            logger.error(f"Error saving model: {e}")

    def _verify_model_integrity(self, model_path: str) -> bool:
        try:
            sha_path = f"{model_path}.sha256"
            if not os.path.exists(sha_path):
                return False
            expected_hash = open(sha_path, 'r').read()
            actual_hash = hashlib.sha256(open(model_path, 'rb').read()).hexdigest()
            return expected_hash == actual_hash
        except Exception as e:
            logger.error(f"Model integrity check failed: {e}")
            return False

    def load_model(self) -> bool:
        if not self.ml_available:
            return False

        if not os.path.exists(self.model_path):
            return False

        if not self._verify_model_integrity(self.model_path):
            logger.error("Model integrity check failed - file may have been tampered with")
            os.rename(self.model_path, f"{self.model_path}.corrupted")
            return False

        try:
            with open(self.model_path, 'rb') as f:
                data = joblib.load(f)
                self.model = data['model']
                self.scaler = data['scaler']
                self.threshold = data['threshold']
                self.is_trained = True
            logger.info("ML model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return False


class BehavioralAnalyzer:
    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.feature_extractor = FeatureExtractor()
        self.anomaly_detector = AnomalyDetector()
        self.session_window = 3600  # 1 hour

    async def analyze(
        self,
        client_ip: str,
        method: str,
        path: str,
        query: str,
        body: str,
        headers: Dict
    ) -> Dict:
        result = {
            "is_anomaly": False,
            "anomaly_score": 0.0,
            "behavior_flags": [],
        }

        # Extract features
        features = self.feature_extractor.extract(method, path, query, body, headers)

        # Get ML prediction
        if self.anomaly_detector.is_trained:
            is_anomaly, score = self.anomaly_detector.predict(features)
            if is_anomaly[0] == 1:
                result["is_anomaly"] = True
                result["behavior_flags"].append("ML Anomaly Detection")

            # Calculate probability
            anomaly_proba = self.anomaly_detector.predict_proba(features)
            result["anomaly_score"] = anomaly_proba

        # Check for behavioral anomalies
        await self._check_behavioral_anomalies(client_ip, result)

        return result

    async def _check_behavioral_anomalies(self, client_ip: str, result: Dict):
        if not self.redis:
            return

        try:
            # Get session stats
            key = f"session:{client_ip}"
            stats = await self.redis.hgetall(key)

            if stats:
                # Check request rate
                req_count = int(stats.get('count', 0))
                if req_count > 100:
                    result["behavior_flags"].append("High Request Volume")

                # Check unique paths
                unique_paths = int(stats.get('unique_paths', 0))
                if unique_paths > 50:
                    result["behavior_flags"].append("Path Enumeration")

        except Exception as e:
            logger.error(f"Error checking behavioral anomalies: {e}")


class ThreatScorer:
    def __init__(self):
        self.weights = {
            "ml_anomaly": 25,
            "attack_signatures": 30,
            "bot_detection": 20,
            "tor_vpn": 15,
            "reputation": 10,
            "geographic": 5,
            "rate_limiting": 10,
            "behavioral": 10,
        }

    def calculate_score(
        self,
        ml_score: float,
        signature_score: float,
        bot_score: float,
        ip_reputation: int,
        geo_risk: float,
        behavioral_score: float
    ) -> Tuple[int, str]:
        score = 0
        reasons = []

        # ML anomaly
        if ml_score > 0.5:
            score += ml_score * self.weights["ml_anomaly"]
            reasons.append(f"ML Anomaly: {ml_score:.2f}")

        # Attack signatures
        if signature_score > 0:
            score += signature_score * self.weights["attack_signatures"]
            reasons.append(f"Attack Signature: {signature_score}")

        # Bot detection
        if bot_score > 50:
            score += self.weights["bot_detection"]
            reasons.append(f"Bot Detected: {bot_score}")

        # IP reputation
        reputation_score = max(0, (100 - ip_reputation) / 10)
        score += reputation_score * self.weights["reputation"]

        # Geographic risk
        score += geo_risk * self.weights["geographic"]

        # Behavioral
        if behavioral_score > 0.5:
            score += self.weights["behavioral"]
            reasons.append("Behavioral Anomaly")

        # Cap at 100
        score = min(100, int(score))

        # Determine threat level
        if score >= 75:
            threat_level = "critical"
        elif score >= 50:
            threat_level = "high"
        elif score >= 25:
            threat_level = "medium"
        elif score >= 10:
            threat_level = "low"
        else:
            threat_level = "info"

        return score, threat_level


class MLEngine:
    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.feature_extractor = FeatureExtractor()
        self.anomaly_detector = AnomalyDetector()
        self.behavioral_analyzer = BehavioralAnalyzer(redis_client)
        self.threat_scorer = ThreatScorer()
        self.enabled = ML_AVAILABLE

    async def initialize(self):
        if self.enabled:
            self.anomaly_detector.load_model()

    async def analyze_request(
        self,
        client_ip: str,
        method: str,
        path: str,
        query: str,
        body: str,
        headers: Dict,
        user_agent: str
    ) -> Dict:
        result = {
            "threat_score": 0,
            "threat_level": "info",
            "ml_anomaly": False,
            "ml_score": 0.0,
            "behavior_flags": [],
            "recommendation": "allow",
        }

        if not self.enabled:
            return result

        try:
            # Extract features from request
            features = self.feature_extractor.extract(method, path, query, body, headers)

            # ML anomaly detection
            if self.anomaly_detector.is_trained:
                is_anomaly, _ = self.anomaly_detector.predict(features)
                ml_score = self.anomaly_detector.predict_proba(features)

                result["ml_anomaly"] = is_anomaly[0] == 1
                result["ml_score"] = ml_score

                if ml_score > 0.75:
                    result["behavior_flags"].append("ML Anomaly Detected")

            # Behavioral analysis
            behavioral = await self.behavioral_analyzer.analyze(
                client_ip, method, path, query, body, headers
            )

            if behavioral["is_anomaly"]:
                result["behavior_flags"].append("Behavioral Anomaly")

            result["behavior_flags"].extend(behavioral["behavior_flags"])

            # Calculate final threat score
            threat_score, threat_level = self.threat_scorer.calculate_score(
                result["ml_score"],
                0,  # signature_score would be set by WAF engine
                0,  # bot_score would be set by bot detector
                50,  # ip_reputation
                0,  # geo_risk
                float(behavioral.get("anomaly_score", 0))
            )

            result["threat_score"] = threat_score
            result["threat_level"] = threat_level

            # Set recommendation
            if threat_score >= 75:
                result["recommendation"] = "block"
            elif threat_score >= 50:
                result["recommendation"] = "challenge"
            else:
                result["recommendation"] = "allow"

        except Exception as e:
            logger.error(f"Error in ML analysis: {e}")

        return result