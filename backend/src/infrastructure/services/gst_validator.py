class GSTValidator:
    def validate(self, gstin: str) -> bool:
        import re
        if not re.match(r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$", gstin):
            return False
        base = gstin[:14]
        provided = gstin[14]
        return self._compute_checksum(base) == provided

    def _compute_checksum(self, base: str) -> str:
        chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        total = 0
        for i, c in enumerate(base):
            val = chars.index(c) * (1 if i % 2 == 0 else 2)
            total += (val // 36) + (val % 36)
        return chars[36 - (total % 36)]
