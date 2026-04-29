from src.infrastructure.db.supabase_client import supabase
from src.domain.entities.booking import Booking
import uuid
from datetime import datetime

class BookingRepository:
    async def create(self, booking: Booking) -> Booking:
        payload = booking.model_dump(exclude={"created_at", "updated_at"})
        payload["created_at"] = datetime.utcnow().isoformat()
        payload["updated_at"] = payload["created_at"]
        
        res = await supabase.table("shipments").insert(payload).execute()
        if not res.data: raise Exception("Booking persistence failed")
        return Booking(**res.data[0])
