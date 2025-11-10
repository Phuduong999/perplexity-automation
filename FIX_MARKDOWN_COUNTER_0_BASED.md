# 🔧 Fix: Markdown Counter Bắt Đầu Từ 0

## Vấn Đề

**User feedback:**
> "chỗn này markdown đầu tiền trên web là 0 mà, phải 0 mới lấy được"

**Lỗi trong code:**
```typescript
// ❌ SAI: Increment TRƯỚC khi fetch
thread.markdownCounter++;  // 0 → 1
this.addLog(`Fetching markdown-content-${thread.markdownCounter}`);
// Fetch markdown-content-1 ← BỎ LỠ markdown-content-0!
```

**Kết quả:**
- Perplexity tạo `markdown-content-0` cho response đầu tiên
- Code fetch `markdown-content-1` → Không tìm thấy → Lỗi
- Bỏ lỡ response thực tế của AI

---

## Giải Pháp

### ✅ Fetch TRƯỚC, Increment SAU

```typescript
// ✅ ĐÚNG: Fetch using current counter (starts at 0)
this.addLog(`Fetching markdown-content-${thread.markdownCounter}`);
const markdownResponse = await chrome.tabs.sendMessage(this.state.perplexityTabId, {
  type: 'GET_MARKDOWN',
  payload: { index: thread.markdownCounter }  // index = 0 lần đầu
});

// Increment AFTER successful fetch for next iteration
thread.markdownCounter++;  // 0 → 1
```

---

## Flow Đúng

### Thread Mới (CÓ Initial Prompt)

```
Thread mới: markdownCounter = 0

1. Initial Prompt:
   - Gửi promptForce.md → AI tạo markdown-content-0
   - KHÔNG fetch (skip response này)
   - Set markdownCounter = 1 ✅

2. Row 1:
   - Gửi "Chicken breast" → AI tạo markdown-content-1
   - Fetch markdown-content-1 ✅ (counter = 1)
   - Increment: markdownCounter = 2

3. Row 2:
   - Gửi "Milk" → AI tạo markdown-content-2
   - Fetch markdown-content-2 ✅ (counter = 2)
   - Increment: markdownCounter = 3
```

### Emergency NEW THREAD

```
Thread hiện tại: markdownCounter = 5

1. Row 6:
   - Gửi prompt → AI tạo markdown-content-6
   - Fetch markdown-content-6 (counter = 6)
   - Check hasCode → FALSE ❌

2. Emergency NEW THREAD:
   - Click "New Thread" button
   - Gửi initial prompt → AI tạo markdown-content-0
   - Set markdownCounter = 1 ✅ (skip markdown-0)
   - Set rowsInCurrentThread = 0

3. Retry Row 6:
   - Gửi prompt → AI tạo markdown-content-1
   - Fetch markdown-content-1 ✅ (counter = 1)
   - Increment: markdownCounter = 2
```

---

## Code Changes

### 1. Fetch TRƯỚC, Increment SAU
**File:** `src/backgroundProcessor.ts` - Line 391-404

**Trước:**
```typescript
// ❌ SAI
thread.markdownCounter++;  // Increment TRƯỚC
this.addLog(`Fetching markdown-content-${thread.markdownCounter}`);
const markdownResponse = await chrome.tabs.sendMessage(...);
```

**Sau:**
```typescript
// ✅ ĐÚNG
this.addLog(`Fetching markdown-content-${thread.markdownCounter}`);
const markdownResponse = await chrome.tabs.sendMessage(this.state.perplexityTabId, {
  type: 'GET_MARKDOWN',
  payload: { index: thread.markdownCounter }
});

// Increment AFTER successful fetch
thread.markdownCounter++;
```

---

### 2. Set Counter = 1 Sau Initial Prompt
**File:** `src/backgroundProcessor.ts` - Line 501-509

**Thêm:**
```typescript
// Wait for AI to process initial prompt
await this.sleep(10000);

// ✅ Set counter to 1 to skip markdown-content-0 (initial prompt response)
thread.markdownCounter = 1;
this.addLog('✅ Initial prompt sent, new thread ready (counter set to 1 to skip markdown-0)', 'success');
```

**Tại sao cần:**
- Initial prompt response là `markdown-content-0`
- Response này chỉ là acknowledgment: "I understand..."
- KHÔNG phải là tag data → Cần skip
- Row tiếp theo sẽ tạo `markdown-content-1` → Fetch đúng

---

### 3. KHÔNG Reset markdownCounter Sau createNewThread()

**File:** `src/backgroundProcessor.ts` - Emergency NEW THREAD (Line 410-420)

**Trước:**
```typescript
// ❌ SAI
await this.createNewThread();
thread.markdownCounter = 0;  // Reset về 0 → SAI!
thread.rowsInCurrentThread = 0;
```

**Sau:**
```typescript
// ✅ ĐÚNG
await this.createNewThread();  // This already sets markdownCounter = 1
// ✅ Only reset rowsInCurrentThread, NOT markdownCounter
thread.rowsInCurrentThread = 0;
```

