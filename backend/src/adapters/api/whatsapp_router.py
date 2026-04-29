"""
WhatsApp Router
===============
Endpoints:
  GET  /webhooks/whatsapp        — Meta webhook verification
  POST /webhooks/whatsapp        — Inbound message processing
  POST /api/whatsapp/test-send   — Send a test message (simulation-safe)
  GET  /api/whatsapp/stats       — Usage stats + mode indicator
  GET  /api/whatsapp/logs        — Last N messages from Supabase
"""

from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import logging

from src.infrastructure.config.settings import get_settings
from src.infrastructure.services.whatsapp_handler import WhatsAppHandler
from src.infrastructure.services.whatsapp_sender import WhatsAppSender

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(tags=["WhatsApp"])

# ─── Singleton handler (reused across requests) ────────────────────────────────
_handler: WhatsAppHandler | None = None
_sender: WhatsAppSender | None = None


def get_handler() -> WhatsAppHandler:
    global _handler
    if _handler is None:
        _handler = WhatsAppHandler()
    return _handler


def get_sender() -> WhatsAppSender:
    global _sender
    if _sender is None:
        _sender = WhatsAppSender()
    return _sender


# ─── DTOs ──────────────────────────────────────────────────────────────────────


class TestSendDTO(BaseModel):
    to: str
    message: str = "Hello from LogiSahay! 👋 Your logistics assistant is connected."


class WaSettingsDTO(BaseModel):
    rto_guard_enabled: bool
    sms_forward_enabled: bool


# ── In-memory settings cache (persisted to Supabase when table exists) ──────────
_WA_SETTINGS: dict = {
    "rto_guard_enabled": True,
    "sms_forward_enabled": True,
    "savings_this_month": 0,
    "ndr_prevented": 0,
    "recovery_rate": 74,
}


# ─── Webhook Verification (GET) ────────────────────────────────────────────────


@router.get("/webhooks/whatsapp", response_class=PlainTextResponse)
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
):
    """
    Meta webhook verification handshake.
    Meta sends GET with hub.mode=subscribe, hub.verify_token, hub.challenge.
    We must return hub.challenge as plain text if the token matches.
    """
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        logger.info("✅ WhatsApp webhook verified by Meta")
        return hub_challenge or ""
    logger.warning(f"❌ Webhook verification failed — token mismatch: {hub_verify_token!r}")
    raise HTTPException(status_code=403, detail="Webhook verification failed")


# ─── Inbound Message Handler (POST) ───────────────────────────────────────────


@router.post("/webhooks/whatsapp", status_code=200)
async def receive_webhook(request: Request):
    """
    Process inbound WhatsApp messages from Meta.
    Always returns 200 immediately (Meta requirement — retries on non-200).
    """
    try:
        payload = await request.json()
        logger.debug(f"WhatsApp webhook payload: {payload}")

        # Navigate Meta's nested payload structure
        entry = payload.get("entry", [])
        for e in entry:
            for change in e.get("changes", []):
                value = change.get("value", {})
                messages = value.get("messages", [])
                for msg in messages:
                    from_number = msg.get("from", "")
                    text_body = msg.get("text", {}).get("body", "")
                    if from_number and text_body:
                        # Fire and forget — don't await to stay non-blocking
                        import asyncio
                        asyncio.create_task(
                            get_handler().handle_inbound(from_number, text_body)
                        )

    except Exception as e:
        # Never return non-200 to Meta — log and swallow
        logger.error(f"WhatsApp webhook processing error: {e}")

    return {"status": "ok"}


# ─── Test Send ─────────────────────────────────────────────────────────────────


@router.post("/api/whatsapp/test-send")
async def test_send(body: TestSendDTO):
    """
    Send a test WhatsApp message.
    In simulation mode: logs to Supabase + console.
    In live mode: sends via Meta Graph API.
    Safe for demos — never fails hard.
    """
    try:
        sender = get_sender()
        result = await sender.send_text(
            to_number=body.to,
            message=body.message,
        )
        return {
            "success": True,
            "mode": "live" if sender.use_real_api else "simulation",
            **result,
        }
    except Exception as e:
        logger.error(f"test-send failed: {e}")
        return {"success": False, "status": "error", "detail": str(e)}


# ─── Stats ─────────────────────────────────────────────────────────────────────


@router.get("/api/whatsapp/stats")
async def get_stats():
    """
    Returns message usage stats + current mode.
    Counts from Supabase whatsapp_logs; falls back to demo values.
    """
    mode = "live" if settings.WHATSAPP_ACCESS_TOKEN else "simulation"
    limit = 1000
    resets_in_days = 30 - datetime.now(timezone.utc).day  # rough monthly reset

    try:
        from src.infrastructure.db.supabase_client import supabase
        # Count messages sent this month
        start_of_month = datetime.now(timezone.utc).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        ).isoformat()
        res = (
            supabase.table("whatsapp_logs")
            .select("id", count="exact")
            .eq("direction", "outbound")
            .gte("created_at", start_of_month)
            .execute()
        )
        used = res.count or 0
    except Exception:
        used = 47  # demo value

    return {
        "used": used,
        "limit": limit,
        "resets_in_days": max(resets_in_days, 1),
        "mode": mode,
        "phone_number": settings.WHATSAPP_PHONE_ID or "+91 98765 43210 (demo)",
        "business_id": settings.WHATSAPP_BUSINESS_ID or "demo-business-id",
    }


# ─── Settings ──────────────────────────────────────────────────────────────────


