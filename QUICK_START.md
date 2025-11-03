# 🚀 Quick Start - Excel Tag Automation

## Cài Đặt (1 phút)

1. **Load Extension**:

   ```
   Chrome → chrome://extensions/
   → Bật "Developer mode"
   → Click "Load unpacked"
   → Chọn folder "dist"
   ```

2. **Mở Extension**:
   - Click icon extension trên toolbar
   - Popup "Excel Tag Automation" sẽ hiện ra

## Sử Dụng (2 bước - Tự động!)

### Bước 1: Chọn Excel Files

```
Click "Select Excel Files"
→ Hold Ctrl/Cmd để chọn nhiều files
→ Chọn: Part1.xlsx, Part2.xlsx, ... (hoặc chỉ 1 file)
```

### Bước 2: Start Processing

```
Click "🚀 Start Processing"
→ Extension tự động mở Perplexity
→ Đợi xử lý xong (khoảng 5-10 phút cho 20 rows)
→ Click "💾 Download Updated Excel"
→ Tất cả files sẽ được download
```

## ✨ Tính Năng Mới

### 1. Auto Open Perplexity

- Không cần click "Open Perplexity" riêng
- Click "Start Processing" → Tự động mở Perplexity

### 2. Multiple Files Support

- Chọn nhiều files cùng lúc (Ctrl/Cmd + Click)
- Xử lý tuần tự tất cả rows từ tất cả files
- Download tất cả files đã xử lý

### 3. Auto Reload Extension (Dev Mode)

- Extension tự động reload khi code thay đổi
- Không cần reload thủ công

### 4. Persistent State

- State được lưu vào chrome.storage
- Tắt popup không mất progress
- Mở lại popup → Tiếp tục từ chỗ cũ

## Kết Quả

✅ File Excel mới với:

- Tags được fill vào cột AT-BB
- Status đổi từ "REVIEW" → "PROCESSED"
- Tên file: `{original}_PROCESSED.xlsx`

## Workflow Chi Tiết

```
1. Đọc promptForce.md → Gửi cho AI (skip markdown-0)
2. Đọc row đầu tiên có Status = "REVIEW"
3. Format: "99% _id = {A} |status = {B} | {C}"
4. Gửi cho AI → Đợi response
5. Parse JSON: {"tags": ["Beef", "Citrus"]}
6. Map tags → Fill vào Excel
7. Update Status → "PROCESSED"
8. Lặp lại cho row tiếp theo
```

## Ví Dụ

**Input**:

```
99% _id = 67c1820973f218d0633dc57e |status = REVIEW | Fat Free Coleslaw Dressing
```

**AI Response**:

```json
{
  "tags": ["Dairy", "Sweeteners", "Alliums"]
}
```

**Output Excel**:

- AT (Protein Sources): `Dairy`
- BA (Miscellaneous): `Sweeteners`
- AX (Vegetables): `Alliums`
- Status: `PROCESSED`

## Tag Mapping

| Column | Category           | Tags                                                            |
| ------ | ------------------ | --------------------------------------------------------------- |
| AT     | Protein Sources    | Beef, Pork, Chicken, Turkey, Lamb, Fish, Shellfish, Eggs, Dairy |
| AU     | Dairy Alternatives | Lactose-Free, Non-Dairy Milk, Non-Dairy Cheese                  |
| AV     | Grains & Starches  | Wheat, Gluten-Free Grains, Pasta Alternatives, Potatoes, Corn   |
| AW     | Legumes & Nuts     | Beans, Peanuts, Tree Nuts, Soy, Lentils                         |
| AX     | Vegetables         | Nightshades, Cruciferous, Leafy Greens, Mushrooms, Alliums      |
| AY     | Fruits             | Citrus, Berries, Tropical Fruits, Stone Fruits, Melons          |
| AZ     | Herbs & Spices     | Dried Herbs & Spices, Fresh Herbs, Spicy                        |
| BA     | Miscellaneous      | Sweeteners, Alcohol, Caffeine                                   |
| BB     | Others             | Other (fallback only)                                           |

## Troubleshooting

❌ **"Perplexity tab not opened"**
→ Click "📂 Open Perplexity" trước

❌ **"Timeout waiting for markdown"**
→ AI chưa xong, đợi thêm hoặc tăng timeout

❌ **Tags không đúng**
→ Kiểm tra console logs để xem AI response

## Test Mode

Hiện tại: **20 rows đầu tiên** (để test)

Để xử lý toàn bộ file, edit `src/excelWorkflow.ts`:

```typescript
private maxRows: number = 500; // Hoặc số lớn hơn
```

Sau đó build lại:

```bash
npm run build
```

## Files Cần Biết

- `dist/` - Extension đã build (load vào Chrome)
- `src/IngredientName/` - Folder chứa Excel files
- `src/promptForce.md` - Prompt template cho AI
- `EXCEL_WORKFLOW_GUIDE.md` - Hướng dẫn chi tiết

## Support

Xem chi tiết: `EXCEL_WORKFLOW_GUIDE.md`

---

**Ready to go!** 🎉
