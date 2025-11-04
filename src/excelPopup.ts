import { MessageType } from './types';
import { ExcelWorkflowManager } from './excelWorkflow';

/**
 * DOM Elements
 */
const elements = {
  partSelector: document.getElementById('partSelector') as HTMLSelectElement,
  loadPartBtn: document.getElementById('loadPartBtn') as HTMLButtonElement,
  singlePartMode: document.getElementById('singlePartMode') as HTMLInputElement,
  openTabBtn: document.getElementById('openTabBtn') as HTMLButtonElement,
  startBtn: document.getElementById('startBtn') as HTMLButtonElement,
  stopBtn: document.getElementById('stopBtn') as HTMLButtonElement,
  downloadBtn: document.getElementById('downloadBtn') as HTMLButtonElement,
  statusDot: document.getElementById('statusDot') as HTMLElement,
  statusText: document.getElementById('statusText') as HTMLElement,
  logContent: document.getElementById('logContent') as HTMLElement,
  statsSection: document.getElementById('statsSection') as HTMLElement,
  processedCount: document.getElementById('processedCount') as HTMLElement,
  totalRows: document.getElementById('totalRows') as HTMLElement,
  currentRow: document.getElementById('currentRow') as HTMLElement,
  currentRowText: document.getElementById('currentRowText') as HTMLElement,
  progressBar: document.getElementById('progressBar') as HTMLElement,
  progressPercent: document.getElementById('progressPercent') as HTMLElement,
  progressSection: document.getElementById('progressSection') as HTMLElement,
  progressSteps: document.getElementById('progressSteps') as HTMLElement,
  downloadSection: document.getElementById('downloadSection') as HTMLElement
};

/**
 * State
 */
let workflowManagers: Map<string, ExcelWorkflowManager> = new Map();
let excelBuffers: Map<string, ArrayBuffer> = new Map();
let reviewRows: any[] = [];
let currentRowIndex: number = 0;
let isProcessing: boolean = false;
let perplexityTabId: number | null = null;
let promptSent: boolean = false;
let selectedFiles: string[] = []; // File names

/**
 * Production mode: Auto-load all 12 parts sequentially
 * Files must be placed in extension root folder (same level as manifest.json)
 */
const PARTS_FOLDER = 'IngredientName/';
const TOTAL_PARTS = 12;
let currentPartIndex = 1; // Track which part we're processing (will be set from UI selector)
let rowsProcessedInCurrentThread = 0; // Track rows in current Perplexity thread
let markdownCounter = 0; // Global markdown counter (only reset when creating new thread)

// TEST MODE: Set to 5 rows for quick testing, change to 50 for production
const TEST_MODE = false;
const ROWS_PER_THREAD = TEST_MODE ? 5 : 50; // Create new thread every 5 rows (test) or 50 rows (production)

/**
 * State keys for chrome.storage
 */
const STORAGE_KEYS = {
  CURRENT_ROW_INDEX: 'excel_current_row_index',
  REVIEW_ROWS: 'excel_review_rows',
  SELECTED_FILES: 'excel_selected_files',
  PROMPT_SENT: 'excel_prompt_sent',
  PERPLEXITY_TAB_ID: 'excel_perplexity_tab_id',
  IS_PROCESSING: 'excel_is_processing'
};

/**
 * Save state to chrome.storage (lightweight - no row data)
 */
async function saveState(): Promise<void> {
  try {
    // Only save essential data (not full reviewRows - too large!)
    await chrome.storage.local.set({
      [STORAGE_KEYS.CURRENT_ROW_INDEX]: currentRowIndex,
      [STORAGE_KEYS.SELECTED_FILES]: selectedFiles,
      [STORAGE_KEYS.PROMPT_SENT]: promptSent,
      [STORAGE_KEYS.PERPLEXITY_TAB_ID]: perplexityTabId,
      [STORAGE_KEYS.IS_PROCESSING]: isProcessing,
      // Save only row count, not full data
      'excel_total_rows': reviewRows.length
    });
    console.log('💾 State saved to storage (lightweight)');
  } catch (error) {
    console.error('Failed to save state:', error);
    // If still fails, clear old data
    if (error instanceof Error && error.message.includes('quota')) {
      console.warn('⚠️ Storage quota exceeded, clearing old data...');
      await clearState();
    }
  }
}

