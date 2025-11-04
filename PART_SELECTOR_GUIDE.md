# 🎯 Part Selector Guide

## ✨ New Features

Extension bây giờ cho phép bạn **chọn part nào muốn xử lý** thay vì bắt buộc phải bắt đầu từ Part 1.

## 🚀 Cách Sử Dụng

### 1. Reload Extension
```bash
# Vào Chrome/Edge
chrome://extensions/
# Click "Reload" trên Perplexity Automation extension
```

### 2. Mở Extension Popup
- Click vào icon extension
- Bạn sẽ thấy dropdown **"Select Part to Process"**

### 3. Chọn Part
- **Dropdown**: Chọn Part 1-12 (mặc định là Part 2)
- **Checkbox**: "Process only selected part"
  - ✅ **Checked**: Chỉ xử lý part đã chọn, không auto-continue
  - ❌ **Unchecked**: Xử lý từ part đã chọn → tiếp tục đến Part 12

### 4. Start Processing
- Click **"🚀 Start Processing"**
- Extension sẽ load part đã chọn và bắt đầu xử lý

## 📋 Ví Dụ Sử Dụng

### Scenario 1: Chỉ làm Part 5
1. Chọn "Part 5" trong dropdown
2. ✅ Check "Process only selected part"
3. Click "Start Processing"
4. → Chỉ xử lý Part 5, xong thì dừng

### Scenario 2: Làm từ Part 3 đến hết
1. Chọn "Part 3" trong dropdown  
2. ❌ Uncheck "Process only selected part"
3. Click "Start Processing"
4. → Xử lý Part 3 → Part 4 → ... → Part 12

### Scenario 3: Làm lại Part 1
1. Chọn "Part 1" trong dropdown
2. Chọn mode tùy ý
3. Click "Start Processing"
4. → Xử lý Part 1 (và tiếp tục nếu không check single mode)

## 🔄 Thay Đổi Part Giữa Chừng
- Có thể thay đổi part trong dropdown khi **không đang xử lý**
- Extension sẽ tự động load part mới khi bạn thay đổi

## ⚡ Lưu Ý
- Extension không còn auto-start, bạn phải click "Start Processing" manually
- Tất cả logic xử lý khác vẫn giữ nguyên (50 rows/thread, anti-detection, etc.)
- Files vẫn được auto-download sau khi xử lý xong mỗi part
