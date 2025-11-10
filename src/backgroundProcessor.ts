/**
 * Background Processor
 * Handles all Excel processing in background script
 * Continues running even when popup is closed
 */

import { ExcelWorkflowManager } from './excelWorkflow';
import { STORAGE_KEYS, EXCEL_CONFIG } from './constants';

export interface ProcessingThread {
  id: string;
  partNumber: number;
  fileName: string;
  filePath: string; // Store file path for restoring workflow
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentRowIndex: number;
  totalRows: number;
  processedRows: number;
  failedRows: number;
  startTime: number;
  lastUpdateTime: number;
  error?: string;
  markdownCounter: number; // Track markdown-content-{N} index
  rowsInCurrentThread: number; // Track rows processed in current Perplexity thread
  consecutiveFailedThreads: number; // Track consecutive new threads without successful results
}

export interface ProcessingState {
  threads: ProcessingThread[];
  logs: Array<{ text: string; type: 'info' | 'success' | 'error' | 'warning'; timestamp: number }>;
  isProcessing: boolean;
  currentThread: string | null;
  perplexityTabId: number | null;
  testMode: boolean;
  rowsPerThread: number;
}

class BackgroundProcessor {
  private state: ProcessingState = {
    threads: [],
    logs: [],
    isProcessing: false,
    currentThread: null,
    perplexityTabId: null,
    testMode: false,
    rowsPerThread: EXCEL_CONFIG.ROWS_PER_THREAD_PRODUCTION
  };

  private workflowManagers: Map<string, ExcelWorkflowManager> = new Map();
  private processingInterval: number | null = null;

  constructor() {
    this.loadState();
  }

  /**
   * Load state from chrome.storage
   */
  async loadState(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['processingState']);
      if (result.processingState) {
        this.state = result.processingState;
        this.addLog('Restored processing state from storage', 'info');
        
        // Resume processing if it was running
        if (this.state.isProcessing) {
          this.addLog('Resuming processing from previous session', 'info');
          this.resumeProcessing();
        }
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }

