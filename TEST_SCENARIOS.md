# 🧪 Test Scenarios - Markdown Counter & Row Counter Logic

## Test Setup

### Prerequisites
1. Load extension in Chrome
2. Open Excel Popup
3. Load a test Excel file with at least 10 REVIEW rows
4. Open Chrome DevTools Console to monitor logs

---

## 📋 Test Case 1: Normal Flow (No Timeout, No Scheduled New Thread)

### Scenario
Process 3 rows normally without any interruptions

### Expected Behavior

```
Initial State:
├─ markdownCounter = 0
├─ rowsProcessedInCurrentThread = 0
├─ currentRowIndex = 0
└─ promptSent = false

Step 1: Send Initial Prompt
├─ Log: "Markdown counter initialized: 0"
├─ Log: "rowsProcessedInCurrentThread: 0"
├─ Send prompt to Perplexity
├─ markdownCounter = 0 (stays 0, will be skipped)
└─ promptSent = true

Step 2: Process Row 1
├─ markdownCounter++ → 1
├─ Log: "Waiting for markdown-content-1 (rowsProcessedInCurrentThread=0)..."
├─ Wait for markdown-content-1
├─ Log: "Received response from markdown-content-1 (XXX chars)"
├─ Write to Excel
├─ rowsProcessedInCurrentThread++ → 1
└─ currentRowIndex++ → 1

Step 3: Process Row 2
├─ markdownCounter++ → 2
├─ Log: "Waiting for markdown-content-2 (rowsProcessedInCurrentThread=1)..."
├─ Wait for markdown-content-2
├─ Log: "Received response from markdown-content-2 (XXX chars)"
├─ Write to Excel
├─ rowsProcessedInCurrentThread++ → 2
└─ currentRowIndex++ → 2

Step 4: Process Row 3
├─ markdownCounter++ → 3
├─ Log: "Waiting for markdown-content-3 (rowsProcessedInCurrentThread=2)..."
├─ Wait for markdown-content-3
├─ Log: "Received response from markdown-content-3 (XXX chars)"
├─ Write to Excel
├─ rowsProcessedInCurrentThread++ → 3
└─ currentRowIndex++ → 3

Final State:
├─ markdownCounter = 3
├─ rowsProcessedInCurrentThread = 3
├─ currentRowIndex = 3
└─ promptSent = true
```

### ✅ Success Criteria
- [ ] All 3 rows processed successfully
- [ ] Markdown counter increments: 0 → 1 → 2 → 3
- [ ] rowsProcessedInCurrentThread increments: 0 → 1 → 2 → 3
- [ ] currentRowIndex increments: 0 → 1 → 2 → 3
- [ ] Logs show correct counter values at each step

---

## 📋 Test Case 2: Markdown Timeout (Trigger New Thread Mid-Processing)

### Scenario
Process 2 rows normally, then simulate markdown timeout on row 3

### Setup
To simulate timeout, you can:
1. Manually stop Perplexity from responding (close tab temporarily)
2. Or wait 60 seconds for natural timeout

### Expected Behavior

```
Initial State:
├─ markdownCounter = 0
├─ rowsProcessedInCurrentThread = 0
├─ currentRowIndex = 0
└─ promptSent = false

Step 1-2: Process Row 1 & 2 normally
├─ (Same as Test Case 1)
├─ markdownCounter = 2
├─ rowsProcessedInCurrentThread = 2
└─ currentRowIndex = 2

Step 3: Process Row 3 - TIMEOUT OCCURS
├─ markdownCounter++ → 3
├─ Log: "Waiting for markdown-content-3 (rowsProcessedInCurrentThread=2)..."
├─ Wait 60 seconds...
├─ Log: "⚠️ Markdown-content-3 not found after 60s"
├─ Log: "🔄 Triggering new thread due to missing markdown..."
│
├─ Create New Thread:
│  ├─ Click "New Thread" button
│  ├─ Log: "✅ New thread created due to missing markdown"
│  ├─ markdownCounter: 3 → 0
│  ├─ Log: "🔄 Markdown counter reset: 3 → 0 (rowsProcessedInCurrentThread=2 kept)"
│  ├─ ⚠️ IMPORTANT: rowsProcessedInCurrentThread STAYS 2 (NOT RESET!)
│  ├─ Send initial prompt
│  ├─ Log: "✅ Initial prompt sent to new thread (will be markdown-0, skipped)"
│  ├─ markdownCounter: 0 → 1
│  └─ Log: "🔄 Now retrying with markdown-content-1 (after new thread workflow)..."
│
├─ Retry Row 3:
│  ├─ Wait for markdown-content-1 (in new thread)
│  ├─ Log: "✅ Markdown-content-1 found after new thread workflow"
│  ├─ Write to Excel (Row 3 data)
│  ├─ rowsProcessedInCurrentThread++ → 3
│  └─ currentRowIndex++ → 3

Final State:
├─ markdownCounter = 1 (reset to 0, then incremented to 1)
├─ rowsProcessedInCurrentThread = 3 (KEPT from before timeout!)
├─ currentRowIndex = 3
└─ Row 3 processed successfully (no data loss)
```

