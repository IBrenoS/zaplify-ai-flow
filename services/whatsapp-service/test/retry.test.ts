import { describe, expect, it } from 'vitest';
import { retryWithExponentialBackoff, withTimeout } from '../src/utils/retry.js';

describe('Retry Utilities', () => {
  it('should succeed on first try', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      return 'success';
    };

    const result = await retryWithExponentialBackoff(fn, 3);
    expect(result).toBe('success');
    expect(attempts).toBe(1);
  });

  it('should retry on failure', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('fail');
      }
      return 'success';
    };

    const result = await retryWithExponentialBackoff(fn, 3);
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should timeout after specified time', async () => {
    const slowFn = () => new Promise(resolve => setTimeout(resolve, 1000));

    await expect(withTimeout(slowFn(), 100)).rejects.toThrow('Operation timed out');
  });
});
