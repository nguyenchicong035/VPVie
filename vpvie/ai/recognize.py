"""Nhận dạng nét vẽ tay (chữ tiếng Việt / công thức toán) bằng Claude (thị giác).

AI chỉ nhận dạng và trả về văn bản/LaTeX; không bịa nội dung ngoài hình.
"""
import json
import os
import re

MODEL = "claude-opus-5-5"

_SYSTEM = (
    "Bạn là công cụ nhận dạng nét vẽ tay trên bảng dạy học của giáo viên Việt Nam. "
    "Người dùng gửi một ảnh chụp nét vẽ tay (có thể là chữ tiếng Việt có dấu, hoặc công thức toán học, "
    "hoặc hình vẽ). Hãy nhận dạng CHÍNH XÁC nội dung CÓ trong ảnh, không thêm bớt, không giải bài. "
    "Trả về DUY NHẤT một đối tượng JSON, không kèm giải thích, theo dạng:\n"
    '{"kind":"text|math|mixed","text":"<văn bản tiếng Việt nếu có>","latex":"<LaTeX nếu là công thức, dùng cú pháp KaTeX>"}\n'
    "Quy tắc: nếu là chữ thường -> kind=text, điền text. Nếu là công thức/biểu thức toán -> kind=math, điền latex "
    "(ví dụ phương trình bậc hai: x^2-3x=0). Nếu vừa chữ vừa công thức -> kind=mixed, điền cả hai. "
    "Giữ nguyên dấu tiếng Việt. Không bọc JSON trong ``` ."
)


def available() -> bool:
    """Có cấu hình khóa API để gọi AI trực tuyến hay không."""
    return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?|\n?```$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.S)
        if m:
            return json.loads(m.group(0))
        raise


def recognize(image_png_b64: str, mode: str = "auto") -> dict:
    """Gọi Claude để nhận dạng ảnh nét vẽ. Trả về {kind, text, latex}."""
    from anthropic import Anthropic

    hint = {
        "text": "Ưu tiên nhận dạng thành CHỮ tiếng Việt.",
        "math": "Ưu tiên nhận dạng thành CÔNG THỨC toán (LaTeX).",
        "auto": "Tự phân biệt chữ hay công thức.",
    }.get(mode, "Tự phân biệt chữ hay công thức.")

    client = Anthropic()
    msg = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=_SYSTEM,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": image_png_b64}},
                {"type": "text", "text": hint + " Trả JSON như quy định."},
            ],
        }],
    )
    text = "".join(getattr(b, "text", "") for b in msg.content if getattr(b, "type", "") == "text")
    data = _extract_json(text)
    return {
        "kind": data.get("kind", "text"),
        "text": (data.get("text") or "").strip(),
        "latex": (data.get("latex") or "").strip(),
    }
