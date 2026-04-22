from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, List
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiohttp
import asyncio
# Lazy import for get_current_admin
def get_current_admin():
    from backend.main import get_current_admin as gca
    return gca
# from backend.main import get_current_admin
from backend.models.database import WebhookConfig, Alert, async_session, AdminUser
from backend.api.websocket import manager
from sqlalchemy import select
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()


class EmailConfig(BaseModel):
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    from_email: str
    to_emails: List[str]


class WebhookCreate(BaseModel):
    url: str
    name: str
    event_types: List[str]
    headers: Dict = {}


class TelegramConfig(BaseModel):
    bot_token: str
    chat_id: str


class NotificationService:
    def __init__(self):
        self.email_config: Optional[EmailConfig] = None
        self.telegram_config: Optional[TelegramConfig] = None
        self._webhooks = []

    def set_email_config(self, config: EmailConfig):
        self.email_config = config

    def set_telegram_config(self, config: TelegramConfig):
        self.telegram_config = config

    def add_webhook(self, webhook: 'WebhookConfigDB'):
        self._webhooks.append(webhook)

    async def send_alert(
        self,
        title: str,
        message: str,
        severity: str = "high",
        attack_type: str = None,
        source_ip: str = None
    ):
        # Save alert to Database for persistence
        try:
            async with async_session() as session:
                new_alert = Alert(
                    severity=severity,
                    title=title,
                    message=message,
                    source_ip=source_ip,
                    attack_type=attack_type,
                    timestamp=datetime.utcnow()
                )
                session.add(new_alert)
                await session.commit()

                # Get active webhooks from DB
                result = await session.execute(
                    select(WebhookConfig).where(WebhookConfig.is_active == True)
                )
                webhooks = result.scalars().all()

                # Broadcast via WebSocket for Live Dashboard/Globe
                from backend.utils.helpers import get_geo_info
                geo = await get_geo_info(source_ip) if source_ip else {}
                
                await manager.broadcast_alert({
                    "title": title,
                    "message": message,
                    "severity": severity,
                    "attack_type": attack_type,
                    "client_ip": source_ip,
                    "country": geo.get("country", "XX"),
                    "timestamp": datetime.utcnow().isoformat()
                })
        except Exception as e:
            logger.error(f"Failed to persist alert or fetch webhooks: {e}")
            webhooks = []

        tasks = []

        if self.email_config and severity in ["critical", "high"]:
            tasks.append(self._send_email(title, message))

        for webhook in webhooks:
            # Persistent webhooks from DB
            if "all" in webhook.event_types or severity in webhook.event_types:
                tasks.append(self._send_webhook(webhook, title, message, severity))

        if self.telegram_config and severity == "critical":
            tasks.append(self._send_telegram(title, message))

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _send_email(self, title: str, message: str):
        if not self.email_config:
            return

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"[UltraShield WAF] {title}"
            msg["From"] = self.email_config.from_email
            msg["To"] = ", ".join(self.email_config.to_emails)

            html = f"""
            <html>
            <body style="font-family: Arial, sans-serif;">
                <h2 style="color: #ef4444;">{title}</h2>
                <p>{message}</p>
                <p>This is an automated alert from UltraShield WAF.</p>
            </body>
            </html>
            """
            part = MIMEText(html, "html")
            msg.attach(part)

            with smtplib.SMTP(
                self.email_config.smtp_host,
                self.email_config.smtp_port
            ) as server:
                server.starttls()
                server.login(
                    self.email_config.smtp_user,
                    self.email_config.smtp_password
                )
                server.send_message(msg)

            logger.info(f"Email alert sent: {title}")
        except Exception as e:
            logger.error(f"Failed to send email: {e}")

    async def _send_webhook(self, webhook: WebhookConfig, title: str, message: str, severity: str):
        try:
            url_lower = webhook.url.lower()
            payload = {
                "title": title,
                "message": message,
                "severity": severity,
                "source": "UltraShield WAF",
                "timestamp": datetime.utcnow().isoformat()
            }

            # DISCORD Specialization
            if "discord.com/api/webhooks" in url_lower:
                color = 0xef4444 if severity == "critical" else 0xf97316
                payload = {
                    "embeds": [{
                        "title": f"UltraShield {title}",
                        "description": message,
                        "color": color,
                        "footer": {"text": "UltraShield WAF Protection"},
                        "timestamp": datetime.utcnow().isoformat()
                    }]
                }

            # SLACK Specialization
            elif "hooks.slack.com/services" in url_lower:
                emoji = "red_circle" if severity == "critical" else "large_orange_circle"
                payload = {
                    "text": f"*{title}*\n{message}\n_Source: UltraShield WAF_"
                }

            async with aiohttp.ClientSession() as session:
                await session.post(
                    webhook.url,
                    json=payload,
                    headers=webhook.headers or {}
                )

            logger.info(f"Specialized alert sent to {webhook.name}")
        except Exception as e:
            logger.error(f"Failed to send webhook {webhook.name}: {e}")

    async def _send_telegram(self, title: str, message: str):
        if not self.telegram_config:
            return

        try:
            text = f"🔴 *{title}*\n\n{message}"
            payload = {
                "chat_id": self.telegram_config.chat_id,
                "text": text,
                "parse_mode": "Markdown"
            }

            url = f"https://api.telegram.org/bot{self.telegram_config.bot_token}/sendMessage"

            async with aiohttp.ClientSession() as session:
                await session.post(url, json=payload)

            logger.info(f"Telegram alert sent")
        except Exception as e:
            logger.error(f"Failed to send telegram: {e}")


notification_service = NotificationService()


@router.post("/notifications/email")
async def configure_email(
    config: EmailConfig,
    admin: AdminUser = Depends(get_current_admin),
    notification = notification_service
):
    notification.set_email_config(config)
    return {"message": "Email configured"}


@router.post("/notifications/webhook")
async def configure_webhook(
    webhook: WebhookCreate,
    admin: AdminUser = Depends(get_current_admin),
    notification = notification_service
):
    from backend.models.database import WebhookConfig as WebhookConfigDB
    db_webhook = WebhookConfigDB(
        name=webhook.name,
        url=webhook.url,
        event_types=webhook.event_types,
        headers=webhook.headers
    )
    notification.add_webhook(db_webhook)
    return {"message": "Webhook added"}


@router.post("/notifications/telegram")
async def configure_telegram(
    config: TelegramConfig,
    admin: AdminUser = Depends(get_current_admin),
    notification = notification_service
):
    notification.set_telegram_config(config)
    return {"message": "Telegram configured"}


@router.post("/test-notification")
async def test_notification(
    admin: AdminUser = Depends(get_current_admin),
    notification = notification_service
):
    await notification_service.send_alert(
        title="Test Alert",
        message="This is a test notification from UltraShield WAF",
        severity="high"
    )
    return {"message": "Test notification sent"}


notes_router = router