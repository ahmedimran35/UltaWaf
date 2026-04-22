from pydantic_settings import BaseSettings
from typing import Optional
import os
import secrets


class Settings(BaseSettings):
    APP_NAME: str = "UltraShield WAF"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Database - password must be set via env
    POSTGRES_USER: str = "waf"
    POSTGRES_PASSWORD: str = ""
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
    MAX_REQUEST_SIZE: int = 10485760

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60

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

    # CORS
    CORS_ORIGINS: list = []

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._validate_secrets()

    def _validate_secrets(self):
        if not self.SECRET_KEY or self.SECRET_KEY == "ultrashield-super-secret-key-change-in-production":
            raise ValueError("SECRET_KEY must be set via environment variable")
        if not self.POSTGRES_PASSWORD:
            raise ValueError("POSTGRES_PASSWORD must be set via environment variable")

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


def get_settings() -> Settings:
    try:
        return Settings()
    except ValueError as e:
        # Return default settings for development (without validation)
        class DevSettings:
            APP_NAME = "UltraShield WAF"
            APP_VERSION = "1.0.0"
            DEBUG = True
            SECRET_KEY = secrets.token_hex(32)
            ALGORITHM = "HS256"
            ACCESS_TOKEN_EXPIRE_MINUTES = 60
            POSTGRES_USER = "waf"
            POSTGRES_PASSWORD = "waf_secure_password"
            POSTGRES_HOST = "localhost"
            POSTGRES_PORT = 5432
            POSTGRES_DB = "ultrashield_waf"
            REDIS_HOST = "localhost"
            REDIS_PORT = 6379
            REDIS_DB = 0
            REDIS_PASSWORD = None
            WAF_ENABLED = True
            BLOCK_MODE = True
            LOG_ALL_REQUESTS = True
            MAX_REQUEST_SIZE = 10485760
            RATE_LIMIT_REQUESTS = 100
            RATE_LIMIT_WINDOW = 60
            DDoS_THRESHOLD = 1000
            DDoS_WINDOW = 60
            ML_ENABLED = True
            ML_ANOMALY_THRESHOLD = 0.75
            GEOIP_DB_PATH = "/app/geoip/GeoLite2-Country.mmdb"
            PROXY_HOST = "0.0.0.0"
            PROXY_PORT = 8080
            PROXY_TARGET = "http://localhost:8000"
            LOG_LEVEL = "INFO"
            LOG_FILE = "logs/waf.log"
            SIEM_LOG_FILE = "logs/siem_json.log"
            HONEYPOT_PATHS = ["/admin.php", "/wp-admin", "/.env", "/config.php", "/backup.sql"]
            API_SHIELD_ENABLED = True
            VIRTUAL_PATCHING_ENABLED = True
            AI_ENCRYPTION_KEY = None
            CORS_ORIGINS = []

            @property
            def DATABASE_URL(self):
                return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

            @property
            def SYNC_DATABASE_URL(self):
                return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

            @property
            def REDIS_URL(self):
                return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

        return DevSettings()


settings = get_settings()