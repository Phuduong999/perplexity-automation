import * as XLSX from 'xlsx';
import { Logger } from './utils';

/**
 * Tag mapping configuration
 */
const TAG_COLUMNS = {
  'AT': {
    name: 'Protein Sources',
    tags: ['Beef', 'Pork', 'Chicken', 'Turkey', 'Lamb', 'Fish', 'Shellfish', 'Eggs', 'Dairy']
  },
  'AU': {
    name: 'Dairy Alternatives',
    tags: ['Lactose-Free', 'Non-Dairy Milk', 'Non-Dairy Cheese']
  },
  'AV': {
    name: 'Grains & Starches',
    tags: ['Wheat', 'Gluten-Free Grains', 'Pasta Alternatives', 'Potatoes', 'Corn']
  },
  'AW': {
    name: 'Legumes & Nuts',
    tags: ['Beans', 'Peanuts', 'Tree Nuts', 'Soy', 'Lentils']
  },
  'AX': {
    name: 'Vegetables',
    tags: ['Nightshades', 'Cruciferous', 'Leafy Greens', 'Mushrooms', 'Alliums']
  },
  'AY': {
    name: 'Fruits',
    tags: ['Citrus', 'Berries', 'Tropical Fruits', 'Stone Fruits', 'Melons']
  },
  'AZ': {
    name: 'Herbs & Spices',
    tags: ['Dried Herbs & Spices', 'Fresh Herbs', 'Spicy']
  },
  'BA': {
    name: 'Miscellaneous',
    tags: ['Sweeteners', 'Alcohol', 'Caffeine']
  },
  'BB': {
    name: 'Others (Fallback)',
    tags: ['Other']
  }
};

interface ExcelRow {
  rowIndex: number;
  _id: string;
  status: string;
  name: string;
}

/**
 * Excel Workflow Manager
 */
export class ExcelWorkflowManager {
  private filePath: string;
  private workbook: XLSX.WorkBook | null = null;
  private worksheet: XLSX.WorkSheet | null = null;
  private promptContent: string = '';
  private processedCount: number = 0;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Load prompt from promptForce.md
   */
  async loadPrompt(): Promise<void> {
    try {
      const response = await fetch(chrome.runtime.getURL('promptForce.md'));
      this.promptContent = await response.text();
      Logger.log('✅ Loaded prompt from promptForce.md');
    } catch (error) {
      Logger.error('Failed to load prompt:', error);
      throw error;
    }
  }

  /**
   * Read Excel file
   */
  async readExcelFile(): Promise<void> {
    try {
      // For Chrome extension, we need to read file differently
      // This will be handled by the popup/background script
      Logger.log(`Reading Excel file: ${this.filePath}`);
      
      // Note: In browser context, we'll need to use FileReader API
      // This is a placeholder - actual implementation will be in popup
      throw new Error('Excel reading must be done in popup context with FileReader');
    } catch (error) {
      Logger.error('Failed to read Excel file:', error);
      throw error;
    }
  }

  /**
   * Parse Excel workbook from ArrayBuffer
   */
  parseExcelFromBuffer(buffer: ArrayBuffer): void {
    try {
      this.workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = this.workbook.SheetNames[0];
      this.worksheet = this.workbook.Sheets[sheetName];
      Logger.log(`✅ Parsed Excel file, sheet: ${sheetName}`);
    } catch (error) {
      Logger.error('Failed to parse Excel:', error);
      throw error;
    }
  }

  /**
   * Get rows with REVIEW status
   */
  getReviewRows(): ExcelRow[] {
    if (!this.worksheet) {
      throw new Error('Worksheet not loaded');
    }

    const rows: ExcelRow[] = [];
    const range = XLSX.utils.decode_range(this.worksheet['!ref'] || 'A1');
    
    // Start from row 2 (skip header)
    for (let rowNum = 2; rowNum <= range.e.r + 1; rowNum++) {
      const statusCell = this.worksheet[`B${rowNum}`];
      const status = statusCell ? String(statusCell.v).trim() : '';
      
      if (status === 'REVIEW') {
        const idCell = this.worksheet[`A${rowNum}`];
        const nameCell = this.worksheet[`C${rowNum}`];
        
        rows.push({
          rowIndex: rowNum,
          _id: idCell ? String(idCell.v) : '',
          status: status,
          name: nameCell ? String(nameCell.v) : ''
        });
      }
    }

    Logger.log(`Found ${rows.length} rows with REVIEW status`);
    return rows;
  }

  /**
   * Format input for AI - Only send ingredient name
   */
  formatInput(row: ExcelRow): string {
    return row.name;
  }

