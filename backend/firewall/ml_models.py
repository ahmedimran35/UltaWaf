import os
import logging
import pickle
import json
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

ML_AVAILABLE = True
try:
    from sklearn.ensemble import IsolationForest, RandomForestClassifier, GradientBoostingClassifier
    from sklearn.preprocessing import StandardScaler, LabelEncoder
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score, f1_score,
        confusion_matrix, classification_report, roc_auc_score
    )
    from sklearn.svm import OneClassSVM
    from sklearn.neighbors import KNeighborsClassifier
    import joblib
except ImportError:
    ML_AVAILABLE = False
    logger.warning("scikit-learn not available, ML features disabled")


class MLModelRegistry:
    MODELS_DIR = "/home/ubuntu/waf/ml_models"
    
    @staticmethod
    def get_model_path(name: str, version: str = "v1") -> str:
        Path(MLModelRegistry.MODELS_DIR).mkdir(parents=True, exist_ok=True)
        return f"{MLModelRegistry.MODELS_DIR}/{name}_{version}.pkl"

    @staticmethod
    def get_scaler_path() -> str:
        return f"{MLModelRegistry.MODELS_DIR}/scaler.pkl"

    @staticmethod
    def get_metadata_path() -> str:
        return f"{MLModelRegistry.MODELS_DIR}/metadata.json"


