from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, Integer, cast
from datetime import datetime, timedelta
from typing import Optional

from backend.models.database import get_db, AdminUser
from backend.models.database import RequestLog, Alert
# Lazy import for get_current_admin
def get_current_admin():
    from backend.main import get_current_admin as gca
    return gca
# from backend.main import get_current_admin


router = APIRouter()


@router.get("/overview")
async def get_overview(
    hours: int = Query(24, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    since = datetime.utcnow() - timedelta(hours=hours)

    total_result = await db.execute(
        select(func.count(RequestLog.id)).where(RequestLog.timestamp >= since)
    )
    total_requests = total_result.scalar()

    blocked_result = await db.execute(
        select(func.count(RequestLog.id)).where(
            RequestLog.blocked == True,
            RequestLog.timestamp >= since
        )
    )
    blocked_requests = blocked_result.scalar()

    allowed_requests = total_requests - blocked_requests

    unique_ips = await db.execute(
        select(func.count(func.distinct(RequestLog.client_ip)))
        .where(RequestLog.timestamp >= since)
    )
    unique_ips_count = unique_ips.scalar()

    avg_response_time = await db.execute(
        select(func.avg(RequestLog.response_time)).where(RequestLog.timestamp >= since)
    )
    avg_response = avg_response_time.scalar() or 0

    return {
        "total_requests": total_requests,
        "blocked_requests": blocked_requests,
        "allowed_requests": allowed_requests,
        "unique_ips": unique_ips_count,
        "avg_response_time": round(avg_response, 2),
        "block_rate": round((blocked_requests / total_requests * 100), 2) if total_requests > 0 else 0
    }


@router.get("/attacks")
async def get_attack_stats(
    hours: int = Query(24, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    since = datetime.utcnow() - timedelta(hours=hours)

    result = await db.execute(
        select(RequestLog.attack_type, func.count(RequestLog.id))
        .where(
            RequestLog.attack_type != None,
            RequestLog.timestamp >= since
        )
        .group_by(RequestLog.attack_type)
        .order_by(desc(func.count(RequestLog.id)))
    )

    attacks = [
        {"type": row[0], "count": row[1]}
        for row in result.all()
    ]

    total = sum(a["count"] for a in attacks)

    return {
        "attacks": attacks,
        "total": total
    }


@router.get("/timeline")
async def get_timeline(
    hours: int = Query(24, ge=1, le=168),
    interval: str = Query("hour", pattern="^(hour|minute)$"),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    since = datetime.utcnow() - timedelta(hours=hours)

    if interval == "hour":
        truncate = "hour"
    else:
        truncate = "minute"

    result = await db.execute(
        select(
            func.date_trunc(truncate, RequestLog.timestamp).label("time"),
            func.count(RequestLog.id).label("total"),
            func.sum(cast(RequestLog.blocked, Integer)).label("blocked")
        )
        .where(RequestLog.timestamp >= since)
        .group_by("time")
        .order_by("time")
    )

    timeline = [
        {
            "time": str(row[0]),
            "total": row[1],
            "blocked": int(row[2] or 0)
        }
        for row in result.all()
    ]

    return {"timeline": timeline}


@router.get("/top-ips")
async def get_top_ips(
    limit: int = Query(10, ge=1, le=50),
    blocked_only: bool = Query(False),
    hours: int = Query(24, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    since = datetime.utcnow() - timedelta(hours=hours)

    query = select(
        RequestLog.client_ip,
        func.count(RequestLog.id).label("total"),
        func.sum(cast(RequestLog.blocked, Integer)).label("blocked"),
        func.avg(RequestLog.threat_score).label("avg_threat")
    ).where(RequestLog.timestamp >= since)

    if blocked_only:
        query = query.where(RequestLog.blocked == True)

    query = query.group_by(RequestLog.client_ip)
    query = query.order_by(desc("total"))
    query = query.limit(limit)

    result = await db.execute(query)

    ips = [
        {
            "ip": row[0],
            "total_requests": row[1],
            "blocked_requests": int(row[2] or 0),
            "avg_threat_score": round(float(row[3] or 0), 2)
        }
        for row in result.all()
    ]

    return {"ips": ips}


@router.get("/severity")
async def get_severity_stats(
    hours: int = Query(24, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    since = datetime.utcnow() - timedelta(hours=hours)

    result = await db.execute(
        select(RequestLog.attack_type, func.avg(RequestLog.threat_score))
        .where(
            RequestLog.attack_type != None,
            RequestLog.timestamp >= since
        )
        .group_by(RequestLog.attack_type)
    )

    severity = [
        {"attack_type": row[0], "avg_score": round(float(row[1]), 2)}
        for row in result.all()
    ]

    return {"severity": severity}


stats_router = router