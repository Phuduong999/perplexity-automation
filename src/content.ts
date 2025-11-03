import {
  Logger,
  sleep
} from './utils';
import { MessageType, StepStatus, WorkflowState } from './types';

/**
 * Workflow Manager - handles the automation workflow
 */
class WorkflowManager {
  private state: WorkflowState = {
    currentStep: 'idle',
    status: StepStatus.PENDING,
    timestamp: Date.now()
  };

  private highlightedElements: HTMLElement[] = [];

  /**
   * Update workflow state and notify popup
   */
  private updateState(step: string, status: StepStatus, error?: string): void {
    this.state = {
      currentStep: step,
      status,
      error,
      timestamp: Date.now()
    };

    Logger.info(`Workflow state: ${step} - ${status}`, error || '');

    // Notify popup about state change
    chrome.runtime.sendMessage({
      type: MessageType.WORKFLOW_STATUS,
      payload: this.state
    }).catch(() => {
      // Popup might be closed, ignore error
    });
  }

  /**
   * Highlight element with color
   */
  private highlightElement(element: Element, color: string, label: string): void {
    const htmlElement = element as HTMLElement;

    // Store original styles
    const originalBorder = htmlElement.style.border;
    const originalBoxShadow = htmlElement.style.boxShadow;
    const originalPosition = htmlElement.style.position;

    // Apply highlight
    htmlElement.style.border = `3px solid ${color}`;
    htmlElement.style.boxShadow = `0 0 10px ${color}`;
    htmlElement.style.position = htmlElement.style.position || 'relative';

    // Add label
    const labelDiv = document.createElement('div');
    labelDiv.textContent = label;
    labelDiv.style.cssText = `
      position: absolute;
      top: -25px;
      left: 0;
      background: ${color};
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      z-index: 10000;
      pointer-events: none;
    `;
    htmlElement.appendChild(labelDiv);

    // Store for cleanup
    this.highlightedElements.push(htmlElement);

    // Store cleanup function
    (htmlElement as any).__cleanup = () => {
      htmlElement.style.border = originalBorder;
      htmlElement.style.boxShadow = originalBoxShadow;
      htmlElement.style.position = originalPosition;
      if (labelDiv.parentNode) {
        labelDiv.remove();
      }
    };
  }

  /**
   * Clear all highlights
   */
  private clearHighlights(): void {
    this.highlightedElements.forEach(el => {
      if ((el as any).__cleanup) {
        (el as any).__cleanup();
      }
    });
    this.highlightedElements = [];
  }

  /**
   * Find input element
   */
  private findInputElement(): HTMLElement | null {
    const input = document.querySelector('#ask-input') as HTMLElement;
    if (input) {
      Logger.log('✅ Found input element:', input);
      this.highlightElement(input, '#4ECDC4', '📝 INPUT');
      return input;
    }
    Logger.warn('❌ Input element #ask-input not found');
    return null;
  }

  /**
   * Send prompt to input (Lexical contenteditable div) using paste
   */
  private async sendPromptToInput(prompt: string): Promise<boolean> {
    this.updateState('send_prompt', StepStatus.IN_PROGRESS);
    Logger.log('=== Sending Prompt to Input ===');

    const input = this.findInputElement();
    if (!input) {
      Logger.error('❌ Cannot send prompt: Input not found');
      this.updateState('send_prompt', StepStatus.FAILED, 'Input not found');
      return false;
    }

    // Check if contenteditable (Lexical editor)
    const isContentEditable = input.getAttribute('contenteditable') === 'true';
    const isLexical = input.getAttribute('data-lexical-editor') === 'true';
    Logger.log(`Input type: ${isContentEditable ? 'contenteditable' : 'input/textarea'}, Lexical: ${isLexical}`);

    // Focus first
    input.focus();
    await sleep(200);

    // Clear existing content first
    Logger.log('🗑️ Clearing existing content...');
    if (isContentEditable) {
      // Clear completely
      input.textContent = '';
      input.innerHTML = '';
      await sleep(200);
    } else if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      input.value = '';
      await sleep(200);
    }
    Logger.log('✅ Content cleared');

