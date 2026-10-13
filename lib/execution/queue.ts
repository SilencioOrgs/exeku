export class QueueFullError extends Error {
  constructor(message = "Execution queue is at full capacity. Please retry shortly.") {
    super(message);
    this.name = "QueueFullError";
  }
}

export interface ExecutionQueueOptions {
  maxConcurrency?: number;
  maxQueueLength?: number;
}

interface QueuedTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

export class ExecutionQueue {
  private readonly maxConcurrency: number;
  private readonly maxQueueLength: number;
  private activeCount: number = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queue: QueuedTask<any>[] = [];

  constructor(options?: ExecutionQueueOptions) {
    this.maxConcurrency = options?.maxConcurrency ?? 4;
    this.maxQueueLength = options?.maxQueueLength ?? 50;
  }

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    if (this.queue.length >= this.maxQueueLength) {
      throw new QueueFullError(
        `Server execution queue is saturated (${this.queue.length}/${this.maxQueueLength} waiting). Please retry in a few seconds.`
      );
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn: task, resolve, reject });
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
        this.processNext();
      });
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
