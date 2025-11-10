# New Thread Button - XPath Information

## XPath được sử dụng
```xpath
(//button[@data-testid="sidebar-new-thread"])[1]
```

## Giải thích
- `//button[@data-testid="sidebar-new-thread"]` - Tìm tất cả các button có attribute `data-testid="sidebar-new-thread"`
- `[1]` - Chọn phần tử **ĐẦU TIÊN** (index 1 trong XPath)
- Đây là cách đảm bảo luôn chọn nút đầu tiên khi có 2 nút trùng nhau

## CSS Selector tương đương (nếu cần)
```css
button[data-testid="sidebar-new-thread"]:first-of-type
```

## Cách test trên Perplexity
1. Mở Perplexity.ai
2. Mở DevTools (F12)
3. Vào tab Console
4. Chạy lệnh sau để test XPath:

```javascript
// Test XPath
const xpath = '(//button[@data-testid="sidebar-new-thread"])[1]';
const button = document.evaluate(
  xpath,
  document,
  null,
  XPathResult.FIRST_ORDERED_NODE_TYPE,
  null
).singleNodeValue;

console.log('Button found:', button);
console.log('Button visible:', !!button?.offsetParent);
console.log('Button disabled:', button?.hasAttribute('disabled'));
console.log('Button HTML:', button?.outerHTML);
```

## Thay đổi đã thực hiện

### 1. File: `src/content.ts` (dòng 398-449)
- XPath đã được cấu hình để chọn nút **ĐẦU TIÊN**: `(//button[@data-testid="sidebar-new-thread"])[1]`
- Validate button phải visible và không bị disabled
- Click button với đầy đủ events (focus, click, mousedown, mouseup)

### 2. File: `src/content.ts` (dòng 864-876)
- **THÊM MỚI**: Sau khi click New Thread button thành công, đợi **5 giây** để content load
- Log message: `⏳ Waiting 5 seconds for new thread content to load...`
- Sau 5s mới return success về excelPopup.ts

### 3. File: `src/excelPopup.ts` (dòng 497-546 và 814-861)
- Nhận response từ content script (đã bao gồm 5s wait)
- Log message: `⏳ Content script already waited 5s for new thread to load`
- **SAU ĐÓ** mới reset counters và gửi initial prompt
- Đảm bảo prompt được gửi sau khi new thread đã load xong

## Flow hoàn chỉnh
1. **excelPopup.ts** gửi message `NEW_THREAD` đến content script
2. **content.ts** nhận message:
   - Click nút New Thread (nút đầu tiên với XPath)
   - **ĐỢI 5 GIÂY** để new thread content load
   - Return success về excelPopup.ts
3. **excelPopup.ts** nhận success:
   - Reset markdown counter về 0
   - Reset rows counter về 0
   - Reset promptSent flag về false
   - **GỬI INITIAL PROMPT** (lúc này new thread đã sẵn sàng)
   - Đợi 10s để AI xử lý prompt
   - Tiếp tục workflow

## Lợi ích
✅ Luôn chọn đúng nút đầu tiên (tránh click nhầm nút thứ 2)
✅ Đợi 5s để new thread load xong trước khi gửi prompt
✅ Tránh lỗi "ask-input not found" do gửi prompt quá sớm
✅ Flow ổn định hơn, ít lỗi hơn

