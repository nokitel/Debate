/**
 * Transaction queue with concurrency control.
 * Limits the number of simultaneous blockchain transactions to avoid nonce issues.
 */

const MAX_CONCURRENT = 10;

/** Simple semaphore for controlling transaction concurrency. */
class TransactionSemaphore {
  private current = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly max: number) {}

  /** Acquire a slot. Resolves when a slot is available. */
  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  /** Release a slot, unblocking the next waiter if any. */
  release(): void {
    const next = this.waiters.shift();
    if (next) {
      next();
    } else {
      this.current--;
    }
  }

  /** Current number of active slots. */
  get activeCount(): number {
    return this.current;
  }

  /** Number of tasks waiting for a slot. */
  get waitingCount(): number {
    return this.waiters.length;
  }
}

const semaphore = new TransactionSemaphore(MAX_CONCURRENT);

/**
 * Execute an async function with transaction queue concurrency control.
 * At most MAX_CONCURRENT (10) operations run simultaneously.
 *
 * @param fn - The async function to execute within the queue.
 * @returns The result of the function.
 */
export async function withTransactionQueue<T>(fn: () => Promise<T>): Promise<T> {
  await semaphore.acquire();
  try {
    return await fn();
  } finally {
    semaphore.release();
  }
}

/**
 * Get queue stats for monitoring.
 */
export function getQueueStats(): { active: number; waiting: number } {
  return {
    active: semaphore.activeCount,
    waiting: semaphore.waitingCount,
  };
}