  /**
   * Parse AI response (JSON from code block)
   */
  parseAIResponse(response: string): string[] {
    try {
      let jsonStr = response.trim();

      // Remove common suffixes like "💻 CODE", "```", etc.
      jsonStr = jsonStr.replace(/\n?💻\s*CODE.*$/i, '');
      jsonStr = jsonStr.replace(/\n?```.*$/gm, '');

      // Extract JSON from markdown code block
      if (jsonStr.includes('```')) {
        // Find first ``` and last ```
        const firstBlock = jsonStr.indexOf('```');
        const afterFirst = jsonStr.indexOf('\n', firstBlock) + 1;
        const lastBlock = jsonStr.indexOf('```', afterFirst);

        if (firstBlock !== -1 && lastBlock !== -1) {
          // Extract only content between ``` markers
          jsonStr = jsonStr.substring(afterFirst, lastBlock).trim();
        }
      }

      // Extract ONLY the JSON object {...} - ignore everything else
      const jsonMatch = jsonStr.match(/\{[^{}]*\{[^{}]*\}[^{}]*\}|\{[^{}]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      Logger.log('Extracted JSON:', jsonStr);

      const parsed = JSON.parse(jsonStr);

      if (parsed.tags && Array.isArray(parsed.tags)) {
        Logger.log(`Parsed tags:`, parsed.tags);
        return parsed.tags;
      }

      throw new Error('Invalid response format: missing tags array');
    } catch (error) {
      Logger.error('Failed to parse AI response:', error);
      Logger.error('Response was:', response.substring(0, 500));
      throw error;
    }
  }

  /**
   * Map tags to Excel columns
   */
  mapTagsToColumns(tags: string[]): { [column: string]: string } {
    const result: { [column: string]: string } = {};

    for (const [column, config] of Object.entries(TAG_COLUMNS)) {
      const matchedTags = tags.filter(tag => config.tags.includes(tag));
      
      if (matchedTags.length > 0) {
        result[column] = matchedTags.join(', ');
      }
    }

    Logger.log('Mapped tags to columns:', result);
    return result;
  }

  /**
   * Clear all tag columns (AT-BB) for a row before writing new tags
   */
  clearTagColumns(rowIndex: number): void {
    if (!this.worksheet) {
      throw new Error('Worksheet not loaded');
    }

    // Clear columns AT to BB
    const columns = Object.keys(TAG_COLUMNS); // ['AT', 'AU', 'AV', 'AW', 'AX', 'AY', 'AZ', 'BA', 'BB']

    for (const column of columns) {
      const cellAddress = `${column}${rowIndex}`;
      // Delete the cell (set to undefined removes it from worksheet)
      delete this.worksheet[cellAddress];
    }

    Logger.log(`🗑️ Cleared tag columns AT-BB for row ${rowIndex}`);
  }

  /**
   * Write tags to Excel row (after clearing old tags)
   */
  writeTagsToRow(rowIndex: number, mappedColumns: { [column: string]: string }): void {
    if (!this.worksheet) {
      throw new Error('Worksheet not loaded');
    }

    // Clear old tags first
    this.clearTagColumns(rowIndex);

    // Write new tags
    for (const [column, value] of Object.entries(mappedColumns)) {
      const cellAddress = `${column}${rowIndex}`;
      this.worksheet[cellAddress] = { t: 's', v: value };
    }

    Logger.log(`✅ Wrote tags to row ${rowIndex}`);
  }

  /**
   * Update status to OK (processed successfully)
   */
  updateRowStatus(rowIndex: number, newStatus: string = 'OK'): void {
    if (!this.worksheet) {
      throw new Error('Worksheet not loaded');
    }

    const cellAddress = `B${rowIndex}`;

    // Set cell value with green background for "OK" status
    this.worksheet[cellAddress] = {
      t: 's',
      v: newStatus,
      s: {
        fill: {
          fgColor: { rgb: '00FF00' } // Green background
        },
        font: {
          bold: true,
          color: { rgb: '000000' } // Black text
        }
      }
    };

    Logger.log(`✅ Updated row ${rowIndex} status to ${newStatus} (with green background)`);
  }

  /**
   * Save Excel file
   */
  saveExcelFile(): ArrayBuffer {
    if (!this.workbook) {
      throw new Error('Workbook not loaded');
    }

    const wbout = XLSX.write(this.workbook, { bookType: 'xlsx', type: 'array' });
    Logger.log('✅ Excel file saved to buffer');
    return wbout;
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      processedCount: this.processedCount
    };
  }
}

