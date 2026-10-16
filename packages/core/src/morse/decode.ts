import { err, ok, type Result } from '../result.js';
import { REVERSE_MORSE_TABLE } from './table.js';

/**
 * Error returned when the input string to decode is empty.
 */
export interface EmptyInputError {
  readonly code: 'EMPTY_INPUT';
}

/**
 * Error returned when an unexpected character other than '.', '-', ' ', or '/' is encountered.
 */
export interface InvalidSymbolError {
  readonly code: 'INVALID_SYMBOL';
  readonly index: number;
  readonly symbol: string;
}

/**
 * Error returned when word or letter separators are malformed.
 */
export interface MalformedSeparatorError {
  readonly code: 'MALFORMED_SEPARATOR';
  readonly index: number;
}

/**
 * Error returned when a dot-dash sequence is not present in the Morse reference table.
 */
export interface UnknownPatternError {
  readonly code: 'UNKNOWN_PATTERN';
  readonly index: number;
  readonly pattern: string;
}

/**
 * Union of possible errors encountered while decoding Morse code into text.
 */
export type DecodeError =
  | EmptyInputError
  | InvalidSymbolError
  | MalformedSeparatorError
  | UnknownPatternError;

/**
 * Decodes a Morse code string into uppercase plain text according to strict grammar.
 *
 * Grammar:
 * ```
 * word ( " / " word )*
 * where:
 *   word = letter ( " " letter )*
 *   letter = one or more of "." or "-"
 * ```
 *
 * Output is uppercase text with single spaces between words.
 *
 * Errors returned with first offending character index:
 * - `EMPTY_INPUT`: Input is empty.
 * - `INVALID_SYMBOL`: Character other than '.', '-', ' ', '/'.
 * - `MALFORMED_SEPARATOR`: Leading/trailing spaces, double spaces, '/' without space on both sides, or empty words.
 * - `UNKNOWN_PATTERN`: Dot/dash pattern not found in ITU-R reference table.
 *
 * @param morse - The Morse code string to decode.
 * @returns A Result containing the decoded plain text on success, or a DecodeError on failure.
 */
export function decodeMorse(morse: string): Result<string, DecodeError> {
  if (morse.length === 0) {
    return err({ code: 'EMPTY_INPUT' });
  }

  const firstChar = morse[0];
  if (firstChar === ' ' || firstChar === '/') {
    return err({ code: 'MALFORMED_SEPARATOR', index: 0 });
  }

  const words: string[] = [];
  let currentWordChars: string[] = [];
  let patternStart = 0;
  let i = 0;

  while (i < morse.length) {
    const ch = morse[i];
    if (ch === undefined) {
      break;
    }

    // Validate symbol
    if (ch !== '.' && ch !== '-' && ch !== ' ' && ch !== '/') {
      return err({ code: 'INVALID_SYMBOL', index: i, symbol: ch });
    }

    if (ch === '.' || ch === '-') {
      i++;
      continue;
    }

    // Encountered separator character ('/' without preceding space)
    if (ch === '/') {
      return err({ code: 'MALFORMED_SEPARATOR', index: i });
    }

    // ch is ' '
    const pattern = morse.slice(patternStart, i);
    const decodedChar = REVERSE_MORSE_TABLE[pattern];
    if (decodedChar === undefined) {
      return err({ code: 'UNKNOWN_PATTERN', index: patternStart, pattern });
    }
    currentWordChars.push(decodedChar);

    // Trailing space check
    if (i + 1 >= morse.length) {
      return err({ code: 'MALFORMED_SEPARATOR', index: i });
    }

    const nextCh = morse[i + 1];
    if (nextCh === ' ') {
      // Double space
      return err({ code: 'MALFORMED_SEPARATOR', index: i + 1 });
    }

    if (nextCh === '/') {
      const slashIndex = i + 1;
      const afterSlash = morse[i + 2];
      if (afterSlash === undefined || afterSlash !== ' ') {
        return err({ code: 'MALFORMED_SEPARATOR', index: slashIndex });
      }

      // Valid " / " sequence found: close current word
      words.push(currentWordChars.join(''));
      currentWordChars = [];

      // Trailing space after slash check
      if (i + 3 >= morse.length) {
        return err({ code: 'MALFORMED_SEPARATOR', index: i + 2 });
      }

      const nextLetterStart = morse[i + 3];
      if (nextLetterStart === ' ' || nextLetterStart === '/') {
        return err({ code: 'MALFORMED_SEPARATOR', index: i + 3 });
      }

      if (nextLetterStart !== '.' && nextLetterStart !== '-') {
        return err({
          code: 'INVALID_SYMBOL',
          index: i + 3,
          symbol: nextLetterStart ?? '',
        });
      }

      patternStart = i + 3;
      i = i + 3;
      continue;
    }

    if (nextCh !== '.' && nextCh !== '-') {
      return err({
        code: 'INVALID_SYMBOL',
        index: i + 1,
        symbol: nextCh ?? '',
      });
    }

    patternStart = i + 1;
    i = i + 1;
  }

  // End of input: decode final accumulated pattern
  const finalPattern = morse.slice(patternStart, morse.length);
  const finalDecodedChar = REVERSE_MORSE_TABLE[finalPattern];
  if (finalDecodedChar === undefined) {
    return err({
      code: 'UNKNOWN_PATTERN',
      index: patternStart,
      pattern: finalPattern,
    });
  }
  currentWordChars.push(finalDecodedChar);
  words.push(currentWordChars.join(''));

  return ok(words.join(' '));
}
