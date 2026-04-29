from pydantic import BaseModel, Field, field_validator

class OTPRequestDTO(BaseModel):
    phone: str = Field(..., pattern=r"^[6-9]\d{9}$", description="10-digit Indian phone number")

class OTPVerifyDTO(BaseModel):
    phone: str = Field(..., pattern=r"^[6-9]\d{9}$")
    token: str = Field(..., min_length=6, max_length=6)

class OnboardDTO(BaseModel):
    business_name: str = Field(..., min_length=3, max_length=100)
    gstin: str | None = Field(None, pattern=r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$")
    preferred_language: str = "en"
    consent_data_sharing: bool

    @field_validator("consent_data_sharing")
    @classmethod
    def enforce_dpdp(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Data sharing consent is mandatory under DPDP Act 2023")
        return v
