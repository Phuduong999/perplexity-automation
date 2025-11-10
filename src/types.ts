/**
 * Button states for Perplexity AI submit button
 */
export enum ButtonState {
  READY = 'READY',           // Voice mode button visible - ready to submit
  LOADING = 'LOADING',       // Processing/loading state
  DISABLED = 'DISABLED',     // Disabled state - response complete
  NOT_FOUND = 'NOT_FOUND'    // Button not found
}

/**
 * Workflow step status
 */
export enum StepStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

/**
 * Message types for communication between scripts
 */
export enum MessageType {
  START_WORKFLOW = 'START_WORKFLOW',
  WORKFLOW_STATUS = 'WORKFLOW_STATUS',
  OPEN_OR_SWITCH_TAB = 'OPEN_OR_SWITCH_TAB',
  OPEN_TAB = 'OPEN_TAB',
  TAB_READY = 'TAB_READY',
  GET_MARKDOWN = 'GET_MARKDOWN',
  NEW_THREAD = 'NEW_THREAD',
  ERROR = 'ERROR',
  GET_STATE = 'GET_STATE',
  CREATE_THREAD = 'CREATE_THREAD',
  START_PROCESSING = 'START_PROCESSING',
  STOP_PROCESSING = 'STOP_PROCESSING'
}

/**
 * Workflow state
 */
export interface WorkflowState {
  currentStep: string;
  status: StepStatus;
  error?: string;
  timestamp: number;
}

/**
 * Message structure
 */
export interface Message {
  type: MessageType;
  payload?: any;
}

/**
 * Configuration for element waiting
 */
export interface WaitConfig {
  timeout?: number;
  checkInterval?: number;
  throwOnTimeout?: boolean;
}

