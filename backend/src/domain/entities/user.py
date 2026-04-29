from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class User(BaseModel):
    id: str
    phone: Optional[str] = None
    business_name: str
    gstin: Optional[str] = None
    tier: str = Field(default="freemium", pattern="^(freemium|pro|enterprise)$")
    preferred_language: str = Field(default="en", pattern="^(en|hi|gu|mr)$")
    consent_data_sharing: bool = False
    created_at: datetime
    updated_at: datetime