  /**
   * Save state to chrome.storage
   */
  async saveState(): Promise<void> {
    try {
      await chrome.storage.local.set({ processingState: this.state });
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  /**
   * Add log entry
   */
  addLog(text: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    const log = {
      text: `${new Date().toLocaleTimeString()} - ${text}`,
      type,
      timestamp: Date.now()
    };

    this.state.logs.push(log);

    // Keep only last 100 logs
    if (this.state.logs.length > 100) {
      this.state.logs = this.state.logs.slice(-100);
    }

    this.saveState();
    this.notifyPopup({ type: 'LOG_ADDED', log });
  }

  /**
   * Create new processing thread
   */
  async createThread(partNumber: number, fileName: string, filePath: string): Promise<string> {
    this.addLog(`createThread called with: partNumber=${partNumber}, fileName=${fileName}, filePath=${filePath}`, 'info');

    if (!partNumber || !fileName || !filePath) {
      const error = `Invalid parameters: partNumber=${partNumber}, fileName=${fileName}, filePath=${filePath}`;
      this.addLog(error, 'error');
      throw new Error(error);
    }

    const threadId = `thread_${Date.now()}_${partNumber}`;

    const thread: ProcessingThread = {
      id: threadId,
      partNumber,
      fileName,
      filePath, // Store file path for later restoration
      status: 'idle',
      currentRowIndex: 0,
      totalRows: 0,
      processedRows: 0,
      failedRows: 0,
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      markdownCounter: 0,
      rowsInCurrentThread: 0,
      consecutiveFailedThreads: 0
    };

    this.state.threads.push(thread);
    this.addLog(`Created thread for ${fileName} (Part ${partNumber})`, 'info');

    // Load Excel file
    try {
      const workflow = new ExcelWorkflowManager(filePath);
      await workflow.loadPrompt();

      // Ensure filePath is a string
      if (typeof filePath !== 'string' || filePath.trim() === '') {
        throw new Error(`Invalid filePath: ${filePath}`);
      }

      const fileUrl = chrome.runtime.getURL(filePath);
      this.addLog(`Loading file from: ${fileUrl}`, 'info');

      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      workflow.parseExcelFromBuffer(arrayBuffer);

      const reviewRows = workflow.getReviewRows();
      thread.totalRows = reviewRows.length;

      // Store review rows in chrome.storage for processing
      await chrome.storage.local.set({
        [STORAGE_KEYS.REVIEW_ROWS]: reviewRows
      });

      // Store Excel buffer for later download restoration
      const storageKey = `excel_buffer_${threadId}`;
      await chrome.storage.local.set({
        [storageKey]: Array.from(new Uint8Array(arrayBuffer))
      });

      this.workflowManagers.set(threadId, workflow);
      this.addLog(`Loaded ${reviewRows.length} rows for processing`, 'success');

      thread.status = 'idle';
    } catch (error) {
      thread.status = 'error';
      thread.error = String(error);
      this.addLog(`Failed to load file: ${error}`, 'error');
      throw error;
    }

    await this.saveState();
    return threadId;
  }

  /**
   * Start processing
   */
  async startProcessing(threadId?: string, testMode?: boolean): Promise<void> {
    this.state.isProcessing = true;

    if (threadId) {
      this.state.currentThread = threadId;

      // Set thread status to running
      const thread = this.state.threads.find(t => t.id === threadId);
      if (thread) {
        thread.status = 'running';
        this.addLog(`Thread ${threadId} status set to running`, 'info');
      }
    }

    if (testMode !== undefined) {
      this.state.testMode = testMode;
      this.state.rowsPerThread = testMode
        ? EXCEL_CONFIG.ROWS_PER_THREAD_TEST
        : EXCEL_CONFIG.ROWS_PER_THREAD_PRODUCTION;
      this.addLog(`Test mode: ${testMode ? 'ON (5 rows/thread)' : 'OFF (50 rows/thread)'}`, 'info');
    }

    this.addLog('Starting background processing', 'info');
    await this.saveState();

    // Start processing loop
    this.processingInterval = setInterval(() => {
      this.processNextRow();
    }, 5000) as unknown as number; // Process every 5 seconds
  }

  private isProcessingRow: boolean = false;

  /**
   * Process next row
   */
  private async processNextRow(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessingRow) {
      this.addLog('Already processing a row, skipping...', 'info');
      return;
    }

    if (!this.state.currentThread) return;

    const thread = this.state.threads.find(t => t.id === this.state.currentThread);
    if (!thread || thread.status !== 'running') return;

    const workflow = this.workflowManagers.get(thread.id);
    if (!workflow) return;

    // Get review rows from storage
    const result = await chrome.storage.local.get([STORAGE_KEYS.REVIEW_ROWS]);
    const reviewRows = result[STORAGE_KEYS.REVIEW_ROWS] || [];

    if (thread.currentRowIndex >= reviewRows.length) {
      // Thread complete
      thread.status = 'completed';
      this.addLog(`Thread ${thread.id} completed`, 'success');

      // ✅ Auto-download Excel file
      await this.downloadExcelFile(thread);

      this.stopProcessing();
      await this.saveState();
      return;
    }

    const row = reviewRows[thread.currentRowIndex];

    this.isProcessingRow = true;
    this.addLog(`Processing row ${thread.currentRowIndex + 1}/${thread.totalRows}: ${row.name}`, 'info');

    try {
      // 1. Format prompt
      // First row in VERY FIRST thread (rowsInCurrentThread === 0): send full prompt + ingredient name
      // After createNewThread (rowsInCurrentThread === -1): just ingredient name (init already sent)
      // Other rows: just ingredient name
      const isFirstRowInThread = thread.rowsInCurrentThread === 0;
      const prompt = workflow.formatInput(row, isFirstRowInThread);

      if (isFirstRowInThread) {
        this.addLog('Sending full prompt (first row in very first thread)', 'info');
      } else {
        this.addLog('Sending ingredient name only', 'info');
      }

      // 2. Send to Perplexity (via content script)
      // Pass current markdown counter, will be incremented inside sendToPerplexity
      const response = await this.sendToPerplexity(prompt, thread);

      // 3. Parse AI response
      const tags = workflow.parseAIResponse(response);

      // 4. Map tags to columns
      const mappedColumns = workflow.mapTagsToColumns(tags);

      // 5. Write to Excel
      workflow.writeTagsToRow(row.rowIndex, mappedColumns);
      workflow.updateRowStatus(row.rowIndex, EXCEL_CONFIG.STATUS.OK);

      // 5.1. Save updated Excel buffer to storage for download restoration
      const updatedBuffer = workflow.saveExcelFile();
      const storageKey = `excel_buffer_${thread.id}`;
      await chrome.storage.local.set({
        [storageKey]: Array.from(new Uint8Array(updatedBuffer))
      });

      // 6. Update thread state
      thread.processedRows++;
      thread.currentRowIndex++;

      // ✅ FIX: If rowsInCurrentThread is -1 (after createNewThread), set to 1 instead of incrementing
      // This ensures next row won't be treated as "first row"
      if (thread.rowsInCurrentThread === -1) {
        thread.rowsInCurrentThread = 1;
      } else {
        thread.rowsInCurrentThread++;
      }

      // ✅ Reset consecutive failed threads counter on successful result
      thread.consecutiveFailedThreads = 0;

      thread.lastUpdateTime = Date.now();

      this.addLog(`✅ Processed row ${thread.currentRowIndex}/${thread.totalRows}`, 'success');

      // 7. Check if need new thread (every N rows based on mode)
      if (thread.rowsInCurrentThread >= this.state.rowsPerThread && thread.currentRowIndex < thread.totalRows) {
        this.addLog(`Creating new thread after ${this.state.rowsPerThread} rows`, 'info');
        await this.createNewThread();

        // ✅ rowsInCurrentThread already set to -1 by createNewThread()
        this.addLog('New thread created, rowsInCurrentThread set to -1 (init already sent)', 'info');
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // ✅ FIX: Check if error is due to emergency new thread creation
      if (errorMsg.includes('created new thread')) {
        // Increment consecutive failed threads counter
        thread.consecutiveFailedThreads++;
        this.addLog(`🔄 Will retry current row in new thread (consecutive failures: ${thread.consecutiveFailedThreads}/5)`, 'warning');

        // ✅ Check if too many consecutive failed threads
        if (thread.consecutiveFailedThreads >= 5) {
          thread.status = 'error';
          thread.error = `Stopped after 5 consecutive new threads without successful results. Processed: ${thread.processedRows}/${thread.totalRows} rows (${thread.processedRows} OK).`;

          this.addLog(`🛑 STOPPED: 5 consecutive new threads failed`, 'error');
          this.addLog(`� Results: ${thread.processedRows} rows processed successfully out of ${thread.totalRows} total`, 'info');
          this.addLog(`✅ Total OK: ${thread.processedRows}`, 'success');

          this.state.isProcessing = false;
          await this.saveState();
          this.notifyPopup({ type: 'STATE_UPDATE', state: this.state });
          return; // Stop processing
        }

        // Don't count as failed, don't move to next row - will retry current row in new thread
      } else {
        // Regular error - count as failed and move to next row
        thread.failedRows++;
        this.addLog(`❌ Failed to process row ${thread.currentRowIndex}: ${errorMsg}`, 'error');
        thread.currentRowIndex++;
      }
    } finally {
      this.isProcessingRow = false;
    }

    await this.saveState();
    this.notifyPopup({ type: 'STATE_UPDATE', state: this.state });
  }

  /**
   * Resume processing after reload
   */
  private async resumeProcessing(): Promise<void> {
    if (this.state.currentThread) {
      await this.startProcessing(this.state.currentThread);
    }
  }



  /**
   * Stop processing
   */
  stopProcessing(): void {
    this.state.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.addLog('Processing stopped', 'warning');
    this.saveState();
  }

  /**
   * Notify popup of state changes
   */
  private notifyPopup(message: any): void {
    chrome.runtime.sendMessage(message).catch(() => {
      // Popup might be closed, ignore error
    });
  }

  /**
   * Get current state
   */
  getState(): ProcessingState {
    return this.state;
  }

  /**
   * Send prompt to Perplexity via content script with retry
   */
  private async sendToPerplexity(prompt: string, thread: ProcessingThread, maxRetries: number = 3): Promise<string> {
    // Wait for rate limit
    const now = Date.now();
    const timeSinceLastRequest = now - (this.lastRequestTime || 0);
    const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      this.addLog(`Rate limiting: waiting ${waitTime}ms`, 'info');
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();

    // Send to content script
    if (!this.state.perplexityTabId) {
      throw new Error('Perplexity tab not found');
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.addLog(`Attempt ${attempt}/${maxRetries}: Sending prompt to AI`, 'info');

        // Send prompt to Perplexity
        const response = await chrome.tabs.sendMessage(this.state.perplexityTabId, {
          type: 'START_WORKFLOW',
          payload: { prompt }
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to get AI response');
        }

        // Wait for AI to process (5 seconds initial wait)
        await this.sleep(5000);

        // ✅ NEW: Wait for thinking mode to complete with 1 minute timeout
        this.addLog('Checking if AI is in thinking mode...', 'info');
        const thinkingStartTime = Date.now();
        const THINKING_TIMEOUT = 60000; // 1 minute

        while (true) {
          const thinkingElapsed = Date.now() - thinkingStartTime;

          // Check if thinking mode timeout exceeded
          if (thinkingElapsed > THINKING_TIMEOUT) {
            this.addLog(`⏰ Thinking mode timeout (${Math.round(thinkingElapsed/1000)}s > 60s) - creating new thread`, 'warning');
            await this.createNewThread();

            // ✅ rowsInCurrentThread already set to -1 by createNewThread() (init already sent)
            this.addLog('New thread created due to thinking timeout, will retry row', 'info');

            throw new Error('Thinking mode timeout - created new thread, will retry row in new thread');
          }

          // Check if AI is still thinking
          const thinkingResponse = await chrome.tabs.sendMessage(this.state.perplexityTabId, {
            type: 'CHECK_THINKING'
          });

          if (thinkingResponse && thinkingResponse.isThinking) {
            const elapsed = Math.round(thinkingElapsed / 1000);
            if (elapsed % 10 === 0) { // Log every 10 seconds
              this.addLog(`⏳ AI is thinking... (${elapsed}s / 60s)`, 'info');
            }
            await this.sleep(2000); // Check every 2 seconds
            continue;
          }

          // AI finished thinking or never started
          if (thinkingElapsed > 0) {
            this.addLog(`✅ AI finished thinking (${Math.round(thinkingElapsed/1000)}s)`, 'success');
          }
          break;
        }

        // ✅ FIX: Fetch using CURRENT counter (starts at 0), then increment AFTER
        this.addLog(`Fetching markdown-content-${thread.markdownCounter}`, 'info');

        // Extract markdown content using current counter
        const markdownResponse = await chrome.tabs.sendMessage(this.state.perplexityTabId, {
          type: 'GET_MARKDOWN',
          payload: { index: thread.markdownCounter }
        });

        // Increment counter AFTER successful fetch for next iteration
        thread.markdownCounter++;

        // ✅ FIX: If failed to get markdown OR no code block → create new thread immediately
        if (!markdownResponse.success || !markdownResponse.hasCode) {
          const reason = !markdownResponse.success
            ? 'Failed to get markdown content (timeout or not found)'
            : 'AI response has NO code block';

          this.addLog(`⚠️ ${reason} - triggering EMERGENCY NEW THREAD`, 'warning');
          await this.createNewThread();

          // ✅ rowsInCurrentThread already set to -1 by createNewThread() (init already sent)
          this.addLog('Emergency new thread created, rowsInCurrentThread set to -1 (init already sent)', 'info');

          throw new Error(`${reason} - created new thread, will retry row in new thread`);
        }

        const content = markdownResponse.content;

        // Validate response has code block with JSON
        if (!content || content.trim() === '') {
          throw new Error('Empty response from AI');
        }

        // Check if response contains JSON-like structure
        if (!content.includes('{') || !content.includes('tags')) {
          throw new Error('Response does not contain valid JSON structure');
        }

        this.addLog(`✅ Valid response received on attempt ${attempt}`, 'success');
        return content;

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.addLog(`❌ Attempt ${attempt} failed: ${errorMsg}`, 'warning');

        // ✅ NEW: If error is "created new thread", propagate immediately (don't retry)
        if (errorMsg.includes('created new thread')) {
          throw error;
        }

        if (attempt < maxRetries) {
          const waitTime = 2000 * attempt; // Exponential backoff: 2s, 4s, 6s
          this.addLog(`Waiting ${waitTime}ms before retry...`, 'info');
          await this.sleep(waitTime);
        } else {
          // ✅ NEW: After all retries failed, create new thread and retry
          this.addLog(`⚠️ All ${maxRetries} attempts failed - creating new thread to recover`, 'warning');
          await this.createNewThread();

          this.addLog('New thread created after repeated failures, will retry row', 'info');
          throw new Error('All attempts failed - created new thread, will retry row in new thread');
        }
      }
    }

    throw new Error('Failed to get valid response from AI');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create new thread in Perplexity
   */
  private async createNewThread(): Promise<void> {
    if (!this.state.perplexityTabId) {
      throw new Error('Perplexity tab not found');
    }

    this.addLog('🔄 Creating new Perplexity thread...', 'info');

    // 1. Click "New Thread" button
    const response = await chrome.tabs.sendMessage(this.state.perplexityTabId, {
      type: 'NEW_THREAD'
    });

    if (!response.success) {
      throw new Error('Failed to create new thread');
    }

    this.addLog('✅ New thread created', 'success');

    // 2. Wait for thread to load (already waited 5s in content script)
    // 3. Send initial prompt to new thread
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

        // ✅ FIX: Increment counter to 1 to skip markdown-content-0 (initial prompt response)
        thread.markdownCounter = 1;

        // ✅ FIX: Set rowsInCurrentThread to -1 so next row will be treated as "already initialized"
        // This prevents sending full prompt again (init already sent above)
        thread.rowsInCurrentThread = -1;

        this.addLog('✅ Initial prompt sent, new thread ready (counter=1, rowsInCurrentThread=-1)', 'success');
      }
    }
  }

  private lastRequestTime: number = 0;

  /**
   * Public method to download Excel file (called from background.ts)
   */
  async downloadExcelFile(thread: ProcessingThread): Promise<void> {
    try {
      let workflow = this.workflowManagers.get(thread.id);

      // If workflow not in memory, try to restore from storage
      if (!workflow) {
        this.addLog('⚠️ Workflow not in memory, restoring from storage...', 'warning');

        try {
          // Get stored Excel buffer
          const storageKey = `excel_buffer_${thread.id}`;
          const result = await chrome.storage.local.get([storageKey]);

          if (!result[storageKey]) {
            throw new Error('Excel buffer not found in storage. Please re-process the file.');
          }

          // Restore workflow from buffer
          workflow = new ExcelWorkflowManager(thread.filePath);
          await workflow.loadPrompt();

          const bufferArray = result[storageKey];
          const buffer = new Uint8Array(bufferArray).buffer;
          workflow.parseExcelFromBuffer(buffer);

          // Store back in memory
          this.workflowManagers.set(thread.id, workflow);
          this.addLog('✅ Workflow restored from storage', 'success');
        } catch (restoreError) {
          this.addLog(`❌ Failed to restore workflow: ${restoreError}`, 'error');
          throw new Error('Workflow manager not found and could not be restored. Please re-process the file.');
        }
      }

      this.addLog('📥 Preparing download...', 'info');

      // Get Excel buffer
      const buffer = workflow.saveExcelFile();

      // Send to popup for download (background can't create <a> element)
      this.notifyPopup({
        type: 'DOWNLOAD_EXCEL',
        payload: {
          buffer: Array.from(new Uint8Array(buffer)), // Convert to array for message passing
          fileName: thread.fileName.replace('.xlsx', '_PROCESSED.xlsx'),
          partNumber: thread.partNumber
        }
      });

      this.addLog(`✅ Download triggered: ${thread.fileName.replace('.xlsx', '_PROCESSED.xlsx')}`, 'success');
    } catch (error) {
      this.addLog(`❌ Download failed: ${error}`, 'error');
      throw error;
    }
  }
}

// Create singleton instance
export const backgroundProcessor = new BackgroundProcessor();

