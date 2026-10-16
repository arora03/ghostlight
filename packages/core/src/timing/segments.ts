import { decodeMorse, type DecodeError } from '../morse/decode.js';
import { err, ok, type Result } from '../result.js';

/**
 * An on/off duration segment in the Morse timing model.
 */
export interface Segment {
  readonly on: boolean;
  readonly units: number;
}

/**
 * Error returned when an invalid words-per-minute speed is provided.
 */
export interface InvalidWpmError {
  readonly code: 'INVALID_WPM';
}

/**
 * Computes the total duration in timing units across a sequence of segments.
 *
 * @param segments - Array of timing segments.
 * @returns Total number of units.
 */
export function totalUnits(segments: readonly Segment[]): number {
  let sum = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg !== undefined) {
      sum += seg.units;
    }
  }
  return sum;
}

/**
 * Converts a words-per-minute (WPM) transmission rate into the duration of a single unit in seconds,
 * according to the international standard PARIS reference word (50 units per word).
 *
 * Formula: unitSeconds = 60 / (50 * WPM) = 1.2 / WPM.
 *
 * @param wpm - Speed in words per minute. Must be finite and between 5 and 60 inclusive.
 * @returns A Result containing unit duration in seconds, or an InvalidWpmError.
 */
export function unitSecondsFromWpm(wpm: number): Result<number, InvalidWpmError> {
  if (!Number.isFinite(wpm) || wpm < 5 || wpm > 60) {
    return err({ code: 'INVALID_WPM' });
  }
  return ok(1.2 / wpm);
}

/**
 * Converts a valid Morse code string into an alternating sequence of on/off timing segments.
 *
 * Timing unit rules (ITU-R M.1677-1):
 * - Dot: 1 unit on
 * - Dash: 3 units on
 * - Intra-character symbol gap: 1 unit off
 * - Inter-character letter gap: 3 units off
 * - Inter-word word gap: 7 units off
 *
 * Segments strictly alternate on/off, with no leading or trailing off segments.
 * The input is validated using `decodeMorse`; any error returned by `decodeMorse` is returned directly.
 *
 * @param morse - The Morse code string to convert.
 * @returns A Result containing the array of timing segments, or the exact DecodeError.
 */
export function morseToSegments(morse: string): Result<readonly Segment[], DecodeError> {
  const decodeResult = decodeMorse(morse);
  if (!decodeResult.ok) {
    return err(decodeResult.error);
  }

  const words = morse.split(' / ');
  const segments: Segment[] = [];

  for (let w = 0; w < words.length; w++) {
    if (w > 0) {
      segments.push({ on: false, units: 7 });
    }
    const word = words[w];
    if (word === undefined) {
      continue;
    }
    const letters = word.split(' ');
    for (let l = 0; l < letters.length; l++) {
      if (l > 0) {
        segments.push({ on: false, units: 3 });
      }
      const letter = letters[l];
      if (letter === undefined) {
        continue;
      }
      for (let s = 0; s < letter.length; s++) {
        if (s > 0) {
          segments.push({ on: false, units: 1 });
        }
        const sym = letter[s];
        if (sym === '.') {
          segments.push({ on: true, units: 1 });
        } else if (sym === '-') {
          segments.push({ on: true, units: 3 });
        }
      }
    }
  }

  return ok(segments);
}