/**
 * Load state from chrome.storage (DISABLED - not used in production mode)
 */
// @ts-ignore - unused in production mode
async function loadState(): Promise<void> {
  try {
    const result = await chrome.storage.local.get([
      ...Object.values(STORAGE_KEYS),
      'excel_total_rows'
    ]);

    currentRowIndex = result[STORAGE_KEYS.CURRENT_ROW_INDEX] || 0;
    selectedFiles = result[STORAGE_KEYS.SELECTED_FILES] || [];
    promptSent = result[STORAGE_KEYS.PROMPT_SENT] || false;
    perplexityTabId = result[STORAGE_KEYS.PERPLEXITY_TAB_ID] || null;
    isProcessing = result[STORAGE_KEYS.IS_PROCESSING] || false;
    const totalRows = result['excel_total_rows'] || 0;

    if (totalRows > 0 && selectedFiles.length > 0) {
      addLog(`📂 Found previous session: ${selectedFiles.length} file(s), ${currentRowIndex}/${totalRows} rows processed`, 'info');
      addLog(`⚠️ Please re-select files to continue`, 'warning');

      // Show file list - replaced with log since fileList element doesn't exist
      addLog(`📂 Previous files: ${selectedFiles.map(f => `📄 ${f}`).join(', ')}`);
      addLog(`📝 Re-select files to continue`);
    }

    console.log('📂 State loaded from storage');
  } catch (error) {
    console.error('Failed to load state:', error);
  }
}

/**
 * Clear state from chrome.storage
 */
export async function clearState(): Promise<void> {
  try {
    await chrome.storage.local.remove(Object.values(STORAGE_KEYS));
    console.log('🗑️ State cleared from storage');
  } catch (error) {
    console.error('Failed to clear state:', error);
  }
}

/**
 * Add log message
 */
function addLog(message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info'): void {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry log-${type}`;
  logEntry.textContent = `[${timestamp}] ${message}`;
  elements.logContent.appendChild(logEntry);
  elements.logContent.scrollTop = elements.logContent.scrollHeight;
  console.log(`[${type.toUpperCase()}] ${message}`);
}

/**
 * Update status
 */
function updateStatus(text: string, state: 'ready' | 'loading' | 'error' | 'success'): void {
  elements.statusText.textContent = text;
  elements.statusDot.className = `status-dot status-${state}`;
}

/**
 * Update stats
 */
function updateStats(): void {
  elements.processedCount.textContent = currentRowIndex.toString();
  elements.totalRows.textContent = reviewRows.length.toString();

  // Update progress bar
  const percent = reviewRows.length > 0 ? Math.round((currentRowIndex / reviewRows.length) * 100) : 0;
  elements.progressBar.style.width = `${percent}%`;
  elements.progressPercent.textContent = `${percent}%`;

  if (currentRowIndex < reviewRows.length) {
    const row = reviewRows[currentRowIndex];
    elements.currentRowText.textContent = `${row.name} (ID: ${row._id})`;
    elements.currentRow.style.display = 'block';
  } else {
    elements.currentRow.style.display = 'none';
  }

  // Save state after updating stats
  saveState();
}

/**
 * Load a single Part file from extension folder
 */
