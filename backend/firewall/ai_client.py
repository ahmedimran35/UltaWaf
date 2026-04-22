import asyncio
import json
import logging
import os
from typing import Dict, List, Optional, Any, AsyncGenerator
from datetime import datetime
from enum import Enum
import aiohttp
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)


class AIProviderType(Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    OPENROUTER = "openrouter"
    KILOCODE = "kilocode"
    OPENCODE = "opencode"
    CUSTOM = "custom"
    OLLAMA = "ollama"


class UniversalAIClient:
    PROVIDER_CONFIGS = {
        "openai": {
            "name": "OpenAI",
            "base_url": "https://api.openai.com/v1",
            "auth_header": "Bearer",
            "models_endpoint": "/models",
            "chat_endpoint": "/chat/completions",
            "requires_org": False,
        },
        "anthropic": {
            "name": "Anthropic (Claude)",
            "base_url": "https://api.anthropic.com",
            "auth_header": "x-api-key",
            "api_version": "2023-06-01",
            "chat_endpoint": "/v1/messages",
            "requires_org": False,
        },
        "openrouter": {
            "name": "OpenRouter",
            "base_url": "https://openrouter.ai/api/v1",
            "auth_header": "Bearer",
            "models_endpoint": "/models",
            "chat_endpoint": "/chat/completions",
            "extra_headers": {
                "HTTP-Referer": "https://ultrashield-waf.local",
                "X-Title": "UltraShield WAF"
            },
            "requires_org": False,
        },
        "kilocode": {
            "name": "KiloCode AI",
            "base_url": "https://api.kilocode.dev/v1",
            "auth_header": "Bearer",
            "models_endpoint": "/models",
            "chat_endpoint": "/chat/completions",
            "openai_compatible": True,
            "requires_org": False,
        },
        "opencode": {
            "name": "OpenCode AI",
            "base_url": "https://api.opencode.ai/v1",
            "auth_header": "Bearer",
            "models_endpoint": "/models",
            "chat_endpoint": "/chat/completions",
            "openai_compatible": True,
            "requires_org": False,
        },
        "ollama": {
            "name": "Ollama (Local)",
            "base_url": "http://localhost:11434",
            "auth_header": "None",
            "models_endpoint": "/api/tags",
            "chat_endpoint": "/api/chat",
            "openai_compatible": True,
            "requires_org": False,
        },
        "lmstudio": {
            "name": "LM Studio (Local)",
            "base_url": "http://localhost:1234/v1",
            "auth_header": "Bearer",
            "models_endpoint": "/models",
            "chat_endpoint": "/chat/completions",
            "openai_compatible": True,
            "requires_org": False,
        },
        "groq": {
            "name": "Groq",
            "base_url": "https://api.groq.com/openai/v1",
            "auth_header": "Bearer",
            "models_endpoint": "/models",
            "chat_endpoint": "/chat/completions",
            "openai_compatible": True,
            "requires_org": False,
        },
        "custom": {
            "name": "Custom Endpoint",
            "base_url": "",
            "auth_header": "Bearer",
            "models_endpoint": "/models",
            "chat_endpoint": "/chat/completions",
            "openai_compatible": True,
            "requires_org": False,
        },
    }

    MODEL_PRICING = {
        "gpt-4o": {"input": 0.0025, "output": 0.01},
        "gpt-4-turbo": {"input": 0.01, "output": 0.03},
        "gpt-4": {"input": 0.03, "output": 0.06},
        "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
        "claude-opus-4": {"input": 0.015, "output": 0.075},
        "claude-sonnet-4": {"input": 0.003, "output": 0.015},
        "claude-haiku": {"input": 0.00025, "output": 0.00125},
    }

    FREE_MODELS = [
        "gpt-3.5-turbo",
        "llama-3.1-70b-instruct",
        "llama-3.1-8b-instruct",
        "mistral-7b-instruct",
        "gemma-2-9b-it",
        "mixtral-8x7b-instruct",
        "phi-3-mini-128k-instruct",
    ]

    def __init__(
        self,
        provider: str,
        api_key: str,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        custom_headers: Optional[Dict] = None,
        timeout: int = 30,
        max_tokens: int = 2048,
        temperature: float = 0.7,
    ):
        self.provider = provider
        self.api_key = api_key
        self.config = self.PROVIDER_CONFIGS.get(provider, self.PROVIDER_CONFIGS["custom"])
        self.base_url = base_url or self.config.get("base_url", "")
        self.model = model
        self.custom_headers = custom_headers or {}
        self.timeout = timeout
        self.max_tokens = max_tokens
        self.temperature = temperature
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            )
        return self._session

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()

    def _get_headers(self) -> Dict[str, str]:
        auth_header = self.config.get("auth_header", "Bearer")
        
        if self.provider == "anthropic":
            headers = {
                "x-api-key": self.api_key,
                "anthropic-version": self.config.get("api_version", "2023-06-01"),
                "content-type": "application/json",
            }
        else:
            headers = {
                "Authorization": f"{auth_header} {self.api_key}",
                "content-type": "application/json",
            }

        extra_headers = self.config.get("extra_headers", {})
        extra_headers.update(self.custom_headers)
        headers.update(extra_headers)

        return headers

    async def list_models(self) -> List[Dict]:
        session = await self._get_session()

        if self.provider == "anthropic":
            return [
                {"id": "claude-opus-4-20240929", "name": "Claude Opus 4"},
                {"id": "claude-sonnet-4-20240929", "name": "Claude Sonnet 4"},
                {"id": "claude-haiku-3-5-20241022", "name": "Claude Haiku 3.5"},
            ]

        if self.provider in ["ollama"]:
            url = f"{self.base_url}{self.config.get('models_endpoint', '/api/tags')}"
        else:
            url = f"{self.base_url}{self.config.get('models_endpoint', '/models')}"

        try:
            async with session.get(url, headers=self._get_headers()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if self.provider == "ollama":
                        return [{"id": m["name"], "name": m["name"]} for m in data.get("models", [])]
                    return data.get("data", [])
                elif resp.status == 401:
                    raise Exception("Invalid API key")
                else:
                    text = await resp.text()
                    raise Exception(f"Failed to fetch models: {text}")
        except aiohttp.ClientError as e:
            logger.error(f"Error listing models: {e}")
            raise

    async def chat(
        self,
        messages: List[Dict[str, str]],
        stream: bool = False,
    ) -> AsyncGenerator:
        session = await self._get_session()

        if self.provider == "anthropic":
            payload = {
                "model": self.model or "claude-haiku-3-5-20241022",
                "max_tokens": self.max_tokens,
                "messages": messages,
                "stream": stream,
            }
            url = f"{self.base_url}{self.config.get('chat_endpoint', '/v1/messages')}"
        else:
            payload = {
                "model": self.model or "gpt-3.5-turbo",
                "messages": messages,
                "max_tokens": self.max_tokens,
                "temperature": self.temperature,
                "stream": stream,
            }
            url = f"{self.base_url}{self.config.get('chat_endpoint', '/chat/completions')}"

        try:
            async with session.post(url, json=payload, headers=self._get_headers()) as resp:
                if resp.status == 200:
                    if stream:
                        async for line in resp.content:
                            if line:
                                line = line.decode().strip()
                                if line.startswith("data:"):
                                    data = line[6:]
                                    if data == "[DONE]":
                                        break
                                    yield json.loads(data)
                    else:
                        data = await resp.json()
                        if self.provider == "anthropic":
                            yield data.get("content", "")
                        else:
                            choices = data.get("choices", [])
                            if choices:
                                yield choices[0].get("message", {}).get("content", "")
                elif resp.status == 401:
                    raise Exception("Invalid API key")
                else:
                    text = await resp.text()
                    raise Exception(f"API error: {text}")
        except asyncio.TimeoutError:
            raise Exception("Request timed out")
        except aiohttp.ClientError as e:
            logger.error(f"Chat error: {e}")
            raise

    async def chat_complete(
        self,
        messages: List[Dict[str, str]],
    ) -> str:
        result = []
        async for chunk in self.chat(messages, stream=False):
            result.append(chunk)
        return "".join(result)

    async def test_connection(self) -> Dict[str, Any]:
        try:
            models = await self.list_models()
            return {
                "success": True,
                "models_count": len(models),
                "provider": self.provider,
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "provider": self.provider,
            }

    def estimate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        model_key = self.model or "gpt-3.5-turbo"
        pricing = self.MODEL_PRICING.get(model_key, {"input": 0.0, "output": 0.0})
        
        input_cost = (prompt_tokens / 1000) * pricing["input"]
        output_cost = (completion_tokens / 1000) * pricing["output"]
        
        return round(input_cost + output_cost, 6)

    async def analyze_threat(
        self,
        request_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        system_prompt = """You are a WAF (Web Application Firewall) security expert.
Analyze the following HTTP request for potential security threats.
Respond in JSON format:
{
    "is_threat": true/false,
    "threat_type": "SQLi/XSS/LFI/RFI/CMDI/XXE/SSRF/path_traversal/bot/unknown/none",
    "confidence": 0-100,
    "severity": "low/medium/high/critical",
    "explanation": "human readable reason",
    "recommendation": "block/allow/monitor",
    "suggested_rule": "optional regex pattern"
}"""

        user_message = f"""Analyze this HTTP request:
Method: {request_data.get('method')}
Path: {request_data.get('path')}
Query: {request_data.get('query')}
Body: {request_data.get('body')}
Headers: {request_data.get('headers')}
Client IP: {request_data.get('client_ip')}
User-Agent: {request_data.get('user_agent')}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]

        try:
            result = await self.chat_complete(messages)
            json_start = result.find("{")
            json_end = result.rfind("}") + 1
            
            if json_start >= 0 and json_end > json_start:
                return json.loads(result[json_start:json_end])
            else:
                return {
                    "is_threat": False,
                    "threat_type": "unknown",
                    "confidence": 0,
                    "severity": "low",
                    "explanation": "Could not parse AI response",
                    "recommendation": "allow",
                }
        except Exception as e:
            logger.error(f"Threat analysis error: {e}")
            return {
                "is_threat": False,
                "threat_type": "error",
                "confidence": 0,
                "severity": "low",
                "explanation": str(e),
                "recommendation": "allow",
            }

    async def generate_rule(self, attack_description: str) -> Dict[str, Any]:
        system_prompt = """You are a WAF rule expert. Generate ModSecurity-compatible rules.
Respond in JSON format:
{
    "rule_id": "auto_001",
    "name": "Rule name",
    "description": "What this rule detects",
    "rule_type": "sqli/xss/lfi/rfi/cmdi/xxe/ssrf/path_traversal/custom",
    "pattern": "regex pattern",
    "severity": "critical/high/medium/low",
    "action": "block",
    "explanation": "How the rule works"
}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Generate a WAF rule for: {attack_description}"},
        ]

        try:
            result = await self.chat_complete(messages)
            json_start = result.find("{")
            json_end = result.rfind("}") + 1
            
            if json_start >= 0 and json_end > json_start:
                return json.loads(result[json_start:json_end])
            else:
                return {"error": "Could not parse AI response"}
        except Exception as e:
            logger.error(f"Rule generation error: {e}")
            return {"error": str(e)}

    async def analyze_logs(self, logs: List[Dict]) -> Dict[str, Any]:
        system_prompt = """You are a WAF security analyst.
Analyze the following attack logs and provide a security report.
Include: attack patterns, trends, severity assessment, and recommendations.
Respond in JSON format:
{
    "summary": "brief summary",
    "patterns": ["pattern1", "pattern2"],
    "top_attack_types": {"sqli": count, "xss": count},
    "risk_level": "low/medium/high/critical",
    "recommendations": ["recommendation1", "recommendation2"],
    "executive_summary": "executive summary for management"
}"""

        logs_text = json.dumps(logs[:100], indent=2)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Analyze these logs:\n{logs_text}"},
        ]

        try:
            result = await self.chat_complete(messages)
            json_start = result.find("{")
            json_end = result.rfind("}") + 1
            
            if json_start >= 0 and json_end > json_start:
                return json.loads(result[json_start:json_end])
            else:
                return {"error": "Could not parse AI response"}
        except Exception as e:
            logger.error(f"Log analysis error: {e}")
            return {"error": str(e)}


class EncryptionHelper:
    @staticmethod
    def generate_key() -> str:
        return Fernet.generate_key().decode()

    @staticmethod
    def encrypt(plaintext: str, key: str) -> str:
        f = Fernet(key.encode())
        return f.encrypt(plaintext.encode()).decode()

    @staticmethod
    def decrypt(ciphertext: str, key: str) -> str:
        f = Fernet(key.encode())
        return f.decrypt(ciphertext.encode()).decode()


_encryption_key = None

def get_encryption_key() -> str:
    global _encryption_key
    if _encryption_key is None:
        _encryption_key = os.environ.get("AI_ENCRYPTION_KEY")
        if not _encryption_key:
            _encryption_key = Fernet.generate_key().decode()
            os.environ["AI_ENCRYPTION_KEY"] = _encryption_key
    return _encryption_key