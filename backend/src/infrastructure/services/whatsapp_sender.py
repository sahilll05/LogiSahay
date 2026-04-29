"""
WhatsApp Sender Service
=======================
Simulation-first: if WHATSAPP_ACCESS_TOKEN is set, sends real messages via
Meta Cloud API v18.0. Otherwise logs to Supabase + console — zero friction for demos.

To switch to real: set WHATSAPP_ACCESS_TOKEN in .env and restart.
"""

import httpx
import logging
from datetime import datetime, timezone

from src.infrastructure.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class WhatsAppSender:
    def __init__(self):
        self.use_real_api = bool(settings.WHATSAPP_ACCESS_TOKEN)
        self.phone_id = settings.WHATSAPP_PHONE_ID
        self.access_token = settings.WHATSAPP_ACCESS_TOKEN
        self.base_url = f"https://graph.facebook.com/v18.0/{self.phone_id}/messages"

        if self.use_real_api:
            logger.info("✅ WhatsApp: LIVE mode (Meta Cloud API)")
        else:
            logger.info("🧪 WhatsApp: SIMULATION mode (logging to Supabase)")

    # ─── Public API ────────────────────────────────────────────────────────────

    async def send_text(self, to_number: str, message: str) -> dict:
        """Send a plain text WhatsApp message."""
        if self.use_real_api:
            return await self._send_meta_text(to_number, message)
        return await self._simulate(to_number, message, msg_type="text")

    async def send_interactive_buttons(
        self, to_number: str, body: str, buttons: list[dict]
    ) -> dict:
        """
        Send an interactive button message.
        buttons = [{"id": "btn_retry", "title": "Retry Delivery"}, ...]
        """
        if self.use_real_api:
            return await self._send_meta_buttons(to_number, body, buttons)
        # Simulate: format the button list as readable text
        btn_text = "\n".join(f"  {i+1}. {b['title']}" for i, b in enumerate(buttons))
        sim_msg = f"{body}\n\n[Interactive Buttons]\n{btn_text}"
        return await self._simulate(to_number, sim_msg, msg_type="interactive_buttons")

    # ─── Meta Cloud API ────────────────────────────────────────────────────────

    async def _send_meta_text(self, to_number: str, message: str) -> dict:
        payload = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "type": "text",
            "text": {"preview_url": False, "body": message},
        }
        return await self._post_to_meta(payload, to_number, message)

    async def _send_meta_buttons(
        self, to_number: str, body: str, buttons: list[dict]
    ) -> dict:
        payload = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body},
                "action": {
                    "buttons": [
                        {"type": "reply", "reply": {"id": b["id"], "title": b["title"]}}
                        for b in buttons[:3]  # Meta max 3 buttons
                    ]
                },
            },
        }
        return await self._post_to_meta(payload, to_number, body)

    async def _post_to_meta(self, payload: dict, to_number: str, preview_msg: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    self.base_url,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {self.access_token}",
                        "Content-Type": "application/json",
                    },
                )
                data = resp.json()
                if resp.status_code == 200:
                    logger.info(f"📱 WhatsApp sent to {to_number}: {preview_msg[:50]}...")
                    await self._log_to_supabase(to_number, preview_msg, "text", simulated=False)
                    return {"status": "sent", "wamid": data.get("messages", [{}])[0].get("id")}
                else:
                    logger.error(f"Meta API error {resp.status_code}: {data}")
                    return {"status": "error", "detail": data}
        except httpx.ConnectError as e:
            logger.error(f"Meta API connection failed: {e}")
            return {"status": "error", "detail": "Cannot reach Meta API"}

    # ─── Simulation ────────────────────────────────────────────────────────────

    async def _simulate(self, to_number: str, message: str, msg_type: str = "text") -> dict:
        print(f"\n📱 [SIMULATED WhatsApp → {to_number}]\n{message}\n")
        logger.info(f"📱 [SIM] WhatsApp to {to_number}: {message[:80]}...")
        await self._log_to_supabase(to_number, message, msg_type, simulated=True)
        return {"status": "simulated", "to": to_number, "message": message}

    async def _log_to_supabase(
        self,
        to_number: str,
        content: str,
        msg_type: str,
        simulated: bool,
    ) -> None:
        """Best-effort Supabase log — never raises on failure."""
        try:
            from src.infrastructure.db.supabase_client import supabase
            supabase.table("whatsapp_logs").insert({
                "to": to_number,
                "content": content[:1000],
                "msg_type": msg_type,
                "direction": "outbound",
                "simulated": simulated,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as e:
            logger.debug(f"WhatsApp log to Supabase skipped: {e}")
