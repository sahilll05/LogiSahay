from src.domain.entities.rate import CourierRate

class RateNormalizer:
    TAX_RATE = 0.18  # 18% GST
    RTO_SURCHARGE = 0.12  # 12% for COD/RTO risk

    @staticmethod
    def normalize_rates(rates: list[CourierRate]) -> list[CourierRate]:
        normalized = []
        for rate in rates:
            tax = rate.base_cost * RateNormalizer.TAX_RATE
            rto = rate.total_cost * RateNormalizer.RTO_SURCHARGE if rate.cod_available else 0
            rate.total_cost = round(rate.base_cost + tax + rto, 2)
            normalized.append(rate)
        return normalized
