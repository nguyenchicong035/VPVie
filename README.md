# VPVie – Bộ ứng dụng văn phòng tiếng Việt có AI

Giao diện **tiếng Việt**, thân thiện người dùng Việt Nam. AI dùng **mã nguồn mở, miễn phí**.
Module đầu tiên: **Bảng dạy học** (trọng tâm dạy toán trực tuyến + nhận diện nét vẽ).

## Tính năng Bảng dạy học
- ✍️ **Vẽ tay** (bút nhiều màu, cỡ nét, tẩy, hoàn tác, xóa) trên bảng kẻ ô.
- ✨ **Làm đẹp nét (offline)**: nét nguệch ngoạc → **đường thẳng / tròn / elip / chữ nhật / tam giác**.
- 🤖 **Nhận diện nét vẽ bằng AI nguồn mở**:
  - **Tesseract.js** – nhận chữ tiếng Việt, chạy **ngay trong trình duyệt, miễn phí, không cần máy chủ**.
  - **Ollama** (tùy chọn) – mô hình thị giác mở chạy cục bộ (nhận cả chữ lẫn công thức). Công thức trả về **LaTeX mở ra để sửa** rồi chèn.
- ∑ **Công thức toán LaTeX** (KaTeX) có xem trước.
- 📈 **Máy tính đồ thị**: nhập `y = a*x^2 + b*x + c` → tự tạo **thanh trượt tham số** a, b, c, đồ thị đổi theo thời gian thực.
- 🧮 **Máy tính khoa học** (math.js): sin, cos, log, √, lũy thừa…
- △ **Mẫu hình học**: tam giác, chữ nhật, đường tròn, hệ trục Oxy.
- 🖼️ **Xuất PNG** / 📄 **Xuất PDF** cả bảng (html2canvas + jsPDF).

## Chạy thử
```bash
pip install -r requirements.txt
python run.py            # http://127.0.0.1:8000
```
Nhận dạng **Tesseract** chạy ngay (miễn phí, không cần cấu hình).

### Bật nhận dạng bằng Ollama (mô hình mở, mạnh hơn)
```bash
# cài Ollama (ollama.com) rồi tải một mô hình thị giác mở, ví dụ:
ollama pull qwen2.5vl:7b
export VPVIE_AI_PROVIDER=ollama          # mặc định
export VPVIE_OLLAMA_MODEL=qwen2.5vl:7b
python run.py
```
Chọn "Máy chủ (Ollama/Claude)" ở ô công cụ nhận dạng. (Tùy chọn Claude: `VPVIE_AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`.)

## Thiết kế an toàn
- AI **chỉ nhận dạng** nội dung trong hình; mọi tính toán/đồ thị do thư viện thật xử lý (không để AI bịa số).
- Mọi thư viện (KaTeX, function-plot, math.js, jsPDF, html2canvas, Tesseract.js + dữ liệu `vie`/`eng`) đều **nguồn mở**, lấy từ các kho công khai trên GitHub và **đóng gói sẵn** trong `web/vendor/` → chạy được cả khi không có mạng (riêng Ollama/Claude cần dịch vụ tương ứng).

## Công nghệ
Backend FastAPI (Python). Frontend HTML/Canvas thuần. Thư viện nguồn mở: KaTeX, function-plot, math.js, Tesseract.js, jsPDF, html2canvas.

## Lộ trình
Hình học động kéo-thả • Khối câu hỏi trắc nghiệm/Đúng-Sai • Nhiều trang & sổ bài giảng • Bảng biến thiên/xét dấu • Hỏi Excel tiếng Việt • Tạo slide bằng AI • Soạn thảo Word/PowerPoint/PDF/Markdown/HTML.
