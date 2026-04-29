import httpx
from src.infrastructure.external.courier.base import BaseCourierClient
from src.domain.entities.rate import CourierRate
from src.domain.entities.booking import Booking
from src.infrastructure.config.settings import get_settings
from datetime import datetime
import uuid

class ShiprocketClient(BaseCourierClient):
    def __init__(self):
        settings = get_settings()
        self.base_url = "https://apiv2.shiprocket.in/v1/external"
        self.email = settings.SHIPROCKET_EMAIL
        self.password = settings.SHIPROCKET_PASSWORD
        self._token = None

    async def _get_token(self) -> str:
        if self._token:
            return self._token
        async with httpx.AsyncClient() as client:
            res = await client.post(f"{self.base_url}/auth/login", json={"email": self.email, "password": self.password})
            res.raise_for_status()
            self._token = res.json()["token"]
        return self._token

    async def get_serviceability(self, pickup_pin: str, delivery_pin: str, weight_kg: float, cod: bool) -> list[CourierRate]:
        token = await self._get_token()
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{self.base_url}/courier/serviceability",
                params={"pickup_postcode": pickup_pin, "delivery_postcode": delivery_pin, "weight": weight_kg, "cod": int(cod)},
                headers={"Authorization": f"Bearer {token}"}
            )
            res.raise_for_status()
            data = res.json()
        
        rates = []
        for item in data.get("available_courier_companies", []):
            rates.append(CourierRate(
                courier_name=item.get("courier_company_id"),
                base_cost=float(item.get("rate", 0)),
                total_cost=float(item.get("rate", 0)),
                estimated_days=int(item.get("estimated_delivery_days", 7)),
                reliability_score=0.92,  # Shiprocket doesn't expose SLA % directly, fallback to avg
                cod_available=cod,
                service_type=item.get("service_name", "Standard"),
                raw_response=item
            ))
        return rates

    async def create_booking(self, booking_data: dict) -> Booking:
        token = await self._get_token()
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{self.base_url}/orders/create/adhoc",
                json=booking_data,
                headers={"Authorization": f"Bearer {token}"}
            )
            res.raise_for_status()
            data = res.json()
        
        return Booking(
            id=str(uuid.uuid4()),
            user_id=booking_data.get("user_id", ""),
            courier_name="shiprocket",
            tracking_id=data.get("shipment_id", ""),
            pickup_pin=booking_data["order_from"].get("pin", ""),
            delivery_pin=booking_data["order_to"].get("pin", ""),
            weight_kg=float(booking_data.get("weight", 0)),
            is_cod=bool(booking_data.get("payment_method") == "COD"),
            status="booked",
            total_cost=float(booking_data.get("total_cost", 0)),
            idempotency_key=booking_data.get("idempotency_key", ""),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
