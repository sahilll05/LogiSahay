from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from src.infrastructure.db.supabase_client import supabase
from src.infrastructure.middleware.auth import get_current_user_optional
from typing import Literal
import uuid
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ndr", tags=["NDR Automation"])

# ── Demo seed data ────────────────────────────────────────────────────────────
_DEMO_CASES = [
    {"id": "SHP-8818", "tracking_id": "TRK908124", "destination": "Jaipur", "pin": "302001", "reason": "Customer not available", "attempt": 1, "status": "open", "whatsapp_sent": True, "created_at": "2026-04-27T08:00:00Z", "updated_at": "2026-04-27T08:00:00Z"},
    {"id": "SHP-8815", "tracking_id": "TRK908122", "destination": "Bhopal", "pin": "462001", "reason": "Wrong address — reply pending", "attempt": 2, "status": "open", "whatsapp_sent": True, "created_at": "2026-04-27T05:00:00Z", "updated_at": "2026-04-27T05:00:00Z"},
    {"id": "SHP-8811", "tracking_id": "TRK908119", "destination": "Lucknow", "pin": "226001", "reason": "Door locked — 2nd attempt", "attempt": 2, "status": "open", "whatsapp_sent": False, "created_at": "2026-04-26T10:00:00Z", "updated_at": "2026-04-26T10:00:00Z"},
    {"id": "SHP-8808", "tracking_id": "TRK908116", "destination": "Patna", "pin": "800001", "reason": "Phone unreachable", "attempt": 1, "status": "open", "whatsapp_sent": True, "created_at": "2026-04-26T08:00:00Z", "updated_at": "2026-04-26T08:00:00Z"},
    {"id": "SHP-8804", "tracking_id": "TRK908112", "destination": "Kanpur", "pin": "208001", "reason": "Incorrect PIN provided", "attempt": 1, "status": "open", "whatsapp_sent": False, "created_at": "2026-04-25T12:00:00Z", "updated_at": "2026-04-25T12:00:00Z"},
]

_DEMO_RESOLVED = [
    {"id": "SHP-8800", "tracking_id": "TRK908110", "destination": "Pune", "pin": "411001", "reason": "Customer rescheduled", "attempt": 1, "status": "resolved", "whatsapp_sent": True, "created_at": "2026-04-24T12:00:00Z", "updated_at": "2026-04-25T09:00:00Z"},
    {"id": "SHP-8795", "tracking_id": "TRK908105", "destination": "Hyderabad", "pin": "500001", "reason": "Address corrected", "attempt": 2, "status": "resolved", "whatsapp_sent": True, "created_at": "2026-04-23T10:00:00Z", "updated_at": "2026-04-24T11:00:00Z"},
]


class NDRActionDTO(BaseModel):
    action: Literal["resend_whatsapp", "reattempt", "initiate_rto"]
    note: str = ""


@router.get("/cases")
async def get_ndr_cases(
    filter: str = "open",
    user=Depends(get_current_user_optional),
):
    """Get NDR cases filtered by status."""
    try:
        query = supabase.table("ndr_cases").select("*").eq("status", filter)
        if user:
            query = query.eq("user_id", user.id)
        
        res = query.order("created_at", desc=True).execute()
        cases = res.data or []
        
        if not cases:
            # No data — return demo seed for the requested filter
            if filter == "open":
                return {"success": True, "source": "demo", "cases": _DEMO_CASES, "count": len(_DEMO_CASES)}
            elif filter == "resolved":
                return {"success": True, "source": "demo", "cases": _DEMO_RESOLVED, "count": len(_DEMO_RESOLVED)}
            else:
                return {"success": True, "source": "demo", "cases": [], "count": 0}
        return {"success": True, "source": "live", "cases": cases, "count": len(cases)}
    except Exception as e:
        logger.warning(f"NDR cases query failed, returning demo: {e}")
        if filter == "open":
            return {"success": True, "source": "demo", "cases": _DEMO_CASES, "count": len(_DEMO_CASES)}
        return {"success": True, "source": "demo", "cases": _DEMO_RESOLVED, "count": len(_DEMO_RESOLVED)}


@router.post("/cases/{case_id}/action")
async def ndr_action(
    case_id: str,
    body: NDRActionDTO,
    user=Depends(get_current_user_optional),
):
    """
    Trigger an action on an NDR case.
    Actions: resend_whatsapp | reattempt | initiate_rto
    Calls WhatsAppSender (simulation-safe).
    """
    now = datetime.now(timezone.utc).isoformat()
    action = body.action

    # Determine new status
    new_status = "open"
    if action == "initiate_rto":
        new_status = "rto"
    elif action == "reattempt":
        new_status = "open"
    elif action == "resend_whatsapp":
        new_status = "open"

    result = {
        "success": True,
        "case_id": case_id,
        "action": action,
        "new_status": new_status,
        "timestamp": now,
    }

    # Send WhatsApp if applicable (simulation-safe)
    if action == "resend_whatsapp":
        try:
            from src.infrastructure.services.whatsapp_sender import WhatsAppSender
            sender = WhatsAppSender()
            wa_result = await sender.send_text(
                to_number="919999999999",  # Customer phone would come from DB in production
                message=f"LogiSahay: Your delivery attempt for shipment {case_id} was unsuccessful. Please reply with your preferred re-delivery slot:\n1️⃣ Tomorrow morning (10am–2pm)\n2️⃣ Tomorrow evening (4pm–8pm)\n3️⃣ Day after tomorrow"
            )
            result["whatsapp"] = wa_result
        except Exception as e:
            logger.error(f"WhatsApp send failed for {case_id}: {e}")
            result["whatsapp"] = {"status": "error", "detail": str(e)}

    # Log action to Supabase
    try:
        supabase.table("ndr_actions").insert({
            "id": str(uuid.uuid4()),
            "case_id": case_id,
            "action": action,
            "note": body.note,
            "new_status": new_status,
            "performed_by": user.id if user else "anonymous",
            "created_at": now,
        }).execute()

        # Update case status in Supabase
        supabase.table("ndr_cases").update({
            "status": new_status,
            "updated_at": now,
            "whatsapp_sent": action == "resend_whatsapp",
        }).eq("id", case_id).execute()
    except Exception as e:
        logger.warning(f"NDR action DB write failed (demo mode): {e}")
        # Silently continue — demo still works without DB write

    return result
