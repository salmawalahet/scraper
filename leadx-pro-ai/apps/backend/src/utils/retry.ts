export async function retry<T>(fn: () => Promise<T>, attempts = 3, baseDelay = 500): Promise<T> {
  let lastError: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      // Retry on rate‑limit (429) or server errors (5xx)
      if (err.status === 429 || (err.status >= 500 && err.status < 600)) {
        lastError = err;
        const delay = baseDelay * 2 ** i;
        await new Promise(res => setTimeout(res, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
