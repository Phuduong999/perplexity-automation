/**
 * Application Constants
 * Centralized configuration for the Perplexity Automation Extension
 * Following clean code principles: No magic numbers, clear naming, organized by domain
 */

// ============================================================================
// APPLICATION METADATA
// ============================================================================
export const APP_NAME = 'Perplexity Automation' as const;
export const APP_VERSION = '1.0.0' as const;

// ============================================================================
// URLS & ENDPOINTS
// ============================================================================
export const PERPLEXITY_BASE_URL = 'https://www.perplexity.ai/' as const;
export const PERPLEXITY_URL_PATTERN = 'https://www.perplexity.ai/*' as const;

// ============================================================================
// DOM SELECTORS
// ============================================================================
export const DOM_SELECTORS = {
  // Input elements
  INPUT_ASK: '#ask-input',
  
  // Button selectors (in priority order for fallback)
  SUBMIT_BUTTONS: [
    'button[aria-label="Submit"]',
    'button[data-testid="submit-button"]',
    'button[type="submit"]',
    'form button[type="button"]',
    'button:has(svg)',
    'button[aria-label*="ubmit"]',
    'button.submit'
  ],
  
  // Workflow buttons
  NEW_THREAD_BUTTON: 'button[data-testid="sidebar-new-thread"]',
  STOP_GENERATING_BUTTON: 'button[data-testid="stop-generating-response-button"]',
  VOICE_MODE_BUTTON: 'button[aria-label="Voice mode"]',
  
  // Content elements
  MARKDOWN_CONTENT_PREFIX: 'markdown-content-',
  CODE_ELEMENT: 'code'
} as const;

// ============================================================================
// TIMING CONSTANTS (in milliseconds)
// ============================================================================
export const TIMING = {
  // Short delays
  DELAY_VERY_SHORT: 50,
  DELAY_SHORT: 100,
  DELAY_MEDIUM: 200,
  DELAY_STANDARD: 500,
  
  // Processing delays
  DELAY_BETWEEN_ROWS: 2000,
  DELAY_AFTER_SUBMIT: 500,
  DELAY_PAGE_LOAD: 2000,
  DELAY_PAGE_LOAD_EXTENDED: 3000,
  DELAY_SCRIPT_INIT: 1000,
  DELAY_SCRIPT_INJECT: 1500,
  DELAY_INITIAL_PROMPT: 10000,
  DELAY_AI_START: 5000,
  
  // Polling intervals
  POLL_INTERVAL_FAST: 100,
  POLL_INTERVAL_STANDARD: 500,
  POLL_INTERVAL_SLOW: 2000,
  
  // Timeouts
  TIMEOUT_TAB_READY: 30000,
  TIMEOUT_ELEMENT_WAIT: 30000,
  TIMEOUT_BUTTON_STATE: 60000,
  TIMEOUT_MARKDOWN_WAIT: 60000,
  
  // Retry delays
  RETRY_INITIAL_DELAY: 1000,
  RETRY_MAX_DELAY: 10000,
  RETRY_BACKOFF_MULTIPLIER: 2
} as const;

// ============================================================================
// RETRY & ATTEMPT LIMITS
// ============================================================================
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY: TIMING.RETRY_INITIAL_DELAY,
  MAX_DELAY: TIMING.RETRY_MAX_DELAY,
  BACKOFF_MULTIPLIER: TIMING.RETRY_BACKOFF_MULTIPLIER
} as const;

// ============================================================================
// EXCEL PROCESSING CONFIGURATION
// ============================================================================
export const EXCEL_CONFIG = {
  // File configuration
  PARTS_FOLDER: 'IngredientName/',
  TOTAL_PARTS: 12,
  FILE_NAME_TEMPLATE: 'Food Exclusion Tag_RootFile_Part{PART_NUMBER}.xlsx',
  OUTPUT_SUFFIX: '_PROCESSED.xlsx',
  
  // Processing modes
  TEST_MODE: false,
  ROWS_PER_THREAD_TEST: 5,
  ROWS_PER_THREAD_PRODUCTION: 50,
  
  // Column mapping (Excel columns)
  COLUMNS: {
    ID: 'A',
    STATUS_FROM_BA: 'B',
    STATUS: 'C',
    INGREDIENT_NAME: 'D',
    SKIP: 'E',
    // Tag columns F-N
    TAG_START: 'F',
    TAG_END: 'N'
  },
  
  // Status values
  STATUS: {
    REVIEW: 'REVIEW',
    OK: 'OK',
    NOT_OK: 'NOT-OK'
  },
  
  // Output folders
  OUTPUT_FOLDERS: {
    TEST: 'test',
    PRODUCTION: 'results'
  }
} as const;

