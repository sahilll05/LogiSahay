from abc import ABC, abstractmethod
from src.domain.entities.rate import CourierRate
from src.domain.entities.booking import Booking

class BaseCourierClient(ABC):
    @abstractmethod
    async def get_serviceability(self, pickup_pin: str, delivery_pin: str, weight_kg: float, cod: bool) -> list[CourierRate]: ...
    @abstractmethod
    async def create_booking(self, booking_data: dict) -> Booking: ...
