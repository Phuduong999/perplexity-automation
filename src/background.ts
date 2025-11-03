import { MessageType, Message } from './types';
import './reload'; // Auto-reload in development

const PERPLEXITY_URL = 'https://www.perplexity.ai/';

/**
 * Logger for background script
 */
class BackgroundLogger {
  private static prefix = '[Background]';

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
 * Find existing Perplexity tab
 */
async function findPerplexityTab(): Promise<chrome.tabs.Tab | null> {
  BackgroundLogger.log('Searching for existing Perplexity tab...');
  
  const tabs = await chrome.tabs.query({});
  
  for (const tab of tabs) {
    if (tab.url && tab.url.startsWith(PERPLEXITY_URL)) {
      BackgroundLogger.log(`Found existing tab: ${tab.id} - ${tab.url}`);
      return tab;
    }
  }
  
  BackgroundLogger.log('No existing Perplexity tab found');
  return null;
}

/**
 * Open or switch to Perplexity tab
 */
async function openOrSwitchToPerplexity(): Promise<chrome.tabs.Tab> {
  BackgroundLogger.log('Opening or switching to Perplexity...');
  
  // Try to find existing tab
  const existingTab = await findPerplexityTab();
  
  if (existingTab && existingTab.id) {
    // Switch to existing tab
    BackgroundLogger.log(`Switching to existing tab: ${existingTab.id}`);
    
    // Activate the tab
    await chrome.tabs.update(existingTab.id, { active: true });
    
    // Focus the window containing the tab
    if (existingTab.windowId) {
      await chrome.windows.update(existingTab.windowId, { focused: true });
    }
    
    // Reload the tab to ensure fresh state
    await chrome.tabs.reload(existingTab.id);
    
    BackgroundLogger.log('Switched to existing tab and reloaded');
    return existingTab;
  } else {
    // Create new tab
    BackgroundLogger.log('Creating new Perplexity tab...');
    
    const newTab = await chrome.tabs.create({
      url: PERPLEXITY_URL,
      active: true
    });
    
    BackgroundLogger.log(`Created new tab: ${newTab.id}`);
    return newTab;
  }
}

/**
 * Wait for tab to be fully loaded
 */
async function waitForTabReady(tabId: number, timeout: number = 30000): Promise<boolean> {
  BackgroundLogger.log(`Waiting for tab ${tabId} to be ready...`);
  
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const checkTab = async () => {
      try {
        const tab = await chrome.tabs.get(tabId);
        
        if (tab.status === 'complete') {
          BackgroundLogger.log(`Tab ${tabId} is ready`);
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime >= timeout) {
          BackgroundLogger.error(`Timeout waiting for tab ${tabId}`);
          resolve(false);
          return;
        }
        
        setTimeout(checkTab, 500);
      } catch (error) {
        BackgroundLogger.error(`Error checking tab ${tabId}:`, error);
        resolve(false);
      }
    };
    
    checkTab();
  });
}

/**
 * Send message to content script
 */
async function sendMessageToTab(tabId: number, message: Message): Promise<any> {
  BackgroundLogger.log(`Sending message to tab ${tabId}:`, message);
  
  try {
    const response = await chrome.tabs.sendMessage(tabId, message);
    BackgroundLogger.log(`Received response from tab ${tabId}:`, response);
    return response;
  } catch (error) {
    BackgroundLogger.error(`Error sending message to tab ${tabId}:`, error);
    throw error;
  }
}

