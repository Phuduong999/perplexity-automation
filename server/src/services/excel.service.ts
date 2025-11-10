/**
 * Excel Processing Service
 * Handles Excel file parsing, processing, and generation
 */

import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import config from '../config';
import { createLogger } from '../utils/logger';
import { ValidationError, InternalServerError } from '../utils/errors';

const logger = createLogger('excel-service');
const prisma = new PrismaClient();

interface ExcelRow {
  rowIndex: number;
  ingredientId: string | null;
  status: string;
  name: string;
}

interface ProcessedRow {
  rowIndex: number;
  ingredientId: string | null;
  ingredientName: string;
  originalStatus: string;
  newStatus: string;
  tags: string[];
  success: boolean;
  errorMessage?: string;
}

export class ExcelService {
  private workbook: XLSX.WorkBook | null = null;
  private worksheet: XLSX.WorkSheet | null = null;

  /**
   * Parse Excel file from buffer
   */
  parseExcelFromBuffer(buffer: Buffer): void {
    try {
      this.workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = this.workbook.SheetNames[0];
      this.worksheet = this.workbook.Sheets[sheetName];

      if (!this.worksheet) {
        throw new ValidationError('No worksheet found in Excel file');
      }

      logger.info('Excel file parsed successfully');
    } catch (error) {
      logger.error('Excel parsing error:', error);
      throw new ValidationError('Failed to parse Excel file');
    }
  }

  /**
   * Get all rows that need review
   */
  getReviewRows(): ExcelRow[] {
    if (!this.worksheet) {
      throw new InternalServerError('No worksheet loaded');
    }

    const rows: ExcelRow[] = [];
    const range = XLSX.utils.decode_range(this.worksheet['!ref'] || 'A1');

    // Start from row 2 (skip header)
    for (let rowNum = 2; rowNum <= range.e.r + 1; rowNum++) {
      const statusCell = this.worksheet[`${config.excel.columns.STATUS}${rowNum}`];
      const nameCell = this.worksheet[`${config.excel.columns.INGREDIENT_NAME}${rowNum}`];
      const idCell = this.worksheet[`${config.excel.columns.ID}${rowNum}`];

      if (!statusCell || !nameCell) {
        continue;
      }

      const status = statusCell.v?.toString().trim();
      const name = nameCell.v?.toString().trim();

      if (status === config.excel.statusValues.REVIEW && name) {
        rows.push({
          rowIndex: rowNum,
          ingredientId: idCell?.v?.toString() || null,
          status,
          name,
        });
      }
    }

    logger.info(`Found ${rows.length} rows to review`);
    return rows;
  }

  /**
   * Map tags to Excel columns
   */
  mapTagsToColumns(tags: string[]): Record<string, string> {
    const mappedColumns: Record<string, string> = {};
    const tagColumns = config.excel.tagColumns;

    for (const tag of tags) {
      let matched = false;

      // Try to match tag to a column
      for (const [column, columnData] of Object.entries(tagColumns)) {
        if (columnData.tags.includes(tag)) {
          mappedColumns[column] = tag;
          matched = true;
          break;
        }
      }

      // If no match, put in fallback column
      if (!matched) {
        mappedColumns[config.excel.columns.TAG_END] = tag;
      }
    }

    return mappedColumns;
  }

  /**
   * Write tags to a specific row
   */
  writeTagsToRow(rowIndex: number, mappedColumns: Record<string, string>): void {
    if (!this.worksheet) {
      throw new InternalServerError('No worksheet loaded');
    }

    // Clear existing tags (columns F-N)
    const startCol = config.excel.columns.TAG_START.charCodeAt(0);
    const endCol = config.excel.columns.TAG_END.charCodeAt(0);

    for (let col = startCol; col <= endCol; col++) {
      const cellAddress = `${String.fromCharCode(col)}${rowIndex}`;
      delete this.worksheet[cellAddress];
    }

    // Write new tags
    for (const [column, value] of Object.entries(mappedColumns)) {
      const cellAddress = `${column}${rowIndex}`;
      this.worksheet[cellAddress] = { v: value, t: 's' };
    }

    logger.debug(`Tags written to row ${rowIndex}`);
  }

  /**
   * Update row status
   */
  updateRowStatus(rowIndex: number, status: string): void {
    if (!this.worksheet) {
      throw new InternalServerError('No worksheet loaded');
    }

    const cellAddress = `${config.excel.columns.STATUS}${rowIndex}`;
    this.worksheet[cellAddress] = { v: status, t: 's' };

    // Add green background for OK status
    if (status === config.excel.statusValues.OK) {
      if (!this.worksheet[cellAddress].s) {
        this.worksheet[cellAddress].s = {};
      }
      this.worksheet[cellAddress].s.fgColor = { rgb: '90EE90' };
    }

    logger.debug(`Row ${rowIndex} status updated to ${status}`);
  }

  /**
   * Save Excel file to buffer
   */
  saveExcelFile(): Buffer {
    if (!this.workbook) {
      throw new InternalServerError('No workbook loaded');
    }

    try {
      const buffer = XLSX.write(this.workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      });

      logger.info('Excel file saved to buffer');
      return buffer;
    } catch (error) {
      logger.error('Excel save error:', error);
      throw new InternalServerError('Failed to save Excel file');
    }
  }
}

export default ExcelService;

