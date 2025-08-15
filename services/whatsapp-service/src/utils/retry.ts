export function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  return new Promise((resolve, reject) => {
    let retries = 0;

    const execute = async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        retries++;

        if (retries >= maxRetries) {
          reject(error);
          return;
        }

        const delay = baseDelay * Math.pow(2, retries - 1);
        setTimeout(execute, delay);
      }
    };

    execute();
  });
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    ),
  ]);
}
