import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(performance.now()), 0) as unknown as number;
  globalThis.cancelAnimationFrame = (handle) => clearTimeout(handle);
}

afterEach(() => cleanup());
