from pydantic import BaseModel
from datetime import datetime

class Booking(BaseModel):
    id: str
    user_id: str
    courier_name: str
    tracking_id: str
    pickup_pin: str
    delivery_pin: str
    weight_kg: float
    is_cod: bool
    status: str
    total_cost: float
    idempotency_key: str
    created_at: datetime
    updated_at: datetime
