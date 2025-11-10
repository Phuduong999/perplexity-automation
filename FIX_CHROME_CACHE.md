# 🔧 Fix: Chrome Extension Hiển Thị UI Cũ Sau Khi Build Mới

## Vấn Đề

**Triệu chứng:**
- Đã `git pull` code mới nhất
- Đã `npm install`
- Đã `npm run build` thành công
- Reload extension trong Chrome
- **Nhưng UI vẫn hiển thị giao diện cũ** ❌

**Nguyên nhân:**
Chrome cache extension files (JS, HTML, CSS) và không clear cache khi reload extension.

---

## Giải Pháp

### ✅ Cách 1: Hard Reload Extension (Khuyến Nghị)

1. **Mở Chrome Extensions:**
   ```
   chrome://extensions/
   ```

2. **Bật Developer Mode** (góc trên bên phải)

3. **Remove extension hoàn toàn:**
   - Click nút **"Remove"** trên extension
   - Confirm xóa

4. **Load lại extension:**
   - Click **"Load unpacked"**
   - Chọn folder `dist/`
   - Extension sẽ load với code mới 100%

---

### ✅ Cách 2: Clear Cache + Reload

1. **Mở Chrome Extensions:**
   ```
   chrome://extensions/
   ```

2. **Click nút "Reload" trên extension**

3. **Mở DevTools cho extension popup:**
   - Right-click vào extension icon → **"Inspect popup"**
   - Hoặc mở popup → F12

4. **Hard refresh trong DevTools:**
   - Giữ **Ctrl + Shift + R** (Windows/Linux)
   - Hoặc **Cmd + Shift + R** (Mac)
   - Hoặc right-click nút refresh → **"Empty Cache and Hard Reload"**

5. **Đóng và mở lại popup**

---

### ✅ Cách 3: Tăng Version Number (Tự Động Clear Cache)

**Thêm vào `manifest.json`:**

```json
{
  "manifest_version": 3,
  "name": "Perplexity Automation",
  "version": "1.0.1",  // ← Tăng version mỗi lần build
  ...
}
```

**Mỗi lần build mới:**
1. Tăng version: `1.0.1` → `1.0.2` → `1.0.3`
2. Build: `npm run build`
3. Reload extension
4. Chrome sẽ detect version mới và clear cache tự động

---

### ✅ Cách 4: Script Tự Động (Khuyến Nghị Cho Dev)

**Tạo file `scripts/build-and-reload.sh`:**

```bash
#!/bin/bash

echo "🔨 Building extension..."
npm run build

echo "📦 Build complete!"
echo ""
echo "🔄 To reload extension:"
echo "1. Go to chrome://extensions/"
echo "2. Click 'Remove' on the extension"
echo "3. Click 'Load unpacked' and select dist/ folder"
echo ""
echo "Or use Ctrl+R on chrome://extensions/ page"
```

**Sử dụng:**
```bash
chmod +x scripts/build-and-reload.sh
./scripts/build-and-reload.sh
```

---

## Verify UI Mới

### Kiểm Tra UI Đã Update

**UI mới (Mantine) có:**
- ✅ Checkbox "Test mode (5 rows/thread)"
- ✅ Giao diện đẹp hơn với Mantine components
- ✅ Progress bar màu xanh
- ✅ Logs có màu sắc (success = xanh, error = đỏ, warning = vàng)
- ✅ Auto-save modal

**UI cũ có:**
- ❌ Không có checkbox test mode
- ❌ Giao diện đơn giản, không có Mantine
- ❌ Progress bar cơ bản

---

## Kiểm Tra Code Đã Update

### 1. Kiểm Tra File Size

**UI mới (Mantine):**
```bash
ls -lh dist/excelPopup.js
# Khoảng 1MB (1010 KiB) vì có Mantine library
```

**UI cũ:**
```bash
# Khoảng 100-200KB (không có Mantine)
```

### 2. Kiểm Tra Console Logs

**Mở DevTools → Console:**

**UI mới sẽ log:**
```
Excel Tag Automation - Production Mode
Test mode: OFF (50 rows/thread)
```

**UI cũ sẽ log:**
```
Excel Tag Automation
```

### 3. Kiểm Tra Background Script

**Mở DevTools cho background script:**
```
chrome://extensions/ → Extension → "Inspect views: background page"
```

**Console sẽ show:**
```
Background processor initialized
```

Nếu không thấy → Code cũ chưa update.

---

## Checklist Sau Khi Pull Code Mới

```bash
# 1. Pull code mới
git pull origin main

# 2. Install dependencies (nếu có thay đổi package.json)
npm install

# 3. Clean build cũ
rm -rf dist/

# 4. Build mới
npm run build

# 5. Verify build output
ls -lh dist/excelPopup.js
# Phải thấy ~1MB

# 6. Remove extension trong Chrome
# chrome://extensions/ → Remove

# 7. Load unpacked lại
# chrome://extensions/ → Load unpacked → chọn dist/

# 8. Test UI
# Mở popup → Phải thấy checkbox "Test mode"
```

