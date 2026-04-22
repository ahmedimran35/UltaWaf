from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "UltraShield WAF"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "ultrashield-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Database
    POSTGRES_USER: str = "waf"
    POSTGRES_PASSWORD: str = "waf_secure_password"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "ultrashield_waf"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None

    # WAF Settings
    WAF_ENABLED: bool = True
    BLOCK_MODE: bool = True
    LOG_ALL_REQUESTS: bool = True
    MAX_REQUEST_SIZE: int = 10485760  # 10MB

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds

    # DDoS Protection
    DDoS_THRESHOLD: int = 1000
    DDoS_WINDOW: int = 60

    # ML Engine
    ML_ENABLED: bool = True
    ML_ANOMALY_THRESHOLD: float = 0.75

    # GeoIP
    GEOIP_DB_PATH: str = "/app/geoip/GeoLite2-Country.mmdb"

    # Proxy Settings
    PROXY_HOST: str = "0.0.0.0"
    PROXY_PORT: int = 8080
    PROXY_TARGET: str = "http://localhost:8000"

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/waf.log"
    SIEM_LOG_FILE: str = "logs/siem_json.log"

    # Advanced Features
    HONEYPOT_PATHS: list = ["/admin.php", "/wp-admin", "/.env", "/config.php", "/backup.sql"]
    API_SHIELD_ENABLED: bool = True
    VIRTUAL_PATCHING_ENABLED: bool = True
    AI_ENCRYPTION_KEY: Optional[str] = None

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def SYNC_DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
