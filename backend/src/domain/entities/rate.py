from pydantic import BaseModel

class CourierRate(BaseModel):
    courier_name: str
    base_cost: float
    total_cost: float  # includes taxes, fuel, RTO surcharge
    estimated_days: int
    reliability_score: float  # 0.0 to 1.0
    cod_available: bool
    service_type: str
    raw_response: dict | None = None