    if (isContentEditable && isLexical) {
      // For Lexical editor, set textContent directly (avoid execCommand duplicate)
      Logger.log('Setting textContent directly for Lexical editor');

      try {
        // Create a text node and set it as the only child
        input.textContent = prompt;

        // Trigger input event to notify Lexical
        input.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          cancelable: false,
          inputType: 'insertText',
          data: prompt
        }));

        Logger.log(`✅ textContent set directly: ${prompt.substring(0, 50)}...`);

      } catch (e) {
        Logger.error('❌ textContent set failed:', e);
        this.updateState('send_prompt', StepStatus.FAILED, 'textContent failed');
        return false;
      }

    } else if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      input.value = prompt;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      Logger.log('✅ Prompt set via .value');
    }

    // DO NOT dispatch additional events - may cause duplicate!

    // Wait for Lexical to fully process
    await sleep(500);

    // Verify prompt was set (relaxed check)
    let currentValue = '';
    if (isContentEditable) {
      currentValue = input.textContent?.trim() || '';
    } else if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      currentValue = input.value.trim();
    }

    Logger.log(`Verification - Expected length: ${prompt.length}, Got length: ${currentValue.length}`);
    Logger.log(`First 100 chars - Expected: "${prompt.substring(0, 100)}"...`);
    Logger.log(`First 100 chars - Got: "${currentValue.substring(0, 100)}"...`);

    // Relaxed verification: Check if content has at least 50% of expected length
    const minLength = Math.floor(prompt.length * 0.5);
    if (currentValue.length < minLength) {
      Logger.error(`❌ Prompt verification failed - too short (${currentValue.length} < ${minLength})`);
      this.updateState('send_prompt', StepStatus.FAILED, 'Prompt not set correctly');
      return false;
    }

    Logger.log(`✅ Prompt verified (length: ${currentValue.length})`);
    this.updateState('send_prompt', StepStatus.COMPLETED);

    return true;
  }

  /**
   * Find submit button (flexible detection)
   */
  private findSubmitButton(): { element: HTMLElement | null; state: string } {
    // Try multiple selectors for flexibility
    const selectors = [
      { selector: 'button[aria-label="Submit"]', name: 'aria-submit' },
      { selector: 'button[data-testid="submit-button"]', name: 'submit-button' },
      { selector: 'button[type="submit"]', name: 'type-submit' },
      { selector: 'form button[type="button"]', name: 'form-button' },
      { selector: 'button:has(svg)', name: 'svg-button' },
      { selector: 'button[aria-label*="ubmit"]', name: 'aria-contains-submit' },
      { selector: 'button.submit', name: 'class-submit' }
    ];

    for (const { selector, name } of selectors) {
      const button = document.querySelector(selector) as HTMLElement;
      if (button) {
        const isDisabled = button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true';
        const state = isDisabled ? 'THINKING' : 'READY';

        Logger.log(`✅ Found button via ${name}:`, {
          element: button,
          disabled: isDisabled,
          state: state,
          ariaLabel: button.getAttribute('aria-label'),
          classes: button.className
        });

        const color = isDisabled ? '#FFC107' : '#28A745';
        const label = isDisabled ? '⏳ THINKING' : '✅ READY';
        this.highlightElement(button, color, label);

        return { element: button, state };
      }
    }

    Logger.warn('❌ Submit button not found');
    return { element: null, state: 'NOT_FOUND' };
  }

  /**
   * Submit via Enter key (alternative to clicking button)
   */
  private async submitViaEnter(): Promise<boolean> {
    this.updateState('click_submit', StepStatus.IN_PROGRESS);
    Logger.log('=== Submitting via Enter Key ===');

    const input = this.findInputElement();
    if (!input) {
      Logger.error('❌ Cannot submit: Input not found');
      this.updateState('click_submit', StepStatus.FAILED, 'Input not found');
      return false;
    }

    try {
      // Focus input first
      input.focus();
      await sleep(100);

      // Dispatch Enter key events
      const enterKeyDown = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });

      const enterKeyPress = new KeyboardEvent('keypress', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });

      const enterKeyUp = new KeyboardEvent('keyup', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });

      input.dispatchEvent(enterKeyDown);
      Logger.log('✅ Enter keydown dispatched');

      await sleep(50);

      input.dispatchEvent(enterKeyPress);
      Logger.log('✅ Enter keypress dispatched');

      await sleep(50);

      input.dispatchEvent(enterKeyUp);
      Logger.log('✅ Enter keyup dispatched');

    } catch (error) {
      Logger.error('❌ Error submitting via Enter:', error);
      this.updateState('click_submit', StepStatus.FAILED, 'Enter key error');
      return false;
    }

    Logger.log('✅ Enter key submitted');
    this.updateState('click_submit', StepStatus.COMPLETED);
    return true;
  }

  /**
   * Click submit button
   */
  private async clickSubmitButton(): Promise<boolean> {
    this.updateState('click_submit', StepStatus.IN_PROGRESS);
    Logger.log('=== Clicking Submit Button ===');

    const { element: button, state } = this.findSubmitButton();

    if (!button) {
      Logger.error('❌ Cannot click: Button not found');
      this.updateState('click_submit', StepStatus.FAILED, 'Button not found');
      return false;
    }

    Logger.log(`Button state before click: ${state}`);
    Logger.log('Button element:', button);
    Logger.log('Button HTML:', button.outerHTML.substring(0, 200));

    if (state === 'THINKING') {
      Logger.warn('⚠️ Button already in THINKING state - will click anyway');
    }

    // Click button ONCE only (avoid duplicate submissions)
    try {
      // Ensure button is visible and in viewport
      button.scrollIntoView({ behavior: 'instant', block: 'center' });
      await sleep(100);

      // Focus button first
      if (button instanceof HTMLElement) {
        button.focus();
        Logger.log('✅ Button focused');
        await sleep(50);
      }

      // Try direct click first
      button.click();
      Logger.log('✅ Direct click executed');
      await sleep(100);

      // Also dispatch mousedown + mouseup (some sites need this)
      button.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
      await sleep(50);

      button.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
      Logger.log('✅ Mouse events dispatched');

    } catch (error) {
      Logger.error('❌ Error clicking button:', error);
      this.updateState('click_submit', StepStatus.FAILED, 'Click error');
      return false;
    }

    Logger.log('✅ Click executed');
    this.updateState('click_submit', StepStatus.COMPLETED);
    return true;
  }

  /**
   * Find and click "New Thread" button to reset conversation
   */
  private async clickNewThreadButton(): Promise<boolean> {
    Logger.log('=== Clicking New Thread Button ===');

    // Find button by data-testid
    const button = document.querySelector('button[data-testid="sidebar-new-thread"]') as HTMLElement;

    if (!button) {
      Logger.error('❌ New Thread button not found');
      return false;
    }

    Logger.log('✅ Found New Thread button');

    try {
      // Scroll into view
      button.scrollIntoView({ behavior: 'instant', block: 'center' });
      await sleep(100);

      // Focus and click
      button.focus();
      await sleep(50);

      button.click();
      Logger.log('✅ New Thread button clicked');

      // Also dispatch mouse events
      button.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
      await sleep(50);

      button.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        view: window
      }));

      Logger.log('✅ New Thread created');

      // Wait for new thread to load
      await sleep(2000);

      return true;
    } catch (error) {
      Logger.error('❌ Error clicking New Thread button:', error);
      return false;
    }
  }

  /**
   * Find "Stop Generating" button (indicates AI is thinking)
   * Returns: { element, isThinking }
   * - isThinking = true if button exists and NOT disabled
   * - isThinking = false if button disabled or not found
   */
  private findStopButton(): { element: HTMLElement | null; isThinking: boolean } {
    // Primary selector - exact match
    const button = document.querySelector('button[data-testid="stop-generating-response-button"]') as HTMLElement;

    if (!button) {
      return { element: null, isThinking: false };
    }

    // Check if button is disabled (AI finished)
    const isDisabled = button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true';
    const isVisible = button.offsetParent !== null;

    // AI is thinking if button exists, visible, and NOT disabled
    const isThinking = isVisible && !isDisabled;

    Logger.log(`Stop button: ${isThinking ? '🔴 THINKING' : '✅ IDLE'} (disabled: ${isDisabled}, visible: ${isVisible})`);

    return { element: button, isThinking };
  }

  /**
   * Wait for AI to finish thinking
   * Strategy: Monitor "Stop Generating" button state
   * NO TIMEOUT - wait indefinitely until AI finishes
   */
  private async waitForThinkingComplete(_timeoutMs?: number): Promise<boolean> {
    this.updateState('wait_thinking', StepStatus.IN_PROGRESS);
    Logger.log('=== Waiting for AI to finish thinking (NO TIMEOUT) ===');

    const startTime = Date.now();
    const checkInterval = 500; // Check every 500ms
    let wasThinking = false;
    let checkCount = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) { // NO TIMEOUT - wait forever
      checkCount++;
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      // Check "Stop Generating" button
      const { isThinking } = this.findStopButton();

      if (isThinking) {
        wasThinking = true;
        if (checkCount % 4 === 0) { // Log every 2 seconds
          Logger.log(`⏳ AI is thinking... (${elapsed}s)`);
        }
        await sleep(checkInterval);
        continue;
      }

      // If was thinking and now stopped → AI finished!
      if (wasThinking && !isThinking) {
        Logger.log(`✅ AI finished thinking! (took ${elapsed}s)`);
        this.updateState('wait_thinking', StepStatus.COMPLETED);
        return true;
      }

      // If never started thinking, wait a bit more (AI might be starting)
      if (!wasThinking && elapsed < 5) {
        if (checkCount % 4 === 0) {
          Logger.log(`⏳ Waiting for AI to start... (${elapsed}s)`);
        }
        await sleep(checkInterval);
        continue;
      }

      // If never started thinking after 5s, assume already done
      if (!wasThinking && elapsed >= 5) {
        Logger.log('✅ AI response ready (no thinking detected)');
        this.updateState('wait_thinking', StepStatus.COMPLETED);
        return true;
      }

      await sleep(checkInterval);
    }
  }

  /**
   * Analyze and log DOM structure
   */
  private async analyzeDOMStructure(): Promise<void> {
    this.updateState('analyze_dom', StepStatus.IN_PROGRESS);
    Logger.log('=== Analyzing Perplexity DOM ===');

    // Clear previous highlights
    this.clearHighlights();

    // Find input
    const input = this.findInputElement();

    // Find submit button
    const { element: button, state: buttonState } = this.findSubmitButton();

    // Summary
    Logger.log('=== Analysis Summary ===', {
      input: input ? '✅ Found' : '❌ Not found',
      button: button ? '✅ Found' : '❌ Not found',
      buttonState: buttonState
    });

    this.updateState('analyze_dom', StepStatus.COMPLETED);
    Logger.log('=== DOM Analysis Complete ===');
  }

  /**
   * Find and extract code block content by index
   */
  private findCodeBlockContent(index: number): any {
    const markdownId = `markdown-content-${index}`;
    const markdownElement = document.querySelector(`#${markdownId}`);

    if (!markdownElement) {
      return { found: false, id: markdownId };
    }

    // Highlight the markdown container
    this.highlightElement(markdownElement, '#9B59B6', `📄 ${markdownId}`);

    // Find code element inside
    const codeElement = markdownElement.querySelector('code');
    if (!codeElement) {
      return { found: true, id: markdownId, hasCode: false };
    }

    // Highlight code block
    this.highlightElement(codeElement, '#E74C3C', '💻 CODE');

    // Extract text content
    const rawText = codeElement.textContent || '';
    const cleanText = rawText.trim();

    return {
      found: true,
      id: markdownId,
      hasCode: true,
      rawText: rawText,
      cleanText: cleanText,
      value: cleanText, // The actual value (e.g., "33")
      length: cleanText.length
    };
  }

  /**
   * Scan all possible markdown-content indices
   */
  private scanAllCodeBlocks(maxIndex: number = 10): any[] {
    const results: any[] = [];

    for (let i = 0; i <= maxIndex; i++) {
      const result = this.findCodeBlockContent(i);
      if (result.found) {
        results.push(result);
        Logger.log(`✅ Found ${result.id}:`, result.value);
      }
    }

    return results;
  }

  /**
   * Extract workflow elements info
   */
  private async extractAllContent(): Promise<any> {
    this.updateState('extract_content', StepStatus.IN_PROGRESS);
    Logger.log('=== Extracting Workflow Elements ===');

    const results: any = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      workflow: {
        input: null,
        submitButton: null
      },
      codeBlocks: []
    };

    // Get input info
    const input = document.querySelector('#ask-input') as HTMLElement;
    if (input) {
      results.workflow.input = {
        found: true,
        id: input.id,
        tag: input.tagName,
        type: input.getAttribute('type'),
        placeholder: input.getAttribute('placeholder'),
        value: (input as HTMLInputElement).value || '',
        classes: input.className
      };
    } else {
      results.workflow.input = { found: false };
    }

    // Get button info
    const { element: button, state: buttonState } = this.findSubmitButton();
    if (button) {
      results.workflow.submitButton = {
        found: true,
        state: buttonState,
        tag: button.tagName,
        ariaLabel: button.getAttribute('aria-label'),
        disabled: button.hasAttribute('disabled'),
        dataTestId: button.getAttribute('data-testid'),
        classes: button.className,
        innerHTML: button.innerHTML.substring(0, 200)
      };
    } else {
      results.workflow.submitButton = { found: false };
    }

    // Scan for code blocks
    results.codeBlocks = this.scanAllCodeBlocks(10);
    Logger.log(`📊 Found ${results.codeBlocks.length} code blocks`);

    this.updateState('extract_content', StepStatus.COMPLETED);
    Logger.log('=== Extraction Complete ===');

    return results;
  }

  /**
   * Run full workflow with prompt, submit and wait
   */
  async runWorkflow(prompt?: string): Promise<any> {
    Logger.log('=== Starting Full Workflow ===');

    // Default prompt if not provided
    const defaultPrompt = 'Generate a random number between 1 and 100. Output only the number in a code block with no explanation.';
    const finalPrompt = prompt || defaultPrompt;

    try {
      // Wait a bit for page to fully load
      await sleep(2000);

      // Step 1: Analyze DOM structure (find input & button)
      await this.analyzeDOMStructure();

      // Step 2: Send prompt to input (MUST succeed before clicking submit)
      Logger.log('⚠️ IMPORTANT: Must send prompt successfully before clicking submit');
      const promptSent = await this.sendPromptToInput(finalPrompt);
      if (!promptSent) {
        Logger.error('❌ BLOCKED: Cannot proceed without sending prompt');
        throw new Error('Failed to send prompt to input - Submit blocked');
      }
      Logger.log('✅ Prompt sent successfully - Safe to click submit');

      // Wait a bit to ensure prompt is fully set in input
      await sleep(500);
      Logger.log('⏳ Waited 500ms for prompt to settle');

      // Step 3: Submit via button click (only after prompt is sent)
      Logger.log('⚠️ About to submit via button click...');
      const clicked = await this.clickSubmitButton();
      if (!clicked) {
        Logger.warn('⚠️ Button click failed, trying Enter key...');
        const submitted = await this.submitViaEnter();
        if (!submitted) {
          throw new Error('Failed to submit (both button click and Enter failed)');
        }
      }
      Logger.log('✅ Submitted successfully');

      // Wait a bit for the submission to register
      await sleep(500);

      // Step 4: Wait for thinking to complete (NO TIMEOUT)
      const thinkingDone = await this.waitForThinkingComplete();
      if (!thinkingDone) {
        throw new Error('Failed waiting for AI response');
      }

      // Step 5: Extract code blocks
      const results = await this.extractAllContent();

      Logger.log('=== Workflow Completed Successfully ===');
      Logger.log('Results:', results);

      this.updateState('completed', StepStatus.COMPLETED);

      return results;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      Logger.error('Workflow failed:', errorMsg);

      this.updateState('failed', StepStatus.FAILED, errorMsg);

      throw error;
    }
  }

  /**
   * Get current workflow state
   */
  getState(): WorkflowState {
    return { ...this.state };
  }
}

