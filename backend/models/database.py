from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from datetime import datetime, timezone
from backend.config import settings

Base = declarative_base()


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)

    def __repr__(self):
        return f"<AdminUser {self.username}>"


class IPBlacklist(Base):
    __tablename__ = "ip_blacklist"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(45), unique=True, nullable=False, index=True)
    reason = Column(Text)
    source = Column(String(50), default="manual")
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("admin_users.id"))

    def __repr__(self):
        return f"<IPBlacklist {self.ip_address}>"


class IPWhitelist(Base):
    __tablename__ = "ip_whitelist"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(45), unique=True, nullable=False, index=True)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("admin_users.id"))

    def __repr__(self):
        return f"<IPWhitelist {self.ip_address}>"


class GeoIPBlock(Base):
    __tablename__ = "geoip_blocks"

    id = Column(Integer, primary_key=True, index=True)
    country_code = Column(String(2), nullable=False, index=True)
    country_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("admin_users.id"))

    def __repr__(self):
        return f"<GeoIPBlock {self.country_code}>"


class WAFRule(Base):
    __tablename__ = "waf_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    rule_type = Column(String(50), nullable=False)
    pattern = Column(Text, nullable=False)
    pattern_type = Column(String(20), default="regex")
    severity = Column(String(20), default="medium")
    action = Column(String(20), default="block")
    is_enabled = Column(Boolean, default=True)
    priority = Column(Integer, default=100)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("admin_users.id"))

    __table_args__ = (
        Index('idx_rule_type_enabled', 'rule_type', 'is_enabled'),
        Index('idx_priority', 'priority'),
    )

    def __repr__(self):
        return f"<WAFRule {self.name}>"


class RequestLog(Base):
    __tablename__ = "request_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    client_ip = Column(String(45), nullable=False, index=True)
    method = Column(String(10), nullable=False)
    path = Column(String(2048), nullable=False)
    query_string = Column(String(2048))
    headers = Column(JSON)
    body = Column(Text)
    response_status = Column(Integer)
    response_body = Column(Text)
    response_time = Column(Float)
    blocked = Column(Boolean, default=False)
    blocked_reason = Column(Text)
    threat_score = Column(Float, default=0.0)
    attack_type = Column(String(50))
    user_agent = Column(String(512))
    country = Column(String(45), nullable=True)
    session_id = Column(String(100), index=True)
    rule_matches = Column(JSON, default=list)



    __table_args__ = (
        Index('idx_timestamp_blocked', 'timestamp', 'blocked'),
        Index('idx_client_ip_timestamp', 'client_ip', 'timestamp'),
        Index('idx_attack_type', 'attack_type'),
    )

    def __repr__(self):
        return f"<RequestLog {self.id} - {self.path}>"


class IPReputation(Base):
    __tablename__ = "ip_reputation"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(45), unique=True, nullable=False, index=True)
    score = Column(Integer, default=50)
    is_tor = Column(Boolean, default=False)
    is_vpn = Column(Boolean, default=False)
    is_proxy = Column(Boolean, default=False)
    is_datacenter = Column(Boolean, default=False)
    country = Column(String(10))
    asn = Column(String(20))
    total_requests = Column(Integer, default=0)
    blocked_requests = Column(Integer, default=0)
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)

    def __repr__(self):
        return f"<IPReputation {self.ip_address} - Score: {self.score}>"


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), unique=True, nullable=False, index=True)
    client_ip = Column(String(45), nullable=False, index=True)
    user_agent = Column(String(512))
    country = Column(String(10))
    requests_count = Column(Integer, default=0)
    blocked_count = Column(Integer, default=0)
    threat_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)

    def __repr__(self):
        return f"<Session {self.session_id}>"


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    severity = Column(String(20), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text)
    source_ip = Column(String(45))
    attack_type = Column(String(50))
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    resolved_by = Column(Integer, ForeignKey("admin_users.id"))

    def __repr__(self):
        return f"<Alert {self.id} - {self.title}>"


class WebhookConfig(Base):
    __tablename__ = "webhook_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    url = Column(String(512), nullable=False)
    event_types = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    headers = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("admin_users.id"))

    def __repr__(self):
        return f"<WebhookConfig {self.name}>"


class MLModel(Base):
    __tablename__ = "ml_models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    model_type = Column(String(50), nullable=False)
    file_path = Column(String(512))
    accuracy = Column(Float)
    precision = Column(Float)
    recall = Column(Float)
    f1_score = Column(Float)
    is_active = Column(Boolean, default=False)
    trained_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<MLModel {self.name}>"


class RateLimitRule(Base):
    __tablename__ = "rate_limit_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    endpoint = Column(String(512), nullable=False)
    method = Column(String(10), nullable=True)
    max_requests = Column(Integer, default=100)
    window_seconds = Column(Integer, default=60)
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<RateLimitRule {self.name}>"


class AIProvider(Base):
    __tablename__ = "ai_providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True)
    display_name = Column(String(100), nullable=False)
    api_key_encrypted = Column(Text)
    base_url = Column(String(512))
    selected_model = Column(String(100))
    custom_headers = Column(JSON, default=dict)
    is_active = Column(Boolean, default=False)
    is_fallback = Column(Boolean, default=False)
    fallback_provider_id = Column(Integer, ForeignKey("ai_providers.id"), nullable=True)
    response_timeout = Column(Integer, default=30)
    retry_attempts = Column(Integer, default=3)
    max_tokens = Column(Integer, default=2048)
    temperature = Column(Float, default=0.7)
    test_status = Column(String(20), default="not_tested")
    last_tested_at = Column(DateTime)
    test_error = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<AIProvider {self.name}>"


class AIChatSession(Base):
    __tablename__ = "ai_chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), unique=True, nullable=False, index=True)
    messages = Column(JSON, default=list)
    token_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime)

    def __repr__(self):
        return f"<AIChatSession {self.session_id}>"


class AIUsageStats(Base):
    __tablename__ = "ai_usage_stats"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("ai_providers.id"))
    date = Column(DateTime, default=datetime.utcnow, index=True)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    requests_count = Column(Integer, default=0)
    estimated_cost = Column(Float, default=0.0)

    def __repr__(self):
        return f"<AIUsageStats {self.provider_id} - {self.date}>"


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(JSON, nullable=False)
    description = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<SystemSetting {self.key}: {self.value}>"


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=40
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

sync_engine = create_engine(
    settings.SYNC_DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True
)

SyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=sync_engine
)


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)