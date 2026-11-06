"""Nhận dạng nét vẽ tay (chữ tiếng Việt / công thức) – AI nguồn mở miễn phí.

Nhà cung cấp (VPVIE_AI_PROVIDER):
  - "ollama"    : gọi mô hình thị giác MỞ chạy cục bộ qua Ollama (miễn phí). Mặc định.
  - "anthropic" : gọi Claude (tùy chọn, cần ANTHROPIC_API_KEY).
Giao diện web còn có Tesseract.js (nguồn mở) chạy ngay trong trình duyệt, không cần máy chủ.

AI chỉ nhận dạng nội dung có trong hình, không bịa; tính toán/đồ thị do thư viện thật xử lý.
"""
import json
import os
import re
import urllib.request

def _provider():
    return os.environ.get("VPVIE_AI_PROVIDER", "ollama").lower()


def _ollama_url():
    return os.environ.get("OLLAMA_URL", "http://localhost:11434").rstrip("/")


def _ollama_model():
    return os.environ.get("VPVIE_OLLAMA_MODEL", "qwen2.5vl:7b")

_SYSTEM = (
    "Bạn là công cụ nhận dạng nét vẽ tay trên bảng dạy học của giáo viên Việt Nam. "
    "Người dùng gửi ảnh nét vẽ tay (chữ tiếng Việt có dấu, hoặc công thức toán, hoặc hình vẽ). "
    "Hãy nhận dạng CHÍNH XÁC nội dung CÓ trong ảnh, không thêm bớt, không giải bài. "
    "Chỉ trả về một JSON: "
    '{"kind":"text|math|mixed","text":"<chữ tiếng Việt nếu có>","latex":"<LaTeX kiểu KaTeX nếu là công thức>"}. '
    "Chữ thường -> kind=text. Công thức toán -> kind=math, điền latex (vd x^2-3x=0). Vừa chữ vừa công thức -> kind=mixed. "
    "Giữ nguyên dấu tiếng Việt. Không bọc JSON trong dấu ```."
)


def available() -> bool:
    p = _provider()
    if p == "anthropic":
        return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))
    if p == "ollama":
        return True  # cần Ollama chạy cục bộ; lỗi kết nối sẽ báo khi gọi
    return False


def provider_info() -> dict:
    p = _provider()
    return {"provider": p, "model": _ollama_model() if p == "ollama" else "claude-opus-5-5"}


def _hint(mode: str) -> str:
    return {
        "text": "Ưu tiên nhận dạng thành CHỮ tiếng Việt.",
        "math": "Ưu tiên nhận dạng thành CÔNG THỨC toán (LaTeX).",
        "auto": "Tự phân biệt chữ hay công thức.",
    }.get(mode, "Tự phân biệt chữ hay công thức.")


def _extract_json(text: str) -> dict:
    text = (text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?|\n?```$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.S)
        if m:
            return json.loads(m.group(0))
        return {"kind": "text", "text": text}


def _normalize(data: dict) -> dict:
    return {
        "kind": data.get("kind", "text"),
        "text": (data.get("text") or "").strip(),
        "latex": (data.get("latex") or "").strip(),
    }


def _ollama(image_png_b64: str, mode: str) -> dict:
    body = json.dumps({
        "model": _ollama_model(),
        "stream": False,
        "format": "json",
        "messages": [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": _hint(mode) + " Trả JSON như quy định.", "images": [image_png_b64]},
        ],
    }).encode("utf-8")
    req = urllib.request.Request(_ollama_url() + "/api/chat", data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        resp = json.loads(r.read().decode("utf-8"))
    content = (resp.get("message") or {}).get("content", "")
    return _normalize(_extract_json(content))


def _anthropic(image_png_b64: str, mode: str) -> dict:
    from anthropic import Anthropic
    client = Anthropic()
    msg = client.messages.create(
        model="claude-opus-5-5", max_tokens=1024, system=_SYSTEM,
        messages=[{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": image_png_b64}},
            {"type": "text", "text": _hint(mode) + " Trả JSON như quy định."},
        ]}],
    )
    text = "".join(getattr(b, "text", "") for b in msg.content if getattr(b, "type", "") == "text")
    return _normalize(_extract_json(text))


def recognize(image_png_b64: str, mode: str = "auto") -> dict:
    if _provider() == "anthropic":
        return _anthropic(image_png_b64, mode)
    return _ollama(image_png_b64, mode)
