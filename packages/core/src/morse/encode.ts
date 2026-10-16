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
 * Encodes plain text into standard Morse code representation.
 *
 * Requirements:
 * - Case-insensitive (converted to uppercase).
 * - Whitespace runs (space, tab, newline) collapse into a single word separator (" / ").
 * - Leading and trailing whitespace is ignored.
 * - Empty or whitespace-only strings return `EMPTY_MESSAGE`.
 * - Unsupported characters return `UNSUPPORTED_CHARACTERS` with all occurrences and UTF-16 indices.
 *
 * @param text - The plain text string to encode.
 * @returns A Result containing the encoded Morse string on success, or an EncodeError on failure.
 */
export function encodeText(text: string): Result<string, EncodeError> {
  // Reject empty or whitespace-only input
  if (text.trim().length === 0) {
    return err({ code: 'EMPTY_MESSAGE' });
  }

  // Scan entire text for unsupported characters, capturing accurate UTF-16 indices
  const unsupportedCharacters: UnsupportedCharacter[] = [];
  let i = 0;
  while (i < text.length) {
    const codePoint = text.codePointAt(i);
    if (codePoint === undefined) {
      break;
    }
    const char = String.fromCodePoint(codePoint);
    const charLength = char.length; // 1 for BMP, 2 for surrogate pair

    // Check non-whitespace characters against the reference table
    if (!/\s/.test(char)) {
      const upperChar = char.toUpperCase();
      if (!(upperChar in MORSE_TABLE)) {
        unsupportedCharacters.push({ char, index: i });
      }
    }

    i += charLength;
  }

  if (unsupportedCharacters.length > 0) {
    return err({
      code: 'UNSUPPORTED_CHARACTERS',
      characters: unsupportedCharacters,
    });
  }

  // Split into words, collapsing whitespace runs and ignoring leading/trailing whitespace
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);
  const encodedWords: string[] = [];

  for (const word of words) {
    const encodedLetters: string[] = [];
    for (const char of word) {
      const upper = char.toUpperCase();
      const pattern = MORSE_TABLE[upper];
      if (pattern !== undefined) {
        encodedLetters.push(pattern);
      }
    }
    encodedWords.push(encodedLetters.join(' '));
  }

  return ok(encodedWords.join(' / '));
}
