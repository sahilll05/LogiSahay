from src.domain.entities.rate import CourierRate

class RoutingEngine:
    @staticmethod
    def score_and_rank(rates: list[CourierRate]) -> CourierRate:
        if not rates: raise ValueError("No rates available")
        max_cost = max(r.total_cost for r in rates)
        min_days = min(r.estimated_days for r in rates)
        
        scored = []
        for r in rates:
            cost_score = 1 - (r.total_cost / max_cost)
            speed_score = 1 - (r.estimated_days / (min_days + 1))
            composite = (0.6 * cost_score) + (0.3 * r.reliability_score) + (0.1 * speed_score)
            scored.append((composite, r))
        scored.sort(key=lambda x: x[0], reverse=True)
        return scored[0][1]
