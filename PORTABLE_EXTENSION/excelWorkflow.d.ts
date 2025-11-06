interface ExcelRow {
    rowIndex: number;
    _id: string;
    status: string;
    name: string;
}
/**
 * Excel Workflow Manager
 */
export declare class ExcelWorkflowManager {
    private filePath;
    private workbook;
    private worksheet;
    private promptContent;
    private processedCount;
    constructor(filePath: string);
    /**
     * Load prompt from promptForce.md
     */
    loadPrompt(): Promise<void>;
    /**
     * Read Excel file
     */
    readExcelFile(): Promise<void>;
    /**
     * Parse Excel workbook from ArrayBuffer
     */
    parseExcelFromBuffer(buffer: ArrayBuffer): void;
    /**
     * Get rows with REVIEW status
     * Supports multiple status variants (case-insensitive):
     * - REVIEW, review
     * - NOT-OK, not-ok, not-oke, not ok, NOT OK, etc.
     */
    getReviewRows(): ExcelRow[];
    /**
     * Format input for AI - Only send ingredient name
     */
    formatInput(row: ExcelRow): string;
    /**
     * Parse AI response (JSON from code block)
     */
    parseAIResponse(response: string): string[];
    /**
     * Map tags to Excel columns
     */
    mapTagsToColumns(tags: string[]): {
        [column: string]: string;
    };
    /**
     * Clear all tag columns (F-N) for a row before writing new tags
     */
    clearTagColumns(rowIndex: number): void;
    /**
     * Write tags to Excel row (after clearing old tags)
     */
    writeTagsToRow(rowIndex: number, mappedColumns: {
        [column: string]: string;
    }): void;
    /**
     * Update status to OK (processed successfully)
     */
    updateRowStatus(rowIndex: number, newStatus?: string): void;
    /**
     * Save Excel file
     */
    saveExcelFile(): ArrayBuffer;
    /**
     * Get processing statistics
     */
    getStats(): {
        processedCount: number;
    };
}
export {};
//# sourceMappingURL=excelWorkflow.d.ts.map