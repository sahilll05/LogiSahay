from src.domain.repositories.interfaces import IAuthRepository

class VerifyOTP:
    def __init__(self, auth_repo: IAuthRepository):
        self.auth_repo = auth_repo

    def execute(self, phone: str, token: str) -> dict:
        return self.auth_repo.verify_otp(phone, token)
