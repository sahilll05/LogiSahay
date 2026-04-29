from pydantic import BaseModel, Field

class RateCompareDTO(BaseModel):
    pickup_pin: str = Field(..., pattern=r"^\d{6}$")
    delivery_pin: str = Field(..., pattern=r"^\d{6}$")
    weight_kg: float = Field(..., gt=0, le=30)
    is_cod: bool = False

class BookingCreateDTO(BaseModel):
    user_id: str | None = None
    pickup_pin: str
    delivery_pin: str
    weight_kg: float
    is_cod: bool
    selected_courier: str  # Express, Standard, Economy
    idempotency_key: str
