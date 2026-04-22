from backend.models.database import Base, get_db, engine, async_session, SyncSessionLocal
from backend.models.database import (
    AdminUser, WAFRule, RequestLog, IPBlacklist, IPWhitelist,
    GeoIPBlock, IPReputation, Alert, WebhookConfig, RateLimitRule,
    Session, MLModel, AIProvider, AIChatSession, AIUsageStats
)

logs_router = None
rules_router = None
ip_router = None
stats_router = None
settings_router = None
alerts_router = None


def _init_routers():
    global logs_router, rules_router, ip_router, stats_router, settings_router, alerts_router
    from backend.api.logs import logs_router as _logs
    from backend.api.rules import rules_router as _rules
    from backend.api.ip import ip_router as _ip
    from backend.api.stats import stats_router as _stats
    from backend.api.settings import settings_router as _settings
    from backend.api.alerts import alerts_router as _alerts
    logs_router = _logs
    rules_router = _rules
    ip_router = _ip
    stats_router = _stats
    settings_router = _settings
    alerts_router = _alerts