---

## Tại Sao Reload Extension Không Đủ?

### Chrome Extension Cache Behavior

**Khi reload extension:**
- ✅ Background script được reload
- ✅ Content script được reload (cho tabs mới)
- ❌ Popup HTML/JS/CSS **VẪN BỊ CACHE**
- ❌ Service worker cache **KHÔNG CLEAR**

**Khi remove + load lại:**
- ✅ Tất cả files được load lại từ disk
- ✅ Cache được clear hoàn toàn
- ✅ Extension ID mới (nếu cần)

---

## Debug: Kiểm Tra File Nào Đang Load

### 1. Mở DevTools cho Popup

```
Right-click extension icon → Inspect popup
```

### 2. Vào Tab "Sources"

```
Sources → top → chrome-extension://[ID]/ → excelPopup.js
```

### 3. Tìm dòng code đặc trưng

**UI mới có:**
```javascript
testMode: false,
logs: [{ text: 'Excel Tag Automation - Production Mode', type: 'info' }],
```

**UI cũ có:**
```javascript
logs: ['Excel Tag Automation'],
```

### 4. Kiểm Tra Timestamp

```bash
# Xem thời gian build
ls -l dist/excelPopup.js

# So sánh với thời gian hiện tại
date
```

Nếu timestamp cũ → Build chưa chạy hoặc Chrome load file cũ.

---

## Common Issues

### Issue 1: "webpack not found"

**Nguyên nhân:** Chưa install dependencies

**Fix:**
```bash
npm install
```

### Issue 2: Build thành công nhưng dist/ trống

**Nguyên nhân:** Webpack config sai hoặc permissions

**Fix:**
```bash
# Check webpack config
cat webpack.config.js

# Check permissions
ls -la dist/

# Rebuild
rm -rf dist/
npm run build
```

### Issue 3: Extension load nhưng popup trắng

**Nguyên nhân:** 
- React không render
- excelPopup.js bị lỗi
- Missing dependencies

**Fix:**
```bash
# Mở DevTools → Console xem lỗi
# Thường là:
# - "React is not defined"
# - "Cannot find module"

# Rebuild
npm install
npm run build
```

### Issue 4: UI mới nhưng background script cũ

**Nguyên nhân:** Chrome cache background script riêng

**Fix:**
```bash
# 1. Remove extension
# 2. Restart Chrome hoàn toàn (quit app)
# 3. Load unpacked lại
```

---

## Best Practices

### 1. Luôn Clean Build Khi Pull Code Mới

```bash
git pull origin main
rm -rf dist/ node_modules/
npm install
npm run build
```

### 2. Tăng Version Mỗi Lần Deploy

```json
// manifest.json
{
  "version": "1.0.2"  // Tăng mỗi lần build
}
```

### 3. Sử dụng Build Script

```json
// package.json
{
  "scripts": {
    "clean": "rimraf dist",
    "prebuild": "npm run clean",
    "build": "webpack --mode production",
    "rebuild": "npm run clean && npm run build"
  }
}
```

**Sử dụng:**
```bash
npm run rebuild  # Clean + build tự động
```

### 4. Verify Build Output

```bash
# Sau mỗi lần build
npm run build

# Check file sizes
ls -lh dist/*.js

# Expected:
# background.js: ~423KB
# excelPopup.js: ~1010KB (có Mantine)
# popup.js: ~467KB
# content.js: ~15KB
```

---

## Summary

### ✅ Cách Nhanh Nhất (Khuyến Nghị)

```bash
# Terminal
git pull origin main
npm install
rm -rf dist/
npm run build

# Chrome
# 1. chrome://extensions/
# 2. Remove extension
# 3. Load unpacked → chọn dist/
# 4. Mở popup → Verify UI mới
```

### ✅ Verify Thành Công

- ✅ Thấy checkbox "Test mode (5 rows/thread)"
- ✅ File size `dist/excelPopup.js` ~1MB
- ✅ Console log: "Excel Tag Automation - Production Mode"
- ✅ Background script log: "Background processor initialized"

---

## Hướng Dẫn Cho Máy Khác

**Gửi cho người dùng máy khác:**

```
1. Pull code mới:
   git pull origin main

2. Xóa dist cũ:
   rm -rf dist/

3. Install dependencies:
   npm install

4. Build:
   npm run build

5. Mở Chrome:
   chrome://extensions/

6. Bật Developer Mode

7. REMOVE extension cũ (quan trọng!)

8. Click "Load unpacked"

9. Chọn folder dist/

10. Mở popup → Phải thấy checkbox "Test mode"

Nếu vẫn UI cũ → Restart Chrome hoàn toàn và làm lại bước 7-9.
```

