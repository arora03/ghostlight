/**
 * Mulberry32 32-bit seeded pseudo-random number generator.
 *
 * Conforms to AGENTS.md rule 2 (determinism: no Math.random() in core).
 * Produces pseudo-random 32-bit floating point numbers in the half-open interval [0, 1).
 *
 * @param seed - An unsigned 32-bit integer between 0 and 4294967295 inclusive.
 * @returns A zero-argument function that yields the next pseudo-random float in [0, 1).
 * @throws {RangeError} If seed is not an integer or is outside [0, 4294967295].
 */
export function createPrng(seed: number): () => number {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) {
    throw new RangeError(
      `Seed must be an integer between 0 and 4294967295 (inclusive), got ${String(seed)}`,
    );
  }

  let state = seed;

  return (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= (t + Math.imul(t ^ (t >>> 7), 61 | t)) | 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
