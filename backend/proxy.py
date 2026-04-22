import asyncio
import logging
import httpx
from typing import Optional, Dict, Any
from datetime import datetime
from urllib.parse import urljoin, urlparse
import re

logger = logging.getLogger(__name__)


class ProxyRoute:
    def __init__(self, path: str, target: str, methods: list = None):
        self.path = path
        self.target = target
        self.methods = methods or ["GET", "POST", "PUT", "DELETE", "PATCH"]


class ProxyPool:
    def __init__(self, max_connections: int = 100):
        self.max_connections = max_connections
        self.active = 0
        self.total_requests = 0
        self.failed_requests = 0


class ReverseProxy:
    def __init__(self, target_url: str, waf_engine):
        self.target_url = target_url
        self.waf_engine = waf_engine
        self.pool = ProxyPool()
        self.client = None
        self.routes = []

    async def start(self):
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            limits=httpx.Limits(
                max_connections=self.pool.max_connections,
                max_keepalive_connections=20
            ),
            follow_redirects=True
        )
        logger.info(f"Reverse proxy started, target: {self.target_url}")

    async def stop(self):
        if self.client:
            await self.client.aclose()
        logger.info("Reverse proxy stopped")

    def add_route(self, path: str, target: str, methods: list = None):
        route = ProxyRoute(path, target, methods)
        self.routes.append(route)
        logger.info(f"Added route: {path} -> {target}")

    async def proxy_request(
        self,
        path: str,
        method: str,
        headers: Dict,
        body: Optional[bytes],
        query_params: Dict
    ) -> Dict[str, Any]:
        self.pool.active += 1
        self.pool.total_requests += 1

        try:
            target_path = self._resolve_path(path)
            target_url = urljoin(self.target_url, target_path)

            request_headers = self._prepare_headers(headers)

            response = await self.client.request(
                method=method,
                url=target_url,
                headers=request_headers,
                params=query_params,
                content=body
            )

            return {
                "status": response.status_code,
                "headers": dict(response.headers),
                "body": response.content,
                "elapsed": response.elapsed.total_seconds()
            }

        except httpx.RequestError as e:
            self.pool.failed_requests += 1
            logger.error(f"Proxy error: {e}")
            return {
                "status": 502,
                "headers": {},
                "body": b"Bad Gateway",
                "error": str(e)
            }

        finally:
            self.pool.active -= 1

    def _resolve_path(self, path: str) -> str:
        import posixpath
        for route in self.routes:
            if path.startswith(route.path):
                resolved = path.replace(route.path, "", 1)
                
                # Normalize the path to resolve .. and other traversal attempts
                # We use posixpath to ensure / behavior even on Windows
                normalized = posixpath.normpath('/' + resolved).lstrip('/')
                
                if normalized.startswith('..') or '/..' in normalized:
                     # This should have been caught by normpath, but just in case
                     return "/"

                if normalized == ".":
                    return "/"
                    
                return '/' + normalized
        return path

    def _is_valid_url(self, url: str) -> bool:
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            return False
        if parsed.netloc:
            hostname = parsed.netloc.split(':')[0]
            if hostname in ('localhost', '127.0.0.1', '0.0.0.0', '::1'):
                return False
            private_ips = (
                '10.', '172.16.', '172.17.', '172.18.', '172.19.',
                '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
                '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
                '172.30.', '172.31.', '192.168.', '169.254.'
            )
            for prefix in private_ips:
                if hostname.startswith(prefix):
                    return False
        return True

    def _prepare_headers(self, headers: Dict) -> Dict:
        exclude = ["host", "connection", "keep-alive"]
        return {
            k: v for k, v in headers.items()
            if k.lower() not in exclude
        }

    def get_stats(self) -> Dict:
        return {
            "active_connections": self.pool.active,
            "total_requests": self.pool.total_requests,
            "failed_requests": self.pool.failed_requests,
            "routes": len(self.routes)
        }


class ProxyMiddleware:
    def __init__(self, proxy: ReverseProxy):
        self.proxy = proxy

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.proxy.proxy_app(scope, receive, send)
            return

        path = scope.get("path", "/")
        method = scope.get("method", "GET")

        headers = {}
        for key, value in scope.get("headers", []):
            headers[key.decode()] = value.decode()

        client = scope.get("client")
        client_ip = client[0] if client else "unknown"

        body = None
        if method in ["POST", "PUT", "PATCH"]:
            body = await receive()
            body = body.get("body")

        query_string = scope.get("query_string", b"").decode()
        query_params = {}
        if query_string:
            for param in query_string.split("&"):
                if "=" in param:
                    key, value = param.split("=", 1)
                    query_params[key] = value

        proxied = await self.proxy.proxy_request(
            path=path,
            method=method,
            headers=headers,
            body=body,
            query_params=query_params
        )

        await send({
            "type": "http.response.start",
            "status": proxied.get("status", 500),
            "headers": [(k.encode(), v.encode()) for k, v in proxied.get("headers", {}).items()]
        })

        await send({
            "type": "http.response.body",
            "body": proxied.get("body", b"")
        })