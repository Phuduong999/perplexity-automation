import { MessageType, Message, StepStatus } from './types';

/**
 * DOM Elements
 */
const elements = {
  statusDot: document.getElementById('statusDot') as HTMLElement,
  statusText: document.getElementById('statusText') as HTMLElement,
  openTabBtn: document.getElementById('openTabBtn') as HTMLButtonElement,
  startBtn: document.getElementById('startBtn') as HTMLButtonElement,
  progressSection: document.getElementById('progressSection') as HTMLElement,
  progressSteps: document.getElementById('progressSteps') as HTMLElement,
  resultSection: document.getElementById('resultSection') as HTMLElement,
  resultContent: document.getElementById('resultContent') as HTMLElement,
  copyBtn: document.getElementById('copyBtn') as HTMLButtonElement,
  logContent: document.getElementById('logContent') as HTMLElement
};

/**
 * Workflow steps for progress tracking
 */
const workflowSteps = [
  { id: 'analyze_dom', label: '🔍 Finding Input & Submit Button' },
  { id: 'send_prompt', label: '📝 Sending Prompt to Input' },
  { id: 'click_submit', label: '🖱️ Clicking Submit Button' },
  { id: 'wait_thinking', label: '⏳ Waiting for AI Response' },
  { id: 'extract_content', label: '📦 Extracting Code Blocks' }
];

/**
 * Workflow state storage
 */
let currentWorkflowState: any = null;

/**
 * Add log entry
 */
