export class QueueFullError extends Error {}
export class JobAbortedError extends Error {}

interface Waiter {
  resolve: (boxId: number) => void;
  reject: (err: Error) => void;
  onAbort?: () => void;
  signal?: AbortSignal;
}

/** Hands out sandbox box IDs. At most `size` jobs run at once; the rest wait in order. */
export class BoxPool {
  readonly size: number;
  private readonly maxWaiting: number;
  private readonly free: number[];
  private readonly waiting: Waiter[] = [];

  // No parameter properties: Node runs this file by stripping types, which does not support them.
  constructor(size: number, maxWaiting: number, firstBoxId = 0) {
    this.size = size;
    this.maxWaiting = maxWaiting;
    this.free = Array.from({ length: size }, (_, i) => firstBoxId + i);
  }

  get stats() {
    return { active: this.size - this.free.length, waiting: this.waiting.length, size: this.size };
  }

  async use<T>(fn: (boxId: number) => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) throw new JobAbortedError("Client disconnected.");
    const boxId = await this.acquire(signal);
    try {
      return await fn(boxId);
    } finally {
      this.release(boxId);
    }
  }

  private acquire(signal?: AbortSignal): Promise<number> {
    if (signal?.aborted) return Promise.reject(new JobAbortedError("Client disconnected."));
    const boxId = this.free.pop();
    if (boxId !== undefined) return Promise.resolve(boxId);
    if (this.waiting.length >= this.maxWaiting) return Promise.reject(new QueueFullError("The judge queue is full. Try again in a few seconds."));
    return new Promise((resolve, reject) => {
      const waiter: Waiter = { resolve, reject, signal };
      if (signal) {
        waiter.onAbort = () => {
          const idx = this.waiting.indexOf(waiter);
          if (idx >= 0) this.waiting.splice(idx, 1);
          reject(new JobAbortedError("Client disconnected."));
        };
        signal.addEventListener("abort", waiter.onAbort, { once: true });
      }
      this.waiting.push(waiter);
    });
  }

  private release(boxId: number) {
    const next = this.waiting.shift();
    if (next) {
      if (next.signal && next.onAbort) next.signal.removeEventListener("abort", next.onAbort);
      next.resolve(boxId);
    } else {
      this.free.push(boxId);
    }
  }
}
