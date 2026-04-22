from fastapi import FastAPI, Request, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
import json
import logging
import asyncio
from typing import Optional, List, Any
from contextlib import asynccontextmanager
import redis.asyncio as aioredis

from backend.config import settings
from backend.models.database import Base, get_db, engine, async_session, AdminUser, WAFRule, RequestLog, IPBlacklist, IPWhitelist, GeoIPBlock, IPReputation, Alert, WebhookConfig, RateLimitRule
from backend.firewall.rules_engine import WAFEngine, AttackType, Severity
from backend.firewall.ddos_protector import RateLimiter, DDOSProtector
from backend.firewall.bot_detector import IPIntelligence
from backend.firewall.ml_engine import MLEngine
from backend.utils.auth import create_access_token, verify_password, get_password_hash
from backend.utils.helpers import get_client_ip, parse_query_params, get_geo_info

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


redis_client = None
waf_engine = WAFEngine()
rate_limiter = RateLimiter()
ddos_protector = DDOSProtector()
bot_detector = IPIntelligence()
ml_engine = None


from jose import jwt, JWTError


async def init_redis():
    global redis_client, ml_engine
    try:
        redis_client = await aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
        await redis_client.ping()
        logger.info("Redis connected")

        rate_limiter.redis = redis_client
        ddos_protector.redis = redis_client
        bot_detector.redis = redis_client

        ml_engine = MLEngine(redis_client)
        await ml_engine.initialize()
        logger.info("ML Engine initialized")

    except Exception as e:
        logger.error(f"Redis connection failed: {e}")
        redis_client = None
        ml_engine = MLEngine()


async def init_db_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting UltraShield WAF...")
    await init_db_tables()
    await init_redis()
    await seed_default_data()
    
    # Start Global Attack Feed (DShield)
    from backend.api.websocket import manager
    await manager.start_global_feed()
    
    yield
    logger.info("Shutting down UltraShield WAF...")
    if redis_client:
        await redis_client.close()


async def seed_default_data():
    from backend.models.database import async_session
    from sqlalchemy import select

    async with async_session() as session:
        result = await session.execute(select(AdminUser).where(AdminUser.username == "admin"))
        admin = result.scalar_one_or_none()

        if admin:
            # Reset password to default "admin"
            admin.hashed_password = get_password_hash("admin")
            await session.commit()
            logger.info("Admin password reset to default")
        if not admin:
            admin = AdminUser(
                username="admin",
                email="admin@ultrashield.local",
                hashed_password=get_password_hash("admin"),
                full_name="Administrator",
                is_superuser=True
            )
            session.add(admin)
            await session.commit()
            logger.info("Default admin user created")


app = FastAPI(
    title="UltraShield WAF",
    version="1.0.0",
    description="Production-ready Web Application Firewall",
    lifespan=lifespan
)

security = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from backend.api.logs import logs_router
from backend.api.rules import rules_router
from backend.api.ip import ip_router
from backend.api.stats import stats_router
from backend.api.settings import settings_router
from backend.api.alerts import alerts_router
from backend.api.ai import ai_router
from backend.api.websocket import ws_router
from backend.api.ml import ml_router
from backend.api.notifications import notes_router, notification_service
from backend.api.reports import reports_router

