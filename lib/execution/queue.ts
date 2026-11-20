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
  maxPerIp?: number;
}

/** Who a run counts against: `key` for the per-student limit, `ip` for the per-network cap. */
export interface QueueClient {
  key: string;
  ip: string;
}

/** Forwarded addresses can be faked, so they are read only when TRUST_PROXY=1 (Vercel or a proxy that overwrites them). */
export function clientFrom(headers: Headers, userId: string, env: Record<string, string | undefined> = process.env): QueueClient {
  if (env.TRUST_PROXY !== "1") return { ip: "local", key: userId };
  const realIp = headers.get("x-real-ip")?.trim();
  const xffParts = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  // Take the rightmost proxy-appended client IP when x-real-ip is not provided.
  const ip = realIp || xffParts[xffParts.length - 1] || "local";
  return { ip, key: userId };
}

/** Adds to a counter, and removes it at zero so the map cannot grow without bound. */
function adjust(counts: Map<string, number>, key: string, change: number): void {
  const next = (counts.get(key) ?? 0) + change;
  if (next > 0) counts.set(key, next);
  else counts.delete(key);
}

interface QueuedTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  client?: QueueClient;
}

export class ExecutionQueue {
  private readonly maxConcurrency: number;
  private readonly maxQueueLength: number;
  private readonly maxPerClient: number;
  private readonly maxPerIp: number;
  /** Active plus waiting runs. */
  private readonly clientCounts = new Map<string, number>();
  private readonly ipCounts = new Map<string, number>();
  private activeCount: number = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queue: QueuedTask<any>[] = [];

  constructor(options?: ExecutionQueueOptions) {
    this.maxConcurrency = options?.maxConcurrency ?? 4;
    this.maxQueueLength = options?.maxQueueLength ?? 50;
    this.maxPerClient = options?.maxPerClient ?? 2;
    this.maxPerIp = options?.maxPerIp ?? 60;
  }

  async enqueue<T>(task: () => Promise<T>, client?: QueueClient): Promise<T> {
    if (client) {
      const held = this.clientCounts.get(client.key) ?? 0;
      if (held >= this.maxPerClient) {
        throw new QueueFullError(`You already have ${held} runs in progress. Wait for one to finish, then try again.`);
      }
      if (client.ip !== "local") {
        const onNetwork = this.ipCounts.get(client.ip) ?? 0;
        if (onNetwork >= this.maxPerIp) {
          throw new QueueFullError(`This network already has ${onNetwork} runs in progress. Please retry in a few seconds.`);
        }
      }
    }

    if (this.queue.length >= this.maxQueueLength) {
      throw new QueueFullError(
        `Server execution queue is saturated (${this.queue.length}/${this.maxQueueLength} waiting). Please retry in a few seconds.`
      );
    }

    if (client) {
      adjust(this.clientCounts, client.key, 1);
      if (client.ip !== "local") adjust(this.ipCounts, client.ip, 1);
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn: task, resolve, reject, client });
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

    Promise.resolve()
      .then(() => nextTask.fn())
      .then((res) => {
        nextTask.resolve(res);
      })
      .catch((err) => {
        nextTask.reject(err);
      })
      .finally(() => {
        this.activeCount--;
        if (nextTask.client) {
          adjust(this.clientCounts, nextTask.client.key, -1);
          if (nextTask.client.ip !== "local") adjust(this.ipCounts, nextTask.client.ip, -1);
        }
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

const configuredConcurrency = Number(process.env.JUDGE_CONCURRENCY);
export const globalExecutionQueue = new ExecutionQueue({
  maxConcurrency: Number.isFinite(configuredConcurrency) && configuredConcurrency >= 1 ? Math.floor(configuredConcurrency) : 4,
  maxQueueLength: 50,
  maxPerIp: 60,
});