// Initialize workflow manager
const workflowManager = new WorkflowManager();

/**
 * Handle messages from background script or popup
 */
chrome.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
  Logger.log('Content script received message:', message);

  (async () => {
    try {
      switch (message.type) {
        case MessageType.START_WORKFLOW: {
          Logger.log('Starting DOM analysis workflow');

          const prompt = message.payload?.prompt;
          const results = await workflowManager.runWorkflow(prompt);

          sendResponse({
            success: true,
            results,
            state: workflowManager.getState()
          });

          break;
        }

        case MessageType.WORKFLOW_STATUS: {
          sendResponse({
            success: true,
            state: workflowManager.getState()
          });
          break;
        }

        case MessageType.GET_MARKDOWN: {
          const index = message.payload?.index ?? 0;
          Logger.log(`Getting markdown-content-${index}`);

          const result = workflowManager['findCodeBlockContent'](index);

          sendResponse({
            success: result.found,
            content: result.cleanText || null,
            rawText: result.rawText || null
          });
          break;
        }

        case MessageType.NEW_THREAD: {
          Logger.log('Creating new thread');
          const success = await workflowManager['clickNewThreadButton']();
          sendResponse({ success });
          break;
        }

        case 'PING': {
          // Health check from background script
          sendResponse({ success: true, status: 'alive' });
          break;
        }

        default:
          Logger.warn('Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      Logger.error('Error handling message:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        state: workflowManager.getState()
      });
    }
  })();

  return true; // Keep channel open for async response
});

Logger.log('Content script initialized on:', window.location.href);