async function loadPartFile(partNumber: number): Promise<void> {
  const fileName = `Food Exclusion Tag_RootFile_Part${partNumber}.xlsx`;
  const filePath = `${PARTS_FOLDER}${fileName}`;

  addLog(`\n📂 Loading Part${partNumber} from extension folder...`);

  try {
    // Use chrome.runtime.getURL to get extension file URL
    const fileUrl = chrome.runtime.getURL(filePath);
    addLog(`File URL: ${fileUrl}`);

    // Fetch file from extension folder
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to load ${fileName}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Create workflow manager
    const manager = new ExcelWorkflowManager(fileName);
    manager.parseExcelFromBuffer(arrayBuffer);

    // Store manager and buffer
    workflowManagers.set(fileName, manager);
    excelBuffers.set(fileName, arrayBuffer);

    // Count total rows and REVIEW rows
    const totalRowsInFile = manager['worksheet'] ? Object.keys(manager['worksheet']).filter(key => key.match(/^A\d+$/)).length - 1 : 0;
    const reviewRowsCount = manager.getReviewRows().length;
    const okRowsCount = totalRowsInFile - reviewRowsCount;

    addLog(`📊 Part${partNumber} Statistics:`);
    addLog(`   Total rows: ${totalRowsInFile}`);
    addLog(`   Status = REVIEW: ${reviewRowsCount} rows`);
    addLog(`   Status = OK: ${okRowsCount} rows`);

    // Get REVIEW rows and add file info
    const rows = manager.getReviewRows();
    const rowsWithFile = rows.map(row => ({
      ...row,
      fileName: fileName,
      manager: manager
    }));
    addLog(`✅ Loaded Part${partNumber}: Ready to process ${reviewRowsCount} REVIEW rows`);

    // Set as current reviewRows
    reviewRows = rowsWithFile;
    currentRowIndex = 0;
    promptSent = false;
    rowsProcessedInCurrentThread = 0; // Reset counter for new file
    addLog(`🔄 Counters reset for new file: currentRowIndex=0, rowsProcessedInCurrentThread=0, promptSent=false`);
    addLog(`📌 Note: markdownCounter will be reset when sending initial prompt`);

    // Update UI - replaced fileList with log since element doesn't exist
    addLog(`📂 Current file: Part${partNumber}.xlsx - REVIEW: ${reviewRowsCount} | OK: ${okRowsCount}`);
    elements.statsSection.style.display = 'block';
    updateStats();
    // Note: startBtn will be enabled by loadSelectedPart() function

  } catch (error) {
    addLog(`❌ Error loading Part${partNumber}: ${error}`, 'error');
    throw error;
  }
}

/**
 * Handle file selection (DISABLED - Auto-load mode)
 * Note: This event listener is commented out since excelFile element doesn't exist
 */
// elements.excelFile.addEventListener('change', async (event) => {
//   addLog('⚠️ Manual file selection disabled - Using auto-load mode', 'warning');
//   return;

  // OLD CODE (disabled) - commented out since excelFile element doesn't exist
  /*
  const files = (event.target as HTMLInputElement).files;
  // @ts-ignore - disabled code
  if (!files || files.length === 0) return;

  try {
    addLog(`Loading ${files!.length} file(s)...`);

    // Clear previous data
    workflowManagers.clear();
    excelBuffers.clear();
    allReviewRows = [];
    selectedFiles = [];
    currentRowIndex = 0;
    promptSent = false;

    let totalRows = 0;
    let filesProcessed = 0;

    // Process each file
    for (let i = 0; i < files!.length; i++) {
      const file = files![i];
      selectedFiles.push(file.name);

      await new Promise<void>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const buffer = e.target?.result as ArrayBuffer;
            excelBuffers.set(file.name, buffer);

            // Parse Excel
            const manager = new ExcelWorkflowManager(file.name);
            manager.parseExcelFromBuffer(buffer);
            workflowManagers.set(file.name, manager);

            // Get REVIEW rows and add file info
            const rows = manager.getReviewRows();
            const rowsWithFile = rows.map(row => ({
              ...row,
              fileName: file.name,
              manager: manager
            }));

            allReviewRows.push(...rowsWithFile);
            totalRows += rows.length;
            filesProcessed++;

            addLog(`✅ ${file.name}: ${rows.length} REVIEW rows`, 'success');
            resolve();
          } catch (error) {
            addLog(`❌ Error parsing ${file.name}: ${error}`, 'error');
            reject(error);
          }
        };

        reader.onerror = () => {
          addLog(`❌ Failed to read ${file.name}`, 'error');
          reject(new Error(`Failed to read ${file.name}`));
        };

        reader.readAsArrayBuffer(file);
      });
    }

    // Set combined rows (PRODUCTION MODE - ALL ROWS)
    reviewRows = allReviewRows;
    currentRowIndex = 0;

    addLog(`\n📊 Total: ${totalRows} REVIEW rows from ${filesProcessed} file(s)`, 'success');

    // Show file list - replaced with log since fileList element doesn't exist
    addLog(`📂 Selected files: ${selectedFiles.map(f => f).join(', ')}`);

    // Show stats
    elements.statsSection.style.display = 'block';
    updateStats();

    // Enable start button
    elements.startBtn.disabled = false;
    updateStatus(`${filesProcessed} file(s) loaded - Ready to process`, 'ready');

  } catch (error) {
    addLog(`❌ Error: ${error}`, 'error');
    updateStatus('Error loading file', 'error');
  }
  */