/**
 * Handle messages from popup or content scripts
 */
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  BackgroundLogger.log('Received message:', message, 'from:', sender);
  
  (async () => {
    try {
      switch (message.type) {
        case MessageType.OPEN_OR_SWITCH_TAB: {
          BackgroundLogger.log('Handling OPEN_OR_SWITCH_TAB request');
          
          // Open or switch to Perplexity
          const tab = await openOrSwitchToPerplexity();
          
          if (!tab.id) {
            throw new Error('Failed to get tab ID');
          }
          
          // Wait for tab to be ready
          const isReady = await waitForTabReady(tab.id);
          
          if (!isReady) {
            throw new Error('Tab failed to load');
          }
          
          // Send response
          sendResponse({
            success: true,
            tabId: tab.id,
            url: tab.url
          });
          
          break;
        }
        
        case MessageType.OPEN_TAB: {
          BackgroundLogger.log('🔄 Handling OPEN_TAB request');

          const url = message.payload?.url || 'https://www.perplexity.ai';
          BackgroundLogger.log(`📂 Creating new tab with URL: ${url}`);

          const tab = await chrome.tabs.create({ url });
          BackgroundLogger.log(`✅ Tab created with ID: ${tab.id}`);

          if (!tab.id) {
            BackgroundLogger.error('❌ Failed to create tab - no tab ID');
            throw new Error('Failed to create tab');
          }

          // Wait for tab to be ready
          BackgroundLogger.log(`⏳ Waiting for tab ${tab.id} to be ready...`);
          const isReady = await waitForTabReady(tab.id);
          BackgroundLogger.log(`✅ Tab ${tab.id} ready: ${isReady}`);

          const responseData = {
            success: isReady,
            tabId: tab.id,
            url: tab.url
          };
          BackgroundLogger.log(`📤 Sending response: ${JSON.stringify(responseData)}`);
          sendResponse(responseData);

          break;
        }

        case MessageType.START_WORKFLOW: {
          BackgroundLogger.log('Handling START_WORKFLOW request');

          // First, ensure we have a Perplexity tab
          const tab = await openOrSwitchToPerplexity();

          if (!tab.id) {
            throw new Error('Failed to get tab ID');
          }

          // Wait for tab to be ready
          const isReady = await waitForTabReady(tab.id);

          if (!isReady) {
            throw new Error('Tab failed to load');
          }

          // Forward the workflow start message to content script
          await sendMessageToTab(tab.id, {
            type: MessageType.START_WORKFLOW,
            payload: message.payload
          });

          sendResponse({
            success: true,
            tabId: tab.id
          });

          break;
        }

        default:
          BackgroundLogger.warn('Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      BackgroundLogger.error('Error handling message:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })();
  
  // Return true to indicate we'll send response asynchronously
  return true;
});

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  BackgroundLogger.log('Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    BackgroundLogger.log('First time installation');
  } else if (details.reason === 'update') {
    BackgroundLogger.log('Extension updated');
  }
});

/**
 * Auto-inject content script when needed
 */
async function ensureContentScript(tabId: number): Promise<void> {
  try {
    // Check if tab is Perplexity
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url?.startsWith(PERPLEXITY_URL)) {
      return;
    }

    BackgroundLogger.log(`🔍 Checking content script for tab ${tabId}`);

    // Try to ping content script
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      BackgroundLogger.log(`✅ Content script already loaded in tab ${tabId}`);
    } catch (error) {
      // Content script not loaded, inject it
      BackgroundLogger.log(`💉 Injecting content script into tab ${tabId}`);
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      BackgroundLogger.log(`✅ Content script injected into tab ${tabId}`);
    }
  } catch (error) {
    BackgroundLogger.error('Error ensuring content script:', error);
  }
}

/**
 * Handle tab updates - Auto inject content script
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith(PERPLEXITY_URL)) {
    BackgroundLogger.log(`📄 Perplexity tab ${tabId} loaded, ensuring content script...`);
    ensureContentScript(tabId);
  }
});

/**
 * Handle tab activation - Auto inject when user switches to tab
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url?.startsWith(PERPLEXITY_URL)) {
      BackgroundLogger.log(`👁️ Switched to Perplexity tab ${activeInfo.tabId}, ensuring content script...`);
      ensureContentScript(activeInfo.tabId);
    }
  } catch (error) {
    BackgroundLogger.error('Error handling tab activation:', error);
  }
});

BackgroundLogger.log('Background script initialized');

