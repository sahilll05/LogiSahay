import httpx
from src.infrastructure.external.courier.base import BaseCourierClient
from src.domain.entities.rate import CourierRate
from src.domain.entities.booking import Booking
from src.infrastructure.config.settings import get_settings
from datetime import datetime
import uuid

class DelhiveryClient(BaseCourierClient):
    def __init__(self):
        settings = get_settings()
        self.base_url = "https://track.delhivery.com/api/v1"
        self.api_key = settings.DELHIVERY_API_KEY
        self.partner_code = settings.DELHIVERY_PARTNER_CODE

    async def get_serviceability(self, pickup_pin: str, delivery_pin: str, weight_kg: float, cod: bool) -> list[CourierRate]:
        # Delhivery doesn't have a public rate calculator without partner auth
        # Using their Pincodes API as fallback for serviceability check + mock rate structure
        # In production, replace with actual Delhivery Rate Card API
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{self.base_url}/packages/client/pin/codes/",
                params={"filter_codes": delivery_pin},
                headers={"Authorization": f"Token {self.api_key}"}
        )
            res.raise_for_status()
            # Normalize to standard rate format
            return [CourierRate(
                courier_name="delhivery",
                base_cost=weight_kg * 28.5 + (12.0 if cod else 0.0),  # Base pricing formula
                total_cost=weight_kg * 31.2 + (14.5 if cod else 0.0),
                estimated_days=3,
                reliability_score=0.95,
                cod_available=cod,
                service_type="Surface",
                raw_response=res.json()
            )]

    async def create_booking(self, booking_data: dict) -> Booking:
        # Simplified booking creation for Phase 3
        # Replace with actual Delhivery Manifest/Booking API in Phase 4
        return Booking(
            id=str(uuid.uuid4()),
            user_id=booking_data.get("user_id", ""),
            courier_name="delhivery",
            tracking_id=f"DLY{int(datetime.utcnow().timestamp())}",
            pickup_pin=booking_data.get("pickup_pin", ""),
            delivery_pin=booking_data.get("delivery_pin", ""),
            weight_kg=float(booking_data.get("weight_kg", 0)),
            is_cod=bool(booking_data.get("is_cod", False)),
            status="booked",
            total_cost=float(booking_data.get("total_cost", 0)),
            idempotency_key=booking_data.get("idempotency_key", ""),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
