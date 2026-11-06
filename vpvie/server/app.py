"""Máy chủ VPVie: phục vụ giao diện web + API nhận dạng nét vẽ bằng AI."""
import os

from fastapi import FastAPI
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from ..version import __version__, APP_NAME
from ..ai import recognize as ai_recognize, available as ai_available

WEB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "web")

app = FastAPI(title=f"{APP_NAME} – Bảng dạy học", version=__version__)


class RecognizeIn(BaseModel):
    image: str          # ảnh PNG mã hóa base64 (không kèm tiền tố data:)
    mode: str = "auto"  # auto | text | math


@app.get("/api/health")
def health():
    return {"ok": True, "app": APP_NAME, "version": __version__, "ai": ai_available()}


@app.post("/api/recognize")
def recognize(body: RecognizeIn):
    if not ai_available():
        return JSONResponse(
            status_code=503,
            content={"ok": False, "error": "Chưa cấu hình khóa AI. Đặt biến môi trường ANTHROPIC_API_KEY để bật nhận dạng trực tuyến."},
        )
    img = body.image
    if "," in img and img.strip().startswith("data:"):
        img = img.split(",", 1)[1]
    try:
        result = ai_recognize(img, body.mode)
        return {"ok": True, **result}
    except Exception as e:  # noqa: BLE001
        return JSONResponse(status_code=500, content={"ok": False, "error": f"Lỗi nhận dạng: {e}"})


@app.get("/")
def index():
    return FileResponse(os.path.join(WEB_DIR, "index.html"))


# Phục vụ toàn bộ tệp tĩnh trong web/
app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
