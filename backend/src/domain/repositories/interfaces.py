from abc import ABC, abstractmethod
from src.domain.entities.user import User
from typing import Optional

class IAuthRepository(ABC):
    @abstractmethod
    def request_otp(self, phone: str) -> None: ...
    @abstractmethod
    def verify_otp(self, phone: str, token: str) -> dict: ...  # Returns Supabase session
    @abstractmethod
    def get_user_from_jwt(self, jwt: str) -> str: ...          # Returns user_id

class IUserRepository(ABC):
    @abstractmethod
    def find_by_id(self, user_id: str) -> Optional[User]: ...
    @abstractmethod
    def upsert(self, user_id: str, data: dict) -> User: ...
