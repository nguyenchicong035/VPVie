# VPVie – Ứng dụng máy tính (Electron) & cài trên iPad (PWA)

VPVie chạy được ở **3 dạng**, dùng chung một bộ mã giao diện:

| Dạng | Thiết bị | Cách |
|---|---|---|
| **Ứng dụng máy tính** | Windows / macOS / Linux | Electron → `.exe` / `.dmg` / `.AppImage` |
| **Cài như app (PWA)** | iPad, iPhone, Android, máy tính | Mở trong trình duyệt → "Thêm vào màn hình chính" |
| **Web** | mọi nơi | Mở bằng trình duyệt |

## A. Ứng dụng máy tính (.exe cho Windows)

Cần **Node.js 18+** trên máy build.

```bash
cd desktop
npm install
npm run dist:win     # tạo bộ cài .exe (NSIS) + .msi trong desktop/dist/
```
- `npm start` để chạy thử ngay (không đóng gói).
- `npm run dist` build cho hệ điều hành hiện tại; `dist:win` ép Windows.
- Kết quả: `desktop/dist/VPVie Setup x.y.z.exe` — gửi cho người dùng bấm đúp cài.

**AI khi chạy app:** nếu máy người dùng có **Python + fastapi/uvicorn**, app tự chạy
máy chủ AI nội bộ (nhận dạng qua máy chủ). Nếu không, app vẫn chạy **đầy đủ ngoại
tuyến** (vẽ, nắn nét, công thức, đồ thị, nhận dạng theo nét, OCR Tesseract, bản
quyền, xuất PNG/PDF). Ép ngoại tuyến bằng biến môi trường `VPVIE_FORCE_OFFLINE=1`.

> Lưu ý: build `.exe` phải chạy **trên Windows** (hoặc dùng CI Windows). Build `.dmg`
> trên macOS, `.AppImage` trên Linux. electron-builder không build chéo sang Windows
> từ Linux một cách ổn định.

## B. Cài trên iPad / iPhone / Android (PWA)

1. Mở địa chỉ VPVie bằng trình duyệt (Safari trên iPad, Chrome trên Android).
2. **iPad/iPhone:** nút Chia sẻ → **Thêm vào màn hình chính**.
   **Android:** menu ⋮ → **Cài ứng dụng** / **Thêm vào màn hình chính**.
3. Mở từ biểu tượng → chạy toàn màn hình như app, **offline được** (service worker).

PWA cần phục vụ qua **HTTPS** (hoặc `localhost`). Khi đưa lên mạng, dùng tên miền có
HTTPS thì iPad mới cài được.

## Biểu tượng
`desktop/build/icon.ico` (Windows), `icon.png` (mac/Linux), `web/icons/*` (PWA).
Thay bằng logo của bạn nếu muốn, giữ nguyên tên tệp.

## Tự cập nhật (auto-update)

App `.exe` tự cập nhật từ **GitHub Releases** (electron-updater): mở app sẽ kiểm tra,
có bản mới thì tải ngầm rồi hỏi "Khởi động lại & cập nhật". Menu ☰ → **Kiểm tra cập
nhật** để kiểm tra ngay.

**Quy trình phát hành bản mới (quan trọng):**
1. Sửa code.
2. **Tăng số phiên bản** trong `desktop/package.json` (`"version"`) — vd 1.0.0 → 1.0.1.
   (Auto-update chỉ nhận ra bản mới khi version CAO HƠN bản đang cài.)
3. Commit, rồi đẩy tag trùng version:
   ```
   git tag v1.0.1
   git push origin v1.0.1
   ```
4. GitHub Actions tự build và **publish** lên Release: `VPVie Setup 1.0.1.exe` +
   `latest.yml` (tệp để app dò bản mới) + `.blockmap`.
5. Các máy đã cài sẽ tự thấy bản mới ở lần mở kế tiếp.

> `latest.yml` do electron-builder tạo khi publish — KHÔNG xoá khỏi Release.
> Bản chưa ký số vẫn tự cập nhật được (NSIS), chỉ hiện cảnh báo SmartScreen khi cài lần đầu.

**Web/PWA** (GitHub Pages/Netlify): service worker dùng network-first cho mã ứng dụng
nên **mở lại là có bản mới** khi online; menu Kiểm tra cập nhật ép tải bản mới ngay.
