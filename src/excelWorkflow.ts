import * as XLSX from 'xlsx';
import { Logger } from './utils';
import {
  TAG_COLUMNS,
  EXCEL_CONFIG,
  VALIDATION,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  UI_STYLES
} from './constants';

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
      Logger.log(SUCCESS_MESSAGES.PROMPT_LOADED);
    } catch (error) {
      Logger.error('Failed to load prompt:', error);
      throw error;
    }
  }

  /**
   * Get prompt content (for sending initial prompt to new threads)
   */
  getPromptContent(): string {
    return this.promptContent;
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
      Logger.log(`${SUCCESS_MESSAGES.EXCEL_PARSED}, sheet: ${sheetName}`);
    } catch (error) {
      Logger.error('Failed to parse Excel:', error);
      throw error;
    }
  }

  /**
   * Get rows with REVIEW status
   * Supports multiple status variants (case-insensitive):
   * - REVIEW, review
   * - NOT-OK, not-ok, not-oke, not ok, NOT OK, etc.
   */
  getReviewRows(): ExcelRow[] {
    if (!this.worksheet) {
      throw new Error(ERROR_MESSAGES.WORKSHEET_NOT_LOADED);
    }

    const rows: ExcelRow[] = [];
    const range = XLSX.utils.decode_range(this.worksheet['!ref'] || 'A1');

    // Start from row 2 (skip header)
    // Column structure: A=_id, B=Status From BA, C=Status, D=Ingredient Name
    for (let rowNum = VALIDATION.EXCEL_START_ROW; rowNum <= range.e.r + 1; rowNum++) {
      const statusCell = this.worksheet[`${EXCEL_CONFIG.COLUMNS.STATUS}${rowNum}`];
      const status = statusCell ? String(statusCell.v).trim() : '';

      // Check if status is REVIEW or any variant of NOT-OK
      const isReview = VALIDATION.STATUS_PATTERNS.REVIEW.test(status);
      const isNotOk = VALIDATION.STATUS_PATTERNS.NOT_OK.test(status);

      if (isReview || isNotOk) {
        const idCell = this.worksheet[`${EXCEL_CONFIG.COLUMNS.ID}${rowNum}`];
        const nameCell = this.worksheet[`${EXCEL_CONFIG.COLUMNS.INGREDIENT_NAME}${rowNum}`];

        rows.push({
          rowIndex: rowNum,
          _id: idCell ? String(idCell.v) : '',
          status: status, // Keep original status
          name: nameCell ? String(nameCell.v) : ''
        });
      }
    }

    Logger.log(`Found ${rows.length} rows with REVIEW/NOT-OK status`);
    return rows;
  }

  /**
   * Format input for AI
   * @param row - Excel row data
   * @param isFirstRow - If true, send full prompt. Otherwise just ingredient name
   */
  formatInput(row: ExcelRow, isFirstRow: boolean = false): string {
    // Validate row
    if (!row.name || row.name.trim() === '') {
      throw new Error(`Invalid ingredient name at row ${row.rowIndex}`);
    }

    if (row.rowIndex < VALIDATION.EXCEL_START_ROW) {
      throw new Error(`Invalid row index: ${row.rowIndex}`);
    }

    // Sanitize name
    const sanitizedName = row.name.trim().replace(/[<>]/g, '');

    // First row: send full prompt + ingredient name
    // Other rows: just ingredient name
    if (isFirstRow) {
      return `${this.promptContent}\n\n${sanitizedName}`;
    } else {
      return sanitizedName;
    }
  }

  /**
   * Parse AI response (JSON from code block)
   */
  parseAIResponse(response: string): string[] {
    if (!response || response.trim() === '') {
      throw new Error('Empty AI response - no content to parse');
    }

    // ✅ FIX: Check if response contains JSON structure
    if (!response.includes('{') || !response.includes('tags')) {
      throw new Error(`AI response doesn't contain JSON: ${response.substring(0, 200)}...`);
    }

    try {
      let jsonStr = response.trim();

      // Extract JSON from markdown code block
      const jsonMatch = jsonStr.match(/\{[^{}]*\{[^{}]*\}[^{}]*\}|\{[^{}]*\}/);
      if (!jsonMatch) {
        throw new Error(`No JSON object found in response: ${response.substring(0, 200)}...`);
      }

      jsonStr = jsonMatch[0];
      Logger.log('Extracted JSON:', jsonStr);

      const parsed = JSON.parse(jsonStr);

      if (!parsed.tags || !Array.isArray(parsed.tags)) {
        throw new Error('Invalid response format - missing tags array');
      }

      return parsed.tags;
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
      const matchedTags = tags.filter(tag => (config.tags as readonly string[]).includes(tag));

      if (matchedTags.length > 0) {
        result[column] = matchedTags.join(', ');
      }
    }

    Logger.log('Mapped tags to columns:', result);
    return result;
  }

  /**
   * Clear all tag columns (F-N) for a row before writing new tags
   */
  clearTagColumns(rowIndex: number): void {
    if (!this.worksheet) {
      throw new Error(ERROR_MESSAGES.WORKSHEET_NOT_LOADED);
    }

    // Clear columns F to N (tag columns)
    const columns = Object.keys(TAG_COLUMNS); // ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']

    for (const column of columns) {
      const cellAddress = `${column}${rowIndex}`;
      // Delete the cell (set to undefined removes it from worksheet)
      delete this.worksheet[cellAddress];
    }

    Logger.log(`Cleared tag columns ${EXCEL_CONFIG.COLUMNS.TAG_START}-${EXCEL_CONFIG.COLUMNS.TAG_END} for row ${rowIndex}`);
  }

  /**
   * Write tags to Excel row (after clearing old tags)
   */
  writeTagsToRow(rowIndex: number, mappedColumns: { [column: string]: string }): void {
    if (!this.worksheet) {
      throw new Error(ERROR_MESSAGES.WORKSHEET_NOT_LOADED);
    }

    // Clear old tags first
    this.clearTagColumns(rowIndex);

    // Write new tags
    for (const [column, value] of Object.entries(mappedColumns)) {
      const cellAddress = `${column}${rowIndex}`;
      this.worksheet[cellAddress] = { t: 's', v: value };
    }

    Logger.log(`${SUCCESS_MESSAGES.TAGS_WRITTEN} ${rowIndex}`);
  }

  /**
   * Update status to OK (processed successfully)
   */
  updateRowStatus(rowIndex: number, newStatus: string = EXCEL_CONFIG.STATUS.OK): void {
    if (!this.worksheet) {
      throw new Error(ERROR_MESSAGES.WORKSHEET_NOT_LOADED);
    }

    const cellAddress = `${EXCEL_CONFIG.COLUMNS.STATUS}${rowIndex}`;

    // Set cell value with green background for "OK" status
    this.worksheet[cellAddress] = {
      t: 's',
      v: newStatus,
      s: {
        fill: {
          fgColor: { rgb: UI_STYLES.COLORS.SUCCESS_BG }
        },
        font: {
          bold: true,
          color: { rgb: UI_STYLES.COLORS.TEXT_BLACK }
        }
      }
    };

    Logger.log(`${SUCCESS_MESSAGES.STATUS_UPDATED} to ${newStatus} (row ${rowIndex}, with green background)`);
  }

  /**
   * Save Excel file
   */
  saveExcelFile(): ArrayBuffer {
    if (!this.workbook) {
      throw new Error(ERROR_MESSAGES.WORKBOOK_NOT_LOADED);
    }

    const wbout = XLSX.write(this.workbook, { bookType: 'xlsx', type: 'array' });
    Logger.log('Excel file saved to buffer');
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