// });

/**
 * Open Perplexity tab
 */
elements.openTabBtn.addEventListener('click', async () => {
  try {
    addLog('Opening Perplexity...');
    
    const response = await chrome.runtime.sendMessage({
      type: MessageType.OPEN_TAB,
      payload: { url: 'https://www.perplexity.ai' }
    });
    
    if (response.success) {
      perplexityTabId = response.tabId;
      addLog(`✅ Perplexity opened (Tab ID: ${perplexityTabId})`, 'success');
    }
  } catch (error) {
    addLog(`❌ Error opening Perplexity: ${error}`, 'error');
  }
});

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Inject content script into tab
 */
async function injectContentScript(tabId: number): Promise<void> {
  try {
    addLog(`💉 Injecting content script into tab ${tabId}...`, 'info');

    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });

    addLog('✅ Content script injected', 'success');
    await sleep(1000); // Wait for script to initialize
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    // Ignore if already injected
    if (!errorMsg.includes('Cannot access')) {
      addLog(`⚠️ Inject warning: ${errorMsg}`, 'warning');
    }
  }
}

/**
 * Send message to content script with retry logic
 */
async function sendToContentScript(message: any, retries: number = 3): Promise<any> {
  if (!perplexityTabId) {
    throw new Error('Perplexity tab not opened');
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await chrome.tabs.sendMessage(perplexityTabId, message);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Check if content script not loaded
      if (errorMsg.includes('Receiving end does not exist')) {
        addLog(`⚠️ Content script not responding (attempt ${attempt}/${retries})`, 'warning');

        if (attempt < retries) {
          // Try to inject content script
          addLog('🔄 Attempting to inject content script...', 'info');
          await injectContentScript(perplexityTabId);
          await sleep(1500);
          continue; // Retry
        }
      }

      if (attempt === retries) {
        addLog('❌ All retry attempts failed', 'error');
        throw error;
      }

      await sleep(1000);
    }
  }

  throw new Error('Failed after all retries');
}

/**
 * Wait for markdown content
 * If not found after maxWait, trigger new thread and retry
 */
async function waitForMarkdown(index: number, maxWait: number = 60000): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    try {
      const response = await sendToContentScript({
        type: 'GET_MARKDOWN',
        payload: { index }
      });

      if (response.success && response.content) {
        return response.content;
      }
    } catch (error) {
      // Continue waiting
    }

    await sleep(2000);
  }

  // Timeout - markdown not found, trigger new thread
  addLog(`⚠️ Markdown-content-${index} not found after ${maxWait/1000}s`, 'warning');
  addLog('🔄 Triggering new thread due to missing markdown...', 'warning');

  // Create new thread
  try {
    const response = await sendToContentScript({
      type: MessageType.NEW_THREAD
    });

    if (response && response.success) {
      addLog('✅ New thread created due to missing markdown');

      // Reset markdown counter only (keep rowsProcessedInCurrentThread)
      const oldMarkdownCounter = markdownCounter;
      markdownCounter = 0;
      addLog(`🔄 Markdown counter reset: ${oldMarkdownCounter} → 0 (rowsProcessedInCurrentThread=${rowsProcessedInCurrentThread} kept)`);

      // Send initial prompt again
      addLog('📤 Sending initial prompt to new thread...');
      const firstManager = Array.from(workflowManagers.values())[0];
      if (firstManager) {
        await sendToContentScript({
          type: MessageType.START_WORKFLOW,
          payload: { prompt: firstManager['promptContent'] }
        });
        await sleep(10000);
        addLog('✅ Initial prompt sent to new thread (will be markdown-0, skipped)');
      }

      // Now we need to re-send the CURRENT ROW's prompt (not retry markdown-1)
      // Because markdown-1 doesn't exist yet - it will be created by the current row
      addLog(`🔄 Re-sending current row prompt to new thread...`);

      // The caller (processRow) will handle re-sending the prompt
      // We just need to signal that we're ready for a new request
      // Return empty to trigger re-send in processRow
      throw new Error('NEW_THREAD_CREATED_RETRY_NEEDED');
    }
  } catch (error) {
    addLog(`❌ Error creating new thread: ${error}`, 'error');
  }

  throw new Error(`Timeout waiting for markdown-content-${index} even after new thread`);
}