### ✅ Success Criteria
- [ ] Timeout detected after 60s
- [ ] New thread created automatically
- [ ] markdownCounter reset: 3 → 0 → 1
- [ ] **rowsProcessedInCurrentThread KEPT: 2 → 3** (NOT reset to 0!)
- [ ] currentRowIndex continues: 2 → 3
- [ ] Row 3 data written successfully (no data loss)
- [ ] Log shows: "rowsProcessedInCurrentThread=2 kept"
- [ ] Log shows: "Now retrying with markdown-content-1 (after new thread workflow)"

---

## 📋 Test Case 3: Scheduled New Thread (Every 5 Rows in TEST_MODE)

### Scenario
Process 7 rows with TEST_MODE=true (ROWS_PER_THREAD=5)

### Setup
1. Edit `src/excelPopup.ts`:
   ```typescript
   const TEST_MODE = true; // Set to true
   const ROWS_PER_THREAD = TEST_MODE ? 5 : 50;
   ```
2. Rebuild: `npm run build`
3. Reload extension

### Expected Behavior

```
Initial State:
├─ markdownCounter = 0
├─ rowsProcessedInCurrentThread = 0
├─ currentRowIndex = 0
└─ ROWS_PER_THREAD = 5

Step 1-5: Process Rows 1-5 normally
├─ Row 1: markdownCounter=1, rowsProcessedInCurrentThread=1, currentRowIndex=1
├─ Row 2: markdownCounter=2, rowsProcessedInCurrentThread=2, currentRowIndex=2
├─ Row 3: markdownCounter=3, rowsProcessedInCurrentThread=3, currentRowIndex=3
├─ Row 4: markdownCounter=4, rowsProcessedInCurrentThread=4, currentRowIndex=4
└─ Row 5: markdownCounter=5, rowsProcessedInCurrentThread=5, currentRowIndex=5

Step 6: After Row 5 - SCHEDULED NEW THREAD TRIGGERED
├─ Check: rowsProcessedInCurrentThread (5) >= ROWS_PER_THREAD (5) ✅
├─ Log: "🔄 ========== NEW THREAD TRIGGERED (SCHEDULED) =========="
├─ Log: "📊 Processed 5 rows in current thread (limit: 5)"
├─ Log: "📊 Markdown counter before reset: 5"
├─ Log: "📊 Current row index: 5 / X"
│
├─ Create New Thread:
│  ├─ Click "New Thread" button
│  ├─ Log: "✅ New thread created successfully"
│  ├─ promptSent: true → false
│  ├─ rowsProcessedInCurrentThread: 5 → 0 (RESET!)
│  ├─ markdownCounter: 5 → 0 (RESET!)
│  ├─ Log: "✅ Counters reset: rowsProcessedInCurrentThread=0, markdownCounter=0"
│  ├─ Log: "📌 Note: Excel row counter (i=5) continues - NOT reset"
│  ├─ Send initial prompt
│  ├─ Log: "✅ Initial prompt sent to new thread (will be markdown-0, skipped)"
│  ├─ promptSent: false → true
│  └─ Log: "▶️ Continuing processing with next row..."

Step 7: Process Row 6 (in new thread)
├─ markdownCounter++ → 1 (starts from 0 in new thread)
├─ Log: "Waiting for markdown-content-1 (rowsProcessedInCurrentThread=0)..."
├─ Wait for markdown-content-1
├─ Log: "Received response from markdown-content-1 (XXX chars)"
├─ Write to Excel (Row 6 data)
├─ rowsProcessedInCurrentThread++ → 1
└─ currentRowIndex++ → 6

Step 8: Process Row 7 (in new thread)
├─ markdownCounter++ → 2
├─ Log: "Waiting for markdown-content-2 (rowsProcessedInCurrentThread=1)..."
├─ Wait for markdown-content-2
├─ Log: "Received response from markdown-content-2 (XXX chars)"
├─ Write to Excel (Row 7 data)
├─ rowsProcessedInCurrentThread++ → 2
└─ currentRowIndex++ → 7

Final State:
├─ markdownCounter = 2 (reset after row 5, then 0→1→2)
├─ rowsProcessedInCurrentThread = 2 (reset after row 5, then 0→1→2)
├─ currentRowIndex = 7 (NEVER reset, continues)
└─ All 7 rows processed successfully
```

