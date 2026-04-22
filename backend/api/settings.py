from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.config import settings
from backend.models.database import get_db, SystemSetting, AdminUser
# Lazy import for get_current_admin
def get_current_admin():
    from backend.main import get_current_admin as gca
    return gca
# from backend.main import get_current_admin


router = APIRouter()


ALLOWED_ADVANCED_KEYS = {"honeypot_paths", "api_shield_enabled", "virtual_patching_enabled", "siem_logging_enabled"}

class AdvancedSettings(BaseModel):
    honeypot_paths: List[str]
    api_shield_enabled: bool
    virtual_patching_enabled: bool
    siem_logging_enabled: bool

    class Config:
        extra = "forbid"

@router.get("/advanced")
async def get_advanced_settings(
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    result = await db.execute(select(SystemSetting))
    db_settings = {s.key: s.value for s in result.scalars().all()}

    return {
        "honeypot_paths": db_settings.get("honeypot_paths", settings.HONEYPOT_PATHS),
        "api_shield_enabled": db_settings.get("api_shield_enabled", settings.API_SHIELD_ENABLED),
        "virtual_patching_enabled": db_settings.get("virtual_patching_enabled", settings.VIRTUAL_PATCHING_ENABLED),
        "siem_logging_enabled": db_settings.get("siem_logging_enabled", True)
    }

@router.post("/advanced")
async def update_advanced_settings(
    data: AdvancedSettings,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    settings_dict = data.dict()
    for key, value in settings_dict.items():
        if key not in ALLOWED_ADVANCED_KEYS:
            continue
        result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
        db_setting = result.scalar_one_or_none()

        if db_setting:
            db_setting.value = value
        else:
            db_setting = SystemSetting(key=key, value=value)
            db.add(db_setting)

    await db.commit()
    return {"message": "Advanced settings updated successfully"}

# ... existing code ...


class WAFSettings(BaseModel):
    waf_enabled: bool = settings.WAF_ENABLED
    block_mode: bool = settings.BLOCK_MODE
    log_all_requests: bool = settings.LOG_ALL_REQUESTS
    max_request_size: int = settings.MAX_REQUEST_SIZE
    rate_limit_requests: int = settings.RATE_LIMIT_REQUESTS
    rate_limit_window: int = settings.RATE_LIMIT_WINDOW
    ddos_threshold: int = settings.DDoS_THRESHOLD
    ddos_window: int = settings.DDoS_WINDOW
    ml_enabled: bool = settings.ML_ENABLED
    ml_anomaly_threshold: float = settings.ML_ANOMALY_THRESHOLD


@router.get("")
async def get_settings(
    admin: AdminUser = Depends(get_current_admin)
):
    return {
        "waf_enabled": settings.WAF_ENABLED,
        "block_mode": settings.BLOCK_MODE,
        "log_all_requests": settings.LOG_ALL_REQUESTS,
        "max_request_size": settings.MAX_REQUEST_SIZE,
        "rate_limit_requests": settings.RATE_LIMIT_REQUESTS,
        "rate_limit_window": settings.RATE_LIMIT_WINDOW,
        "ddos_threshold": settings.DDoS_THRESHOLD,
        "ddos_window": settings.DDoS_WINDOW,
        "ml_enabled": settings.ML_ENABLED,
        "ml_anomaly_threshold": settings.ML_ANOMALY_THRESHOLD,
        "version": settings.APP_VERSION,
        "proxy_host": settings.PROXY_HOST,
        "proxy_port": settings.PROXY_PORT
    }


@router.post("")
async def update_settings(
    settings_data: WAFSettings,
    admin: AdminUser = Depends(get_current_admin)
):
    return {"message": "Settings updated", "data": settings_data.dict()}


settings_router = router