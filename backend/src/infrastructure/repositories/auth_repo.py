from src.domain.repositories.interfaces import IAuthRepository
from src.infrastructure.db.supabase_client import supabase
from src.domain.errors.auth_errors import AuthError
from src.infrastructure.config.settings import get_settings
try:
    import supabase_auth.errors as auth_errors
except ImportError:
    try:
        import gotrue.errors as auth_errors
    except ImportError:
        # Fallback for newer supabase versions where errors might be in different places
        auth_errors = None

import uuid

settings = get_settings()

def get_mock_uuid(phone: str) -> str:
    # Deterministically generate a valid UUID from the phone number
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, phone))

class SupabaseAuthRepository(IAuthRepository):
    def request_otp(self, phone: str) -> None:
        if settings.APP_ENV == "development":
            print(f"🛠️ [DEV MODE] Mock OTP requested for {phone}. Use 123456 to verify.")
            return

        formatted = f"+91{phone}"
        try:
            supabase.auth.sign_in_with_otp({"phone": formatted})
        except (auth_errors.AuthRetryableError if auth_errors else Exception) as e:
            if "503" in str(e):
                raise AuthError(
                    "SMS Provider Error: If you are testing locally without Twilio, "
                    "you MUST enable 'Test OTPs' in Supabase Dashboard -> Authentication -> Providers -> Phone. "
                    f"Make sure to add '{formatted}' as a test number there!",
                    "SMS_PROVIDER_NOT_CONFIGURED",
                    503
                )
            raise AuthError(str(e), "OTP_REQUEST_FAILED", 400)
        except Exception as e:
            raise AuthError(str(e), "OTP_REQUEST_FAILED", 400)

    def verify_otp(self, phone: str, token: str) -> dict:
        if settings.APP_ENV == "development":
            if token != "123456":
                raise AuthError("Invalid or expired OTP", "OTP_VERIFICATION_FAILED", 401)
            
            user_id = get_mock_uuid(phone)
            mock_jwt = f"mock_jwt_{phone}"
            
            print(f"🛠️ [DEV MODE] Successfully verified OTP. Mocking JWT for {phone} with UUID {user_id}")
            return {
                "access_token": mock_jwt,
                "refresh_token": "mock_refresh_token",
                "user": {"id": user_id}
            }

        formatted = f"+91{phone}"
        try:
            res = supabase.auth.verify_otp({"phone": formatted, "token": token, "type": "sms"})
            if not res or not res.session:
                raise AuthError("Invalid or expired OTP", "OTP_VERIFICATION_FAILED", 401)
            
            return {
                "access_token": res.session.access_token,
                "refresh_token": res.session.refresh_token,
                "user": {"id": res.user.id} if res.user else None
            }
        except (auth_errors.AuthApiError if auth_errors else Exception) as e:
            raise AuthError("Invalid or expired OTP", "OTP_VERIFICATION_FAILED", 401)
        except Exception as e:
            raise AuthError(str(e), "OTP_VERIFICATION_FAILED", 401)

    def get_user_from_jwt(self, jwt: str) -> str:
        if settings.APP_ENV == "development" and jwt.startswith("mock_jwt_"):
            phone = jwt.replace("mock_jwt_", "")
            return get_mock_uuid(phone)

        try:
            res = supabase.auth.get_user(jwt)
            if not res or not res.user:
                raise AuthError("Invalid session", "UNAUTHORIZED", 401)
            return res.user.id
        except Exception as e:
            raise AuthError("Invalid session", "UNAUTHORIZED", 401)
