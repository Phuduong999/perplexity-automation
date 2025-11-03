/**
 * Auto-reload extension when files change (Development only)
 * This watches for changes in the dist folder and reloads the extension
 */

const WATCH_INTERVAL = 1000; // Check every second
const TIMESTAMP_KEY = 'dev_last_reload_timestamp';

/**
 * Get current timestamp of background.js (proxy for build time)
 */
async function getCurrentBuildTime(): Promise<number> {
  try {
    const url = chrome.runtime.getURL('background.js');
    const response = await fetch(url, { cache: 'no-store' });
    const lastModified = response.headers.get('last-modified');
    return lastModified ? new Date(lastModified).getTime() : Date.now();
  } catch {
    return Date.now();
  }
}

/**
 * Check if files have changed and reload if needed
 */
async function checkAndReload(): Promise<void> {
  const currentTime = await getCurrentBuildTime();

  chrome.storage.local.get([TIMESTAMP_KEY], (result) => {
    const lastTime = result[TIMESTAMP_KEY] || 0;

    if (lastTime > 0 && currentTime > lastTime) {
      console.log('🔄 Files changed, reloading extension...');
      chrome.runtime.reload();
    }

    // Update timestamp
    chrome.storage.local.set({ [TIMESTAMP_KEY]: currentTime });
  });
}

// Start watching in development mode
const isDevelopment = !('update_url' in chrome.runtime.getManifest());

if (isDevelopment) {
  console.log('🔧 Development mode: Auto-reload enabled');

  // Check on startup
  checkAndReload();

  // Check periodically
  setInterval(checkAndReload, WATCH_INTERVAL);
}

export {};

