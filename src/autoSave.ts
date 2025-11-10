/**
 * Auto-Save Utility
 * Automatically saves processing results to prevent data loss
 * Saves to Desktop/PerplexityAutomation/results/ folder
 */

import { STORAGE_KEYS, FILE_PATHS } from './constants';

export interface ProcessedRowData {
  rowIndex: number;
  ingredientId: string | null;
  ingredientName: string;
  originalStatus: string;
  newStatus: string;
  tags: string[];
  timestamp: number;
}

export interface AutoSaveData {
  processedRows: ProcessedRowData[];
  currentRowIndex: number;
  totalRows: number;
  lastSaveTimestamp: number;
  selectedFiles: any[];
}

/**
 * Save processed data to chrome.storage
 */
export async function autoSaveToStorage(data: Partial<AutoSaveData>): Promise<void> {
  try {
    const existingData = await loadAutoSaveData();
    
    const updatedData: AutoSaveData = {
      processedRows: data.processedRows || existingData.processedRows,
      currentRowIndex: data.currentRowIndex ?? existingData.currentRowIndex,
      totalRows: data.totalRows ?? existingData.totalRows,
      lastSaveTimestamp: Date.now(),
      selectedFiles: data.selectedFiles || existingData.selectedFiles
    };

    await chrome.storage.local.set({
      [STORAGE_KEYS.AUTO_SAVE_RESULTS]: updatedData,
      [STORAGE_KEYS.LAST_SAVE_TIMESTAMP]: updatedData.lastSaveTimestamp
    });

    console.log('💾 Auto-saved:', {
      processedRows: updatedData.processedRows.length,
      currentRow: updatedData.currentRowIndex,
      totalRows: updatedData.totalRows
    });
  } catch (error) {
    console.error('❌ Auto-save failed:', error);
  }
}

/**
 * Load auto-saved data from chrome.storage
 */
export async function loadAutoSaveData(): Promise<AutoSaveData> {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.AUTO_SAVE_RESULTS]);
    
    if (result[STORAGE_KEYS.AUTO_SAVE_RESULTS]) {
      console.log('📂 Loaded auto-save data:', result[STORAGE_KEYS.AUTO_SAVE_RESULTS]);
      return result[STORAGE_KEYS.AUTO_SAVE_RESULTS];
    }
  } catch (error) {
    console.error('❌ Failed to load auto-save data:', error);
  }

  // Return empty data if nothing saved
  return {
    processedRows: [],
    currentRowIndex: 0,
    totalRows: 0,
    lastSaveTimestamp: 0,
    selectedFiles: []
  };
}

/**
 * Check if auto-save data exists
 */
export async function hasAutoSaveData(): Promise<boolean> {
  const data = await loadAutoSaveData();
  return data.processedRows.length > 0 || data.currentRowIndex > 0;
}

/**
 * Clear auto-save data
 */
export async function clearAutoSaveData(): Promise<void> {
  try {
    await chrome.storage.local.remove([
      STORAGE_KEYS.AUTO_SAVE_RESULTS,
      STORAGE_KEYS.LAST_SAVE_TIMESTAMP
    ]);
    console.log('🗑️ Auto-save data cleared');
  } catch (error) {
    console.error('❌ Failed to clear auto-save data:', error);
  }
}

/**
 * Export auto-save data to JSON file
 * Downloads to Desktop/PerplexityAutomation/results/
 */
export async function exportAutoSaveToFile(): Promise<void> {
  try {
    const data = await loadAutoSaveData();
    
    if (data.processedRows.length === 0) {
      console.log('⚠️ No data to export');
      return;
    }

    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `auto_save_${timestamp}.json`;
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
    
    console.log('📥 Exported auto-save data to:', filename);
  } catch (error) {
    console.error('❌ Failed to export auto-save data:', error);
  }
}

/**
 * Get desktop path for saving files
 */
export function getDesktopSavePath(): string {
  return FILE_PATHS.getResultsPath();
}

/**
 * Auto-save on window unload (unexpected close)
 */
export function setupAutoSaveOnUnload(getCurrentData: () => Partial<AutoSaveData>): void {
  window.addEventListener('beforeunload', async (event) => {
    const data = getCurrentData();
    
    if (data.processedRows && data.processedRows.length > 0) {
      await autoSaveToStorage(data);
      console.log('💾 Auto-saved on window close');
    }
  });
  
  console.log('✅ Auto-save on unload enabled');
}

