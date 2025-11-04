# 🚀 Quick Test Guide - 3 Test Cases

## 🎯 Objective
Verify that markdown counter and row counter logic works correctly in 3 scenarios:
1. ✅ Normal flow
2. ✅ Timeout triggers new thread (keeps rowsProcessedInCurrentThread)
3. ✅ Scheduled new thread (resets rowsProcessedInCurrentThread)

---

## 🛠️ Setup (One-time)

### 1. Check Current Mode
```bash
./test-helper.sh status
```

### 2. Prepare Test Excel File
Create a test Excel file with **10 REVIEW rows**:
- Column A: ID (1, 2, 3, ...)
- Column B: Status (all "REVIEW")
- Column C: Name (any ingredient names)

Save as: `IngredientName/TestFile.xlsx`

### 3. Load Extension
1. Open Chrome: `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `dist` folder
5. Extension should appear as "Perplexity Automation"

---

## 🧪 Test Case 1: Normal Flow (3 Rows)

### Goal
Verify counters increment correctly without interruptions

### Steps
1. **Open Excel Popup**
   ```
   Click extension icon → "Open Excel Popup"
   ```

2. **Open DevTools Console**
   ```
   Right-click popup → Inspect → Console tab
   ```

3. **Load Test File**
   ```
   Click "Choose Files" → Select TestFile.xlsx
   ```

4. **Start Processing**
   ```
   Click "Start Processing"
   ```

5. **Stop After 3 Rows**
   ```
   Click "Stop Processing" after row 3 completes
   ```

### ✅ Expected Logs
```
=== Step 1: Sending initial prompt ===
🔄 Markdown counter initialized: 0
📊 rowsProcessedInCurrentThread: 0
✅ Initial prompt sent to new thread (will be markdown-0, skipped)

=== Starting row processing ===
🔍 Waiting for markdown-content-1 (rowsProcessedInCurrentThread=0)...
✅ Received response from markdown-content-1 (XXX chars)
🔍 DEBUG: rowsProcessedInCurrentThread=1, ROWS_PER_THREAD=50, i=0, total=10

🔍 Waiting for markdown-content-2 (rowsProcessedInCurrentThread=1)...
✅ Received response from markdown-content-2 (XXX chars)
🔍 DEBUG: rowsProcessedInCurrentThread=2, ROWS_PER_THREAD=50, i=1, total=10

🔍 Waiting for markdown-content-3 (rowsProcessedInCurrentThread=2)...
✅ Received response from markdown-content-3 (XXX chars)
🔍 DEBUG: rowsProcessedInCurrentThread=3, ROWS_PER_THREAD=50, i=2, total=10
```

### ✅ Verify
- [ ] markdownCounter: 0 → 1 → 2 → 3
- [ ] rowsProcessedInCurrentThread: 0 → 1 → 2 → 3
- [ ] All 3 rows have Status = "OK" (green background)
- [ ] Tags written to columns AT-BB

---

## 🧪 Test Case 2: Timeout New Thread

### Goal
Verify that timeout triggers new thread but KEEPS rowsProcessedInCurrentThread

### Steps
1. **Continue from Test Case 1** (or restart)
   ```
   Current state: 3 rows processed
   markdownCounter = 3
   rowsProcessedInCurrentThread = 3
   ```

2. **Simulate Timeout**
   
   **Option A: Close Perplexity Tab (Recommended)**
   ```
   1. Find Perplexity tab
   2. Close it temporarily
   3. Click "Resume Processing" in Excel Popup
   4. Wait 60 seconds for timeout
   5. Reopen Perplexity tab when you see "New thread created"
   ```
   
   **Option B: Wait Naturally**
   ```
   1. Click "Resume Processing"
   2. Wait for AI to timeout (60s)
   ```

3. **Observe Logs**

### ✅ Expected Logs
```
🔍 Waiting for markdown-content-4 (rowsProcessedInCurrentThread=3)...
⏳ Waiting... (checking every 2s)
⏳ Waiting... (checking every 2s)
... (30 times = 60 seconds)

