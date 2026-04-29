from src.domain.repositories.interfaces import IUserRepository
from src.infrastructure.db.supabase_client import supabase
from src.domain.entities.user import User
from typing import Optional

class UserRepository(IUserRepository):
    def find_by_id(self, user_id: str) -> Optional[User]:
        res = supabase.table("users").select("*").eq("id", user_id).execute()
        return User(**res.data[0]) if res.data else None

    def upsert(self, user_id: str, data: dict) -> User:
        payload = {
            "id": user_id,
            "phone": data.get("phone"),
            "business_name": data["business_name"],
            "gstin": data.get("gstin"),
            "preferred_language": data.get("preferred_language", "en"),
            "consent_data_sharing": data.get("consent_data_sharing", False)
        }
        res = supabase.table("users").upsert(payload, on_conflict="id").execute()
        if not res.data:
            raise Exception("Failed to persist user profile")
        return User(**res.data[0])
