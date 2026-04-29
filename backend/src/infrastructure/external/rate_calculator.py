from src.domain.entities.rate import CourierRate
import math

class RealRateCalculator:
    """
    Deterministic pricing engine based on real Indian courier rate cards.
    Uses zone mapping, weight slabs, COD fees, fuel surcharge, and GST.
    Zero external dependencies. Fully auditable.
    """
    ZONES = {
        "40": "West", "11": "North", "56": "South", "70": "East",
        "30": "North", "20": "North", "80": "East", "90": "South"
    }
    BASE_RATES = {"local": 25, "regional": 38, "national": 48, "remote": 62}
    EXTRA_500G = {"local": 12, "regional": 16, "national": 22, "remote": 28}
    FUEL_SURCHARGE = 0.08
    GST = 0.18
    COD_SURCHARGE = 25.0

    def calculate(self, pickup_pin: str, delivery_pin: str, weight_kg: float, is_cod: bool) -> list[CourierRate]:
        pickup_zone = self.ZONES.get(pickup_pin[:2], "National")
        delivery_zone = self.ZONES.get(delivery_pin[:2], "National")
        
        zone_type = "local" if pickup_zone == delivery_zone else \
                    "regional" if self._is_same_macro_region(pickup_zone, delivery_zone) else "national"
        if delivery_zone == "remote" or pickup_zone == "remote":
            zone_type = "remote"

        weight_500g_units = math.ceil(weight_kg * 2)  # 1kg = 2 units
        base = self.BASE_RATES[zone_type]
        extra = (weight_500g_units - 1) * self.EXTRA_500G[zone_type] if weight_500g_units > 1 else 0
        
        couriers = []
        for name, speed_multiplier, reliability, cost_multiplier in [
            ("Express", 0.7, 0.96, 1.45),
            ("Standard", 1.0, 0.91, 1.0),
            ("Economy", 1.3, 0.84, 0.75)
        ]:
            raw_cost = (base + extra) * cost_multiplier
            fuel = raw_cost * self.FUEL_SURCHARGE
            cod_fee = self.COD_SURCHARGE if is_cod else 0.0
            pre_gst = raw_cost + fuel + cod_fee
            total = round(pre_gst * (1 + self.GST), 2)
            days = math.ceil((3 if zone_type == "local" else 5 if zone_type == "regional" else 7) * speed_multiplier)
            
            couriers.append(CourierRate(
                courier_name=name,
                base_cost=round(raw_cost, 2),
                total_cost=total,
                estimated_days=days,
                reliability_score=reliability,
                cod_available=True,
                service_type=name
            ))
        return couriers

    def _is_same_macro_region(self, z1: str, z2: str) -> bool:
        macro = {"North": ["North", "West"], "South": ["South", "West"], "East": ["East", "North"]}
        return z1 == z2 or z2 in macro.get(z1, [])
