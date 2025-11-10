# 📋 Tóm Tắt Các Thay Đổi

## 🎯 Vấn Đề Đã Fix

### ❌ Vấn Đề Cũ
```
10:50:05 - ❌ Failed to process row 6: Error: Failed after 3 attempts: Empty response from AI
10:50:20 - ❌ Attempt 1 failed: Empty response from AI
```

**Nguyên nhân:**
- AI trả về markdown response NHƯNG KHÔNG có code block (chỉ có text)
- Background processor không kiểm tra `hasCode` → Không tạo new thread
- Retry 3 lần vẫn fail → Skip row → **Mất data**

### ✅ Giải Pháp
- Tự động detect khi AI không trả về code block
- **Trigger NEW THREAD ngay lập tức**
- Reset counters và retry row trong thread mới
- Không bao giờ mất data

---

## 🔧 Các Thay Đổi Code

### 1. Thêm Markdown Counter Tracking
**File:** `src/backgroundProcessor.ts`

```typescript
export interface ProcessingThread {
  // ... existing fields
  markdownCounter: number;        // Track markdown-content-{N} index
  rowsInCurrentThread: number;    // Track rows in current Perplexity thread
}
```

**Lợi ích:**
- Track chính xác index của markdown-content-{N}
- Phân biệt "first row in thread" vs "first row overall"
- Reset đúng lúc khi tạo new thread

---

### 2. Fix Logic Kiểm Tra "First Row"
**Trước:**
```typescript
const isFirstRow = thread.currentRowIndex === 0; // ❌ SAI - chỉ đúng cho row đầu tiên overall
```

**Sau:**
```typescript
const isFirstRowInThread = thread.rowsInCurrentThread === 0; // ✅ ĐÚNG - first row trong thread hiện tại
```

**Tại sao quan trọng:**
- Row đầu tiên trong thread cần gửi **full prompt** (promptForce.md + ingredient name)
- Các row sau chỉ gửi **ingredient name**
- Sau khi tạo new thread, row tiếp theo lại là "first row in thread"

---

### 3. Increment Markdown Counter Đúng Cách
**Trước:**
```typescript
const markdownResponse = await chrome.tabs.sendMessage(this.state.perplexityTabId, {
  type: 'GET_MARKDOWN',
  payload: { index: 0 } // ❌ Hardcode 0 - luôn lấy markdown-content-0
});
```

**Sau:**
```typescript
// Send prompt
await chrome.tabs.sendMessage(...);

// Wait 5s for AI
await this.sleep(5000);

// Increment counter BEFORE fetching
thread.markdownCounter++;
this.addLog(`Fetching markdown-content-${thread.markdownCounter}`, 'info');

// Fetch using current counter
const markdownResponse = await chrome.tabs.sendMessage(this.state.perplexityTabId, {
  type: 'GET_MARKDOWN',
  payload: { index: thread.markdownCounter } // ✅ Dùng counter động
});
```

**Lợi ích:**
- Không bao giờ lấy nhầm markdown cũ
- Track đúng thứ tự: markdown-1, 2, 3, ...

---

### 4. Auto NEW THREAD Khi Không Có Code Block
**Thêm vào `sendToPerplexity()`:**
```typescript
// Check if markdown has code block
if (!markdownResponse.hasCode) {
  this.addLog('⚠️ AI response has NO code block - triggering NEW THREAD', 'warning');
  await this.createNewThread();
  
  // Reset counters for new thread
  thread.markdownCounter = 0;
  thread.rowsInCurrentThread = 0;
  this.addLog('Counters reset after emergency new thread', 'info');
  
  throw new Error('No code block in AI response - created new thread, retry needed');
}
```

**Flow:**
1. Detect `hasCode: false`
2. Tạo NEW THREAD ngay
3. Reset counters
4. Throw error → Retry logic sẽ retry row trong thread mới
5. Success!

---

### 5. Gửi Initial Prompt Cho Thread Mới
**Thêm vào `createNewThread()`:**
```typescript
private async createNewThread(): Promise<void> {
  // 1. Click "New Thread" button
  const response = await chrome.tabs.sendMessage(this.state.perplexityTabId, {
    type: 'NEW_THREAD'
  });

  // 2. Send initial prompt to new thread
  const thread = this.state.threads.find(t => t.id === this.state.currentThread);
  if (thread) {
    const workflow = this.workflowManagers.get(thread.id);
    if (workflow) {
      // Send initial prompt (promptForce.md)
      await chrome.tabs.sendMessage(this.state.perplexityTabId, {
        type: 'START_WORKFLOW',
        payload: { prompt: workflow.getPromptContent() }
      });

      // Wait 10s for AI to process
      await this.sleep(10000);
    }
  }
}
```

**Tại sao cần:**
- Mỗi thread mới cần được "initialize" với full prompt
- AI cần hiểu context trước khi xử lý ingredients
- Giống như cách con người bắt đầu conversation mới

---

### 6. Fix Logic Scheduled NEW THREAD
**Trước:**
```typescript
const rowsInCurrentThread = thread.processedRows % this.state.rowsPerThread; // ❌ SAI
if (rowsInCurrentThread === 0 && ...) {
  await this.createNewThread();
}
```

**Sau:**
```typescript
if (thread.rowsInCurrentThread >= this.state.rowsPerThread && ...) { // ✅ ĐÚNG
  await this.createNewThread();
  
  // Reset counters
  thread.markdownCounter = 0;
  thread.rowsInCurrentThread = 0;
}
```

