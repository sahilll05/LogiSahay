from src.domain.repositories.interfaces import IUserRepository
from src.infrastructure.services.gst_validator import GSTValidator

class OnboardBusiness:
    def __init__(self, user_repo: IUserRepository, gst_validator: GSTValidator):
        self.user_repo = user_repo
        self.gst_validator = gst_validator

    def execute(self, user_id: str, phone: str, data: dict) -> dict:
        if data.get("gstin"):
            if not self.gst_validator.validate(data["gstin"]):
                raise ValueError("Invalid GSTIN format or checksum")
        return self.user_repo.upsert(user_id, {
            "phone": phone,
            "business_name": data["business_name"],
            "gstin": data.get("gstin"),
            "preferred_language": data["preferred_language"],
            "consent_data_sharing": data["consent_data_sharing"]
        })