@router.get("/api/whatsapp/settings")
async def get_wa_settings():
    """
    Returns RTO Guard / SMS forward settings + computed savings.
    Reads from Supabase whatsapp_settings table; falls back to in-memory cache.
    Also computes savings_this_month from resolved NDR cases (₹158 avg RTO cost).
    """
    # Try to load persisted settings from Supabase
    try:
        from src.infrastructure.db.supabase_client import supabase
        res = supabase.table("whatsapp_settings").select("*").eq("id", "default").limit(1).execute()
        if res.data:
            row = res.data[0]
            _WA_SETTINGS["rto_guard_enabled"] = row.get("rto_guard_enabled", True)
            _WA_SETTINGS["sms_forward_enabled"] = row.get("sms_forward_enabled", True)
    except Exception:
        pass  # use in-memory defaults

    # Compute savings from NDR resolved cases
    try:
        from src.infrastructure.db.supabase_client import supabase
        ndr_res = supabase.table("ndr_cases").select("id, status").execute()
        cases = ndr_res.data or []
        resolved = sum(1 for c in cases if c.get("status") == "resolved")
        total = len(cases)
        recovery_rate = round((resolved / total * 100)) if total > 0 else 74
        _WA_SETTINGS["ndr_prevented"] = resolved
        _WA_SETTINGS["savings_this_month"] = resolved * 158  # ~₹158 avg saved per RTO prevented
        _WA_SETTINGS["recovery_rate"] = recovery_rate
    except Exception:
        # Use demo values if table not available
        if _WA_SETTINGS["savings_this_month"] == 0:
            _WA_SETTINGS["savings_this_month"] = 2840
            _WA_SETTINGS["ndr_prevented"] = 18
            _WA_SETTINGS["recovery_rate"] = 74

    return {"success": True, **_WA_SETTINGS}


@router.post("/api/whatsapp/settings")
async def update_wa_settings(body: WaSettingsDTO):
    """
    Update RTO Guard and SMS forward settings.
    Optimistically updates in-memory cache and persists to Supabase if table exists.
    """
    _WA_SETTINGS["rto_guard_enabled"] = body.rto_guard_enabled
    _WA_SETTINGS["sms_forward_enabled"] = body.sms_forward_enabled

    try:
        from src.infrastructure.db.supabase_client import supabase
        supabase.table("whatsapp_settings").upsert({
            "id": "default",
            "rto_guard_enabled": body.rto_guard_enabled,
            "sms_forward_enabled": body.sms_forward_enabled,
        }).execute()
        logger.info(f"WA settings updated: rto_guard={body.rto_guard_enabled}, sms_forward={body.sms_forward_enabled}")
    except Exception as e:
        logger.warning(f"Could not persist WA settings to Supabase (in-memory only): {e}")

    return {"success": True, **_WA_SETTINGS}


# ─── Message Logs ──────────────────────────────────────────────────────────────


@router.get("/api/whatsapp/logs")
async def get_logs(limit: int = Query(10, le=50)):
    """
    Returns recent WhatsApp messages from Supabase whatsapp_logs.
    Falls back to demo entries if table is empty or unavailable.
    """
    _DEMO_LOGS = [
        {
            "id": "log-001",
            "to": "919876543210",
            "content": "📦 Rate Check\n395003 → 110001 · 0.5kg\n\n✅ Best: Delhivery @ ₹58\n⏱ ETA: 3 days\n📊 Reliability: 91%",
            "msg_type": "text",
            "direction": "outbound",
            "simulated": True,
            "created_at": (datetime.now(timezone.utc) - timedelta(minutes=2)).isoformat(),
        },
        {
            "id": "log-002",
            "to": "919876543210",
            "content": "👋 Welcome to LogiSahay!\n\nHere's what I can do:\n📦 Rate Check\n📍 Track Shipment\n🛡️ RTO Guard\n🏭 Find Godown",
            "msg_type": "text",
            "direction": "outbound",
            "simulated": True,
            "created_at": (datetime.now(timezone.utc) - timedelta(minutes=8)).isoformat(),
        },
        {
            "id": "log-003",
            "to": "919812345678",
            "content": "🏭 Godowns near Surat (under ₹8k/month)\n\n1. ShreeRam Logistics Park — ₹5,500/mo\n2. Apex Warehousing Hub — ₹7,200/mo\n3. Om Storage Solutions — ₹4,800/mo",
            "msg_type": "text",
            "direction": "outbound",
            "simulated": True,
            "created_at": (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat(),
        },
        {
            "id": "log-004",
            "to": "919900001111",
            "content": "📍 Tracking: TRK908124\n\nStatus: In Transit\nLast update: Just now\n\nForward any courier SMS for auto-tracking",
            "msg_type": "text",
            "direction": "outbound",
            "simulated": True,
            "created_at": (datetime.now(timezone.utc) - timedelta(minutes=22)).isoformat(),
        },
        {
            "id": "log-005",
            "to": "919876543210",
            "content": "🛡️ RTO Guard ACTIVATED\n\nI will now automatically message your customers when delivery fails.\n\nAvg. 74% of failed deliveries recovered via WhatsApp follow-up",
            "msg_type": "text",
            "direction": "outbound",
            "simulated": True,
            "created_at": (datetime.now(timezone.utc) - timedelta(minutes=45)).isoformat(),
        },
    ]

    try:
        from src.infrastructure.db.supabase_client import supabase
        res = (
            supabase.table("whatsapp_logs")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        logs = res.data or []
        if not logs:
            return {"success": True, "source": "demo", "logs": _DEMO_LOGS, "count": len(_DEMO_LOGS)}
        return {"success": True, "source": "live", "logs": logs, "count": len(logs)}
    except Exception as e:
        logger.warning(f"WhatsApp logs query failed, returning demo: {e}")
        return {"success": True, "source": "demo", "logs": _DEMO_LOGS, "count": len(_DEMO_LOGS)}
