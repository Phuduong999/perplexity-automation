import { ButtonState, WaitConfig } from './types';

/**
 * Logger utility with timestamp
 */
export class Logger {
  private static prefix = '[Perplexity Automation]';

  static log(message: string, ...args: any[]): void {
    console.log(`${this.prefix} ${new Date().toISOString()} - ${message}`, ...args);
  }

  static error(message: string, ...args: any[]): void {
    console.error(`${this.prefix} ${new Date().toISOString()} - ERROR: ${message}`, ...args);
  }

  static warn(message: string, ...args: any[]): void {
    console.warn(`${this.prefix} ${new Date().toISOString()} - WARN: ${message}`, ...args);
  }

  static info(message: string, ...args: any[]): void {
    console.info(`${this.prefix} ${new Date().toISOString()} - INFO: ${message}`, ...args);
  }
}

/**
 * Wait for an element to appear in the DOM
 * @param selector - CSS selector or multiple selectors (fallback)
 * @param config - Configuration options
 * @returns Promise that resolves with the element
 */
export async function waitForElement<T extends Element = Element>(
  selector: string | string[],
  config: WaitConfig = {}
): Promise<T | null> {
  const {
    timeout = 30000,
    checkInterval = 100,
    throwOnTimeout = false
  } = config;

  const selectors = Array.isArray(selector) ? selector : [selector];
  const startTime = Date.now();

  Logger.log(`Waiting for element: ${selectors.join(' OR ')}`);

  return new Promise((resolve, reject) => {
    const checkElement = () => {
      // Try each selector
      for (const sel of selectors) {
        const element = document.querySelector<T>(sel);
        if (element) {
          Logger.log(`Element found: ${sel}`);
          resolve(element);
          return;
        }
      }

      // Check timeout
      if (Date.now() - startTime >= timeout) {
        const errorMsg = `Timeout waiting for element: ${selectors.join(' OR ')}`;
        Logger.error(errorMsg);
        
        if (throwOnTimeout) {
          reject(new Error(errorMsg));
        } else {
          resolve(null);
        }
        return;
      }

      // Continue checking
      setTimeout(checkElement, checkInterval);
    };

    checkElement();
  });
}

/**
 * Wait for an element to disappear from the DOM
 */
export async function waitForElementToDisappear(
  selector: string,
  config: WaitConfig = {}
): Promise<boolean> {
  const {
    timeout = 30000,
    checkInterval = 100
  } = config;

  const startTime = Date.now();

  Logger.log(`Waiting for element to disappear: ${selector}`);

  return new Promise((resolve) => {
    const checkElement = () => {
      const element = document.querySelector(selector);
      
      if (!element) {
        Logger.log(`Element disappeared: ${selector}`);
        resolve(true);
        return;
      }

      if (Date.now() - startTime >= timeout) {
        Logger.warn(`Timeout waiting for element to disappear: ${selector}`);
        resolve(false);
        return;
      }

      setTimeout(checkElement, checkInterval);
    };

    checkElement();
  });
}

/**
 * Detect the current state of the submit button
 */
export function detectButtonState(): ButtonState {
  // State 1: Voice mode button (ready to submit)
  const voiceButton = document.querySelector('button[aria-label="Voice mode"]');
  if (voiceButton) {
    Logger.log('Button state: READY (Voice mode visible)');
    return ButtonState.READY;
  }

  // State 3: Disabled submit button (response complete)
  const disabledButton = document.querySelector('button[data-testid="submit-button"][disabled]');
  if (disabledButton) {
    Logger.log('Button state: DISABLED (Response complete)');
    return ButtonState.DISABLED;
  }

  // State 2: Loading/processing (submit button exists but not disabled)
  const submitButton = document.querySelector('button[data-testid="submit-button"]:not([disabled])');
  if (submitButton) {
    Logger.log('Button state: LOADING (Processing)');
    return ButtonState.LOADING;
  }

  Logger.warn('Button state: NOT_FOUND');
  return ButtonState.NOT_FOUND;
}

/**
 * Wait for button to reach a specific state
 */
export async function waitForButtonState(
  targetState: ButtonState,
  config: WaitConfig = {}
): Promise<boolean> {
  const {
    timeout = 60000,
    checkInterval = 500
  } = config;

  const startTime = Date.now();

  Logger.log(`Waiting for button state: ${targetState}`);

  return new Promise((resolve) => {
    const checkState = () => {
      const currentState = detectButtonState();
      
      if (currentState === targetState) {
        Logger.log(`Button reached target state: ${targetState}`);
        resolve(true);
        return;
      }

      if (Date.now() - startTime >= timeout) {
        Logger.error(`Timeout waiting for button state: ${targetState}`);
        resolve(false);
        return;
      }

      setTimeout(checkState, checkInterval);
    };

    checkState();
  });
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate element is ready for interaction
 */
export function isElementReady(element: Element): boolean {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  const isVisible = rect.width > 0 && rect.height > 0;
  const isInViewport = rect.top >= 0 && rect.left >= 0;
  
  return isVisible && isInViewport;
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      Logger.log(`Attempt ${attempt}/${maxAttempts}`);
      return await fn();
    } catch (error) {
      lastError = error as Error;
      Logger.warn(`Attempt ${attempt} failed: ${lastError.message}`);

      if (attempt < maxAttempts) {
        Logger.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

