# 📦 PORTABLE EXTENSION PACKAGE - HƯỚNG DẪN SỬ DỤNG

## 🎯 Mục đích
Package này chứa extension **đã build sẵn**, có thể copy sang bất kỳ máy Windows nào và sử dụng ngay **KHÔNG CẦN** cài đặt Node.js, GitHub hay bất kỳ tool nào khác!

---

## ✅ Đã có sẵn trong package

File: **PORTABLE_EXTENSION.zip** (1.0 MB)

Bao gồm:
- ✅ Extension đã build sẵn (tất cả file .js, .html, .css)
- ✅ 12 file Excel mẫu (Part1.xlsx - Part12.xlsx)
- ✅ File hướng dẫn chi tiết (INSTALL.txt, HUONG_DAN_WINDOWS.txt)
- ✅ Tất cả dependencies đã được bundle

---

## 🚀 Cách sử dụng (3 bước đơn giản)

### Bước 1: Copy file sang máy Windows
- Copy file **PORTABLE_EXTENSION.zip** sang máy Windows (qua USB, email, Drive, ...)
- Giải nén ra Desktop hoặc bất kỳ đâu

### Bước 2: Load extension vào Chrome
1. Mở Chrome
2. Gõ: `chrome://extensions/`
3. Bật **Developer mode** (góc trên phải)
4. Click **Load unpacked**
5. Chọn folder **PORTABLE_EXTENSION** vừa giải nén
6. ✅ Xong!

### Bước 3: Sử dụng
1. Mở https://www.perplexity.ai/
2. Click icon Extension → Chọn "Perplexity Automation"
3. Chọn Part → Load Part → Start Processing
4. Extension tự động chạy!

---

## 📂 Cấu trúc folder sau khi giải nén

```
PORTABLE_EXTENSION/
├── manifest.json              ← File cấu hình extension
├── INSTALL.txt               ← Hướng dẫn cài đặt (English)
├── HUONG_DAN_WINDOWS.txt     ← Hướng dẫn chi tiết (Tiếng Việt) ⭐
├── README_PORTABLE.txt       ← Thông tin package
├── background.js             ← Extension scripts
├── content.js
├── popup.html
├── popup.js
├── excelPopup.html
├── excelPopup.js
├── popup.css
├── promptForce.md
└── IngredientName/           ← Folder chứa file Excel
    ├── Part1.xlsx
    ├── Part2.xlsx
    └── ... Part12.xlsx
```

---

## 📖 File hướng dẫn chi tiết

Sau khi giải nén, đọc file:
- **HUONG_DAN_WINDOWS.txt** - Hướng dẫn từng bước bằng Tiếng Việt (KHUYÊN DÙNG)
- **INSTALL.txt** - Hướng dẫn bằng English

---

## ⚠️ Lưu ý quan trọng

1. **KHÔNG XÓA** folder PORTABLE_EXTENSION sau khi load extension!
   - Chrome sẽ load extension từ folder này
   - Nếu xóa → Extension không hoạt động

2. **File Excel** phải đặt trong folder `IngredientName/`
   - Tên file phải đúng: Part1.xlsx, Part2.xlsx, ...
   - Không đổi tên!

3. **Nếu di chuyển folder** → Phải load lại extension trong Chrome

---

## 🎯 Tính năng

✅ Tự động gửi câu hỏi lên Perplexity AI  
✅ Tự động lấy kết quả và ghi vào Excel  
✅ Tự động tạo thread mới mỗi 50 rows  
✅ Phát hiện rate limit tự động  
✅ Download file progress khi bị rate limit  
✅ Xử lý 12 Parts tự động (hoặc chọn 1 Part)  
✅ Log chi tiết mọi bước  

---

## 💾 File kết quả

Sau khi xử lý xong, file tự động download vào:
```
C:\Users\YourName\Downloads\results\
```

Tên file:
- **Hoàn thành**: `Part1_PROCESSED.xlsx`
- **Progress (rate limit)**: `Part1_PROGRESS_50of200_PROCESSED.xlsx`

---

## 🔧 Xử lý lỗi thường gặp

### Lỗi: "Extension không load được"
✅ Kiểm tra đã bật "Developer mode" chưa  
✅ Kiểm tra folder có file "manifest.json" không  
✅ Reload extension trong chrome://extensions/  

### Lỗi: "Không tìm thấy file Part"
✅ Đặt file Excel vào folder `IngredientName/`  
✅ Kiểm tra tên file: Part1.xlsx, Part2.xlsx (không có khoảng trắng)  

### Lỗi: "Connection lost"
✅ Reload extension  
✅ Refresh trang Perplexity (F5)  
✅ Click "Start Processing" lại  

### Lỗi: "Rate limit detected"
✅ Extension tự động download file progress  
✅ Đợi 1-2 giờ  
✅ Tiếp tục từ file progress  

---

## 💡 Tips hữu ích

1. **Backup file thủ công**: Click nút "Download Files" trong popup bất cứ lúc nào

2. **Xem log chi tiết**: Nhấn F12 trong popup → Tab Console

3. **Dừng processing**: Click nút "Stop" (file không tự động download)

4. **Chạy nhiều Part**: Bỏ tick "Single Part Mode" → Extension tự động chạy Part 1-12

---

## 📞 Cần hỗ trợ?

Nếu gặp lỗi, chụp màn hình:
1. Popup extension (log)
2. Console (F12)
3. Trang chrome://extensions/

Gửi kèm:
- File Excel đang xử lý
- Dòng bị lỗi
- Thông báo lỗi

---

## ✅ Checklist trước khi bắt đầu

- [ ] Đã giải nén PORTABLE_EXTENSION.zip
- [ ] Đã load extension vào Chrome (chrome://extensions/)
- [ ] Đã bật Developer mode
- [ ] Đã đặt file Excel vào folder IngredientName/
- [ ] Đã mở trang Perplexity.ai
- [ ] Đã click Extension icon và thấy popup
- [ ] Đã chọn Part và click "Load Part"

→ ✅ **SẴN SÀNG!** Click "Start Processing"!

---

## 🎉 Chúc bạn thành công!

Version: 1.0.0  
Build: Production (Portable)  
Date: 2025-11-05  

