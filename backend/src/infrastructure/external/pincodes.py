import httpx
from typing import Optional

class PinCodeService:
    async def get_details(self, pin: str) -> Optional[dict]:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"https://api.postalpincode.in/pincode/{pin}")
            res.raise_for_status()
            data = res.json()
            if data and data[0].get("Status") == "Success":
                post_office = data[0].get("PostOffice", [{}])[0]
                return {
                    "district": post_office.get("District", ""),
                    "state": post_office.get("State", ""),
                    "delivery": post_office.get("DeliveryStatus", "N/A") == "Delivery"
                }
            return None
