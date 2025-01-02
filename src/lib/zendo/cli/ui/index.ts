import chalk from "chalk";
import ora, { type Ora } from "ora";
import { isCI } from "ci-info";

// Check if we're in a TTY environment (not piped/redirected)
const isTTY = process.stdout.isTTY && !isCI;

/**
 * Color utilities for consistent styling
 */
export const colors = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  muted: chalk.gray,
  brand: chalk.cyan,
  dim: chalk.dim,
};

/**
 * Icons for different message types
 */
export const icons = {
  success: "✓",
  error: "✗",
  warning: "⚠",
  info: "ℹ",
  spinner: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
};

/**
 * Creates a spinner instance
 */
export function createSpinner(text: string): Ora {
  return ora({
    text,
    spinner: isTTY ? "dots" : undefined,
    color: "cyan",
  });
}

/**
 * Step indicator (e.g., "Step 1/4")
 */
export function stepIndicator(step: number, total: number, message: string): string {
  return colors.muted(`Step ${step}/${total}: `) + colors.info(message);
}

/**
 * Success message
 */
export function success(message: string): void {
  console.log(colors.success(`${icons.success} ${message}`));
}

/**
 * Error message
 */
export function error(message: string, details?: string, verbose = false): void {
  console.error(colors.error(`${icons.error} ${message}`));
  if (details) {
    if (verbose) {
      console.error(colors.dim(details));
    } else {
      console.error(colors.muted("Run with --verbose for more details"));
    }
  }
}

/**
 * Warning message
 */
export function warning(message: string): void {
  console.warn(colors.warning(`${icons.warning} ${message}`));
}

/**
 * Info message
 */
export function info(message: string): void {
  console.log(colors.info(`${icons.info} ${message}`));
}

/**
 * Muted/quiet message
 */
export function muted(message: string): void {
  console.log(colors.muted(message));
}

/**
 * Summary output showing what was completed
 */
export function summary(items: Array<{ label: string; value: string | number }>): void {
  console.log("\n" + colors.brand.bold("Summary:"));
  items.forEach(({ label, value }) => {
    console.log(`  ${colors.muted(label)}: ${colors.success(value)}`);
  });
}

/**
 * Execute an async operation with a spinner
 */
export async function withSpinner<T>(
  text: string,
  operation: () => Promise<T>,
  successText?: string | ((result: T) => string)
): Promise<T> {
  const spinner = createSpinner(text);
  spinner.start();

  try {
    const result = await operation();
    const finalSuccessText = typeof successText === "function" ? successText(result) : successText || text;
    // succeed() will stop the spinner and print the success message on a new line
    spinner.succeed(finalSuccessText);
    return result;
  } catch (err) {
    // fail() will stop the spinner and print the error message on a new line
    spinner.fail(text);
    throw err;
  }
}

/**
 * Execute an async operation with a spinner that can be updated with progress
 */
export async function withSpinnerAndProgress<T>(
  baseText: string,
  operation: (updateText: (text: string) => void) => Promise<T>,
  successText?: string | ((result: T) => string)
): Promise<T> {
  const spinner = createSpinner(baseText);
  spinner.start();

  try {
    const result = await operation((text) => {
      spinner.text = text;
    });
    const finalSuccessText = typeof successText === "function" ? successText(result) : successText || baseText;
    spinner.succeed(finalSuccessText);
    return result;
  } catch (err) {
    spinner.fail(baseText);
    throw err;
  }
}

/**
 * Execute multiple operations with spinner-based progress tracking
 */
export async function withSpinnerAndItemProgress<T, R>(
  baseText: string,
  items: T[],
  processor: (item: T, index: number, updateProgress: (current: number, total: number) => void) => Promise<R>,
  successText?: string | ((results: R[]) => string)
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const spinner = createSpinner(baseText);
  spinner.start();

  const results: R[] = [];
  const total = items.length;

  try {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item === undefined) continue;

      const updateProgress = (current: number, total: number) => {
        spinner.text = `${baseText}... ${current}/${total}`;
      };

      const result = await processor(item, i, updateProgress);
      results.push(result);

      // Update spinner with current progress
      spinner.text = `${baseText}... ${i + 1}/${total}`;
    }

    const finalSuccessText =
      typeof successText === "function" ? successText(results) : successText || `${baseText} (${total} items)`;
    spinner.succeed(finalSuccessText);
    return results;
  } catch (err) {
    spinner.fail(baseText);
    throw err;
  }
}
