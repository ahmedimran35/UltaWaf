from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
import numpy as np

# Lazy import for get_current_admin
def get_current_admin():
    from backend.main import get_current_admin as gca
    return gca
# from backend.main import get_current_admin
from backend.models.database import get_db, AdminUser
from backend.firewall.ml_models import ml_pipeline, ensemble_model
from backend.firewall.ml_features import extract_request_features

router = APIRouter()


class TrainRequest(BaseModel):
    normal_samples: int = 1000
    attack_samples: int = 500


class PredictRequest(BaseModel):
    method: str
    path: str
    query: Optional[str] = None
    body: Optional[str] = None
    headers: dict = {}
    client_ip: str
    user_agent: Optional[str] = None


class LabelRequest(BaseModel):
    request_id: int
    label: str  # "false_positive" or "true_positive"


@router.get("/status")
async def get_ml_status(
    admin: AdminUser = Depends(get_current_admin)
):
    return {
        "is_training": ml_pipeline.is_training,
        "is_trained": ensemble_model.is_trained,
        "models": {
            "isolation_forest": ensemble_model.isolation_forest.is_trained,
            "random_forest": ensemble_model.random_forest.is_trained,
        },
        "available": ensemble_model.is_trained
    }


@router.post("/train")
async def train_model(
    request: TrainRequest = None,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    if ml_pipeline.is_training:
        return {"error": "Training already in progress"}

    from backend.models.database import RequestLog
    
    result = await db.execute(
        select(RequestLog).where(RequestLog.blocked == False).limit(request.normal_samples)
    )
    normal_logs = result.scalars().all()

    result = await db.execute(
        select(RequestLog).where(RequestLog.blocked == True).limit(request.attack_samples)
    )
    attack_logs = result.scalars().all()

    normal_features = []
    for log in normal_logs:
        features = extract_request_features({
            "path": log.path,
            "query": log.query_string,
            "body": log.body,
            "headers": log.headers,
            "method": log.method,
            "client_ip": log.client_ip,
            "user_agent": log.user_agent,
        })
        normal_features.append(features)

    attack_features = []
    for log in attack_logs:
        features = extract_request_features({
            "path": log.path,
            "query": log.query_string,
            "body": log.body,
            "headers": log.headers,
            "method": log.method,
            "client_ip": log.client_ip,
            "user_agent": log.user_agent,
        })
        attack_features.append(features)

    X_normal = np.array(normal_features) if normal_features else np.array([])
    X_attack = np.array(attack_features) if attack_features else None

    if len(X_normal) < 100:
        return {"error": "Not enough training data. Need at least 100 normal samples."}

    result = await ml_pipeline.train(X_normal, X_attack)
    return result


@router.post("/predict")
async def predict_threat(
    request: PredictRequest,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    if not ensemble_model.is_trained:
        return {
            "prediction": "unknown",
            "confidence": 0,
            "error": "Model not trained"
        }

    request_data = {
        "method": request.method,
        "path": request.path,
        "query": request.query,
        "body": request.body,
        "headers": request.headers,
        "client_ip": request.client_ip,
        "user_agent": request.user_agent,
    }

    features = extract_request_features(request_data)
    X = np.array([features])

    result = await ensemble_model.predict(X)

    return {
        "prediction": result.get("final_decision", "allow"),
        "confidence": result.get("confidence", 0),
        "score": result.get("ensemble_score", 0) * 100,
        "details": result
    }


@router.get("/metrics")
async def get_ml_metrics(
    admin: AdminUser = Depends(get_current_admin)
):
    metrics = {
        "isolation_forest": ensemble_model.isolation_forest.metrics,
        "random_forest": ensemble_model.random_forest.metrics,
    }
    return metrics


@router.get("/features")
async def get_feature_importance(
    admin: AdminUser = Depends(get_current_admin)
):
    if not ensemble_model.is_trained:
        return {"error": "Model not trained"}

    importance = ensemble_model.get_feature_importance()
    
    return {
        "features": [
            {"name": name, "importance": round(score * 100, 2)}
            for name, score in sorted(importance, key=lambda x: x[1], reverse=True)
        ]
    }


@router.get("/versions")
async def get_model_versions(
    admin: AdminUser = Depends(get_current_admin)
):
    import os
    from pathlib import Path

    models_dir = Path("/home/ubuntu/waf/ml_models")
    versions = []

    if models_dir.exists():
        for file in models_dir.glob("*.pkl"):
            versions.append({
                "name": file.stem,
                "path": str(file),
                "size": file.stat().st_size,
                "modified": datetime.fromtimestamp(file.stat().st_mtime).isoformat()
            })

    return {"versions": versions}


@router.post("/rollback")
async def rollback_model(
    version: str,
    admin: AdminUser = Depends(get_current_admin)
):
    import os
    from pathlib import Path

    model_path = Path(f"/home/ubuntu/waf/ml_models/{version}.pkl")
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Version not found")

    try:
        ensemble_model.isolation_forest.version = version
        ensemble_model.isolation_forest.load_model()
        ensemble_model.random_forest.version = version
        ensemble_model.random_forest.load_model()

        return {"message": f"Rolled back to version {version}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/dataset/stats")
async def get_dataset_stats(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    from backend.models.database import RequestLog

    since = datetime.utcnow() - timedelta(days=days)

    total_result = await db.execute(
        select(func.count(RequestLog.id)).where(RequestLog.timestamp >= since)
    )
    total = total_result.scalar()

    blocked_result = await db.execute(
        select(func.count(RequestLog.id)).where(
            RequestLog.blocked == True,
            RequestLog.timestamp >= since
        )
    )
    blocked = blocked_result.scalar()

    attack_types_result = await db.execute(
        select(RequestLog.attack_type, func.count(RequestLog.id))
        .where(
            RequestLog.attack_type != None,
            RequestLog.timestamp >= since
        )
        .group_by(RequestLog.attack_type)
    )

    attack_types = {row[0]: row[1] for row in attack_types_result.all()}

    return {
        "period_days": days,
        "total_samples": total,
        "normal_samples": total - blocked,
        "attack_samples": blocked,
        "attack_types": attack_types,
        "min_required": 100,
        "ready_for_training": total >= 100
    }


@router.post("/label")
async def label_request(
    request: LabelRequest,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    from backend.models.database import RequestLog

    result = await db.execute(
        select(RequestLog).where(RequestLog.id == request.request_id)
    )
    log = result.scalar_one_or_none()

    if not log:
        raise HTTPException(status_code=404, detail="Request not found")

    return {"message": f"Label '{request.label}' recorded for request {request.request_id}"}


ml_router = router