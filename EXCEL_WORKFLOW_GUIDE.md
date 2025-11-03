# 📊 Excel Tag Automation - Hướng Dẫn Sử Dụng

## 🎯 Mục Đích
Tự động hóa việc tag ingredients từ Excel files bằng AI (Perplexity), xử lý tuần tự từng row có status = "REVIEW".

## 📁 Cấu Trúc Dữ Liệu

### Excel Files
- **Vị trí**: `src/IngredientName/`
- **Files**: 
  - `Food Exclusion Tag_RootFile_Part1.xlsx` → Part12.xlsx
  - Mỗi file: ~500 rows (tổng 5438 rows)

### Cột Excel
- **A**: `_id` - ID của ingredient
- **B**: `Status` - Chỉ xử lý khi = "REVIEW"
- **C**: `Name` - Tên ingredient
- **AT-BB**: Tags (sẽ được fill tự động)

### Tag Columns Mapping
- **AT** (Protein Sources): Beef, Pork, Chicken, Turkey, Lamb, Fish, Shellfish, Eggs, Dairy
- **AU** (Dairy Alternatives): Lactose-Free, Non-Dairy Milk, Non-Dairy Cheese
- **AV** (Grains & Starches): Wheat, Gluten-Free Grains, Pasta Alternatives, Potatoes, Corn
- **AW** (Legumes & Nuts): Beans, Peanuts, Tree Nuts, Soy, Lentils
- **AX** (Vegetables): Nightshades, Cruciferous, Leafy Greens, Mushrooms, Alliums
- **AY** (Fruits): Citrus, Berries, Tropical Fruits, Stone Fruits, Melons
- **AZ** (Herbs & Spices): Dried Herbs & Spices, Fresh Herbs, Spicy
- **BA** (Miscellaneous): Sweeteners, Alcohol, Caffeine
- **BB** (Others): Other (fallback only)

## 🔄 Workflow

### Bước 1: Setup Extension
1. Mở Chrome → `chrome://extensions/`
2. Bật "Developer mode" (góc trên phải)
3. Click "Load unpacked" → Chọn folder `dist`
4. Extension sẽ xuất hiện trên toolbar

### Bước 2: Chuẩn Bị
1. Click icon extension trên toolbar
2. Popup "Excel Tag Automation" sẽ mở
3. Click "📂 Open Perplexity" để mở tab Perplexity AI
4. Chọn Excel file (Part1-12) bằng nút "Select Excel File"

### Bước 3: Xử Lý Tự Động

#### Iteration 1 (Setup Prompt)
- Extension tự động đọc `promptForce.md`
- Gửi prompt setup cho AI
- Đợi AI xong
- **SKIP** markdown-content-0 (không dùng)

#### Iteration 2-N (Process Rows)
Cho mỗi row có Status = "REVIEW":

1. **Format Input**:
   ```
   99% _id = {A} |status = {B} | {C}
   ```
   Ví dụ: `99% _id = 67c1820973f218d0633dc57e |status = REVIEW | Fat Free Coleslaw Dressing`

2. **Gửi cho AI**:
   - Extension tự động paste input vào Perplexity
   - Click submit
   - Đợi AI thinking

3. **Đọc Response**:
   - Đọc từ `markdown-content-{i}` (i = iteration number)
   - Parse JSON từ code block:
     ```json
     {
       "tags": ["Beef", "Citrus", "Sweeteners"]
     }
     ```

4. **Map Tags → Columns**:
   - "Beef" → AT = "Beef"
   - "Citrus" → AY = "Citrus"
   - "Sweeteners" → BA = "Sweeteners"

5. **Fill Excel**:
   - Ghi tags vào các cột AT-BB
   - Update Status từ "REVIEW" → "PROCESSED"

6. **Next Row**:
   - Chuyển sang row tiếp theo
   - Lặp lại bước 1-5

### Bước 4: Download Kết Quả
- Sau khi xử lý xong, click "💾 Download Updated Excel"
- File sẽ được tải về với tên `{original_name}_PROCESSED.xlsx`

## 📊 Monitoring

### Stats Section
- **Processed**: Số rows đã xử lý
- **Total REVIEW**: Tổng số rows cần xử lý
- **Current**: Row đang xử lý hiện tại

