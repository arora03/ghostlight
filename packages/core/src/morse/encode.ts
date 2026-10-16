import { err, ok, type Result } from '../result.js';
import { MORSE_TABLE } from './table.js';

/**
 * Error returned when the input text is empty or contains only whitespace characters.
 */
export interface EmptyMessageError {
  readonly code: 'EMPTY_MESSAGE';
}

/**
 * Representation of an individual unsupported character and its UTF-16 index.
 */
export interface UnsupportedCharacter {
  readonly char: string;
  readonly index: number;
}

/**
 * Error returned when input text contains characters outside the Morse reference table.
 */
export interface UnsupportedCharactersError {
  readonly code: 'UNSUPPORTED_CHARACTERS';
  readonly characters: readonly UnsupportedCharacter[];
}

/**
 * Union of possible error representations when encoding text to Morse code.
 */
export type EncodeError = EmptyMessageError | UnsupportedCharactersError;

/**
 * Case-folds only ASCII lowercase characters 'a'-'z' to 'A'-'Z'.
 * All other characters (including accented, Unicode, or non-ASCII characters) are returned unchanged.
 *
 * @param char - The character string to inspect.
 * @returns The uppercase ASCII character if in 'a'-'z', otherwise the original character unchanged.
 */
function foldAscii(char: string): string {
  if (char.length === 1) {
    const code = char.charCodeAt(0);
    if (code >= 0x61 && code <= 0x7a) {
      return String.fromCharCode(code - 0x20);
    }
  }
  return char;
}

/**
 * Checks whether a Unicode code point is one of the four allowed whitespace characters:
 * - U+0020 (space)
 * - U+0009 (horizontal tab)
 * - U+000A (line feed)
 * - U+000D (carriage return)
 *
 * No other characters (e.g. U+00A0 non-breaking space, U+200B zero-width space) are considered whitespace.
 *
 * @param codePoint - The code point to test.
 * @returns True if the code point matches one of the four allowed whitespace characters.
 */
function isAllowedWhitespace(codePoint: number): boolean {
  return (
    codePoint === 0x0020 || codePoint === 0x0009 || codePoint === 0x000a || codePoint === 0x000d
  );
}

/**
 * Encodes plain text into standard Morse code representation in a single pass.
 *
 * Rules:
 * - Only ASCII 'a'-'z' are case-folded to 'A'-'Z'. Arbitrary characters are NOT converted via toUpperCase();
 *   all other characters are looked up exactly as given.
 * - Table membership is determined exclusively via Object.hasOwn(MORSE_TABLE, key).
 * - Whitespace consists strictly of: U+0020 (space), U+0009 (tab), U+000A (line feed), and U+000D (carriage return).
 *   Any run of these whitespace characters acts as a word gap, and leading/trailing whitespace is ignored.
 * - All other characters (including non-breaking space U+00A0, zero-width space U+200B, and Unicode letters like
 *   "ı", "ſ", "ß", "Ａ") are treated as non-table characters and reported in `UNSUPPORTED_CHARACTERS` with their UTF-16 index.
 * - Empty or whitespace-only input returns `EMPTY_MESSAGE`.
 *
 * @param text - The plain text string to encode.
 * @returns A Result containing the encoded Morse string on success, or an EncodeError on failure.
 */
export function encodeText(text: string): Result<string, EncodeError> {
  const unsupportedCharacters: UnsupportedCharacter[] = [];
  const encodedWords: string[] = [];
  let currentWordLetters: string[] = [];
  let inWhitespace = true; // Starts true to ignore leading whitespace
  let hasNonWhitespace = false;

  let i = 0;
  while (i < text.length) {
    const codePoint = text.codePointAt(i);
    if (codePoint === undefined) {
      break;
    }
    const char = String.fromCodePoint(codePoint);
    const charLength = char.length; // 1 for BMP, 2 for surrogate pair

    if (isAllowedWhitespace(codePoint)) {
      if (!inWhitespace) {
        if (currentWordLetters.length > 0) {
          encodedWords.push(currentWordLetters.join(' '));
          currentWordLetters = [];
        }
        inWhitespace = true;
      }
    } else {
      hasNonWhitespace = true;
      inWhitespace = false;

      const lookupChar = foldAscii(char);

      if (Object.hasOwn(MORSE_TABLE, lookupChar)) {
        const pattern = MORSE_TABLE[lookupChar];
        if (pattern === undefined) {
          throw new Error(
            `Internal invariant violation: pattern for character "${lookupChar}" is undefined despite Object.hasOwn returning true.`,
          );
        }
        currentWordLetters.push(pattern);
      } else {
        unsupportedCharacters.push({ char, index: i });
      }
    }

    i += charLength;
  }

  // Push final word if ending on non-whitespace
  if (currentWordLetters.length > 0) {
    encodedWords.push(currentWordLetters.join(' '));
    currentWordLetters = [];
  }

  if (!hasNonWhitespace) {
    return err({ code: 'EMPTY_MESSAGE' });
  }

  if (unsupportedCharacters.length > 0) {
    return err({
      code: 'UNSUPPORTED_CHARACTERS',
      characters: unsupportedCharacters,
    });
  }

  return ok(encodedWords.join(' / '));
}
