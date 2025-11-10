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
      status: 'idle',
      currentRowIndex: 0,
      totalRows: 0,
      processedRows: 0,
      failedRows: 0,
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      markdownCounter: 0,
      rowsInCurrentThread: 0
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
      this.stopProcessing();
      await this.saveState();
      return;
    }

    const row = reviewRows[thread.currentRowIndex];

    this.isProcessingRow = true;
    this.addLog(`Processing row ${thread.currentRowIndex + 1}/${thread.totalRows}: ${row.name}`, 'info');

    try {
      // 1. Format prompt
      // First row in thread: send full prompt + ingredient name
      // Other rows: just ingredient name
      const isFirstRowInThread = thread.rowsInCurrentThread === 0;
      const prompt = workflow.formatInput(row, isFirstRowInThread);

      if (isFirstRowInThread) {
        this.addLog('Sending full prompt (first row in thread)', 'info');
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

      // 6. Update thread state
      thread.processedRows++;
      thread.currentRowIndex++;
      thread.rowsInCurrentThread++;
      thread.lastUpdateTime = Date.now();

      this.addLog(`✅ Processed row ${thread.currentRowIndex}/${thread.totalRows}`, 'success');

      // 7. Check if need new thread (every N rows based on mode)
      if (thread.rowsInCurrentThread >= this.state.rowsPerThread && thread.currentRowIndex < thread.totalRows) {
        this.addLog(`Creating new thread after ${this.state.rowsPerThread} rows`, 'info');
        await this.createNewThread();

        // ✅ FIX: Only reset rowsInCurrentThread, markdownCounter already set to 1 by createNewThread()
        thread.rowsInCurrentThread = 0;
        this.addLog('rowsInCurrentThread reset for new thread', 'info');
      }

    } catch (error) {
      thread.failedRows++;
      this.addLog(`❌ Failed to process row ${thread.currentRowIndex}: ${error}`, 'error');

      // Move to next row even on failure
      thread.currentRowIndex++;
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

        // Wait for AI to process (5 seconds)
        await this.sleep(5000);

        // ✅ FIX: Fetch using CURRENT counter (starts at 0), then increment AFTER
        this.addLog(`Fetching markdown-content-${thread.markdownCounter}`, 'info');

        // Extract markdown content using current counter
        const markdownResponse = await chrome.tabs.sendMessage(this.state.perplexityTabId, {
          type: 'GET_MARKDOWN',
          payload: { index: thread.markdownCounter }
        });

        // Increment counter AFTER successful fetch for next iteration
        thread.markdownCounter++;

        if (!markdownResponse.success) {
          throw new Error('Failed to get markdown content');
        }

        // ✅ FIX: Check if markdown has code block
        if (!markdownResponse.hasCode) {
          this.addLog('⚠️ AI response has NO code block - triggering NEW THREAD', 'warning');
          await this.createNewThread();

          // ✅ FIX: Only reset rowsInCurrentThread, markdownCounter already set to 1 by createNewThread()
          thread.rowsInCurrentThread = 0;
          this.addLog('rowsInCurrentThread reset after emergency new thread', 'info');

          throw new Error('No code block in AI response - created new thread, retry needed');
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

        if (attempt < maxRetries) {
          const waitTime = 2000 * attempt; // Exponential backoff: 2s, 4s, 6s
          this.addLog(`Waiting ${waitTime}ms before retry...`, 'info');
          await this.sleep(waitTime);
        } else {
          throw new Error(`Failed after ${maxRetries} attempts: ${errorMsg}`);
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
        this.addLog('✅ Initial prompt sent, new thread ready (counter set to 1 to skip markdown-0)', 'success');
      }
    }
  }

  private lastRequestTime: number = 0;
}

// Create singleton instance
export const backgroundProcessor = new BackgroundProcessor();

