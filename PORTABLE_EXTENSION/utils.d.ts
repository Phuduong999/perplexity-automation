import { ButtonState, WaitConfig } from './types';
/**
 * Logger utility with timestamp
 */
export declare class Logger {
    private static prefix;
    static log(message: string, ...args: any[]): void;
    static error(message: string, ...args: any[]): void;
    static warn(message: string, ...args: any[]): void;
    static info(message: string, ...args: any[]): void;
}
/**
 * Wait for an element to appear in the DOM
 * @param selector - CSS selector or multiple selectors (fallback)
 * @param config - Configuration options
 * @returns Promise that resolves with the element
 */
export declare function waitForElement<T extends Element = Element>(selector: string | string[], config?: WaitConfig): Promise<T | null>;
/**
 * Wait for an element to disappear from the DOM
 */
export declare function waitForElementToDisappear(selector: string, config?: WaitConfig): Promise<boolean>;
/**
 * Detect the current state of the submit button
 */
export declare function detectButtonState(): ButtonState;
/**
 * Wait for button to reach a specific state
 */
export declare function waitForButtonState(targetState: ButtonState, config?: WaitConfig): Promise<boolean>;
/**
 * Sleep utility
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Validate element is ready for interaction
 */
export declare function isElementReady(element: Element): boolean;
/**
 * Retry a function with exponential backoff
 */
export declare function retry<T>(fn: () => Promise<T>, options?: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
}): Promise<T>;
//# sourceMappingURL=utils.d.ts.map