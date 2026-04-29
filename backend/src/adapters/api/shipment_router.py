from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from src.application.dto.shipment_dto import RateCompareDTO, BookingCreateDTO
from src.application.use_cases.compare_rates import CompareRates
from src.application.use_cases.create_booking import CreateBooking
from src.infrastructure.middleware.auth import get_current_user, get_current_user_optional
from src.infrastructure.services.geocoding_service import geocoding_service
import httpx
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/shipments", tags=["Rates & Booking"])


@router.post("/rates/compare")
async def compare_rates(
    dto: RateCompareDTO,
    user=Depends(get_current_user_optional),  # Public — no auth required for demo
):
    """
    Compare courier rates for a shipment.
    Auth is optional: authenticated users can save results to profile.
    """
    user_id = user.id if user else "anonymous"
    try:
        usecase = CompareRates()
        all_rates, best = await usecase.execute(
            dto.pickup_pin, dto.delivery_pin, dto.weight_kg, dto.is_cod
        )
        rates_data = [r.model_dump() for r in all_rates]

        # Compute market savings context
        if rates_data:
            min_cost = min(r["total_cost"] for r in rates_data)
            max_cost = max(r["total_cost"] for r in rates_data)
            market_avg = round(sum(r["total_cost"] for r in rates_data) / len(rates_data), 2)
        else:
            min_cost = max_cost = market_avg = 0

        return {
            "success": True,
            "user_id": user_id,
            "query": {
                "pickup_pin": dto.pickup_pin,
                "delivery_pin": dto.delivery_pin,
                "weight_kg": dto.weight_kg,
                "is_cod": dto.is_cod,
            },
            "all_rates": rates_data,
            "recommended": best,
            "market_analysis": {
                "min_cost": min_cost,
                "max_cost": max_cost,
                "market_avg": market_avg,
                "potential_monthly_savings": round((max_cost - min_cost) * 10, 2),
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except httpx.ConnectError:
        # PIN lookup failed — fall back without city name validation
        logger.warning("PIN lookup API unreachable, proceeding without validation")
        try:
            from src.infrastructure.external.rate_calculator import RealRateCalculator
            from src.infrastructure.services.routing_engine import RoutingEngine

            calc = RealRateCalculator()
            engine = RoutingEngine()
            rates = calc.calculate(dto.pickup_pin, dto.delivery_pin, dto.weight_kg, dto.is_cod)
            best = engine.score_and_rank(rates)
            rates_data = [r.model_dump() for r in rates]
            min_cost = min(r["total_cost"] for r in rates_data)
            max_cost = max(r["total_cost"] for r in rates_data)
            market_avg = round(sum(r["total_cost"] for r in rates_data) / len(rates_data), 2)
            return {
                "success": True,
                "user_id": user_id,
                "query": {
                    "pickup_pin": dto.pickup_pin,
                    "delivery_pin": dto.delivery_pin,
                    "weight_kg": dto.weight_kg,
                    "is_cod": dto.is_cod,
                },
                "all_rates": rates_data,
                "recommended": best.model_dump(),
                "market_analysis": {
                    "min_cost": min_cost,
                    "max_cost": max_cost,
                    "market_avg": market_avg,
                    "potential_monthly_savings": round((max_cost - min_cost) * 10, 2),
                },
                "warning": "PIN validation unavailable — rates are estimates",
            }
        except Exception as inner_e:
            raise HTTPException(status_code=503, detail="Rate service temporarily unavailable")
    except Exception as e:
        logger.error(f"Rate comparison failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/booking/create")
async def create_booking(dto: BookingCreateDTO, user=Depends(get_current_user)):
    """Create a shipment booking. Requires authentication."""
    try:
        dto.user_id = user.id
        usecase = CreateBooking()
        booking = await usecase.execute(dto)
        return {"success": True, "booking": booking.model_dump()}
    except Exception as e:
        logger.error(f"Booking creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Booking failed: {str(e)}")


@router.get("/geocoding/{pincode}")
async def get_pincode_coords(pincode: str):
    """
    Returns coordinates for a given Indian PIN code.
    Layer 1: SQLite cache (from IN.csv). Layer 2: Nominatim API (auto-cached).
    """
    if len(pincode) != 6 or not pincode.isdigit():
        raise HTTPException(status_code=400, detail="Invalid 6-digit PIN code")

    result = await geocoding_service.get_coordinates(pincode)
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"PIN code {pincode} not found in dataset or geocoding service"
        )

    return result