app.include_router(logs_router, prefix="/api/admin/logs", tags=["Logs"])
app.include_router(rules_router, prefix="/api/admin/rules", tags=["Rules"])
app.include_router(ip_router, prefix="/api/admin/ip", tags=["IP Management"])
app.include_router(stats_router, prefix="/api/admin/stats", tags=["Statistics"])
app.include_router(settings_router, prefix="/api/admin/settings", tags=["Settings"])
app.include_router(alerts_router, prefix="/api/admin/alerts", tags=["Alerts"])
app.include_router(ai_router, prefix="/api/ai", tags=["AI Integration"])
app.include_router(ml_router, prefix="/api/ml", tags=["ML Engine"])
app.include_router(notes_router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(reports_router, prefix="/api/admin/reports", tags=["Reports"])
app.include_router(ws_router, tags=["WebSocket"])


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    from backend.models.database import async_session
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")

        async with async_session() as session:
            result = await session.execute(
                select(AdminUser).where(AdminUser.username == username)
            )
            user = result.scalar_one_or_none()
            if not user or not user.is_active:
                raise HTTPException(status_code=401, detail="User not found")

        return user

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_gui_setting(key: str, default: Any):
    from backend.models.database import SystemSetting
    try:
        async with async_session() as session:
            result = await session.execute(select(SystemSetting).where(SystemSetting.key == key))
            setting = result.scalar_one_or_none()
            return setting.value if setting else default
    except Exception:
        return default

# SIEM Logger Setup
siem_logger = logging.getLogger("siem")
siem_handler = logging.FileHandler(settings.SIEM_LOG_FILE)
siem_handler.setFormatter(logging.Formatter('%(message)s'))
siem_logger.addHandler(siem_handler)
siem_logger.setLevel(logging.INFO)

@app.middleware("http")
async def waf_middleware(request: Request, call_next):
    client_ip = await get_client_ip(request)
    path = request.url.path

    # Dynamic GUI Settings
    honeypot_paths = await get_gui_setting("honeypot_paths", settings.HONEYPOT_PATHS)
    api_shield_enabled = await get_gui_setting("api_shield_enabled", settings.API_SHIELD_ENABLED)
    siem_logging_enabled = await get_gui_setting("siem_logging_enabled", True)

    # Skip WAF for admin API, docs, etc.
    if path.startswith("/api/admin") or path.startswith("/docs") or path.startswith("/openapi"):
        return await call_next(request)

    # 2. API Shielding - robust content-type validation
    if path.startswith("/api/") and api_shield_enabled:
        if request.method in ["POST", "PUT"]:
            content_type = request.headers.get("content-type", "")
            if not content_type.startswith("application/json"):
                return JSONResponse(status_code=415, content={"detail": "API Shield: JSON required"})

    # 3. Honeypot Feature - with IP validation
    if path in honeypot_paths:
        from backend.utils.helpers import validate_ip, is_private_ip
        if validate_ip(client_ip) and not is_private_ip(client_ip):
            logger.warning(f"Honeypot triggered by {client_ip} at {path}")
            async with async_session() as session:
                existing = await session.execute(
                    select(IPBlacklist).where(IPBlacklist.ip_address == client_ip)
                )
                if not existing.scalar_one_or_none():
                    blacklist_entry = IPBlacklist(
                        ip_address=client_ip,
                        reason=f"Honeypot triggered: {path}",
                        source="honeypot"
                    )
                    session.add(blacklist_entry)
                    await session.commit()
        return JSONResponse(status_code=403, content={"detail": "Access Denied"})

    # CSRF Protection for state-changing methods (skip for WebSocket upgrades)
    if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        csrf_token = request.headers.get("X-CSRF-Token")
        if not csrf_token and not path.startswith("/api/admin/login"):
             logger.warning(f"CSRF attempt blocked from {client_ip}")
             return JSONResponse(status_code=403, content={"detail": "CSRF Token missing"})

    # Allow WebSocket upgrades
    if path.startswith("/ws"):
        return await call_next(request)

    is_blocked = await ddos_protector.is_blocked(client_ip)
    if is_blocked:
        return JSONResponse(
            status_code=403,
            content={"detail": "Access denied - Rate limited"}
        )

    is_ddos, reason = await ddos_protector.check_ddos(client_ip, path)
    if is_ddos:
        return JSONResponse(
            status_code=403,
            content={"detail": f"Access denied - {reason}"}
        )

    query_params = parse_query_params(request)
    body = None
    if request.method in ["POST", "PUT", "PATCH"]:
        body = await request.body()

    headers = dict(request.headers)

    # GET GEO INFO
    geo_info = await get_geo_info(client_ip)

    waf_result = await waf_engine.inspect_request(
        request.method,
        path,
        query_params,
        headers,
        body,
        client_ip,
        headers.get("user-agent", "")
    )

    # PERSIST LOG TO DATABASE
    try:
        async with async_session() as session:
            log_entry = RequestLog(
                client_ip=client_ip,
                method=request.method,
                path=path,
                query_string=request.url.query,
                headers=headers,
                body=body.decode('utf-8', errors='ignore') if body else None,
                blocked=waf_result.blocked,
                blocked_reason=waf_result.block_reason,
                threat_score=waf_result.threat_score,
                attack_type=waf_result.attack_type.value if waf_result.attack_type else None,
                user_agent=headers.get("user-agent"),
                country=geo_info.get("country", "XX"),
                timestamp=datetime.utcnow()
            )
            session.add(log_entry)
            await session.commit()
    except Exception as e:
        logger.error(f"Failed to log request to DB: {e}")

    # 3. SIEM Logging (JSON)
    if siem_logging_enabled:
        siem_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "client_ip": client_ip,
            "method": request.method,
            "path": path,
            "threat_score": waf_result.threat_score,
            "blocked": waf_result.blocked,
            "attack_type": waf_result.attack_type.value if waf_result.attack_type else None,
            "country": geo_info.get("country", "XX")
        }
        siem_logger.info(json.dumps(siem_data))

    if waf_result.blocked:
        # Trigger alert if critical
        if waf_result.threat_score >= 80:
            await notification_service.send_alert(
                title=f"WAF Block: {waf_result.attack_type.value if waf_result.attack_type else 'Attack'}",
                message=f"IP {client_ip} blocked for {waf_result.attack_type.value} at {path}",
                severity="critical",
                attack_type=waf_result.attack_type.value if waf_result.attack_type else "unknown",
                source_ip=client_ip
            )

        return JSONResponse(
            status_code=403,
            content={
                "detail": waf_result.block_reason or "Request blocked by WAF",
                "threat_score": waf_result.threat_score,
                "attack_type": waf_result.attack_type.value if waf_result.attack_type else None,
            }
        )

    response = await call_next(request)
    return response


