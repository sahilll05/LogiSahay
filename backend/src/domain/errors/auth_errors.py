from fastapi import HTTPException, status

class AuthError(HTTPException):
    def __init__(self, message: str, code: str, status_code: int = status.HTTP_401_UNAUTHORIZED):
        super().__init__(status_code=status_code, detail={"error": message, "code": code})
