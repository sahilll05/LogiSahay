from fastapi import Request, Depends
from typing import Optional
from src.infrastructure.repositories.auth_repo import SupabaseAuthRepository
from src.infrastructure.repositories.user_repo import UserRepository
from src.domain.errors.auth_errors import AuthError

auth_repo = SupabaseAuthRepository()
user_repo = UserRepository()


def get_current_user(request: Request):
    """Strict auth — raises 401 if no valid token."""
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        raise AuthError("Missing authorization token", "UNAUTHORIZED")
    jwt = token.split(" ")[1]
    user_id = auth_repo.get_user_from_jwt(jwt)
    user = user_repo.find_by_id(user_id)
    if not user:
        raise AuthError("User profile not initialized", "UNAUTHORIZED")
    return user


def get_current_user_optional(request: Request) -> Optional[object]:
    """
    Soft auth — returns user if token valid, else None.
    Use this on public endpoints where auth is optional (e.g. rate comparison).
    Post-hackathon: swap this for get_current_user to enforce login.
    """
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        return None
    try:
        jwt = token.split(" ")[1]
        user_id = auth_repo.get_user_from_jwt(jwt)
        return user_repo.find_by_id(user_id)
    except Exception:
        return None