⚠️ Markdown-content-4 not found after 60s
🔄 Triggering new thread due to missing markdown...
✅ New thread created due to missing markdown
🔄 Markdown counter reset: 4 → 0 (rowsProcessedInCurrentThread=3 kept)
📤 Sending initial prompt to new thread...
✅ Initial prompt sent to new thread (will be markdown-0, skipped)
🔄 Now retrying with markdown-content-1 (after new thread workflow)...
✅ Markdown-content-1 found after new thread workflow
✅ Received response from markdown-content-1 (XXX chars)
🔍 DEBUG: rowsProcessedInCurrentThread=4, ROWS_PER_THREAD=50, i=3, total=10
```

### ✅ Verify
- [ ] Log shows: "Markdown-content-4 not found after 60s"
- [ ] Log shows: "Markdown counter reset: 4 → 0 (rowsProcessedInCurrentThread=3 kept)"
- [ ] Log shows: "Now retrying with markdown-content-1 (after new thread workflow)"
- [ ] **rowsProcessedInCurrentThread: 3 → 4** (NOT reset to 0!)
- [ ] Row 4 processed successfully (no data loss)
- [ ] markdownCounter: 4 → 0 → 1

---

## 🧪 Test Case 3: Scheduled New Thread (Every 5 Rows)

### Goal
Verify scheduled new thread resets BOTH counters

### Steps
1. **Switch to Test Mode**
   ```bash
   ./test-helper.sh test
   ```
   
   This will:
   - Set ROWS_PER_THREAD = 5
   - Rebuild extension
   - Output: "✅ Switched to TEST MODE"

2. **Reload Extension**
   ```
   Chrome: chrome://extensions/
   Click "Reload" on Perplexity Automation
   ```

3. **Start Fresh Test**
   ```
   1. Open Excel Popup
   2. Open DevTools Console
   3. Load TestFile.xlsx (with 10 REVIEW rows)
   4. Click "Start Processing"
   5. Let it run until 7 rows processed
   ```

4. **Observe New Thread After Row 5**

### ✅ Expected Logs
```
=== Rows 1-5 processed normally ===
🔍 Waiting for markdown-content-1 (rowsProcessedInCurrentThread=0)...
✅ Received response from markdown-content-1
🔍 DEBUG: rowsProcessedInCurrentThread=1, ROWS_PER_THREAD=5, i=0, total=10

🔍 Waiting for markdown-content-2 (rowsProcessedInCurrentThread=1)...
✅ Received response from markdown-content-2
🔍 DEBUG: rowsProcessedInCurrentThread=2, ROWS_PER_THREAD=5, i=1, total=10

🔍 Waiting for markdown-content-3 (rowsProcessedInCurrentThread=2)...
✅ Received response from markdown-content-3
🔍 DEBUG: rowsProcessedInCurrentThread=3, ROWS_PER_THREAD=5, i=2, total=10

🔍 Waiting for markdown-content-4 (rowsProcessedInCurrentThread=3)...
✅ Received response from markdown-content-4
🔍 DEBUG: rowsProcessedInCurrentThread=4, ROWS_PER_THREAD=5, i=3, total=10

🔍 Waiting for markdown-content-5 (rowsProcessedInCurrentThread=4)...
✅ Received response from markdown-content-5
🔍 DEBUG: rowsProcessedInCurrentThread=5, ROWS_PER_THREAD=5, i=4, total=10

=== SCHEDULED NEW THREAD TRIGGERED ===
🔄 ========== NEW THREAD TRIGGERED (SCHEDULED) ==========
📊 Processed 5 rows in current thread (limit: 5)
📊 Markdown counter before reset: 5
📊 Current row index: 4 / 9
🔄 Creating new thread...
✅ New thread created successfully
🔄 Resetting workflow state for new thread...
✅ Counters reset: rowsProcessedInCurrentThread=0, markdownCounter=0
📌 Note: Excel row counter (i=4) continues - NOT reset
📤 Sending initial prompt to new thread...
✅ Initial prompt sent to new thread (will be markdown-0, skipped)
🔄 ========== NEW THREAD COMPLETE ==========
▶️ Continuing processing with next row...

