import { describe, expect, it } from 'vitest';
import { VERSION } from './index.js';

describe('VERSION', () => {
  it('is a string', () => {
    expect(typeof VERSION).toBe('string');
  });
});
