# 📊 Markdown Counter Logic - Chi Tiết

## Vấn Đề Ban Đầu

**Lỗi trong code cũ:**
```typescript
// ❌ SAI: Increment TRƯỚC khi fetch
thread.markdownCounter++;  // 0 → 1
this.addLog(`Fetching markdown-content-${thread.markdownCounter}`);  // Fetch markdown-1
```

**Kết quả:**
- Lần đầu fetch `markdown-content-1` thay vì `markdown-content-0`
- Bỏ lỡ response đầu tiên của AI
- Lấy nhầm markdown cũ

---

## Giải Pháp Đúng

### ✅ Logic Mới: Fetch TRƯỚC, Increment SAU

```typescript
// ✅ ĐÚNG: Fetch using current counter, then increment
this.addLog(`Fetching markdown-content-${thread.markdownCounter}`);  // Fetch markdown-0
const markdownResponse = await chrome.tabs.sendMessage(..., {
  payload: { index: thread.markdownCounter }  // index = 0
});

// Increment AFTER successful fetch
thread.markdownCounter++;  // 0 → 1
```

---

## Flow Chi Tiết

### Scenario 1: Thread Mới (Không Có Initial Prompt)

**Nếu không gửi initial prompt:**
```
Thread mới: markdownCounter = 0

Row 1:
  - Gửi prompt → AI tạo markdown-content-0
  - Fetch markdown-content-0 ✅
  - Increment: markdownCounter = 1

Row 2:
  - Gửi prompt → AI tạo markdown-content-1
  - Fetch markdown-content-1 ✅
  - Increment: markdownCounter = 2

Row 3:
  - Gửi prompt → AI tạo markdown-content-2
  - Fetch markdown-content-2 ✅
  - Increment: markdownCounter = 3
```

---

### Scenario 2: Thread Mới (CÓ Initial Prompt)

**Khi gửi initial prompt:**
```
Thread mới: markdownCounter = 0

Initial Prompt:
  - Gửi promptForce.md → AI tạo markdown-content-0
  - KHÔNG fetch (skip)
  - Set markdownCounter = 1 ✅ (để skip markdown-0)

Row 1:
  - Gửi prompt → AI tạo markdown-content-1
  - Fetch markdown-content-1 ✅
  - Increment: markdownCounter = 2

Row 2:
  - Gửi prompt → AI tạo markdown-content-2
  - Fetch markdown-content-2 ✅
  - Increment: markdownCounter = 3
```

**Code implementation:**
```typescript
// In createNewThread()
await chrome.tabs.sendMessage(this.state.perplexityTabId, {
  type: 'START_WORKFLOW',
  payload: { prompt: workflow.getPromptContent() }
});

await this.sleep(10000);  // Wait for AI

// ✅ Set counter to 1 to skip markdown-content-0
thread.markdownCounter = 1;
```

---

### Scenario 3: Emergency NEW THREAD (AI Không Trả Về Code Block)

```
Thread hiện tại: markdownCounter = 5

Row 6:
  - Gửi prompt → AI tạo markdown-content-6
  - Fetch markdown-content-6
  - Check hasCode → FALSE ❌
  
Emergency NEW THREAD:
  - Click "New Thread" button
  - Gửi initial prompt → AI tạo markdown-content-0
  - Set markdownCounter = 1 ✅ (skip markdown-0)
  - Set rowsInCurrentThread = 0
  
Retry Row 6:
  - Gửi prompt → AI tạo markdown-content-1
  - Fetch markdown-content-1 ✅
  - Increment: markdownCounter = 2
```

**Code implementation:**
```typescript
// In sendToPerplexity() when hasCode = false
if (!markdownResponse.hasCode) {
  await this.createNewThread();  // This sets markdownCounter = 1
  
  // ✅ Only reset rowsInCurrentThread, NOT markdownCounter
  thread.rowsInCurrentThread = 0;
  
  throw new Error('No code block - retry needed');
}
```

---

### Scenario 4: Scheduled NEW THREAD (Sau 50 Rows)

```
Thread hiện tại: markdownCounter = 50, rowsInCurrentThread = 50

Row 50:
  - Gửi prompt → AI tạo markdown-content-50
  - Fetch markdown-content-50 ✅
  - Increment: markdownCounter = 51
  - Check: rowsInCurrentThread >= 50 → TRUE
  
Scheduled NEW THREAD:
  - Click "New Thread" button
  - Gửi initial prompt → AI tạo markdown-content-0
  - Set markdownCounter = 1 ✅ (skip markdown-0)
  - Set rowsInCurrentThread = 0
  
Row 51:
  - Gửi prompt → AI tạo markdown-content-1
  - Fetch markdown-content-1 ✅
  - Increment: markdownCounter = 2
```

**Code implementation:**
```typescript
// In processNextRow() after successful row processing
if (thread.rowsInCurrentThread >= this.state.rowsPerThread && ...) {
  await this.createNewThread();  // This sets markdownCounter = 1
  
  // ✅ Only reset rowsInCurrentThread, NOT markdownCounter
  thread.rowsInCurrentThread = 0;
}
```