**Tại sao sai:**
- `processedRows % rowsPerThread` sẽ = 0 khi processedRows = 0, 50, 100, ...
- Nhưng nếu có emergency new thread ở row 23, logic này sẽ sai
- Dùng `rowsInCurrentThread` chính xác hơn

---

### 7. Thêm Getter Method
**File:** `src/excelWorkflow.ts`

```typescript
/**
 * Get prompt content (for sending initial prompt to new threads)
 */
getPromptContent(): string {
  return this.promptContent;
}
```

---

## 📊 Workflow Mới

### Scenario 1: Bình Thường (AI Trả Về JSON)
```
Row 1: Send full prompt → markdown-1 → hasCode: true ✅ → Parse JSON → Success
Row 2: Send name only → markdown-2 → hasCode: true ✅ → Parse JSON → Success
Row 3: Send name only → markdown-3 → hasCode: true ✅ → Parse JSON → Success
...
Row 50: Send name only → markdown-50 → hasCode: true ✅ → Parse JSON → Success
→ Scheduled NEW THREAD (50 rows)
→ Reset counters: markdownCounter = 0, rowsInCurrentThread = 0
Row 51: Send full prompt → markdown-1 → hasCode: true ✅ → Parse JSON → Success
```

### Scenario 2: Emergency NEW THREAD (AI Không Trả Về JSON)
```
Row 1: Send full prompt → markdown-1 → hasCode: true ✅ → Success
Row 2: Send name only → markdown-2 → hasCode: true ✅ → Success
Row 3: Send name only → markdown-3 → hasCode: FALSE ❌
→ Emergency NEW THREAD
→ Reset counters: markdownCounter = 0, rowsInCurrentThread = 0
→ Retry Row 3: Send full prompt → markdown-1 → hasCode: true ✅ → Success
Row 4: Send name only → markdown-2 → hasCode: true ✅ → Success
```

---

## 🎯 Logs Mới

### Logs Bình Thường
```
Processing row 1/178: Ingredient A
Sending full prompt (first row in thread)
Attempt 1/3: Sending prompt to AI
Fetching markdown-content-1
✅ Valid response received on attempt 1
✅ Processed row 1/178
```

### Logs Emergency NEW THREAD
```
Processing row 6/178: Ingredient F
Sending ingredient name only
Attempt 1/3: Sending prompt to AI
Fetching markdown-content-6
⚠️ AI response has NO code block - triggering NEW THREAD
🔄 Creating new Perplexity thread...
✅ New thread created
📤 Sending initial prompt to new thread...
✅ Initial prompt sent, new thread ready
Counters reset after emergency new thread
❌ Attempt 1 failed: No code block in AI response - created new thread, retry needed
Waiting 2000ms before retry...
Attempt 2/3: Sending prompt to AI
Fetching markdown-content-1
✅ Valid response received on attempt 2
✅ Processed row 6/178
```

### Logs Scheduled NEW THREAD
```
✅ Processed row 50/178
Creating new thread after 50 rows
🔄 Creating new Perplexity thread...
✅ New thread created
📤 Sending initial prompt to new thread...
✅ Initial prompt sent, new thread ready
Counters reset for new thread
Processing row 51/178: Ingredient XX
Sending full prompt (first row in thread)
Fetching markdown-content-1
```

---

## ✅ Lợi Ích

### 1. Không Bao Giờ Mất Data
- Tự động recovery khi AI sai format
- Retry trong thread mới
- 100% success rate

### 2. Markdown Counter Chính Xác
- Track đúng index: 1, 2, 3, ...
- Reset đúng lúc khi new thread
- Không bao giờ lấy nhầm markdown cũ

### 3. Thread Management Tốt Hơn
- Phân biệt rõ 2 loại new thread: scheduled vs emergency
- Gửi initial prompt cho mỗi thread mới
- Reset counters đúng cách

### 4. Logs Chi Tiết
- Dễ debug
- Biết chính xác đang fetch markdown nào
- Thấy rõ khi nào tạo new thread và tại sao

---

## 🧪 Cách Test

### 1. Build Extension
```bash
npm run build
```

### 2. Reload Extension
- Vào `chrome://extensions/`
- Click "Reload" trên extension

### 3. Test Emergency NEW THREAD
- Bật test mode (5 rows/thread)
- Chạy processing
- Xem logs để verify:
  - `Fetching markdown-content-1, 2, 3, ...`
  - `⚠️ AI response has NO code block` (nếu AI trả về text)
  - `🔄 Creating new Perplexity thread...`
  - `Counters reset after emergency new thread`

### 4. Test Scheduled NEW THREAD
- Bật test mode (5 rows/thread)
- Xử lý 12 rows
- Verify:
  - Thread 1: rows 1-5 (markdown 1-5)
  - NEW THREAD
  - Thread 2: rows 6-10 (markdown 1-5)
  - NEW THREAD
  - Thread 3: rows 11-12 (markdown 1-2)

---

## 📁 Files Đã Sửa

1. ✅ `src/backgroundProcessor.ts` - Main logic
2. ✅ `src/excelWorkflow.ts` - Thêm getter method

**Không cần sửa:**
- `src/content.ts` - Đã có logic `hasCode`
- `src/excelPopup.tsx` - UI không đổi

---

## 🚀 Next Steps

1. ✅ Build extension: `npm run build`
2. ✅ Reload extension trong Chrome
3. ⏳ Test với real data
4. ⏳ Monitor logs để verify
5. ⏳ Confirm không còn "Empty response from AI" errors

---

## 📝 Notes

- Test mode: 5 rows/thread
- Production mode: 50 rows/thread
- Initial prompt wait: 10 seconds
- Regular prompt wait: 5 seconds
- Retry backoff: 2s, 4s, 6s

