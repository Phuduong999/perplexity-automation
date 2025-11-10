# 🔧 Fix: Tự Động Tạo NEW THREAD Khi AI Không Trả Về Code Block

## Vấn Đề

**Logs lỗi:**
```
10:50:05 - ❌ Failed to process row 6: Error: Failed after 3 attempts: Empty response from AI
10:50:08 - Processing row 8/178: 1st Phorm Level-1 Chocolate Banana Protein Powder
10:50:08 - Sending ingredient name only
10:50:08 - Attempt 1/3: Sending prompt to AI
10:50:13 - Already processing a row, skipping...
10:50:18 - Already processing a row, skipping...
10:50:20 - ❌ Attempt 1 failed: Empty response from AI
```

**Nguyên nhân:**
- AI trả về markdown response NHƯNG KHÔNG có code block
- Content script detect được `hasCode: false` và trả về cho background
- Background processor KHÔNG kiểm tra `hasCode` → Không tạo new thread
- Retry 3 lần vẫn fail → Skip row → Mất data

---

## Giải Pháp

### ✅ Tự Động Tạo NEW THREAD Khi Không Có Code Block

**Logic mới:**
1. Content script trả về `hasCode: false` khi markdown không có code block
2. Background processor kiểm tra `hasCode`
3. Nếu `hasCode === false` → **Trigger NEW THREAD ngay lập tức**
4. Reset counters và retry row hiện tại

---

## Thay Đổi Code

### 1. Thêm Markdown Counter Tracking

**File:** `src/backgroundProcessor.ts`

**Thêm vào interface `ProcessingThread`:**
```typescript
export interface ProcessingThread {
  // ... existing fields
  markdownCounter: number; // Track markdown-content-{N} index
  rowsInCurrentThread: number; // Track rows processed in current Perplexity thread
}
```

**Khởi tạo counters:**
```typescript
const thread: ProcessingThread = {
  // ... existing fields
  markdownCounter: 0,
  rowsInCurrentThread: 0
};
```

---

### 2. Update Logic Xử Lý Row

**File:** `src/backgroundProcessor.ts` - Hàm `processNextRow()`

**Thay đổi:**
```typescript
// ❌ CŨ: Check isFirstRow dựa trên currentRowIndex
const isFirstRow = thread.currentRowIndex === 0;

// ✅ MỚI: Check isFirstRowInThread dựa trên rowsInCurrentThread
const isFirstRowInThread = thread.rowsInCurrentThread === 0;
```

**Increment counters:**
```typescript
// Update thread state
thread.processedRows++;
thread.currentRowIndex++;
thread.rowsInCurrentThread++; // ← MỚI: Track rows in current thread
```

**Check điều kiện NEW THREAD:**
```typescript
// ❌ CŨ: Dùng modulo (sai logic)
const rowsInCurrentThread = thread.processedRows % this.state.rowsPerThread;
if (rowsInCurrentThread === 0 && ...) {
  await this.createNewThread();
}

// ✅ MỚI: So sánh trực tiếp
if (thread.rowsInCurrentThread >= this.state.rowsPerThread && ...) {
  await this.createNewThread();
  
  // Reset counters for new thread
  thread.markdownCounter = 0;
  thread.rowsInCurrentThread = 0;
}
```

---

### 3. Update Hàm `sendToPerplexity()`

**File:** `src/backgroundProcessor.ts`

**Signature mới:**
```typescript
// ❌ CŨ
private async sendToPerplexity(prompt: string, maxRetries: number = 3)

// ✅ MỚI: Thêm thread parameter
private async sendToPerplexity(prompt: string, thread: ProcessingThread, maxRetries: number = 3)
```

**Increment markdown counter:**
```typescript
// Send prompt to Perplexity
const response = await chrome.tabs.sendMessage(...);

// Wait for AI to process (5 seconds)
await this.sleep(5000);

// ✅ MỚI: Increment markdown counter BEFORE fetching
thread.markdownCounter++;
this.addLog(`Fetching markdown-content-${thread.markdownCounter}`, 'info');

// Extract markdown content using current counter
const markdownResponse = await chrome.tabs.sendMessage(this.state.perplexityTabId, {
  type: 'GET_MARKDOWN',
  payload: { index: thread.markdownCounter } // ← Dùng counter thay vì hardcode 0
});
```

