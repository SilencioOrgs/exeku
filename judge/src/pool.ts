export class QueueFullError extends Error {}

/** Hands out sandbox box IDs. At most `size` jobs run at once; the rest wait in order. */
export class BoxPool {
  readonly size: number;
  private readonly maxWaiting: number;
  private readonly free: number[];
  private readonly waiting: Array<(boxId: number) => void> = [];

  // No parameter properties: Node runs this file by stripping types, which does not support them.
  constructor(size: number, maxWaiting: number, firstBoxId = 0) {
    this.size = size;
    this.maxWaiting = maxWaiting;
    this.free = Array.from({ length: size }, (_, i) => firstBoxId + i);
  }

  get stats() {
    return { active: this.size - this.free.length, waiting: this.waiting.length, size: this.size };
  }

  async use<T>(fn: (boxId: number) => Promise<T>): Promise<T> {
    const boxId = await this.acquire();
    try {
      return await fn(boxId);
    } finally {
      this.release(boxId);
    }
  }

  private acquire(): Promise<number> {
    const boxId = this.free.pop();
    if (boxId !== undefined) return Promise.resolve(boxId);
    if (this.waiting.length >= this.maxWaiting) return Promise.reject(new QueueFullError("The judge queue is full. Try again in a few seconds."));
    return new Promise((resolve) => this.waiting.push(resolve));
  }

  private release(boxId: number) {
    const next = this.waiting.shift();
    if (next) next(boxId);
    else this.free.push(boxId);
  }
}
