export class QueueFullError extends Error {
  constructor(message = "Execution queue is at full capacity. Please retry shortly.") {
    super(message);
    this.name = "QueueFullError";
  }
}

export interface ExecutionQueueOptions {
  maxConcurrency?: number;
  maxQueueLength?: number;
  maxPerClient?: number;
}

/**
 * Who a request counts against for the per-client limit.
 * shortcut: IP-based, so students behind one school connection share a limit; move the key to the signed-in user id when real accounts exist.
 */
export function clientKeyFrom(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip")?.trim() || "local";
}

interface QueuedTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  clientKey?: string;
}

export class ExecutionQueue {
  private readonly maxConcurrency: number;
  private readonly maxQueueLength: number;
  private readonly maxPerClient: number;
  /** Active plus waiting runs per client. Entries are removed at zero, so this cannot grow without bound. */
  private readonly clientCounts = new Map<string, number>();
  private activeCount: number = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queue: QueuedTask<any>[] = [];

  constructor(options?: ExecutionQueueOptions) {
    this.maxConcurrency = options?.maxConcurrency ?? 4;
    this.maxQueueLength = options?.maxQueueLength ?? 50;
    this.maxPerClient = options?.maxPerClient ?? 2;
  }

  async enqueue<T>(task: () => Promise<T>, clientKey?: string): Promise<T> {
    const held = clientKey ? this.clientCounts.get(clientKey) ?? 0 : 0;
    if (held >= this.maxPerClient) {
      throw new QueueFullError(`You already have ${held} runs in progress. Wait for one to finish, then try again.`);
    }

    if (this.queue.length >= this.maxQueueLength) {
      throw new QueueFullError(
        `Server execution queue is saturated (${this.queue.length}/${this.maxQueueLength} waiting). Please retry in a few seconds.`
      );
    }

    if (clientKey) this.clientCounts.set(clientKey, held + 1);

    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn: task, resolve, reject, clientKey });
      this.processNext();
    });
  }

  private processNext(): void {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const nextTask = this.queue.shift();
    if (!nextTask) return;

    this.activeCount++;

    nextTask
      .fn()
      .then((res) => {
        nextTask.resolve(res);
      })
      .catch((err) => {
        nextTask.reject(err);
      })
      .finally(() => {
        this.activeCount--;
        this.releaseClient(nextTask.clientKey);
        this.processNext();
      });
  }

  private releaseClient(clientKey?: string): void {
    if (!clientKey) return;
    const held = (this.clientCounts.get(clientKey) ?? 1) - 1;
    if (held > 0) this.clientCounts.set(clientKey, held);
    else this.clientCounts.delete(clientKey);
  }

  getStats(): {
    activeCount: number;
    waitingCount: number;
    maxConcurrency: number;
    maxQueueLength: number;
  } {
    return {
      activeCount: this.activeCount,
      waitingCount: this.queue.length,
      maxConcurrency: this.maxConcurrency,
      maxQueueLength: this.maxQueueLength,
    };
  }
}

export const globalExecutionQueue = new ExecutionQueue({
  maxConcurrency: 4,
  maxQueueLength: 50,
});
