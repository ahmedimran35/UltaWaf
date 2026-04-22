from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.database import get_db, AIProvider, AdminUser
from backend.firewall.ai_client import UniversalAIClient
# Lazy import for get_current_admin
def get_current_admin():
    from backend.main import get_current_admin as gca
    return gca
# from backend.main import get_current_admin

ai_router = APIRouter()

@ai_router.get("/status")
async def get_ai_status(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(AIProvider).where(AIProvider.is_active == True))
    provider = result.scalar_one_or_none()
    if not provider:
        return {"status": "AI service disabled", "active_provider": None}
    return {"status": "AI service ready", "active_provider": provider.name}

@ai_router.post("/analyze")
async def analyze_threat(
    request_data: dict, 
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(AIProvider).where(AIProvider.is_active == True))
    provider = result.scalar_one_or_none()
    
    if not provider:
        raise HTTPException(status_code=400, detail="No active AI provider configured")

    # In a real app, we'd decrypt the API key here using a KMS or secure vault
    # For now, we use the stored key directly (assuming it's stored securely or will be handled by a proper KMS)
    # TODO: Implement proper Fernet/AES decryption using settings.AI_ENCRYPTION_KEY
    api_key = provider.api_key 
    
    client = UniversalAIClient(
        provider=provider.name,
        api_key=api_key,
        base_url=provider.base_url,
        model=provider.selected_model
    )
    
    analysis = await client.analyze_threat(request_data)
    return analysis