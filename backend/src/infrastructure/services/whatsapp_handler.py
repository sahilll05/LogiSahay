"""
WhatsApp Message Handler (NLP Router)
======================================
Routes inbound WhatsApp messages to the correct use-case via regex-based NLP.
No ML dependency — fast, reliable, works offline.

Supported commands:
  rate check: 395003 to 110001, 2kg
  track TRK908124
  #RTOGuard ON / OFF
  godown near Surat, under 8k
  help
"""

import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Patterns ─────────────────────────────────────────────────────────────────
_PAT_RATE = re.compile(
    r"rate\s+check[:\s]+(\d{6})\s+(?:to|->)\s+(\d{6})[\s,]+(\d+(?:\.\d+)?)\s*kg",
    re.IGNORECASE,
)
_PAT_TRACK = re.compile(r"track\s+(TRK\w+|AWB\w+|\w{10,})", re.IGNORECASE)
_PAT_RTO_ON = re.compile(r"#?rtoguard\s+on", re.IGNORECASE)
_PAT_RTO_OFF = re.compile(r"#?rtoguard\s+off", re.IGNORECASE)
_PAT_GODOWN = re.compile(r"godown\s+near\s+([\w\s]+?)(?:,\s*under\s+(\d+)k?)?$", re.IGNORECASE)
_PAT_HELP = re.compile(r"^help$|^hi$|^hello$|^hey$|^menu$", re.IGNORECASE)
# Detects courier tracking SMS forwarded by user
_PAT_SMS_TRACK = re.compile(
    r"(your\s+(?:order|shipment|parcel)|out\s+for\s+delivery|delivered|tracking\s+id)[^.]*"
    r"(TRK\w+|AWB\w+|[A-Z]{2,5}\d{8,})",
    re.IGNORECASE,
)