**File:** `src/backgroundProcessor.ts` - Scheduled NEW THREAD (Line 290-298)

**Trước:**
```typescript
// ❌ SAI
await this.createNewThread();
thread.markdownCounter = 0;  // Reset về 0 → SAI!
thread.rowsInCurrentThread = 0;
```

**Sau:**
```typescript
// ✅ ĐÚNG
await this.createNewThread();  // This already sets markdownCounter = 1
// ✅ Only reset rowsInCurrentThread, NOT markdownCounter
thread.rowsInCurrentThread = 0;
```

---

## Tại Sao Cần Skip markdown-content-0?

### Initial Prompt Response

**Gửi:**
```
[517 dòng hướng dẫn từ promptForce.md]
```

**AI response (markdown-content-0):**
```
I understand. I will analyze each ingredient and return a JSON object with the appropriate tags from the 9 categories you specified. I'm ready to process ingredients.
```

**Đây KHÔNG phải là tag data** → Cần skip!

### Row Đầu Tiên

**Gửi:**
```
Chicken breast
```

**AI response (markdown-content-1):**
```json
{
  "tags": ["Protein Sources - Poultry"]
}
```

**Đây mới là data cần lấy** → Fetch markdown-1 ✅

---

## Testing

### Test Case 1: Thread Mới
**Expected logs:**
```
📤 Sending initial prompt to new thread...
✅ Initial prompt sent, new thread ready (counter set to 1 to skip markdown-0)
Processing row 1/178: Chicken breast
Fetching markdown-content-1
✅ Valid response received
```

### Test Case 2: Emergency NEW THREAD
**Expected logs:**
```
Fetching markdown-content-6
⚠️ AI response has NO code block - triggering NEW THREAD
🔄 Creating new Perplexity thread...
📤 Sending initial prompt to new thread...
✅ Initial prompt sent, new thread ready (counter set to 1 to skip markdown-0)
rowsInCurrentThread reset after emergency new thread
Attempt 2/3: Sending prompt to AI
Fetching markdown-content-1
✅ Valid response received
```

### Test Case 3: Scheduled NEW THREAD (5 rows)
**Expected logs:**
```
Fetching markdown-content-5
✅ Processed row 5/178
Creating new thread after 5 rows
📤 Sending initial prompt to new thread...
✅ Initial prompt sent, new thread ready (counter set to 1 to skip markdown-0)
rowsInCurrentThread reset for new thread
Processing row 6/178: Ingredient F
Fetching markdown-content-1
✅ Valid response received
```

---

## Sequence Diagram

```
Thread Mới
├─ markdownCounter = 0
├─ Gửi initial prompt → markdown-content-0 (skip)
├─ Set markdownCounter = 1
│
Row 1
├─ Gửi prompt → markdown-content-1
├─ Fetch markdown-content-1 (counter = 1) ✅
├─ Increment: markdownCounter = 2
│
Row 2
├─ Gửi prompt → markdown-content-2
├─ Fetch markdown-content-2 (counter = 2) ✅
├─ Increment: markdownCounter = 3
│
Row 3
├─ Gửi prompt → markdown-content-3
├─ Fetch markdown-content-3 (counter = 3) ✅
├─ hasCode = false ❌
│
Emergency NEW THREAD
├─ Click "New Thread"
├─ Gửi initial prompt → markdown-content-0 (skip)
├─ Set markdownCounter = 1
├─ Set rowsInCurrentThread = 0
│
Retry Row 3
├─ Gửi prompt → markdown-content-1
├─ Fetch markdown-content-1 (counter = 1) ✅
├─ Increment: markdownCounter = 2
```

---

## Summary

### ✅ Fixes Applied

1. **Fetch TRƯỚC, Increment SAU** - Lấy đúng markdown-content-0, 1, 2, ...
2. **Set counter = 1 sau initial prompt** - Skip markdown-0 (acknowledgment response)
3. **Không reset markdownCounter sau createNewThread()** - Đã được set = 1 rồi
4. **Chỉ reset rowsInCurrentThread** - Track rows trong thread hiện tại

### 📊 Kết Quả

✅ Lấy đúng markdown-content-0 cho row đầu tiên (nếu không có initial prompt)  
✅ Skip đúng markdown-content-0 khi có initial prompt  
✅ Track chính xác index: 1, 2, 3, ... sau initial prompt  
✅ Không bao giờ lấy nhầm markdown cũ  

### 🚀 Next Steps

1. ✅ Build: `npm run build`
2. ✅ Reload extension trong Chrome
3. ⏳ Test với real data
4. ⏳ Verify logs: "Fetching markdown-content-1, 2, 3, ..."
5. ⏳ Confirm không còn "Empty response" errors

---

## Files Changed

- ✅ `src/backgroundProcessor.ts` - 3 changes:
  1. Fetch TRƯỚC, increment SAU (line 391-404)
  2. Set counter = 1 sau initial prompt (line 501-509)
  3. Không reset markdownCounter sau createNewThread() (line 290-298, 410-420)

- ✅ `MARKDOWN_COUNTER_LOGIC.md` - Documentation chi tiết