class IsolationForestModel:
    def __init__(self, contamination: float = 0.01, n_estimators: int = 100):
        if not ML_AVAILABLE:
            raise ImportError("scikit-learn not available")
        
        self.model = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            random_state=42,
            n_jobs=-1,
            max_samples='auto'
        )
        self.scaler = StandardScaler()
        self.is_trained = False
        self.version = "v1"
        self.metrics = {}

    def train(self, X: np.ndarray, y: np.ndarray = None) -> Dict:
        if len(X) < 100:
            return {"error": "Need at least 100 samples"}

        try:
            X_scaled = self.scaler.fit_transform(X)
            self.model.fit(X_scaled)
            self.is_trained = True

            self._save_model()
            
            self.metrics = {
                "samples_trained": len(X),
                "features": X.shape[1],
                "contamination": self.model.contamination,
                "version": self.version
            }

            return {
                "status": "trained",
                "samples": len(X),
                "version": self.version,
                "metrics": self.metrics
            }
        except Exception as e:
            logger.error(f"Training error: {e}")
            return {"error": str(e)}

    def predict(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        if not self.is_trained:
            return np.array([0]), np.array([0.0])

        try:
            X_scaled = self.scaler.transform(X)
            predictions = self.model.predict(X_scaled)
            scores = self.model.score_samples(X_scaled)
            
            binary = np.where(predictions == -1, 1, 0)
            normalized_scores = (scores - scores.min()) / (scores.max() - scores.min() + 1e-10)
            
            return binary, normalized_scores
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return np.array([0]), np.array([0.0])

    def predict_proba(self, X: np.ndarray) -> float:
        _, scores = self.predict(X)
        return float(np.mean(scores))

    def _save_model(self):
        if not ML_AVAILABLE:
            return
        
        path = MLModelRegistry.get_model_path("isolation_forest", self.version)
        scaler_path = MLModelRegistry.get_scaler_path()
        
        joblib.dump(self.model, path)
        joblib.dump(self.scaler, scaler_path)
        
        self._save_metadata()
        logger.info(f"Model saved to {path}")

    def _save_metadata(self):
        metadata = {
            "model_type": "isolation_forest",
            "version": self.version,
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "metrics": self.metrics
        }
        
        with open(MLModelRegistry.get_metadata_path(), 'w') as f:
            json.dump(metadata, f)

    def load_model(self) -> bool:
        if not ML_AVAILABLE:
            return False
        
        model_path = MLModelRegistry.get_model_path("isolation_forest", self.version)
        scaler_path = MLModelRegistry.get_scaler_path()
        
        if not os.path.exists(model_path):
            return False

        try:
            self.model = joblib.load(model_path)
            self.scaler = joblib.load(scaler_path)
            self.is_trained = True
            
            if os.path.exists(MLModelRegistry.get_metadata_path()):
                with open(MLModelRegistry.get_metadata_path(), 'r') as f:
                    self.metrics = json.load(f).get("metrics", {})
            
            logger.info("Isolation Forest model loaded")
            return True
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return False


class RandomForestClassifierModel:
    def __init__(self, n_estimators: int = 100, max_depth: int = 10):
        if not ML_AVAILABLE:
            raise ImportError("scikit-learn not available")
        
        self.model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=42,
            n_jobs=-1
        )
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.is_trained = False
        self.version = "v1"
        self.metrics = {}

    def train(self, X: np.ndarray, y: np.ndarray) -> Dict:
        if len(X) < 100:
            return {"error": "Need at least 100 samples"}

        try:
            X_scaled = self.scaler.fit_transform(X)
            y_encoded = self.label_encoder.fit_transform(y)
            
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y_encoded, test_size=0.2, random_state=42
            )
            
            self.model.fit(X_train, y_train)
            self.is_trained = True
            
            y_pred = self.model.predict(X_test)
            y_proba = self.model.predict_proba(X_test)[:, 1]
            
            self.metrics = {
                "accuracy": accuracy_score(y_test, y_pred),
                "precision": precision_score(y_test, y_pred, average='weighted'),
                "recall": recall_score(y_test, y_pred, average='weighted'),
                "f1": f1_score(y_test, y_pred, average='weighted'),
                "auc": roc_auc_score(y_test, y_proba),
                "samples_trained": len(X),
                "version": self.version
            }
            
            self._save_model()
            
            return {
                "status": "trained",
                "samples": len(X),
                "metrics": self.metrics,
                "version": self.version
            }
        except Exception as e:
            logger.error(f"Training error: {e}")
            return {"error": str(e)}

    def predict(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        if not self.is_trained:
            return np.array([0]), np.array([0.0])

        try:
            X_scaled = self.scaler.transform(X)
            predictions = self.model.predict(X_scaled)
            probabilities = self.model.predict_proba(X_scaled)[:, 1]
            return predictions, probabilities
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return np.array([0]), np.array([0.0])

    def predict_proba(self, X: np.ndarray) -> float:
        _, probs = self.predict(X)
        return float(np.mean(probs))

    def get_feature_importance(self) -> List[Tuple[str, float]]:
        if not self.is_trained:
            return []
        
        from .ml_features import FeatureImportance
        importance = self.model.feature_importances_
        
        return [
            (FeatureImportance.FEATURE_NAMES[i], float(importance[i]))
            for i in range(len(importance))
        ]

    def _save_model(self):
        if not ML_AVAILABLE:
            return
        
        path = MLModelRegistry.get_model_path("random_forest", self.version)
        scaler_path = MLModelRegistry.get_model_path("rf_scaler", self.version)
        
        joblib.dump(self.model, path)
        joblib.dump(self.scaler, scaler_path)
        logger.info(f"Random Forest model saved")

    def load_model(self) -> bool:
        if not ML_AVAILABLE:
            return False
        
        model_path = MLModelRegistry.get_model_path("random_forest", self.version)
        
        if not os.path.exists(model_path):
            return False

        try:
            self.model = joblib.load(model_path)
            scaler_path = MLModelRegistry.get_model_path("rf_scaler", self.version)
            self.scaler = joblib.load(scaler_path)
            self.is_trained = True
            logger.info("Random Forest model loaded")
            return True
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return False


class EnsembleModel:
    def __init__(self):
        self.isolation_forest = IsolationForestModel()
        self.random_forest = RandomForestClassifierModel()
        self.is_trained = False

    async def initialize(self):
        self.isolation_forest.load_model()
        self.random_forest.load_model()
        self.is_trained = self.isolation_forest.is_trained or self.random_forest.is_trained

    def predict(self, X: np.ndarray) -> Dict[str, Any]:
        results = {
            "isolation_forest": {"score": 0.0, "is_anomaly": False},
            "random_forest": {"score": 0.0, "is_attack": False},
            "ensemble_score": 0.0,
            "final_decision": "allow",
            "confidence": 0.0
        }

        if self.isolation_forest.is_trained:
            binary, scores = self.isolation_forest.predict(X)
            results["isolation_forest"]["is_anomaly"] = bool(binary[0])
            results["isolation_forest"]["score"] = float(scores[0])

        if self.random_forest.is_trained:
            binary, probs = self.random_forest.predict(X)
            results["random_forest"]["is_attack"] = bool(binary[0])
            results["random_forest"]["score"] = float(probs[0])

        if self.isolation_forest.is_trained and self.random_forest.is_trained:
            if_score = results["isolation_forest"]["score"]
            rf_score = results["random_forest"]["score"]
            results["ensemble_score"] = (if_score + rf_score) / 2
        elif self.isolation_forest.is_trained:
            results["ensemble_score"] = results["isolation_forest"]["score"]
        elif self.random_forest.is_trained:
            results["ensemble_score"] = results["random_forest"]["score"]

        score = results["ensemble_score"] * 100
        
        if score >= 80:
            results["final_decision"] = "block"
        elif score >= 60:
            results["final_decision"] = "challenge"
        elif score >= 30:
            results["final_decision"] = "monitor"
        else:
            results["final_decision"] = "allow"

        results["confidence"] = min(100, score + 10)
        
        return results

    def get_feature_importance(self):
        return self.random_forest.get_feature_importance()


class TrainingPipeline:
    def __init__(self):
        self.ensemble = EnsembleModel()
        self.is_training = False

    async def train(
        self,
        normal_samples: np.ndarray,
        attack_samples: Optional[np.ndarray] = None
    ) -> Dict:
        if self.is_training:
            return {"error": "Training already in progress"}

        self.is_training = True
        results = {"status": "started", "models": {}}

        try:
            if len(normal_samples) < 100:
                return {"error": "Need at least 100 normal samples"}

            if_train = normal_samples[:min(len(normal_samples), 1000)]
            results["models"]["isolation_forest"] = self.ensemble.isolation_forest.train(if_train)

            if attack_samples is not None and len(attack_samples) >= 10:
                X = np.vstack([normal_samples[:500], attack_samples[:500]])
                y = np.array([0] * 500 + [1] * 500)
                
                results["models"]["random_forest"] = self.ensemble.random_forest.train(X, y)

            await self.ensemble.initialize()

            return {
                "status": "completed",
                "models": results["models"]
            }

        except Exception as e:
            logger.error(f"Training pipeline error: {e}")
            return {"error": str(e)}
        finally:
            self.is_training = False


ml_pipeline = TrainingPipeline()
ensemble_model = EnsembleModel()