---

## Tại Sao Cần Skip markdown-content-0?

### Khi Gửi Initial Prompt

**AI response cho initial prompt:**
```
markdown-content-0: "I understand. I will analyze ingredients and return JSON with tags..."
```

**Đây KHÔNG phải là response cho ingredient** → Cần skip!

**Row tiếp theo:**
```
Gửi: "Chicken breast"
AI tạo: markdown-content-1: { "tags": ["Protein Sources - Poultry"] }
```

**Đây mới là response cần lấy** → Fetch markdown-1 ✅

---

## Tại Sao Fetch TRƯỚC, Increment SAU?

### ❌ Nếu Increment TRƯỚC (SAI)
```
markdownCounter = 0
Increment: markdownCounter = 1
Fetch: markdown-content-1  ← Bỏ lỡ markdown-0!
```

### ✅ Nếu Fetch TRƯỚC (ĐÚNG)
```
markdownCounter = 0
Fetch: markdown-content-0  ← Lấy đúng!
Increment: markdownCounter = 1
```

---

## Code Changes Summary

### 1. Fetch TRƯỚC, Increment SAU
**File:** `src/backgroundProcessor.ts` - `sendToPerplexity()`

```typescript
// ✅ Fetch using CURRENT counter
this.addLog(`Fetching markdown-content-${thread.markdownCounter}`, 'info');
const markdownResponse = await chrome.tabs.sendMessage(this.state.perplexityTabId, {
  type: 'GET_MARKDOWN',
  payload: { index: thread.markdownCounter }
});

// Increment AFTER successful fetch
thread.markdownCounter++;
```

---

### 2. Set Counter = 1 Sau Initial Prompt
**File:** `src/backgroundProcessor.ts` - `createNewThread()`

```typescript
// Send initial prompt
await chrome.tabs.sendMessage(this.state.perplexityTabId, {
  type: 'START_WORKFLOW',
  payload: { prompt: workflow.getPromptContent() }
});

await this.sleep(10000);

// ✅ Set counter to 1 to skip markdown-content-0
thread.markdownCounter = 1;
```

---

### 3. KHÔNG Reset markdownCounter Sau createNewThread()
**File:** `src/backgroundProcessor.ts` - Emergency & Scheduled NEW THREAD

```typescript
// ❌ CŨ: Reset cả 2 counters
thread.markdownCounter = 0;
thread.rowsInCurrentThread = 0;

// ✅ MỚI: Chỉ reset rowsInCurrentThread
// markdownCounter đã được set = 1 bởi createNewThread()
thread.rowsInCurrentThread = 0;
```

---

## Testing Scenarios

### Test 1: Thread Mới Với Initial Prompt
**Expected:**
```
Initial prompt → markdown-0 (skip)
Row 1 → markdown-1 ✅
Row 2 → markdown-2 ✅
Row 3 → markdown-3 ✅
```

### Test 2: Emergency NEW THREAD
**Expected:**
```
Row 5 → markdown-5 → hasCode: false
NEW THREAD → Initial prompt → markdown-0 (skip)
Retry Row 5 → markdown-1 ✅
Row 6 → markdown-2 ✅
```

### Test 3: Scheduled NEW THREAD (Test Mode: 5 rows)
**Expected:**
```
Row 1 → markdown-1 ✅
Row 2 → markdown-2 ✅
Row 3 → markdown-3 ✅
Row 4 → markdown-4 ✅
Row 5 → markdown-5 ✅
NEW THREAD → Initial prompt → markdown-0 (skip)
Row 6 → markdown-1 ✅
Row 7 → markdown-2 ✅
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

Processing row 2/178: Ingredient B
Sending ingredient name only
Attempt 1/3: Sending prompt to AI
Fetching markdown-content-2
✅ Valid response received on attempt 1
✅ Processed row 2/178
```

### Logs Sau NEW THREAD
```
Creating new thread after 5 rows
🔄 Creating new Perplexity thread...
✅ New thread created
📤 Sending initial prompt to new thread...
✅ Initial prompt sent, new thread ready (counter set to 1 to skip markdown-0)
rowsInCurrentThread reset for new thread

Processing row 6/178: Ingredient F
Sending full prompt (first row in thread)
Attempt 1/3: Sending prompt to AI
Fetching markdown-content-1
✅ Valid response received on attempt 1
✅ Processed row 6/178
```

---

## Summary

✅ **Fetch TRƯỚC, Increment SAU** - Lấy đúng markdown-content-0, 1, 2, ...  
✅ **Set counter = 1 sau initial prompt** - Skip markdown-0 (initial prompt response)  
✅ **Không reset markdownCounter sau createNewThread()** - Đã được set = 1 rồi  
✅ **Chỉ reset rowsInCurrentThread** - Track rows trong thread hiện tại  

**Kết quả:**
- Không bao giờ lấy nhầm markdown
- Track chính xác index
- Skip đúng initial prompt response

