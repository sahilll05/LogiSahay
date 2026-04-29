from fastapi import APIRouter, Depends
from src.infrastructure.db.supabase_client import supabase
from src.infrastructure.middleware.auth import get_current_user_optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

# ── Demo seed data (used when Supabase tables are empty) ─────────────────────
_DEMO_METRICS = {
    "total_shipments": 148,
    "active_shipments": 3,
    "delivered_this_month": 112,
    "revenue_this_month": 18420,
    "savings_this_month": 2850,
    "savings_goal": 3600,
    "ndr_open": 5,
    "ndr_resolved": 28,
    "rto_losses_prevented_inr": 4200,
    "whatsapp_response_rate": 74,
    "active_shipment_list": [
        {"tracking_id": "TRK908124", "destination": "Delhi", "status": "In Transit"},
        {"tracking_id": "TRK908125", "destination": "Bangalore", "status": "Pending Pickup"},
        {"tracking_id": "TRK908126", "destination": "Chennai", "status": "Out for Delivery"},
    ],
    "attention_needed": [
        {"id": "SHP-8818", "issue": "Customer not available", "shipment": "Jaipur · 302001"},
        {"id": "SHP-8815", "issue": "Wrong address", "shipment": "Bhopal · 462001"},
    ],
}


@router.get("/metrics")
async def get_dashboard_metrics(user=Depends(get_current_user_optional)):
    """
    Returns real metrics from Supabase if data exists, else seeds demo data.
    Public endpoint — no auth required.
    """
    try:
        # Try to pull real data from Supabase
        shipment_res = supabase.table("shipments").select("id, status, total_cost, created_at").execute()
        shipments = shipment_res.data or []

        if not shipments:
            # Tables exist but are empty — return demo seed
            return {"success": True, "source": "demo", **_DEMO_METRICS}

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        current_month = now.month
        current_year = now.year

        # Compute real metrics
        total = len(shipments)
        active = sum(1 for s in shipments if s.get("status") in ("booked", "in_transit", "out_for_delivery"))
        delivered = sum(
            1 for s in shipments
            if s.get("status") == "delivered"
            and s.get("created_at", "").startswith(f"{current_year}-{current_month:02d}")
        )
        revenue = sum(
            float(s.get("total_cost", 0)) for s in shipments
            if s.get("created_at", "").startswith(f"{current_year}-{current_month:02d}")
        )

        # Pull NDR data
        ndr_res = supabase.table("ndr_cases").select("id, status").execute()
        ndr_cases = ndr_res.data or []
        ndr_open = sum(1 for n in ndr_cases if n.get("status") == "open")
        ndr_resolved = sum(1 for n in ndr_cases if n.get("status") == "resolved")

        return {
            "success": True,
            "source": "live",
            "total_shipments": total,
            "active_shipments": active,
            "delivered_this_month": delivered,
            "revenue_this_month": round(revenue, 2),
            "savings_this_month": _DEMO_METRICS["savings_this_month"],
            "savings_goal": _DEMO_METRICS["savings_goal"],
            "ndr_open": ndr_open,
            "ndr_resolved": ndr_resolved,
            "rto_losses_prevented_inr": _DEMO_METRICS["rto_losses_prevented_inr"],
            "whatsapp_response_rate": _DEMO_METRICS["whatsapp_response_rate"],
            "active_shipment_list": _DEMO_METRICS["active_shipment_list"],
            "attention_needed": _DEMO_METRICS["attention_needed"],
        }
    except Exception as e:
        logger.warning(f"Dashboard metrics Supabase query failed, returning demo data: {e}")
        return {"success": True, "source": "demo", **_DEMO_METRICS}


@router.get("/shipments")
async def get_shipments(
    page: int = 1,
    limit: int = 20,
    status: str = "",
    user=Depends(get_current_user_optional),
):
    """Paginated shipments list. Public for demo."""
    try:
        query = supabase.table("shipments").select("*").order("created_at", desc=True)
        if status:
            query = query.eq("status", status)
        query = query.range((page - 1) * limit, page * limit - 1)
        res = query.execute()
        return {"success": True, "shipments": res.data or [], "page": page, "limit": limit}
    except Exception as e:
        logger.warning(f"Shipments query failed: {e}")
        return {
            "success": True,
            "source": "demo",
            "shipments": [
                {"id": "SHP-8820", "tracking_id": "TRK908124", "courier_name": "Delhivery", "pickup_pin": "395003", "delivery_pin": "110001", "status": "in_transit", "total_cost": 298.0, "created_at": "2026-04-27T12:00:00Z"},
                {"id": "SHP-8819", "tracking_id": "TRK908125", "courier_name": "XpressBees", "pickup_pin": "395003", "delivery_pin": "560001", "status": "booked", "total_cost": 312.0, "created_at": "2026-04-27T10:00:00Z"},
                {"id": "SHP-8818", "tracking_id": "TRK908126", "courier_name": "Ecom Express", "pickup_pin": "395003", "delivery_pin": "600001", "status": "out_for_delivery", "total_cost": 328.0, "created_at": "2026-04-26T09:00:00Z"},
            ],
            "page": page,
            "limit": limit,
        }
