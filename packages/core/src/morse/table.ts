// ITU-R M.1677-1 (subset)
/**
 * International Morse code mapping based on ITU-R M.1677-1 (subset).
 * Maps uppercase ASCII alphanumeric characters and 13 standard punctuation marks to their Morse pattern.
 * Single source of truth containing exactly 49 entries.
 */
export const MORSE_TABLE: Readonly<Record<string, string>> = {
  // Letters (26)
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',

  // Digits (10)
  '0': '-----',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',

  // Punctuation (13)
  '.': '.-.-.-',
  ',': '--..--',
  ':': '---...',
  '?': '..--..',
  "'": '.----.',
  '-': '-....-',
  '/': '-..-.',
  '(': '-.--.',
  ')': '-.--.-',
  '"': '.-..-.',
  '=': '-...-',
  '+': '.-.-.',
  '@': '.--.-.',
} as const;

/**
 * Reverse mapping from Morse code patterns to their corresponding uppercase character.
 * Generated from MORSE_TABLE to preserve a single source of truth.
 */
export const REVERSE_MORSE_TABLE: Readonly<Record<string, string>> = Object.freeze(
  Object.entries(MORSE_TABLE).reduce<Record<string, string>>((acc, [char, pattern]) => {
    acc[pattern] = char;
    return acc;
  }, {}),
);