**Kiểm tra hasCode và trigger NEW THREAD:**
```typescript
// ✅ MỚI: Check if markdown has code block
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

---

### 4. Update Hàm `createNewThread()`

**File:** `src/backgroundProcessor.ts`

**Thêm logic gửi initial prompt:**
```typescript
private async createNewThread(): Promise<void> {
  // 1. Click "New Thread" button
  const response = await chrome.tabs.sendMessage(this.state.perplexityTabId, {
    type: 'NEW_THREAD'
  });

  if (!response.success) {
    throw new Error('Failed to create new thread');
  }

  this.addLog('✅ New thread created', 'success');

  // ✅ MỚI: 2. Send initial prompt to new thread
  const thread = this.state.threads.find(t => t.id === this.state.currentThread);
  if (thread) {
    const workflow = this.workflowManagers.get(thread.id);
    if (workflow) {
      this.addLog('📤 Sending initial prompt to new thread...', 'info');
      
      // Send initial prompt (without ingredient name)
      const initialPromptResponse = await chrome.tabs.sendMessage(this.state.perplexityTabId, {
        type: 'START_WORKFLOW',
        payload: { prompt: workflow.getPromptContent() }
      });

      if (!initialPromptResponse.success) {
        throw new Error('Failed to send initial prompt to new thread');
      }

      // Wait for AI to process initial prompt
      await this.sleep(10000); // 10 seconds for initial prompt
      this.addLog('✅ Initial prompt sent, new thread ready', 'success');
    }
  }
}
```

---

### 5. Thêm Getter Method

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

## Workflow Mới

### Trường Hợp 1: AI Trả Về Code Block (Bình Thường)

```
1. Gửi prompt → AI
2. Đợi 5s
3. markdownCounter++ (ví dụ: 0 → 1)
4. Fetch markdown-content-1
5. Check hasCode → TRUE ✅
6. Parse JSON → Ghi vào Excel
7. rowsInCurrentThread++ (ví dụ: 0 → 1)
8. Tiếp tục row tiếp theo
```

### Trường Hợp 2: AI KHÔNG Trả Về Code Block (Emergency)

```
1. Gửi prompt → AI
2. Đợi 5s
3. markdownCounter++ (ví dụ: 5 → 6)
4. Fetch markdown-content-6
5. Check hasCode → FALSE ❌
6. ⚠️ TRIGGER NEW THREAD:
   a. Click "New Thread" button
   b. Đợi 5s thread load
   c. Gửi initial prompt (promptForce.md)
   d. Đợi 10s AI xử lý
   e. Reset: markdownCounter = 0, rowsInCurrentThread = 0
7. Throw error → Retry row hiện tại (attempt 2/3)
8. Gửi lại prompt trong thread mới
```

### Trường Hợp 3: Scheduled NEW THREAD (Sau 50 Rows)

```
1. Xử lý row thứ 50 thành công
2. rowsInCurrentThread = 50
3. Check: 50 >= 50 → TRUE
4. Tạo NEW THREAD:
   a. Click "New Thread" button
   b. Đợi 5s thread load
   c. Gửi initial prompt
   d. Đợi 10s AI xử lý
   e. Reset: markdownCounter = 0, rowsInCurrentThread = 0
5. Tiếp tục row 51 trong thread mới
```

---

## Logs Mới

### Logs Bình Thường
```
Processing row 1/178: Ingredient A
Sending full prompt (first row in thread)
Attempt 1/3: Sending prompt to AI
Fetching markdown-content-1
✅ Valid response received on attempt 1
✅ Processed row 1/178
```

### Logs Khi Không Có Code Block
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
```

---

## Lợi Ích

### ✅ Tự Động Recovery
- Không còn mất data khi AI không trả về code block
- Tự động tạo thread mới và retry

### ✅ Markdown Counter Chính Xác
- Track đúng index của markdown-content-{N}
- Không bao giờ lấy nhầm markdown cũ

### ✅ Thread Management Tốt Hơn
- Reset counters đúng lúc
- Gửi initial prompt cho mỗi thread mới
- Phân biệt rõ "first row in thread" vs "first row overall"

### ✅ Retry Logic Thông Minh
- Emergency new thread khi AI sai format
- Scheduled new thread sau N rows
- Exponential backoff khi retry

---

## Testing

### Test Case 1: AI Trả Về Text Thay Vì JSON
**Input:** AI response = "I don't understand this ingredient"
**Expected:**
- Detect `hasCode: false`
- Trigger NEW THREAD
- Retry trong thread mới
- Success

### Test Case 2: Markdown Counter Increment
**Input:** Xử lý 10 rows liên tiếp
**Expected:**
- markdown-content-1, 2, 3, ..., 10
- Không bao giờ lấy nhầm index

### Test Case 3: Scheduled NEW THREAD
**Input:** Test mode (5 rows/thread), xử lý 12 rows
**Expected:**
- Thread 1: rows 1-5 (markdown 1-5)
- NEW THREAD
- Thread 2: rows 6-10 (markdown 1-5)
- NEW THREAD
- Thread 3: rows 11-12 (markdown 1-2)

---

## Summary

✅ **Fix hoàn chỉnh** - Tự động tạo NEW THREAD khi AI không trả về code block

**Files đã sửa:**
1. `src/backgroundProcessor.ts` - Thêm markdown counter tracking, check hasCode, auto new thread
2. `src/excelWorkflow.ts` - Thêm getter method `getPromptContent()`

**Không cần sửa:**
- `src/content.ts` - Đã có logic trả về `hasCode: false`
- `src/excelPopup.tsx` - UI không đổi

**Cách test:**
1. Build extension: `npm run build`
2. Reload extension trong Chrome
3. Chạy processing với test mode
4. Xem logs để verify logic mới

