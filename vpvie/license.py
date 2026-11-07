"""Kiểm tra bản quyền phía máy chủ (chống crack cho tính năng AI).

Dùng chung khoá công khai ECDSA P-256 với web/js/license.js. Máy chủ chỉ trả kết quả
AI khi request kèm một Key hợp lệ (chữ ký đúng + chưa hết hạn). Nhờ vậy, dù ai sửa mã
client cho "đã kích hoạt" thì vẫn không lấy được kết quả AI nếu không có Key thật.

Bật kiểm tra bằng biến môi trường:  VPVIE_REQUIRE_LICENSE=1
(Mặc định TẮT để bản miễn phí / phát triển vẫn chạy bình thường.)

Thu hồi key: liệt kê các payload-id bị thu hồi trong tệp JSON trỏ bởi
VPVIE_REVOKED_KEYS (danh sách chuỗi "m" mã máy, hoặc cả key).
"""
import base64
import json
import os
import time

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.exceptions import InvalidSignature

# Khoá công khai (SPKI, base64url) — PHẢI trùng với PUBKEY_SPKI_B64URL trong web/js/license.js
PUBKEY_SPKI_B64URL = os.environ.get(
    "VPVIE_PUBKEY",
    "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEvPnlzf4xuCNIXnDCRQnHUTtt-hST-03f7IKt4ZP9an524GUaxFzYbQqaUNYIP5Oz-HpwQr1_H0BnlZTs9J76EQ",
)


def _b64url_bytes(s: str) -> bytes:
    s = s.replace("-", "+").replace("_", "/")
    s += "=" * (-len(s) % 4)
    return base64.b64decode(s)


def _load_pubkey():
    der = _b64url_bytes(PUBKEY_SPKI_B64URL)
    return serialization.load_der_public_key(der)


_PUB = None


def require_license() -> bool:
    """Có bắt buộc kiểm tra bản quyền cho API AI không?"""
    return os.environ.get("VPVIE_REQUIRE_LICENSE", "").strip() in ("1", "true", "yes", "on")


def _revoked() -> set:
    path = os.environ.get("VPVIE_REVOKED_KEYS", "").strip()
    if not path or not os.path.exists(path):
        return set()
    try:
        with open(path, "r", encoding="utf-8") as f:
            return set(json.load(f))
    except Exception:  # noqa: BLE001
        return set()


def verify(key: str, machine_id: str = "") -> dict:
    """Trả {ok, reason, data}. Chữ ký ECDSA P-256 dạng ieee-p1363 (r||s, 64 byte)."""
    global _PUB
    key = (key or "").strip()
    parts = key.split(".")
    if len(parts) != 3 or parts[0] != "VPL1":
        return {"ok": False, "reason": "Key sai định dạng"}
    try:
        payload_bytes = _b64url_bytes(parts[1])
        data = json.loads(payload_bytes.decode("utf-8"))
        sig = _b64url_bytes(parts[2])
    except Exception:  # noqa: BLE001
        return {"ok": False, "reason": "Key hỏng"}
    if len(sig) != 64:
        return {"ok": False, "reason": "Chữ ký sai độ dài"}
    r = int.from_bytes(sig[:32], "big")
    s = int.from_bytes(sig[32:], "big")
    try:
        if _PUB is None:
            _PUB = _load_pubkey()
        _PUB.verify(encode_dss_signature(r, s), payload_bytes, ec.ECDSA(hashes.SHA256()))
    except InvalidSignature:
        return {"ok": False, "reason": "Chữ ký không hợp lệ"}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "reason": f"Lỗi kiểm tra: {e}"}
    # Ràng buộc máy (client gửi mã máy; forger không ký được nên vẫn an toàn)
    if machine_id and data.get("m") and data["m"] != machine_id:
        return {"ok": False, "reason": "Key cấp cho máy khác"}
    if data.get("e") and data["e"] > 0 and time.time() > data["e"]:
        return {"ok": False, "reason": "Key đã hết hạn"}
    rev = _revoked()
    if data.get("m") in rev or key in rev:
        return {"ok": False, "reason": "Key đã bị thu hồi"}
    return {"ok": True, "reason": "", "data": data}


def check_request(key: str, machine_id: str = "") -> dict:
    """Dùng trong API: nếu không bắt buộc license thì luôn cho qua."""
    if not require_license():
        return {"ok": True, "reason": "", "data": {"p": "free"}}
    return verify(key, machine_id)
