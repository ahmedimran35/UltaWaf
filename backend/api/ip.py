from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

# Lazy import for get_current_admin
def get_current_admin():
    from backend.main import get_current_admin as gca
    return gca
# from backend.main import get_current_admin
from backend.models.database import get_db
from backend.models.database import IPBlacklist, IPWhitelist, GeoIPBlock, AdminUser


router = APIRouter()


class IPBlacklistCreate(BaseModel):
    ip_address: str
    reason: Optional[str] = None
    expires_at: Optional[datetime] = None


class IPWhitelistCreate(BaseModel):
    ip_address: str
    description: Optional[str] = None


class GeoIPBlockCreate(BaseModel):
    country_code: str
    country_name: str


@router.get("/blacklist", response_model=List[dict])
async def get_blacklist(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    query = select(IPBlacklist).order_by(desc(IPBlacklist.id))

    if search:
        query = query.where(IPBlacklist.ip_address.contains(search))

    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    return [{"id": r.id, "ip_address": r.ip_address, "reason": r.reason,
             "source": r.source, "expires_at": r.expires_at,
             "created_at": r.created_at} for r in result.scalars().all()]


@router.post("/blacklist")
async def add_to_blacklist(
    data: IPBlacklistCreate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    existing = await db.execute(
        select(IPBlacklist).where(IPBlacklist.ip_address == data.ip_address)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="IP already blacklisted")

    entry = IPBlacklist(
        ip_address=data.ip_address,
        reason=data.reason,
        expires_at=data.expires_at,
        source="manual"
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    return {"message": "IP added to blacklist", "id": entry.id}


@router.delete("/blacklist/{ip_address}")
async def remove_from_blacklist(
    ip_address: str,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    result = await db.execute(
        select(IPBlacklist).where(IPBlacklist.ip_address == ip_address)
    )
    entry = result.scalar_one_or_none()

    if not entry:
        raise HTTPException(status_code=404, detail="IP not found")

    await db.delete(entry)
    await db.commit()

    return {"message": "IP removed from blacklist"}


@router.get("/whitelist", response_model=List[dict])
async def get_whitelist(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    query = select(IPWhitelist).order_by(desc(IPWhitelist.id))
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    return [{"id": r.id, "ip_address": r.ip_address, "description": r.description,
             "created_at": r.created_at} for r in result.scalars().all()]


@router.post("/whitelist")
async def add_to_whitelist(
    data: IPWhitelistCreate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    existing = await db.execute(
        select(IPWhitelist).where(IPWhitelist.ip_address == data.ip_address)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="IP already whitelisted")

    entry = IPWhitelist(
        ip_address=data.ip_address,
        description=data.description
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    return {"message": "IP added to whitelist", "id": entry.id}


@router.delete("/whitelist/{ip_address}")
async def remove_from_whitelist(
    ip_address: str,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    result = await db.execute(
        select(IPWhitelist).where(IPWhitelist.ip_address == ip_address)
    )
    entry = result.scalar_one_or_none()

    if not entry:
        raise HTTPException(status_code=404, detail="IP not found")

    await db.delete(entry)
    await db.commit()

    return {"message": "IP removed from whitelist"}


@router.get("/geo", response_model=List[dict])
async def get_geo_blocks(
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    result = await db.execute(
        select(GeoIPBlock).order_by(desc(GeoIPBlock.id))
    )
    return [{"id": r.id, "country_code": r.country_code, "country_name": r.country_name,
             "is_active": r.is_active, "created_at": r.created_at}
            for r in result.scalars().all()]


@router.post("/geo")
async def add_geo_block(
    data: GeoIPBlockCreate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    existing = await db.execute(
        select(GeoIPBlock).where(GeoIPBlock.country_code == data.country_code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Country already blocked")

    entry = GeoIPBlock(
        country_code=data.country_code,
        country_name=data.country_name
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    return {"message": "Country blocked", "id": entry.id}


@router.delete("/geo/{country_code}")
async def remove_geo_block(
    country_code: str,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin)
):
    result = await db.execute(
        select(GeoIPBlock).where(GeoIPBlock.country_code == country_code)
    )
    entry = result.scalar_one_or_none()

    if not entry:
        raise HTTPException(status_code=404, detail="Country not found")

    await db.delete(entry)
    await db.commit()

    return {"message": "Country unblocked"}


ip_router = router