function addLog(message: string, type: 'info' | 'error' = 'info'): void {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry ${type}`;
  logEntry.textContent = `[${timestamp}] ${message}`;
  elements.logContent.appendChild(logEntry);
  elements.logContent.scrollTop = elements.logContent.scrollHeight;
}

/**
 * Update status indicator
 */
function updateStatus(text: string, state: 'ready' | 'loading' | 'error' = 'ready'): void {
  elements.statusText.textContent = text;
  elements.statusDot.className = `status-dot ${state}`;
}

/**
 * Initialize progress display
 */
function initializeProgress(): void {
  elements.progressSteps.innerHTML = '';
  
  workflowSteps.forEach(step => {
    const stepElement = document.createElement('div');
    stepElement.className = 'progress-step';
    stepElement.id = `step-${step.id}`;
    stepElement.innerHTML = `
      <span class="step-icon">⏳</span>
      <span class="step-label">${step.label}</span>
    `;
    elements.progressSteps.appendChild(stepElement);
  });
  
  elements.progressSection.style.display = 'block';
}

/**
 * Update progress step
 */
function updateProgressStep(stepId: string, status: StepStatus): void {
  const stepElement = document.getElementById(`step-${stepId}`);
  if (!stepElement) return;

  stepElement.className = 'progress-step';
  const icon = stepElement.querySelector('.step-icon');
  if (!icon) return;

  switch (status) {
    case StepStatus.IN_PROGRESS:
      stepElement.classList.add('active');
      icon.textContent = '⏳';
      break;
    case StepStatus.COMPLETED:
      stepElement.classList.add('completed');
      icon.textContent = '✅';
      break;
    case StepStatus.FAILED:
      stepElement.classList.add('failed');
      icon.textContent = '❌';
      break;
  }
}

/**
 * Show result
 */
function showResult(content: string): void {
  elements.resultContent.textContent = content;
  elements.resultSection.style.display = 'block';
}

/**
 * Send message to background script
 */
async function sendMessage(message: Message): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Open or switch to Perplexity tab
 */
async function openPerplexityTab(): Promise<void> {
  try {
    updateStatus('Opening Perplexity...', 'loading');
    addLog('Opening or switching to Perplexity tab...');

    const response = await sendMessage({
      type: MessageType.OPEN_OR_SWITCH_TAB
    });

    if (response.success) {
      addLog(`Tab ready: ${response.url}`);
      updateStatus('Tab opened', 'ready');
    } else {
      throw new Error(response.error || 'Failed to open tab');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    addLog(`Error: ${errorMsg}`, 'error');
    updateStatus('Error opening tab', 'error');
    alert(`Failed to open tab: ${errorMsg}`);
  }
}

/**
 * Save workflow state to storage
 */
async function saveWorkflowState(state: any): Promise<void> {
  try {
    await chrome.storage.local.set({ workflowState: state });
    currentWorkflowState = state;
  } catch (error) {
    console.error('Failed to save workflow state:', error);
  }
}

/**
 * Load workflow state from storage
 */
async function loadWorkflowState(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['workflowState']);
    if (result.workflowState) {
      currentWorkflowState = result.workflowState;
      addLog('Restored previous workflow state');

      // Restore UI based on state
      if (currentWorkflowState.currentStep) {
        initializeProgress();
        updateProgressStep(currentWorkflowState.currentStep, currentWorkflowState.status);

        if (currentWorkflowState.status === StepStatus.COMPLETED) {
          updateStatus('✅ Analysis completed', 'ready');
        } else if (currentWorkflowState.status === StepStatus.FAILED) {
          updateStatus('❌ Analysis failed', 'error');
        }
      }
    }
  } catch (error) {
    console.error('Failed to load workflow state:', error);
  }
}

/**
 * Start workflow
 */
async function startWorkflow(): Promise<void> {
  try {
    // Disable buttons
    elements.startBtn.disabled = true;
    elements.openTabBtn.disabled = true;

    // Update UI
    updateStatus('🔄 Analyzing DOM...', 'loading');
    addLog('Starting DOM analysis...');
    initializeProgress();

    // Hide previous result
    elements.resultSection.style.display = 'none';

    // Send workflow start message
    const response = await sendMessage({
      type: MessageType.START_WORKFLOW
    });

    if (response.success) {
      addLog('✅ DOM analysis completed successfully!');
      updateStatus('✅ Analysis completed', 'ready');

      // Update all steps as completed
      workflowSteps.forEach(step => {
        updateProgressStep(step.id, StepStatus.COMPLETED);
      });

      // Show result
      if (response.results) {
        const resultsText = JSON.stringify(response.results, null, 2);
        showResult(resultsText);
        addLog('📊 Results extracted - check console for details');
        console.log('DOM Analysis Results:', response.results);
      }

      // Save state
      await saveWorkflowState({
        currentStep: 'extract_content',
        status: StepStatus.COMPLETED,
        results: response.results,
        timestamp: Date.now()
      });
    } else {
      throw new Error(response.error || 'Analysis failed');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    addLog(`❌ Analysis error: ${errorMsg}`, 'error');
    updateStatus('❌ Analysis failed', 'error');

    // Save error state
    await saveWorkflowState({
      currentStep: 'failed',
      status: StepStatus.FAILED,
      error: errorMsg,
      timestamp: Date.now()
    });

    alert(`Analysis failed: ${errorMsg}`);
  } finally {
    // Re-enable buttons
    elements.startBtn.disabled = false;
    elements.openTabBtn.disabled = false;
  }
}

/**
 * Copy result to clipboard
 */
async function copyResult(): Promise<void> {
  try {
    const content = elements.resultContent.textContent || '';
    await navigator.clipboard.writeText(content);
    
    const originalText = elements.copyBtn.textContent;
    elements.copyBtn.textContent = '✅ Copied!';
    
    setTimeout(() => {
      elements.copyBtn.textContent = originalText;
    }, 2000);
    
    addLog('Result copied to clipboard');
  } catch (error) {
    addLog('Failed to copy result', 'error');
    alert('Failed to copy to clipboard');
  }
}

/**
 * Listen for workflow status updates from content script
 */
chrome.runtime.onMessage.addListener((message: Message, _sender, _sendResponse) => {
  if (message.type === MessageType.WORKFLOW_STATUS && message.payload) {
    const state = message.payload;

    // Update progress
    if (state.currentStep) {
      updateProgressStep(state.currentStep, state.status);
    }

    // Update status text
    if (state.status === StepStatus.IN_PROGRESS) {
      updateStatus(`🔄 ${state.currentStep}...`, 'loading');
    } else if (state.status === StepStatus.COMPLETED) {
      updateStatus(`✅ ${state.currentStep} completed`, 'ready');
    } else if (state.status === StepStatus.FAILED) {
      updateStatus(`❌ ${state.currentStep} failed`, 'error');
    }

    // Save state
    saveWorkflowState(state);
  }
});

/**
 * Initialize popup
 */
async function initialize(): Promise<void> {
  addLog('🚀 Popup initialized');
  updateStatus('⏳ Ready', 'ready');

  // Load previous state
  await loadWorkflowState();

  // Event listeners
  elements.openTabBtn.addEventListener('click', openPerplexityTab);
  elements.startBtn.addEventListener('click', startWorkflow);
  elements.copyBtn.addEventListener('click', copyResult);

  addLog('💡 Tip: Workflow runs in background even when popup is closed');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

