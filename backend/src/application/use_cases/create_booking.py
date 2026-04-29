from src.infrastructure.repositories.booking_repo import BookingRepository
from src.infrastructure.services.idempotency_guard import IdempotencyGuard
from src.domain.entities.booking import Booking
import uuid
from datetime import datetime

class CreateBooking:
    def __init__(self):
        self.repo = BookingRepository()

    async def execute(self, dto) -> Booking:
        cached = await IdempotencyGuard.get(dto.idempotency_key)
        if cached: return Booking(**cached)

        tracking = f"LS{datetime.utcnow().strftime('%y%m%d')}{dto.pickup_pin[2:]}{uuid.uuid4().hex[:6].upper()}"
        booking = Booking(
            id=str(uuid.uuid4()),
            user_id=dto.user_id,
            courier_name=dto.selected_courier,
            tracking_id=tracking,
            pickup_pin=dto.pickup_pin,
            delivery_pin=dto.delivery_pin,
            weight_kg=dto.weight_kg,
            is_cod=dto.is_cod,
            status="booked",
            total_cost=0.0,  # Will be calculated & updated in Phase 4
            idempotency_key=dto.idempotency_key,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        created = await self.repo.create(booking)
        await IdempotencyGuard.set(dto.idempotency_key, created.model_dump())
        return created
