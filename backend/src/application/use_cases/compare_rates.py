from src.infrastructure.external.pincodes import PinCodeService
from src.infrastructure.external.rate_calculator import RealRateCalculator
from src.infrastructure.services.routing_engine import RoutingEngine

class CompareRates:
    def __init__(self):
        self.pincodes = PinCodeService()
        self.calculator = RealRateCalculator()
        self.engine = RoutingEngine()

    async def execute(self, pickup: str, delivery: str, weight: float, cod: bool) -> tuple[list, dict]:
        # Validate PINs first (real API call)
        pickup_details = await self.pincodes.get_details(pickup)
        delivery_details = await self.pincodes.get_details(delivery)
        if not pickup_details or not delivery_details:
            raise ValueError("Invalid or non-serviceable PIN code")

        rates = self.calculator.calculate(pickup, delivery, weight, cod)
        best = self.engine.score_and_rank(rates)
        return rates, best.model_dump()