// ============================================================================
// EXCEL TAG COLUMNS CONFIGURATION
// ============================================================================
export const TAG_COLUMNS = {
  'F': {
    name: 'Protein Sources',
    tags: ['Beef', 'Pork', 'Chicken', 'Turkey', 'Lamb', 'Fish', 'Shellfish', 'Eggs', 'Dairy']
  },
  'G': {
    name: 'Dairy Alternatives',
    tags: ['Lactose-Free', 'Non-Dairy Milk', 'Non-Dairy Cheese']
  },
  'H': {
    name: 'Grains & Starches',
    tags: ['Wheat', 'Gluten-Free Grains', 'Pasta Alternatives', 'Potatoes', 'Corn']
  },
  'I': {
    name: 'Legumes & Nuts',
    tags: ['Beans', 'Peanuts', 'Tree Nuts', 'Soy', 'Lentils']
  },
  'J': {
    name: 'Vegetables',
    tags: ['Nightshades', 'Cruciferous', 'Leafy Greens', 'Mushrooms', 'Alliums']
  },
  'K': {
    name: 'Fruits',
    tags: ['Citrus', 'Berries', 'Tropical Fruits', 'Stone Fruits', 'Melons']
  },
  'L': {
    name: 'Herbs & Spices',
    tags: ['Dried Herbs & Spices', 'Fresh Herbs', 'Spicy']
  },
  'M': {
    name: 'Miscellaneous',
    tags: ['Sweeteners', 'Alcohol', 'Caffeine']
  },
  'N': {
    name: 'Others (Fallback)',
    tags: ['Other']
  }
} as const;

// ============================================================================
// CHROME STORAGE KEYS
// ============================================================================
export const STORAGE_KEYS = {
  CURRENT_ROW_INDEX: 'excel_current_row_index',
  REVIEW_ROWS: 'excel_review_rows',
  SELECTED_FILES: 'excel_selected_files',
  PROMPT_SENT: 'excel_prompt_sent',
  PERPLEXITY_TAB_ID: 'excel_perplexity_tab_id',
  IS_PROCESSING: 'excel_is_processing',
  TOTAL_ROWS: 'excel_total_rows',
  WORKFLOW_STATE: 'workflowState',
  AUTO_SAVE_RESULTS: 'excel_auto_save_results',
  LAST_SAVE_TIMESTAMP: 'excel_last_save_timestamp',
  PROCESSED_DATA: 'excel_processed_data'
} as const;

// ============================================================================
// UI STYLING CONSTANTS
// ============================================================================
export const UI_STYLES = {
  HIGHLIGHT: {
    BORDER_WIDTH: '3px',
    BOX_SHADOW_BLUR: '10px',
    LABEL_TOP_OFFSET: '-25px',
    LABEL_PADDING: '4px 8px',
    LABEL_BORDER_RADIUS: '4px',
    LABEL_FONT_SIZE: '12px',
    Z_INDEX: 10000
  },
  COLORS: {
    PRIMARY: '#32B8C8',      // Custom brand color for borders and buttons
    INPUT: '#4ECDC4',
    BUTTON_READY: '#28A745',
    BUTTON_THINKING: '#FFC107',
    MARKDOWN: '#9B59B6',
    CODE: '#E74C3C',
    SUCCESS: '#40c057',
    ERROR: '#fa5252',
    WARNING: '#fd7e14',
    INFO: '#339af0',
    SUCCESS_BG: '90EE90',
    TEXT_BLACK: '000000',
    TEXT_WHITE: 'white'
  },
  BORDER_RADIUS: '8px',
  SPACING: {
    SMALL: '8px',
    MEDIUM: '16px',
    LARGE: '24px'
  }
} as const;

// ============================================================================
// LOGGING PREFIXES
// ============================================================================
export const LOG_PREFIXES = {
  BACKGROUND: '[Background]',
  CONTENT: '[Perplexity Automation]',
  WORKFLOW: '[Workflow]'
} as const;