### ✅ Success Criteria
- [ ] After row 5: Scheduled new thread triggered
- [ ] Log shows: "NEW THREAD TRIGGERED (SCHEDULED)"
- [ ] Log shows: "Processed 5 rows in current thread (limit: 5)"
- [ ] Both counters reset: markdownCounter (5→0), rowsProcessedInCurrentThread (5→0)
- [ ] Log shows: "Excel row counter (i=5) continues - NOT reset"
- [ ] Row 6 starts with markdown-content-1 (new thread)
- [ ] Row 6 starts with rowsProcessedInCurrentThread=0 (new thread)
- [ ] currentRowIndex continues: 5 → 6 → 7 (NOT reset)
- [ ] All 7 rows processed successfully

---

## 🎯 Summary - What to Verify

### Counter Behaviors

| Counter | Normal Flow | Timeout New Thread | Scheduled New Thread |
|---------|-------------|-------------------|---------------------|
| `markdownCounter` | Increments | Reset to 0, then 1 | Reset to 0 |
| `rowsProcessedInCurrentThread` | Increments | **KEPT** (not reset) | Reset to 0 |
| `currentRowIndex` | Increments | Increments | Increments |

### Key Differences

**Timeout New Thread:**
- ✅ Keeps `rowsProcessedInCurrentThread` (to continue counting toward 50)
- ✅ Resets `markdownCounter` (new thread = new markdown sequence)
- ✅ Retries same row (no data loss)

**Scheduled New Thread:**
- ✅ Resets `rowsProcessedInCurrentThread` (fresh count for new thread)
- ✅ Resets `markdownCounter` (new thread = new markdown sequence)
- ✅ Continues to next row (not retry)

---

## 📝 Test Execution Checklist

### Before Testing
- [ ] Build extension: `npm run build`
- [ ] Load extension in Chrome
- [ ] Open Chrome DevTools Console
- [ ] Prepare test Excel file with 10+ REVIEW rows

### Test Case 1 - Normal Flow
- [ ] Run workflow
- [ ] Verify logs show correct counter increments
- [ ] Verify all 3 rows processed
- [ ] Screenshot logs

### Test Case 2 - Timeout
- [ ] Run workflow
- [ ] Simulate timeout on row 3
- [ ] Verify log: "rowsProcessedInCurrentThread=2 kept"
- [ ] Verify row 3 processed successfully
- [ ] Screenshot logs

### Test Case 3 - Scheduled New Thread
- [ ] Set TEST_MODE=true
- [ ] Rebuild extension
- [ ] Run workflow with 7 rows
- [ ] Verify new thread after row 5
- [ ] Verify log: "Excel row counter (i=5) continues - NOT reset"
- [ ] Verify rows 6-7 processed in new thread
- [ ] Screenshot logs

### After Testing
- [ ] Set TEST_MODE=false
- [ ] Rebuild for production
- [ ] Document any issues found

---

## 🐛 Common Issues to Watch For

1. **Row Data Loss**: If timeout occurs, verify row is retried (not skipped)
2. **Counter Mismatch**: Verify logs show correct counter values
3. **Infinite Loop**: If markdown never found, verify error handling
4. **Excel Write Errors**: Verify data written to correct row

---

## 📊 Expected Log Patterns

### Normal Flow
```
🔍 Waiting for markdown-content-1 (rowsProcessedInCurrentThread=0)...
✅ Received response from markdown-content-1 (XXX chars)
🔍 Waiting for markdown-content-2 (rowsProcessedInCurrentThread=1)...
✅ Received response from markdown-content-2 (XXX chars)
```

### Timeout Flow
```
🔍 Waiting for markdown-content-3 (rowsProcessedInCurrentThread=2)...
⚠️ Markdown-content-3 not found after 60s
🔄 Triggering new thread due to missing markdown...
✅ New thread created due to missing markdown
🔄 Markdown counter reset: 3 → 0 (rowsProcessedInCurrentThread=2 kept)
📤 Sending initial prompt to new thread...
✅ Initial prompt sent to new thread (will be markdown-0, skipped)
🔄 Now retrying with markdown-content-1 (after new thread workflow)...
✅ Markdown-content-1 found after new thread workflow
```

### Scheduled New Thread Flow
```
🔄 ========== NEW THREAD TRIGGERED (SCHEDULED) ==========
📊 Processed 5 rows in current thread (limit: 5)
📊 Markdown counter before reset: 5
📊 Current row index: 5 / X
✅ New thread created successfully
✅ Counters reset: rowsProcessedInCurrentThread=0, markdownCounter=0
📌 Note: Excel row counter (i=5) continues - NOT reset
✅ Initial prompt sent to new thread (will be markdown-0, skipped)
🔄 ========== NEW THREAD COMPLETE ==========
▶️ Continuing processing with next row...
🔍 Waiting for markdown-content-1 (rowsProcessedInCurrentThread=0)...
```

