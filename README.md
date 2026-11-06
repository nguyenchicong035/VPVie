# VPVie – Bộ ứng dụng văn phòng tiếng Việt có AI (trực tuyến)

Giao diện **tiếng Việt**, thân thiện với người dùng Việt Nam. Module đầu tiên: **Bảng dạy học**
(trọng tâm AI cho dạy học + nhận diện nét vẽ).

## Bảng dạy học – tính năng hiện có
- ✍️ **Vẽ tay** trên bảng kẻ ô (bút nhiều màu, cỡ nét, tẩy, hoàn tác, xóa bảng).
- ✨ **Làm đẹp nét (offline)**: nét nguệch ngoạc tự thành **đường thẳng / hình tròn / elip / chữ nhật / tam giác**.
- 🤖 **Nhận diện nét vẽ bằng AI (trực tuyến)**: gửi hình vẽ → AI trả về **chữ tiếng Việt** hoặc **công thức LaTeX**, chèn lại lên bảng.
- ∑ **Công thức toán (LaTeX/KaTeX)**: hộp gõ công thức có xem trước, chèn vào bảng (kéo thả được).
- 📈 **Vẽ đồ thị từ phương trình**: nhập `y = x^2 - 2x - 3`, `sin(x)`… → vẽ đồ thị ngay trên bảng.
- △ **Mẫu hình học**: tam giác, chữ nhật, đường tròn, hệ trục Oxy.

## Chạy thử (cục bộ)
```bash
pip install -r requirements.txt
python run.py           # mở http://127.0.0.1:8000
```

## Bật AI nhận dạng (trực tuyến)
Nhận dạng nét vẽ dùng mô hình Claude (thị giác). Đặt khóa API trước khi chạy:
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
python run.py
```
Chưa có khóa thì mọi tính năng khác vẫn chạy; riêng nút **Nhận dạng AI** báo cần cấu hình khóa.

## Thiết kế an toàn
- AI **chỉ nhận dạng** nội dung có trong hình, không bịa; mọi tính toán/đồ thị do thư viện thật thực hiện.
- Thư viện KaTeX và function-plot được **đóng gói sẵn** trong `web/vendor/` nên chạy được cả khi không có mạng (chỉ nhận dạng AI cần trực tuyến).

## Công nghệ
- Backend: FastAPI (Python) + SDK `anthropic`.
- Frontend: HTML/JS thuần, Canvas; KaTeX (công thức), function-plot (đồ thị) – đều nguồn mở.

## Lộ trình (dự kiến)
Hỏi Excel tiếng Việt • Tạo slide bằng AI • Soạn thảo Word/PowerPoint/PDF/Markdown/HTML • AI hỗ trợ ở cả 6 ứng dụng.
