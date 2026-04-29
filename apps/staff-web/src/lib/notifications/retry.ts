/**
 * Retry configuration — SPEC-NOTIFICATIONS-001 L14
 *
 * L14: Exponential backoff policy: 1 minute, 5 minutes, 30 minutes.
 * After 3 failures, dispatch transitions to terminal 'failed' status.
 * The scheduler is a v1.1 server-side concern; v1 simulates via store action.
 */

export const RETRY_BACKOFF_MINUTES = [1, 5, 30] as const;
export const MAX_RETRY_COUNT = 3;

/**
 * Returns the backoff delay in milliseconds for a given retry attempt (0-indexed).
 * Attempt 0 → 1 min, Attempt 1 → 5 min, Attempt 2 → 30 min.
 * L14: exponential backoff per Doc 13 §2 BSP retry policy.
 */
export function getBackoffMs(retryAttempt: number): number {
  const minutes = RETRY_BACKOFF_MINUTES[retryAttempt] ?? RETRY_BACKOFF_MINUTES[2]!;
  return minutes * 60 * 1000;
}

/**
 * Returns the ISO timestamp when the next retry should fire.
 * L14: calculated from current time + backoff for given attempt.
 */
export function getNextRetryAt(retryAttempt: number, fromNow: Date = new Date()): string {
  const delayMs = getBackoffMs(retryAttempt);
  return new Date(fromNow.getTime() + delayMs).toISOString();
}

/**
 * Whether a dispatch has reached the terminal failure state.
 * L14: terminal after 3 failures — no more retries.
 */
export function isTerminalFailure(retryCount: number): boolean {
  return retryCount >= MAX_RETRY_COUNT;
}