// ============================================================================
// MESSAGE TYPES (for type safety)
// ============================================================================
export const MESSAGE_TYPES = {
  PING: 'PING',
  START_WORKFLOW: 'START_WORKFLOW',
  WORKFLOW_STATUS: 'WORKFLOW_STATUS',
  OPEN_OR_SWITCH_TAB: 'OPEN_OR_SWITCH_TAB',
  OPEN_TAB: 'OPEN_TAB',
  TAB_READY: 'TAB_READY',
  GET_MARKDOWN: 'GET_MARKDOWN',
  NEW_THREAD: 'NEW_THREAD',
  ERROR: 'ERROR'
} as const;

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================
export const VALIDATION = {
  // Prompt verification - minimum acceptable length as percentage
  MIN_PROMPT_LENGTH_RATIO: 0.5,

  // Markdown scanning
  MAX_MARKDOWN_SCAN_INDEX: 10,

  // Excel row validation
  EXCEL_START_ROW: 2, // Skip header row

  // Status normalization patterns
  STATUS_PATTERNS: {
    REVIEW: /^review$/i,
    NOT_OK: /^not[-\s_]?ok[e]?$/i
  }
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================
export const ERROR_MESSAGES = {
  TAB_NOT_FOUND: 'Failed to get tab ID',
  TAB_LOAD_FAILED: 'Tab failed to load',
  TAB_CREATE_FAILED: 'Failed to create tab',
  CONTENT_SCRIPT_NOT_RESPONDING: 'Receiving end does not exist',
  TAB_CLOSED: 'tab closed',
  WORKSHEET_NOT_LOADED: 'Worksheet not loaded',
  WORKBOOK_NOT_LOADED: 'Workbook not loaded',
  INPUT_NOT_FOUND: 'Input not found',
  BUTTON_NOT_FOUND: 'Button not found',
  PROMPT_NOT_SET: 'Prompt not set correctly',
  AI_RESPONSE_FAILED: 'Failed waiting for AI response',
  INVALID_RESPONSE_FORMAT: 'Invalid response format: missing tags array',
  NEW_THREAD_RETRY_NEEDED: 'NEW_THREAD_CREATED_RETRY_NEEDED'
} as const;

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================
export const SUCCESS_MESSAGES = {
  PROMPT_LOADED: 'Loaded prompt from promptForce.md',
  EXCEL_PARSED: 'Parsed Excel file',
  CONTENT_SCRIPT_INJECTED: 'Content script injected',
  NEW_THREAD_CREATED: 'New thread created successfully',
  TAGS_WRITTEN: 'Wrote tags to row',
  STATUS_UPDATED: 'Updated row status'
} as const;

// ============================================================================
// WORKFLOW STEP IDS
// ============================================================================
export const WORKFLOW_STEPS = {
  ANALYZE_DOM: 'analyze_dom',
  SEND_PROMPT: 'send_prompt',
  CLICK_SUBMIT: 'click_submit',
  WAIT_THINKING: 'wait_thinking',
  EXTRACT_CONTENT: 'extract_content',
  COMPLETED: 'completed',
  FAILED: 'failed',
  IDLE: 'idle'
} as const;

// ============================================================================
// KEYBOARD EVENT CODES
// ============================================================================
export const KEYBOARD = {
  ENTER: {
    KEY: 'Enter',
    CODE: 'Enter',
    KEY_CODE: 13,
    WHICH: 13
  }
} as const;

// ============================================================================
// COMPUTED VALUES (derived from other constants)
// ============================================================================
export const COMPUTED = {
  // Get rows per thread based on test mode
  get ROWS_PER_THREAD(): number {
    return EXCEL_CONFIG.TEST_MODE
      ? EXCEL_CONFIG.ROWS_PER_THREAD_TEST
      : EXCEL_CONFIG.ROWS_PER_THREAD_PRODUCTION;
  },

  // Get output folder based on test mode
  get OUTPUT_FOLDER(): string {
    return EXCEL_CONFIG.TEST_MODE
      ? EXCEL_CONFIG.OUTPUT_FOLDERS.TEST
      : EXCEL_CONFIG.OUTPUT_FOLDERS.PRODUCTION;
  },

  // Generate file name for a specific part
  getFileName(partNumber: number): string {
    return EXCEL_CONFIG.FILE_NAME_TEMPLATE.replace('{PART_NUMBER}', partNumber.toString());
  },

  // Get markdown content ID
  getMarkdownId(index: number): string {
    return `${DOM_SELECTORS.MARKDOWN_CONTENT_PREFIX}${index}`;
  }
} as const;

// ============================================================================
// FILE SYSTEM PATHS
// ============================================================================
export const FILE_PATHS = {
  // Desktop folder name
  DESKTOP_FOLDER_NAME: 'PerplexityAutomation',
  RESULTS_SUBFOLDER: 'results',
  AUTO_SAVE_FILENAME: 'auto_save_results.json',

  // Get desktop path based on OS
  getDesktopPath: (): string => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMac = userAgent.includes('mac');
    const isWindows = userAgent.includes('win');

    if (isMac) {
      return `~/Desktop/${FILE_PATHS.DESKTOP_FOLDER_NAME}`;
    } else if (isWindows) {
      return `%USERPROFILE%\\Desktop\\${FILE_PATHS.DESKTOP_FOLDER_NAME}`;
    } else {
      return `~/Desktop/${FILE_PATHS.DESKTOP_FOLDER_NAME}`;
    }
  },

  // Get full results path
  getResultsPath: (): string => {
    return `${FILE_PATHS.getDesktopPath()}/${FILE_PATHS.RESULTS_SUBFOLDER}`;
  }
} as const;