=== Row 6 in NEW THREAD ===
🔍 Waiting for markdown-content-1 (rowsProcessedInCurrentThread=0)...
✅ Received response from markdown-content-1
🔍 DEBUG: rowsProcessedInCurrentThread=1, ROWS_PER_THREAD=5, i=5, total=10

=== Row 7 in NEW THREAD ===
🔍 Waiting for markdown-content-2 (rowsProcessedInCurrentThread=1)...
✅ Received response from markdown-content-2
🔍 DEBUG: rowsProcessedInCurrentThread=2, ROWS_PER_THREAD=5, i=6, total=10
```

### ✅ Verify
- [ ] After row 5: Log shows "NEW THREAD TRIGGERED (SCHEDULED)"
- [ ] Log shows: "Processed 5 rows in current thread (limit: 5)"
- [ ] Log shows: "Counters reset: rowsProcessedInCurrentThread=0, markdownCounter=0"
- [ ] Log shows: "Excel row counter (i=4) continues - NOT reset"
- [ ] Row 6 starts with: "markdown-content-1 (rowsProcessedInCurrentThread=0)"
- [ ] Row 7 starts with: "markdown-content-2 (rowsProcessedInCurrentThread=1)"
- [ ] All 7 rows have Status = "OK"

### 4. **Switch Back to Production Mode**
```bash
./test-helper.sh production
```

---

## 📊 Summary Table

| Test Case | Trigger | markdownCounter | rowsProcessedInCurrentThread | currentRowIndex |
|-----------|---------|-----------------|------------------------------|-----------------|
| **Case 1: Normal** | N/A | 0→1→2→3 | 0→1→2→3 | 0→1→2→3 |
| **Case 2: Timeout** | 60s timeout | 4→0→1 | 3→4 (KEPT!) | 3→4 |
| **Case 3: Scheduled** | After 5 rows | 5→0→1→2 | 5→0→1→2 (RESET!) | 4→5→6→7 |

---

## 🎯 Key Differences to Verify

### Timeout New Thread (Case 2)
```
✅ rowsProcessedInCurrentThread KEPT (3 → 4)
✅ markdownCounter RESET (4 → 0 → 1)
✅ Same row retried (row 4)
✅ Log: "rowsProcessedInCurrentThread=3 kept"
```

### Scheduled New Thread (Case 3)
```
✅ rowsProcessedInCurrentThread RESET (5 → 0)
✅ markdownCounter RESET (5 → 0)
✅ Next row processed (row 6, not retry)
✅ Log: "Excel row counter (i=4) continues - NOT reset"
```

---

## 🐛 Troubleshooting

### Issue: Extension not loading
```bash
# Rebuild extension
npm run build

# Reload in Chrome
chrome://extensions/ → Click "Reload"
```

### Issue: Logs not showing
```
Right-click Excel Popup → Inspect → Console tab
Make sure "Preserve log" is checked
```

### Issue: Timeout not triggering
```
Close Perplexity tab to force timeout
Or wait full 60 seconds
```

### Issue: Can't switch to test mode
```bash
# Check current mode
./test-helper.sh status

# Force switch
./test-helper.sh test

# Verify
grep "const TEST_MODE" src/excelPopup.ts
```

---

## ✅ Final Checklist

After completing all 3 test cases:

- [ ] Test Case 1: Normal flow works (3 rows)
- [ ] Test Case 2: Timeout keeps rowsProcessedInCurrentThread
- [ ] Test Case 3: Scheduled new thread resets both counters
- [ ] All logs show correct counter values
- [ ] No data loss in any scenario
- [ ] Switched back to production mode
- [ ] Extension rebuilt and ready for production

---

## 📝 Report Results

After testing, document:
1. ✅ Which test cases passed
2. ❌ Which test cases failed (if any)
3. 📸 Screenshots of logs
4. 🐛 Any bugs found

Share results with team or create GitHub issue if bugs found.

---

## 🎉 Success!

If all 3 test cases pass, the bug fix is verified and ready for production! 🚀

