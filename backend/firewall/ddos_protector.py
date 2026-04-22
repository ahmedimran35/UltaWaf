import asyncio
import logging
import time
from typing import Dict, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class RateLimiter:
    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.default_rate = 100
        self.default_window = 60

    async def check_rate_limit(
        self,
        client_ip: str,
        endpoint: str = "*",
        max_requests: int = None,
        window: int = None
    ) -> tuple[bool, Dict]:
        max_requests = max_requests or self.default_rate
        window = window or self.default_window

        key = f"rate_limit:{endpoint}:{client_ip}"
        current_time = int(time.time())
        window_start = current_time - window

        if self.redis:
            try:
                pipe = self.redis.pipeline()
                pipe.zremrangebyscore(key, 0, window_start)
                pipe.zcard(key)
                pipe.zadd(key, {str(current_time): current_time})
                pipe.expire(key, window)
                results = await pipe.execute()
                request_count = results[1]
            except Exception as e:
                logger.error(f"Redis error in rate limiting: {e}")
                request_count = 0
        else:
            request_count = 0

        allowed = request_count < max_requests
        remaining = max(0, max_requests - request_count - 1)

        return allowed, {
            "allowed": allowed,
            "limit": max_requests,
            "remaining": remaining,
            "reset": current_time + window
        }


class DDOSProtector:
    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.threshold = 1000
        self.window = 60
        self.block_duration = 300

    async def check_ddos(
        self,
        client_ip: str,
        path: Optional[str] = None
    ) -> tuple[bool, str]:
        key = f"ddos:{client_ip}"
        current_time = int(time.time())
        window_start = current_time - self.window

        if self.redis:
            try:
                pipe = self.redis.pipeline()
                pipe.zremrangebyscore(key, 0, window_start)
                pipe.zcard(key)
                pipe.zadd(key, {str(current_time): current_time})
                pipe.expire(key, self.window)
                results = await pipe.execute()
                request_count = results[1]
            except Exception as e:
                logger.error(f"Redis error in DDoS protection: {e}")
                request_count = 0
        else:
            request_count = 0

        if request_count > self.threshold:
            await self._block_ip(client_ip, "DDoS attack detected")
            return True, f"DDoS: {request_count} requests in {self.window}s"

        return False, ""

    async def _block_ip(self, client_ip: str, reason: str):
        block_key = f"blocked:{client_ip}"
        if self.redis:
            try:
                await self.redis.setex(block_key, self.block_duration, reason)
                logger.warning(f"Blocked IP {client_ip} for {self.block_duration}s: {reason}")
            except Exception as e:
                logger.error(f"Error blocking IP: {e}")

    async def is_blocked(self, client_ip: str) -> bool:
        if self.redis:
            try:
                return await self.redis.exists(f"blocked:{client_ip}")
            except Exception:
                return False
        return False


class SlowlorisProtector:
    def __init__(self):
        self.timeout = 10
        self.max_connections = 100
        self.connection_tracking: Dict[str, list] = {}

    async def check_connection(self, client_ip: str) -> bool:
        current_time = time.time()

        if client_ip not in self.connection_tracking:
            self.connection_tracking[client_ip] = []

        # Clean old connections
        self.connection_tracking[client_ip] = [
            t for t in self.connection_tracking[client_ip]
            if current_time - t < self.timeout
        ]

        if len(self.connection_tracking[client_ip]) >= self.max_connections:
            return True

        self.connection_tracking[client_ip].append(current_time)
        return False

    def release_connection(self, client_ip: str):
        if client_ip in self.connection_tracking and self.connection_tracking[client_ip]:
            self.connection_tracking[client_ip].pop(0)


class ConnectionPool:
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self.active_connections: Dict[str, int] = {}
        self.lock = asyncio.Lock()

    async def acquire(self, client_ip: str) -> bool:
        async with self.lock:
            current = self.active_connections.get(client_ip, 0)
            if current >= self.max_size:
                return False
            self.active_connections[client_ip] = current + 1
            return True

    async def release(self, client_ip: str):
        async with self.lock:
            current = self.active_connections.get(client_ip, 0)
            if current > 0:
                self.active_connections[client_ip] = current - 1

    def get_active_count(self, client_ip: str) -> int:
        return self.active_connections.get(client_ip, 0)