import { describe, expect, it } from 'vitest';
import { createPrng } from './prng.js';

describe('createPrng (Mulberry32)', () => {
  it('reproducibility: same seed produces identical sequence of 1000 values', () => {
    const prng1 = createPrng(42);
    const prng2 = createPrng(42);

    for (let i = 0; i < 1000; i++) {
      expect(prng1()).toBe(prng2());
    }
  });

  it('different seeds produce different sequences', () => {
    const prngA = createPrng(1);
    const prngB = createPrng(2);

    let identicalCount = 0;
    for (let i = 0; i < 100; i++) {
      if (prngA() === prngB()) {
        identicalCount++;
      }
    }
    expect(identicalCount).toBeLessThan(5);
  });

  it('all generated values lie strictly in the half-open interval [0, 1)', () => {
    const prng = createPrng(987654);
    for (let i = 0; i < 1000; i++) {
      const val = prng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('boundary seeds 0 and 4294967295 (uint32 max) work correctly', () => {
    const prngMin = createPrng(0);
    const minVal = prngMin();
    expect(minVal).toBeGreaterThanOrEqual(0);
    expect(minVal).toBeLessThan(1);

    const prngMax = createPrng(4294967295);
    const maxVal = prngMax();
    expect(maxVal).toBeGreaterThanOrEqual(0);
    expect(maxVal).toBeLessThan(1);
  });

  it('invalid seeds throw RangeError with descriptive messages', () => {
    expect(() => createPrng(NaN)).toThrow(RangeError);
    expect(() => createPrng(Infinity)).toThrow(RangeError);
    expect(() => createPrng(-Infinity)).toThrow(RangeError);
    expect(() => createPrng(1.5)).toThrow(RangeError);
    expect(() => createPrng(-1)).toThrow(RangeError);
    expect(() => createPrng(-100)).toThrow(RangeError);
    expect(() => createPrng(4294967296)).toThrow(RangeError);
    expect(() => createPrng(5000000000)).toThrow(RangeError);
  });

  it('statistical mean of 100,000 values is within 0.5 +/- 0.01', () => {
    const prng = createPrng(777);
    const N = 100_000;
    let sum = 0;
    for (let i = 0; i < N; i++) {
      sum += prng();
    }
    const mean = sum / N;
    expect(mean).toBeGreaterThanOrEqual(0.49);
    expect(mean).toBeLessThanOrEqual(0.51);
  });

  it('golden regression check: matches the pinned first 5 values for seed 12345', () => {
    // Note: These values were produced by this Mulberry32 implementation
    // as a regression guard to ensure generator stability across refactorings,
    // not as an independent reference.
    const expectedFirst5 = [
      0.9797282677609473, 0.3067522644996643, 0.484205421525985, 0.817934412509203,
      0.5094283693470061,
    ];

    const prng = createPrng(12345);
    const actual = Array.from({ length: 5 }, () => prng());

    expect(actual).toEqual(expectedFirst5);
  });
});