/**
 * Process single row
 */
async function processRow(row: any, iteration: number): Promise<void> {
  addLog(`\n=== Processing Row ${iteration + 1}/${reviewRows.length} ===`);
  addLog(`File: ${row.fileName}, ID: ${row._id}, Name: ${row.name}`);

  // Get manager for this row
  const manager = row.manager as ExcelWorkflowManager;

  // Format input
  const input = manager.formatInput(row);
  addLog(`Input: ${input}`);

  // Send to AI
  await sendToContentScript({
    type: MessageType.START_WORKFLOW,
    payload: { prompt: input }
  });

  addLog('⏳ Waiting for AI response...');
  await sleep(5000); // Wait for AI to start processing

  // Increment global markdown counter
  markdownCounter++;

  // Wait for markdown content using global counter
  addLog(`🔍 Waiting for markdown-content-${markdownCounter} (rowsProcessedInCurrentThread=${rowsProcessedInCurrentThread})...`);

  let content: string;
  try {
    content = await waitForMarkdown(markdownCounter);
  } catch (error) {
    // Check if new thread was created and we need to retry
    if (error instanceof Error && error.message === 'NEW_THREAD_CREATED_RETRY_NEEDED') {
      addLog('🔄 New thread created, re-sending prompt for current row...');

      // Re-send prompt to new thread
      await sendToContentScript({
        type: MessageType.START_WORKFLOW,
        payload: { prompt: input }
      });

      addLog('⏳ Waiting for AI response in new thread...');
      await sleep(5000);

      // Increment counter again for the retry
      markdownCounter++;
      addLog(`🔍 Waiting for markdown-content-${markdownCounter} (retry after new thread)...`);

      // Wait for markdown again
      content = await waitForMarkdown(markdownCounter);
    } else {
      // Other error, re-throw
      throw error;
    }
  }

  addLog(`✅ Received response from markdown-content-${markdownCounter} (${content.length} chars)`);

  // Parse response
  const tags = manager.parseAIResponse(content);
  addLog(`Tags: ${tags.join(', ')}`);

  // Map to columns
  const mappedColumns = manager.mapTagsToColumns(tags);
  addLog(`Mapped columns: ${JSON.stringify(mappedColumns)}`);

  // Write to Excel
  manager.writeTagsToRow(row.rowIndex, mappedColumns);
  manager.updateRowStatus(row.rowIndex, 'OK');

  // Count completed rows
  const completedCount = iteration + 1;
  const totalCount = reviewRows.length;
  const remainingCount = totalCount - completedCount;

  addLog(`✅ Row ${completedCount}/${totalCount} completed (${remainingCount} remaining)`, 'success');
}

/**
 * Start processing
 */
