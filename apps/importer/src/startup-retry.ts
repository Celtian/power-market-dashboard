export interface StartupRetry {
  attempt: number;
  delayMs: number;
  reason: string;
}

interface StartupRetryOptions {
  initialDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
}

function failureReason(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String(error.code);
    if (/^[A-Z][A-Z0-9_]+$/.test(code)) return code;
  }
  return error instanceof Error ? error.name : 'UnknownError';
}

export async function retryStartup<T>(
  operation: () => Promise<T>,
  onRetry: (retry: StartupRetry) => void,
  options: StartupRetryOptions = {},
): Promise<T> {
  const initialDelayMs = options.initialDelayMs ?? 1_000;
  const maxDelayMs = options.maxDelayMs ?? 30_000;
  const sleep =
    options.sleep ??
    ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
  let attempt = 1;
  let delayMs = initialDelayMs;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      onRetry({ attempt, delayMs, reason: failureReason(error) });
      await sleep(delayMs);
      attempt += 1;
      delayMs = Math.min(delayMs * 2, maxDelayMs);
    }
  }
}
