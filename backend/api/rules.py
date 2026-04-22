from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from backend.models.database import get_db
from backend.models.database import WAFRule, AdminUser


router = APIRouter()


# Lazy import for get_current_admin
def get_current_admin():
    from backend.main import get_current_admin as gca
    return gca


class RuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    rule_type: str
    pattern: str
    pattern_type: str = "regex"
    severity: str = "medium"
    action: str = "block"
    is_enabled: bool = True
    priority: int = 100
    tags: List[str] = []


class RuleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    rule_type: str
    pattern: str
    pattern_type: str
    severity: str
    action: str
    is_enabled: bool
    priority: int
    tags: List[str]
    created_at: datetime
    updated_at: datetime


@router.get("", response_model=List[RuleResponse])
async def get_rules(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    rule_type: Optional[str] = None,
    severity: Optional[str] = None,
    is_enabled: Optional[bool] = None,
    search: Optional[str] = None,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(WAFRule)

    if rule_type:
        query = query.where(WAFRule.rule_type == rule_type)

    if severity:
        query = query.where(WAFRule.severity == severity)

    if is_enabled is not None:
        query = query.where(WAFRule.is_enabled == is_enabled)

    if search:
        query = query.where(WAFRule.name.contains(search))

    query = query.order_by(WAFRule.priority, desc(WAFRule.id))
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/types")
async def get_rule_types(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WAFRule.rule_type).distinct()
    )
    types = [row[0] for row in result.all()]

    return {"types": types}


@router.post("", response_model=RuleResponse)
async def create_rule(
    rule: RuleCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    new_rule = WAFRule(
        name=rule.name,
        description=rule.description,
        rule_type=rule.rule_type,
        pattern=rule.pattern,
        pattern_type=rule.pattern_type,
        severity=rule.severity,
        action=rule.action,
        is_enabled=rule.is_enabled,
        priority=rule.priority,
        tags=rule.tags,
        created_by=admin.id
    )

    db.add(new_rule)
    await db.commit()
    await db.refresh(new_rule)

    return new_rule


@router.get("/{rule_id}", response_model=RuleResponse)
async def get_rule(
    rule_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WAFRule).where(WAFRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    return rule


@router.put("/{rule_id}", response_model=RuleResponse)
async def update_rule(
    rule_id: int,
    rule: RuleCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WAFRule).where(WAFRule.id == rule_id)
    )
    existing_rule = result.scalar_one_or_none()

    if not existing_rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    for key, value in rule.dict().items():
        setattr(existing_rule, key, value)

    existing_rule.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(existing_rule)

    return existing_rule


@router.delete("/{rule_id}")
async def delete_rule(
    rule_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WAFRule).where(WAFRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    await db.delete(rule)
    await db.commit()

    return {"message": "Rule deleted"}


@router.post("/{rule_id}/toggle")
async def toggle_rule(
    rule_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WAFRule).where(WAFRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    rule.is_enabled = not rule.is_enabled
    await db.commit()

    return {"message": f"Rule {'enabled' if rule.is_enabled else 'disabled'}"}


rules_router = router