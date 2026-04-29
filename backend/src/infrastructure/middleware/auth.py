from fastapi import Request, Depends
from typing import Optional
from src.infrastructure.repositories.auth_repo import SupabaseAuthRepository
from src.infrastructure.repositories.user_repo import UserRepository
from src.domain.errors.auth_errors import AuthError

auth_repo = SupabaseAuthRepository()
user_repo = UserRepository()


def get_current_user(request: Request):
    """Fallback dummy user to skip auth."""
    from src.domain.entities.user import User
    from datetime import datetime
    return User(
        id="dummy-user",
        business_name="Demo User",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

def get_current_user_optional(request: Request) -> Optional[object]:
    """Fallback dummy user to skip auth."""
    from src.domain.entities.user import User
    from datetime import datetime
    return User(
        id="dummy-user",
        business_name="Demo User",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
