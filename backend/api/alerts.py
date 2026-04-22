from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

# Lazy import for get_current_admin
def get_current_admin():
    from backend.main import get_current_admin as gca
    return gca
# from backend.main import get_current_admin
from backend.models.database import get_db
from backend.models.database import Alert, WebhookConfig, AdminUser


router = APIRouter()


class AlertCreate(BaseModel):
    severity: str
    title: str
    message: str
    source_ip: Optional[str] = None
    attack_type: Optional[str] = None


class WebhookCreate(BaseModel):
    name: str
    url: str
    event_types: list
    headers: dict = {}


@router.get("/alerts", response_model=list)
async def get_alerts(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    severity: Optional[str] = None,
    is_resolved: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    query = select(Alert).order_by(desc(Alert.timestamp))

    if severity:
        query = query.where(Alert.severity == severity)

    if is_resolved is not None:
        query = query.where(Alert.is_resolved == is_resolved)

    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    return [{"id": a.id, "timestamp": a.timestamp, "severity": a.severity,
             "title": a.title, "message": a.message, "source_ip": a.source_ip,
             "attack_type": a.attack_type, "is_resolved": a.is_resolved}
            for a in result.scalars().all()]


@router.post("/alerts")
async def create_alert(
    alert: AlertCreate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    new_alert = Alert(
        severity=alert.severity,
        title=alert.title,
        message=alert.message,
        source_ip=alert.source_ip,
        attack_type=alert.attack_type
    )
    db.add(new_alert)
    await db.commit()
    await db.refresh(new_alert)

    return {"message": "Alert created", "id": new_alert.id}


@router.put("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_resolved = True
    alert.resolved_at = datetime.utcnow()

    await db.commit()

    return {"message": "Alert resolved"}


@router.get("/webhooks", response_model=list)
async def get_webhooks(
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    result = await db.execute(
        select(WebhookConfig).order_by(desc(WebhookConfig.id))
    )
    return [{"id": w.id, "name": w.name, "url": w.url,
             "event_types": w.event_types, "is_active": w.is_active}
            for w in result.scalars().all()]


@router.post("/webhooks")
async def create_webhook(
    webhook: WebhookCreate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    new_webhook = WebhookConfig(
        name=webhook.name,
        url=webhook.url,
        event_types=webhook.event_types,
        headers=webhook.headers
    )
    db.add(new_webhook)
    await db.commit()
    await db.refresh(new_webhook)

    return {"message": "Webhook created", "id": new_webhook.id}


@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    result = await db.execute(
        select(WebhookConfig).where(WebhookConfig.id == webhook_id)
    )
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    await db.delete(webhook)
    await db.commit()

    return {"message": "Webhook deleted"}


@router.put("/webhooks/{webhook_id}/toggle")
async def toggle_webhook(
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    result = await db.execute(
        select(WebhookConfig).where(WebhookConfig.id == webhook_id)
    )
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    webhook.is_active = not webhook.is_active
    await db.commit()

    return {"message": f"Webhook {'enabled' if webhook.is_active else 'disabled'}"}


alerts_router = router