elements.startBtn.addEventListener('click', async () => {
  // Update currentPartIndex from selector before starting
  currentPartIndex = parseInt(elements.partSelector.value);
  addLog(`=== 🚀 STARTING WORKFLOW ===`, 'success');
  addLog(`📋 Processing Part ${currentPartIndex} (Single part mode: ${elements.singlePartMode.checked})`, 'info');

  if (reviewRows.length === 0) {
    addLog('❌ No data to process', 'error');
    return;
  }

  // Check if Perplexity tab exists, if not find or create it
  if (!perplexityTabId) {
    addLog('🔍 Looking for Perplexity tab...');
    try {
      // Try to find existing Perplexity tab
      const tabs = await chrome.tabs.query({ url: 'https://www.perplexity.ai/*' });

      if (tabs.length > 0) {
        perplexityTabId = tabs[0].id!;
        addLog(`✅ Found existing Perplexity tab (ID: ${perplexityTabId})`, 'success');

        // Inject content script
        await injectContentScript(perplexityTabId);

        // Switch to that tab
        await chrome.tabs.update(perplexityTabId, { active: true });
      } else {
        // Only open new tab if no existing tab found
        addLog('🔄 No Perplexity tab found, opening new one...');
        const response = await chrome.runtime.sendMessage({
          type: MessageType.OPEN_TAB,
          payload: { url: 'https://www.perplexity.ai' }
        });

        if (response.success && response.tabId) {
          perplexityTabId = response.tabId;
          addLog(`✅ Perplexity opened (Tab ID: ${perplexityTabId})`, 'success');
          await sleep(3000); // Wait for page to load

          // Inject content script
          await injectContentScript(response.tabId);
        } else {
          addLog('❌ Failed to open Perplexity', 'error');
          return;
        }
      }
    } catch (error) {
      addLog(`❌ Error checking Perplexity: ${error}`, 'error');
      return;
    }
  } else {
    // Validate existing tab still exists
    try {
      const tab = await chrome.tabs.get(perplexityTabId);
      if (!tab || !tab.url?.includes('perplexity.ai')) {
        addLog('⚠️ Saved tab is invalid, finding new one...', 'warning');
        perplexityTabId = null;
        // Recursively call to find/create tab
        elements.startBtn.click();
        return;
      }
      addLog(`✅ Using existing tab ${perplexityTabId}`, 'success');
    } catch (error) {
      addLog('⚠️ Saved tab not found, finding new one...', 'warning');
      perplexityTabId = null;
      elements.startBtn.click();
      return;
    }
  }

  try {
    isProcessing = true;
    elements.startBtn.style.display = 'none';
    elements.stopBtn.style.display = 'inline-block';
    updateStatus('Processing...', 'loading');

    // Step 1: Send initial prompt (will be skipped as markdown-0)
    if (!promptSent) {
      addLog('=== Step 1: Sending initial prompt ===');

      // Reset markdown counter for new session
      markdownCounter = 0;
      addLog(`🔄 Markdown counter initialized: ${markdownCounter}`);
      addLog(`📊 rowsProcessedInCurrentThread: ${rowsProcessedInCurrentThread}`);

      // Get first manager to load prompt
      const firstManager = Array.from(workflowManagers.values())[0];
      if (!firstManager) {
        addLog('❌ No workflow manager found', 'error');
        return;
      }

      await firstManager.loadPrompt();

      await sendToContentScript({
        type: MessageType.START_WORKFLOW,
        payload: { prompt: firstManager['promptContent'] }
      });

      addLog('⏳ Waiting for AI to process initial prompt...');
      await sleep(10000); // Wait longer for first prompt
      addLog('✅ Initial prompt sent (will be markdown-0, skipped in workflow)', 'success');
      promptSent = true;
      await saveState(); // Save after sending prompt
    }
    
    // Step 2-N: Process rows
    addLog('\n=== Starting row processing ===');
    
    for (let i = currentRowIndex; i < reviewRows.length && isProcessing; i++) {
      currentRowIndex = i;
      updateStats();

      try {
        await processRow(reviewRows[i], i);
        rowsProcessedInCurrentThread++;

        // Debug log
        addLog(`🔍 DEBUG: rowsProcessedInCurrentThread=${rowsProcessedInCurrentThread}, ROWS_PER_THREAD=${ROWS_PER_THREAD}, i=${i}, total=${reviewRows.length}`);

        // Save state after each row
        await saveState();

        // Check if need to refresh conversation (every X rows)
        if (rowsProcessedInCurrentThread >= ROWS_PER_THREAD && i < reviewRows.length - 1) {
          addLog(`\n🔄 ========== NEW THREAD TRIGGERED (SCHEDULED) ==========`, 'warning');
          addLog(`📊 Processed ${rowsProcessedInCurrentThread} rows in current thread (limit: ${ROWS_PER_THREAD})`, 'warning');
          addLog(`📊 Markdown counter before reset: ${markdownCounter}`, 'warning');
          addLog(`📊 Current row index: ${i} / ${reviewRows.length - 1}`, 'warning');
          addLog(`🔄 Creating new thread...`, 'warning');

          // Click "New Thread" button
          try {
            const response = await sendToContentScript({
              type: MessageType.NEW_THREAD
            });

            if (response && response.success) {
              addLog('✅ New thread created successfully');

              // Reset workflow state (NEW THREAD = RESET MARKDOWN COUNTER + ROWS COUNTER)
              addLog('🔄 Resetting workflow state for new thread...');
              promptSent = false;
              rowsProcessedInCurrentThread = 0;
              markdownCounter = 0; // Reset markdown counter for new thread
              addLog(`✅ Counters reset: rowsProcessedInCurrentThread=0, markdownCounter=0`);
              addLog(`📌 Note: Excel row counter (i=${i}) continues - NOT reset`);

              // Send initial prompt again
              addLog('📤 Sending initial prompt to new thread...');
              const firstManager = Array.from(workflowManagers.values())[0];
              if (firstManager) {
                await sendToContentScript({
                  type: MessageType.START_WORKFLOW,
                  payload: { prompt: firstManager['promptContent'] }
                });
                await sleep(10000);
                promptSent = true;
                addLog('✅ Initial prompt sent to new thread (will be markdown-0, skipped)');
              }

              addLog('🔄 ========== NEW THREAD COMPLETE ==========', 'success');
              addLog('▶️ Continuing processing with next row...', 'success');
            } else {
              addLog('❌ Failed to create new thread', 'error');
              isProcessing = false;
              break;
            }
          } catch (error) {
            addLog(`❌ Error creating new thread: ${error}`, 'error');
            isProcessing = false;
            break;
          }
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        addLog(`❌ Error processing row ${i + 1}: ${errorMsg}`, 'error');

        // If connection error, stop processing
        if (errorMsg.includes('Receiving end does not exist') || errorMsg.includes('tab closed')) {
          addLog('❌ Connection lost. Please restart processing.', 'error');
          isProcessing = false;
          break;
        }

        // Otherwise, continue with next row
        addLog('⚠️ Skipping to next row...', 'warning');
      }

      // Small delay between rows
      await sleep(2000);
    }

    if (isProcessing) {
      addLog('\n🎉 ===== PART COMPLETED =====', 'success');
      addLog(`✅ Part${currentPartIndex + 1}: Processed ${reviewRows.length} REVIEW rows → All marked as OK`, 'success');
      addLog('📥 Downloading processed file...', 'success');

      // Auto download current file
      await autoDownloadFiles();

      // Check if we should continue to next parts (only if not in single part mode)
      const singlePartMode = elements.singlePartMode.checked;

      if (!singlePartMode) {
        currentPartIndex++;
        if (currentPartIndex <= TOTAL_PARTS) {
          addLog(`\n🔄 Loading next part (${currentPartIndex}/${TOTAL_PARTS})...`);

          // Clear current file data
          workflowManagers.clear();
          excelBuffers.clear();

          // Load next part
          await loadPartFile(currentPartIndex);

          // Restart processing
          addLog('🔄 Restarting workflow for next part...');
          elements.startBtn.click();
        } else {
          addLog('\n🎉 ALL PARTS COMPLETED!', 'success');
          updateStatus('All parts complete', 'success');
        }
      } else {
        addLog('\n✅ SELECTED PART COMPLETED! (Single part mode)', 'success');
        updateStatus('Selected part complete', 'success');
      }
    }
    
  } catch (error) {
    addLog(`❌ Error: ${error}`, 'error');
    updateStatus('Processing failed', 'error');
  } finally {
    isProcessing = false;
    elements.startBtn.style.display = 'inline-block';
    elements.stopBtn.style.display = 'none';
  }
});

/**
 * Stop processing
 */
elements.stopBtn.addEventListener('click', () => {
  isProcessing = false;
  addLog('⏹️ Processing stopped by user');
  updateStatus('Stopped', 'ready');
});

/**
 * Auto download files after processing
 * Test mode (10 rows) → test/ folder
 * Production mode (all rows) → results/ folder
 */
async function autoDownloadFiles(): Promise<void> {
  if (workflowManagers.size === 0) return;

  try {
    // Always download to results/ folder (production mode)
    const folder = 'results';

    addLog(`\n📥 Auto-downloading to ${folder}/ folder...`);

    let downloadedCount = 0;

    // Download each file
    for (const [fileName, manager] of workflowManagers.entries()) {
      const buffer = manager.saveExcelFile();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      // Download to folder: test/ or results/
      a.download = `${folder}/${fileName.replace('.xlsx', '_PROCESSED.xlsx')}`;
      a.click();

      URL.revokeObjectURL(url);
      downloadedCount++;

      addLog(`✅ Downloaded: ${folder}/${fileName}`, 'success');

      // Small delay between downloads
      await sleep(500);
    }

    addLog(`\n✅ All ${downloadedCount} file(s) downloaded to ${folder}/ folder`, 'success');
  } catch (error) {
    addLog(`❌ Download error: ${error}`, 'error');
  }
}

/**
 * Manual download button (backup)
 */
elements.downloadBtn.addEventListener('click', async () => {
  await autoDownloadFiles();
});

// Initialize
if (TEST_MODE) {
  addLog('⚠️ ========== TEST MODE ENABLED ==========', 'warning');
  addLog(`⚠️ New thread every ${ROWS_PER_THREAD} rows`, 'warning');
  addLog('⚠️ Change TEST_MODE to false for production', 'warning');
  addLog('⚠️ ========================================', 'warning');
} else {
  addLog('Excel Tag Automation - Production Mode');
}
// Load selected part when user clicks Load Part button
function loadSelectedPart() {
  const selectedValue = elements.partSelector.value;

  if (!selectedValue || selectedValue === '') {
    addLog('❌ Please select a part first', 'error');
    return;
  }

  const selectedPart = parseInt(selectedValue);
  currentPartIndex = selectedPart;

  addLog(`🚀 Loading Part${selectedPart}.xlsx...`);
  updateStatus(`Loading Part${selectedPart}...`, 'loading');
  elements.loadPartBtn.disabled = true;
  elements.loadPartBtn.textContent = '⏳ Loading...';

  loadPartFile(selectedPart).then(() => {
    addLog(`✅ Part${selectedPart} loaded - Ready to start!`, 'success');
    updateStatus(`Part${selectedPart} loaded - Ready`, 'ready');
    elements.loadPartBtn.textContent = '✅ Part Loaded';
    elements.startBtn.disabled = false;
  }).catch((error) => {
    addLog(`❌ Failed to load Part${selectedPart}: ${error}`, 'error');
    updateStatus(`Error loading Part${selectedPart}`, 'error');
    elements.loadPartBtn.disabled = false;
    elements.loadPartBtn.textContent = '📂 Load Selected Part';
  });
}

// Listen for part selector changes - enable/disable Load Part button
elements.partSelector.addEventListener('change', () => {
  const selectedValue = elements.partSelector.value;
  elements.loadPartBtn.disabled = !selectedValue || selectedValue === '' || isProcessing;

  if (selectedValue && selectedValue !== '') {
    elements.loadPartBtn.textContent = `📂 Load Part ${selectedValue}`;
  } else {
    elements.loadPartBtn.textContent = '📂 Load Selected Part';
  }

  // Reset start button when changing selection
  elements.startBtn.disabled = true;
});

// Listen for Load Part button click
elements.loadPartBtn.addEventListener('click', () => {
  if (!isProcessing) {
    loadSelectedPart();
  }
});

// Initialize on startup - no auto-load
addLog('📋 Select a part and click "Load Part" to begin');
updateStatus('Select a part to load', 'ready');
elements.startBtn.disabled = true;