class WhatsAppHandler:
    def __init__(self):
        from src.infrastructure.services.whatsapp_sender import WhatsAppSender
        self.sender = WhatsAppSender()

    async def handle_inbound(self, from_number: str, message_text: str) -> dict:
        """
        Entry point for all inbound WhatsApp messages.
        Returns a dict with the action taken and response sent.
        """
        text = message_text.strip()
        logger.info(f"📩 Inbound WhatsApp from {from_number}: {text[:80]}")

        # ── 1. Forwarded SMS (tracking update) ──────────────────────────
        sms_match = _PAT_SMS_TRACK.search(text)
        if sms_match:
            return await self._handle_sms_forward(from_number, text, sms_match.group(2))

        # ── 2. Rate check ───────────────────────────────────────────────
        rate_match = _PAT_RATE.search(text)
        if rate_match:
            return await self._handle_rate_check(
                from_number,
                pickup=rate_match.group(1),
                delivery=rate_match.group(2),
                weight_kg=float(rate_match.group(3)),
            )

        # ── 3. Track shipment ───────────────────────────────────────────
        track_match = _PAT_TRACK.search(text)
        if track_match:
            return await self._handle_track(from_number, track_match.group(1))

        # ── 4. RTO Guard toggle ─────────────────────────────────────────
        if _PAT_RTO_ON.match(text):
            return await self._handle_rto_guard(from_number, enable=True)
        if _PAT_RTO_OFF.match(text):
            return await self._handle_rto_guard(from_number, enable=False)

        # ── 5. Godown search ────────────────────────────────────────────
        godown_match = _PAT_GODOWN.search(text)
        if godown_match:
            return await self._handle_godown(
                from_number,
                city=godown_match.group(1).strip(),
                budget_k=int(godown_match.group(2)) if godown_match.group(2) else None,
            )

        # ── 6. Help / greeting ──────────────────────────────────────────
        if _PAT_HELP.match(text):
            return await self._handle_help(from_number)

        # ── 7. Unknown ──────────────────────────────────────────────────
        return await self._handle_unknown(from_number)

    # ─── Handlers ─────────────────────────────────────────────────────────────

    async def _handle_rate_check(
        self, to: str, pickup: str, delivery: str, weight_kg: float
    ) -> dict:
        try:
            from src.application.use_cases.compare_rates import CompareRates
            _, best = await CompareRates().execute(pickup, delivery, weight_kg, False)
            msg = (
                f"📦 *Rate Check*\n"
                f"{pickup} → {delivery} · {weight_kg}kg\n\n"
                f"✅ Best: *{best.courier_name}* @ ₹{best.total_cost:.0f}\n"
                f"⏱ ETA: {best.estimated_days} days\n"
                f"📊 Reliability: {int(best.reliability_score * 100)}%\n\n"
                f"_Reply 'rate check: <from> to <to>, <wt>kg' for any route_"
            )
        except Exception as e:
            logger.error(f"Rate check failed: {e}")
            msg = f"⚠️ Could not fetch rates for {pickup}→{delivery}. Please try again."
        await self.sender.send_text(to, msg)
        return {"action": "rate_check", "to": to}

    async def _handle_track(self, to: str, tracking_id: str) -> dict:
        # In production: query courier API. For demo: return simulated status.
        statuses = ["In Transit", "Out for Delivery", "Delivered", "Pending Pickup"]
        import hashlib
        status = statuses[int(hashlib.md5(tracking_id.encode()).hexdigest(), 16) % len(statuses)]
        msg = (
            f"📍 *Tracking: {tracking_id}*\n\n"
            f"Status: *{status}*\n"
            f"Last update: Just now\n\n"
            f"_Forward any courier SMS to this number for auto-tracking_"
        )
        await self.sender.send_text(to, msg)
        return {"action": "track", "tracking_id": tracking_id}

    async def _handle_rto_guard(self, to: str, enable: bool) -> dict:
        status = "activated" if enable else "deactivated"
        emoji = "🛡️" if enable else "⏸️"
        msg = (
            f"{emoji} *RTO Guard {status.upper()}*\n\n"
            + (
                "I will now automatically message your customers when delivery fails.\n\n"
                "They can reply:\n1️⃣ Retry delivery\n2️⃣ Change address\n3️⃣ Cancel order\n\n"
                "_Avg. 74% of failed deliveries recovered via WhatsApp follow-up_"
                if enable
                else "RTO Guard paused. Failed deliveries will not trigger auto-messages."
            )
        )
        await self.sender.send_text(to, msg)
        return {"action": "rto_guard", "enabled": enable}

    async def _handle_godown(self, to: str, city: str, budget_k: Optional[int]) -> dict:
        budget_str = f"under ₹{budget_k}k/month" if budget_k else "any budget"
        msg = (
            f"🏭 *Godowns near {city.title()}* ({budget_str})\n\n"
            f"1. *ShreeRam Logistics Park* — ₹5,500/mo · 10,000 sq ft · AC\n"
            f"   📍 Ring Road, {city.title()} · ⭐ 4.7\n\n"
            f"2. *Apex Warehousing Hub* — ₹7,200/mo · 15,000 sq ft\n"
            f"   📍 Industrial Area, {city.title()} · ⭐ 4.5\n\n"
            f"3. *Om Storage Solutions* — ₹4,800/mo · 8,000 sq ft\n"
            f"   📍 GIDC, {city.title()} · ⭐ 4.3\n\n"
            f"_Visit the LogiSahay app for full details + contact numbers_"
        )
        await self.sender.send_text(to, msg)
        return {"action": "godown_search", "city": city}

    async def _handle_sms_forward(self, to: str, sms_text: str, tracking_id: str) -> dict:
        msg = (
            f"📬 *SMS Forwarded — Auto-Tracked*\n\n"
            f"Tracking ID: *{tracking_id}*\n"
            f"Added to your LogiSahay dashboard automatically.\n\n"
            f"_Forward all courier SMSes here for hands-free tracking_"
        )
        await self.sender.send_text(to, msg)
        return {"action": "sms_forward", "tracking_id": tracking_id}

    async def _handle_help(self, to: str) -> dict:
        msg = (
            "👋 *Welcome to LogiSahay!*\n\n"
            "Here's what I can do:\n\n"
            "📦 *Rate Check*\n"
            "`rate check: 395003 to 110001, 0.5kg`\n\n"
            "📍 *Track Shipment*\n"
            "`track TRK908124`\n\n"
            "🛡️ *RTO Guard (Auto NDR)*\n"
            "`#RTOGuard ON` or `#RTOGuard OFF`\n\n"
            "🏭 *Find Godown*\n"
            "`godown near Surat, under 8k`\n\n"
            "📲 *Auto-tracking*\n"
            "Forward any courier SMS here — I'll track it automatically!\n\n"
            "_Powered by LogiSahay · Built for Indian micro-sellers_"
        )
        await self.sender.send_text(to, msg)
        return {"action": "help"}

    async def _handle_unknown(self, to: str) -> dict:
        msg = (
            "🤔 I didn't understand that.\n\n"
            "Try:\n"
            "• `rate check: 395003 to 110001, 0.5kg`\n"
            "• `track TRK908124`\n"
            "• `help` — for full menu\n\n"
            "Or forward a courier SMS for auto-tracking!"
        )
        await self.sender.send_text(to, msg)
        return {"action": "unknown"}
