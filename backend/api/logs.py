from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel

from backend.models.database import get_db
from backend.models.database import RequestLog, AdminUser


router = APIRouter()


def get_current_admin():
    from backend.main import get_current_admin as gca
    return gca


async def skip_auth():
    return None


class LogResponse(BaseModel):
    id: int
    timestamp: datetime
    client_ip: str
    method: str
    path: str
    query_string: Optional[str]
    response_status: Optional[int]
    blocked: bool
    blocked_reason: Optional[str]
    threat_score: float
    attack_type: Optional[str]
    user_agent: Optional[str]
    country: Optional[str]


class LogStats(BaseModel):
    total_requests: int
    blocked_requests: int
    attack_types: dict
    top_ips: list
    requests_timeline: list


@router.get("", response_model=List[LogResponse])
async def get_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    blocked: Optional[bool] = None,
    attack_type: Optional[str] = None,
    ip: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    query = select(RequestLog)

    if blocked is not None:
        query = query.where(RequestLog.blocked == blocked)

    if attack_type:
        query = query.where(RequestLog.attack_type == attack_type)

    if ip:
        query = query.where(RequestLog.client_ip == ip)

    if start_date:
        query = query.where(RequestLog.timestamp >= start_date)

    if end_date:
        query = query.where(RequestLog.timestamp <= end_date)

    if search:
        escaped_search = search.replace('%', '\\%').replace('_', '\\_')
        query = query.where(RequestLog.path.contains(escaped_search, escape='\\'))

    query = query.order_by(desc(RequestLog.timestamp))
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    logs = result.scalars().all()

    return logs


@router.get("/stats", response_model=LogStats)
async def get_log_stats(
    hours: int = Query(24, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(skip_auth)
):
    since = datetime.utcnow() - timedelta(hours=hours)

    total_result = await db.execute(
        select(func.count(RequestLog.id))
        .where(RequestLog.timestamp >= since)
    )
    total_requests = total_result.scalar()

    blocked_result = await db.execute(
        select(func.count(RequestLog.id))
        .where(RequestLog.blocked == True)
        .where(RequestLog.timestamp >= since)
    )
    blocked_requests = blocked_result.scalar()

    attack_result = await db.execute(
        select(RequestLog.attack_type, func.count(RequestLog.id))
        .where(RequestLog.attack_type != None)
        .where(RequestLog.timestamp >= since)
        .group_by(RequestLog.attack_type)
    )
    attack_types = {row[0]: row[1] for row in attack_result.all()}

    top_ip_result = await db.execute(
        select(RequestLog.client_ip, func.count(RequestLog.id))
        .where(RequestLog.timestamp >= since)
        .group_by(RequestLog.client_ip)
        .order_by(desc(func.count(RequestLog.id)))
        .limit(10)
    )
    top_ips = [{"ip": row[0], "count": row[1]} for row in top_ip_result.all()]

    timeline_result = await db.execute(
        select(func.date_trunc('hour', RequestLog.timestamp), func.count(RequestLog.id))
        .where(RequestLog.timestamp >= since)
        .group_by(func.date_trunc('hour', RequestLog.timestamp))
        .order_by(func.date_trunc('hour', RequestLog.timestamp))
    )
    requests_timeline = [
        {"time": str(row[0]), "count": row[1]}
        for row in timeline_result.all()
    ]

    return LogStats(
        total_requests=total_requests,
        blocked_requests=blocked_requests,
        attack_types=attack_types,
        top_ips=top_ips,
        requests_timeline=requests_timeline
    )


@router.get("/{log_id}")
async def get_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(skip_auth)
):
    result = await db.execute(
        select(RequestLog).where(RequestLog.id == log_id)
    )
    log = result.scalar_one_or_none()

    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    return log


@router.delete("/{log_id}")
async def delete_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(skip_auth)
):
    result = await db.execute(
        select(RequestLog).where(RequestLog.id == log_id)
    )
    log = result.scalar_one_or_none()

    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    await db.delete(log)
    await db.commit()

    return {"message": "Log deleted"}


logs_router = router