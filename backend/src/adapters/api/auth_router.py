from fastapi import APIRouter, Depends, HTTPException
from src.application.dto.auth_dto import OTPRequestDTO, OTPVerifyDTO, OnboardDTO
from src.application.use_cases.verify_otp import VerifyOTP
from src.application.use_cases.onboard_business import OnboardBusiness
from src.infrastructure.repositories.auth_repo import SupabaseAuthRepository
from src.infrastructure.repositories.user_repo import UserRepository
from src.infrastructure.services.gst_validator import GSTValidator
from src.infrastructure.middleware.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & Onboarding"])

# Wire dependencies (DI pattern)
auth_repo = SupabaseAuthRepository()
user_repo = UserRepository()
gst_validator = GSTValidator()
verify_otp = VerifyOTP(auth_repo)
onboard_business = OnboardBusiness(user_repo, gst_validator)

@router.post("/otp/request")
def request_otp(dto: OTPRequestDTO):
    auth_repo.request_otp(dto.phone)
    return {"success": True, "message": "OTP sent. Check SMS."}

@router.post("/otp/verify")
def verify_otp_endpoint(dto: OTPVerifyDTO):
    session = verify_otp.execute(dto.phone, dto.token)
    return {
        "success": True,
        "user_id": session["user"]["id"],
        "access_token": session["access_token"],
        "refresh_token": session["refresh_token"],
        "message": "OTP verified. Use access_token in Authorization header for protected routes."
    }

@router.post("/onboard")
def onboard(dto: OnboardDTO, user=Depends(get_current_user)):
    try:
        result = onboard_business.execute(user.id, user.phone, dto.model_dump())
        return {"success": True, "user": result.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me")
def get_profile(user=Depends(get_current_user)):
    return {"success": True, "user": user.model_dump()}