@app.get("/")
async def root():
    return {"status": "running", "service": "UltraShield WAF", "version": "1.0.0"}


MAX_REQUEST_BODY_SIZE = 10 * 1024 * 1024  # 10MB

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


from fastapi import Form


@app.post("/api/admin/login")
async def admin_login(username: str = Form(...), password: str = Form(...)):
    from sqlalchemy import select

    async with async_session() as session:
        result = await session.execute(
            select(AdminUser).where(AdminUser.username == username)
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account disabled")

        user.last_login = datetime.utcnow()
        await session.commit()

        access_token = create_access_token(data={"sub": user.username})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name
            }
        }


from backend.firewall.ml_models import IsolationForestModel
from backend.firewall.ml_features import FeatureExtractor

# ML Background Task
async def ml_retrain_task():
    """Periodically retrain the ML model if enough data is collected."""
    while True:
        try:
            async with async_session() as session:
                # Check if we have enough new logs
                result = await session.execute(select(func.count(RequestLog.id)))
                count = result.scalar()
                
                if count >= 1000: # Threshold for training
                    logger.info(f"Retraining ML model with {count} samples...")
                    result = await session.execute(select(RequestLog).limit(2000))
                    logs = result.scalars().all()
                    
                    # Extract features
                    fe = FeatureExtractor()
                    X = []
                    for log in logs:
                        features = fe.extract(
                            log.method, log.path, log.query_string or "", 
                            log.body or "", log.headers or {}
                        )
                        X.append(features[0])
                    
                    import numpy as np
                    if ml_engine and ml_engine.enabled:
                        await asyncio.to_thread(ml_engine.anomaly_detector.train, np.array(X))
                        logger.info("ML Model retrained successfully")
        except Exception as e:
            logger.error(f"ML Retrain error: {e}")
        
        await asyncio.sleep(3600) # Check every hour

@app.get("/api/auth/csrf")
async def get_csrf_token():
    """Generate a pseudo-random CSRF token for the session."""
    import secrets
    token = secrets.token_hex(32)
    # In production, store this in Redis or Session
    return {"csrf_token": token}