### Console Logs
- Xem chi tiết từng bước trong section "📝 Console Logs"
- Mỗi log có timestamp và type (info/success/error)

## ⚙️ Cấu Hình

### Test Mode (20 rows)
Hiện tại extension được set để test với **20 rows đầu tiên**.

Để thay đổi, edit `src/excelWorkflow.ts`:
```typescript
private maxRows: number = 20; // Đổi thành số rows muốn xử lý
```

### Timeout Settings
- **AI Response**: 60 seconds (có thể tăng nếu AI chậm)
- **Markdown Wait**: 60 seconds
- **Delay giữa rows**: 2 seconds

## 🐛 Troubleshooting

### Lỗi: "Perplexity tab not opened"
- **Giải pháp**: Click "📂 Open Perplexity" trước khi start

### Lỗi: "Timeout waiting for markdown-content-X"
- **Nguyên nhân**: AI chưa trả lời xong
- **Giải pháp**: Tăng timeout trong `excelPopup.ts`:
  ```typescript
  const content = await waitForMarkdown(markdownIndex, 120000); // 2 phút
  ```

### Lỗi: "Failed to parse AI response"
- **Nguyên nhân**: AI trả về format không đúng
- **Giải pháp**: Kiểm tra console logs để xem raw response

### Tags không khớp
- **Nguyên nhân**: AI trả về tag không có trong mapping
- **Giải pháp**: Kiểm tra `TAG_COLUMNS` trong `excelWorkflow.ts`

## 📝 Ví Dụ

### Input
```
99% _id = 67c1820973f218d0633dc57e |status = REVIEW | Fat Free Coleslaw Dressing
```

### AI Response
```json
{
  "tags": ["Dairy", "Sweeteners", "Alliums"]
}
```

### Output (Excel)
- **AT** (Protein Sources): `Dairy`
- **AZ** (Herbs & Spices): (empty)
- **BA** (Miscellaneous): `Sweeteners`
- **AX** (Vegetables): `Alliums`
- **Status**: `PROCESSED`

## 🚀 Tips

1. **Chạy từng Part**: Xử lý từng file Part1-12 riêng biệt để dễ quản lý
2. **Backup**: Luôn backup file Excel gốc trước khi xử lý
3. **Monitor**: Theo dõi console logs để phát hiện lỗi sớm
4. **Stop/Resume**: Có thể click "⏹️ Stop" bất cứ lúc nào, sau đó chọn file khác để tiếp tục

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra console logs (F12 trong popup)
2. Kiểm tra console của Perplexity tab (F12 trên trang Perplexity)
3. Xem file `EXCEL_WORKFLOW_GUIDE.md` này

## 🔧 Development

### Build
```bash
npm run build
```

### Watch Mode (Development)
```bash
npm run dev
```

### Clean
```bash
npm run clean
```

## 📦 Files Structure
```
src/
├── excelWorkflow.ts      # Excel processing logic
├── excelPopup.ts         # Popup UI logic
├── excelPopup.html       # Popup UI
├── content.ts            # Content script (Perplexity page)
├── background.ts         # Background service worker
├── types.ts              # TypeScript types
├── utils.ts              # Utility functions
└── promptForce.md        # AI prompt template

dist/                     # Built extension (load this in Chrome)
├── excelPopup.html
├── excelPopup.js
├── content.js
├── background.js
├── manifest.json
└── promptForce.md
```

## ✅ Checklist Trước Khi Chạy

- [ ] Extension đã được load vào Chrome
- [ ] Đã mở Perplexity tab
- [ ] Đã chọn Excel file
- [ ] Stats section hiển thị số rows REVIEW
- [ ] Console logs đang hoạt động
- [ ] Đã backup file Excel gốc

## 🎉 Kết Quả Mong Đợi

Sau khi chạy xong 20 rows test:
- 20 rows có Status = "REVIEW" → "PROCESSED"
- Các cột AT-BB được fill với tags phù hợp
- File Excel mới được download với suffix "_PROCESSED"
- Console logs hiển thị chi tiết từng bước

---

**Version**: 2.0.0  
**Last Updated**: 2025-11-03

