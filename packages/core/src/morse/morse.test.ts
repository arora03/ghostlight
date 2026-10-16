import { describe, expect, it } from 'vitest';
import { decodeMorse } from './decode.js';
import { encodeText } from './encode.js';
import { MORSE_TABLE } from './table.js';

// Mulberry32 seeded pseudo-random number generator
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function (): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('Morse Table', () => {
  it('has exactly 49 entries, every pattern matches /^[.-]+$/, and all patterns are unique', () => {
    const entries = Object.entries(MORSE_TABLE);
    expect(entries).toHaveLength(49);

    const patterns = entries.map(([, pattern]) => pattern);
    for (const pattern of patterns) {
      expect(pattern).toMatch(/^[.-]+$/);
    }

    const uniquePatterns = new Set(patterns);
    expect(uniquePatterns.size).toBe(49);
  });

  it('matches an independent reference table entry by entry', () => {
    // Independent literal reference table - do NOT import from table.ts
    const REFERENCE_TABLE: Record<string, string> = {
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
    };

    expect(Object.keys(REFERENCE_TABLE)).toHaveLength(49);
    for (const [char, expectedPattern] of Object.entries(REFERENCE_TABLE)) {
      expect(MORSE_TABLE[char]).toBe(expectedPattern);
    }
  });
});

describe('Known Vectors', () => {
  it('encodes and decodes "SOS"', () => {
    const enc = encodeText('SOS');
    expect(enc).toEqual({ ok: true, value: '... --- ...' });
    if (enc.ok) {
      const dec = decodeMorse(enc.value);
      expect(dec).toEqual({ ok: true, value: 'SOS' });
    }
  });

  it('encodes and decodes "HELLO WORLD"', () => {
    const enc = encodeText('HELLO WORLD');
    expect(enc).toEqual({
      ok: true,
      value: '.... . .-.. .-.. --- / .-- --- .-. .-.. -..',
    });
    if (enc.ok) {
      const dec = decodeMorse(enc.value);
      expect(dec).toEqual({ ok: true, value: 'HELLO WORLD' });
    }
  });

  it('encodes and decodes "CQ DX"', () => {
    const enc = encodeText('CQ DX');
    expect(enc).toEqual({ ok: true, value: '-.-. --.- / -.. -..-' });
    if (enc.ok) {
      const dec = decodeMorse(enc.value);
      expect(dec).toEqual({ ok: true, value: 'CQ DX' });
    }
  });

  it('encodes "TEST 123" correctly', () => {
    const enc = encodeText('TEST 123');
    expect(enc).toEqual({
      ok: true,
      value: '- . ... - / .---- ..--- ...--',
    });
    if (enc.ok) {
      const dec = decodeMorse(enc.value);
      expect(dec).toEqual({ ok: true, value: 'TEST 123' });
    }
  });

  it('encodes "A.B" correctly', () => {
    const enc = encodeText('A.B');
    expect(enc).toEqual({
      ok: true,
      value: '.- .-.-.- -...',
    });
    if (enc.ok) {
      const dec = decodeMorse(enc.value);
      expect(dec).toEqual({ ok: true, value: 'A.B' });
    }
  });
});

describe('Round-Trip Property', () => {
  it('round-trips every individual character in the table', () => {
    for (const char of Object.keys(MORSE_TABLE)) {
      const enc = encodeText(char);
      expect(enc.ok).toBe(true);
      if (enc.ok) {
        const dec = decodeMorse(enc.value);
        expect(dec.ok).toBe(true);
        if (dec.ok) {
          expect(dec.value).toBe(char);
        }
      }
    }
  });

  it('round-trips 250 deterministic pseudo-random valid strings', () => {
    const rng = mulberry32(0x1337cafe);
    const validChars = Object.keys(MORSE_TABLE);

    for (let testIdx = 0; testIdx < 250; testIdx++) {
      // 1 to 6 words per string
      const numWords = 1 + Math.floor(rng() * 6);
      const words: string[] = [];

      for (let w = 0; w < numWords; w++) {
        // 1 to 8 characters per word
        const wordLen = 1 + Math.floor(rng() * 8);
        let word = '';
        for (let c = 0; c < wordLen; c++) {
          const charIdx = Math.floor(rng() * validChars.length);
          const pickedChar = validChars[charIdx] ?? 'A';
          word += pickedChar;
        }
        words.push(word);
      }

      const originalText = words.join(' ');
      const enc = encodeText(originalText);
      expect(enc.ok).toBe(true);
      if (enc.ok) {
        const dec = decodeMorse(enc.value);
        expect(dec.ok).toBe(true);
        if (dec.ok) {
          expect(dec.value).toBe(originalText);
        }
      }
    }
  });
});

describe('Encoder Edge Cases', () => {
  describe('Unicode and non-ASCII character handling', () => {
    it('rejects dotless i "ı" (U+0131) as unsupported', () => {
      const enc = encodeText('ı');
      expect(enc).toEqual({
        ok: false,
        error: {
          code: 'UNSUPPORTED_CHARACTERS',
          characters: [{ char: 'ı', index: 0 }],
        },
      });
    });

    it('rejects long s "ſ" (U+017F) as unsupported', () => {
      const enc = encodeText('ſ');
      expect(enc).toEqual({
        ok: false,
        error: {
          code: 'UNSUPPORTED_CHARACTERS',
          characters: [{ char: 'ſ', index: 0 }],
        },
      });
    });

    it('rejects German eszett "ß" as unsupported', () => {
      const enc = encodeText('ß');
      expect(enc).toEqual({
        ok: false,
        error: {
          code: 'UNSUPPORTED_CHARACTERS',
          characters: [{ char: 'ß', index: 0 }],
        },
      });
    });

    it('rejects fullwidth Latin "Ａ" (U+FF21) as unsupported', () => {
      const enc = encodeText('Ａ');
      expect(enc).toEqual({
        ok: false,
        error: {
          code: 'UNSUPPORTED_CHARACTERS',
          characters: [{ char: 'Ａ', index: 0 }],
        },
      });
    });

    it('rejects non-breaking space U+00A0 between two valid words', () => {
      const enc = encodeText('HELLO\u00A0WORLD');
      expect(enc).toEqual({
        ok: false,
        error: {
          code: 'UNSUPPORTED_CHARACTERS',
          characters: [{ char: '\u00A0', index: 5 }],
        },
      });
    });

    it('rejects zero-width space U+200B as unsupported', () => {
      const enc = encodeText('A\u200BB');
      expect(enc).toEqual({
        ok: false,
        error: {
          code: 'UNSUPPORTED_CHARACTERS',
          characters: [{ char: '\u200B', index: 1 }],
        },
      });
    });

    it('still encodes all lowercase ASCII a-z', () => {
      const lower = 'abcdefghijklmnopqrstuvwxyz';
      const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const encLower = encodeText(lower);
      const encUpper = encodeText(upper);
      expect(encLower.ok).toBe(true);
      expect(encUpper.ok).toBe(true);
      expect(encLower).toEqual(encUpper);
    });

    it('reports both bad characters with correct UTF-16 indices when mixing valid text, "ı" and an emoji', () => {
      const enc = encodeText('AıB😀C');
      expect(enc).toEqual({
        ok: false,
        error: {
          code: 'UNSUPPORTED_CHARACTERS',
          characters: [
            { char: 'ı', index: 1 },
            { char: '😀', index: 3 },
          ],
        },
      });
    });
  });

  it('handles lowercase input correctly', () => {
    const enc = encodeText('hello world');
    expect(enc).toEqual({
      ok: true,
      value: '.... . .-.. .-.. --- / .-- --- .-. .-.. -..',
    });
  });

  it('collapses tabs, newlines, and multiple spaces into one word gap', () => {
    const enc = encodeText('HELLO\t\t\n\n  WORLD');
    expect(enc).toEqual({
      ok: true,
      value: '.... . .-.. .-.. --- / .-- --- .-. .-.. -..',
    });
  });

  it('ignores leading and trailing whitespace', () => {
    const enc = encodeText('   \t\nSOS\n\t   ');
    expect(enc).toEqual({ ok: true, value: '... --- ...' });
  });

  it('returns EMPTY_MESSAGE on empty string', () => {
    const enc = encodeText('');
    expect(enc).toEqual({
      ok: false,
      error: { code: 'EMPTY_MESSAGE' },
    });
  });

  it('returns EMPTY_MESSAGE on whitespace-only string', () => {
    const enc = encodeText('   \t\n\r  ');
    expect(enc).toEqual({
      ok: false,
      error: { code: 'EMPTY_MESSAGE' },
    });
  });

  it('reports all unsupported characters with correct UTF-16 indices', () => {
    const enc = encodeText('A#B$C%');
    expect(enc).toEqual({
      ok: false,
      error: {
        code: 'UNSUPPORTED_CHARACTERS',
        characters: [
          { char: '#', index: 1 },
          { char: '$', index: 3 },
          { char: '%', index: 5 },
        ],
      },
    });
  });

  it('reports an emoji as unsupported with correct index', () => {
    const enc = encodeText('A😀B');
    expect(enc).toEqual({
      ok: false,
      error: {
        code: 'UNSUPPORTED_CHARACTERS',
        characters: [{ char: '😀', index: 1 }],
      },
    });
  });

  it('reports accented character "é" as unsupported with correct index', () => {
    const enc = encodeText('café');
    expect(enc).toEqual({
      ok: false,
      error: {
        code: 'UNSUPPORTED_CHARACTERS',
        characters: [{ char: 'é', index: 3 }],
      },
    });
  });
});

describe('Decoder Edge Cases', () => {
  it('returns EMPTY_INPUT on empty string', () => {
    const dec = decodeMorse('');
    expect(dec).toEqual({
      ok: false,
      error: { code: 'EMPTY_INPUT' },
    });
  });

  it('returns INVALID_SYMBOL when non-Morse symbol is encountered', () => {
    const dec = decodeMorse('... $ ...');
    expect(dec).toEqual({
      ok: false,
      error: { code: 'INVALID_SYMBOL', index: 4, symbol: '$' },
    });
  });

  it('returns INVALID_SYMBOL for symbol at index 0', () => {
    const dec = decodeMorse('HELLO');
    expect(dec).toEqual({
      ok: false,
      error: { code: 'INVALID_SYMBOL', index: 0, symbol: 'H' },
    });
  });

  it('returns INVALID_SYMBOL for symbol following word slash', () => {
    const dec = decodeMorse('... / @');
    expect(dec).toEqual({
      ok: false,
      error: { code: 'INVALID_SYMBOL', index: 6, symbol: '@' },
    });
  });

  describe('MALFORMED_SEPARATOR sub-cases', () => {
    it('detects leading space', () => {
      const dec = decodeMorse(' ...');
      expect(dec).toEqual({
        ok: false,
        error: { code: 'MALFORMED_SEPARATOR', index: 0 },
      });
    });

    it('detects trailing space', () => {
      const dec = decodeMorse('... ');
      expect(dec).toEqual({
        ok: false,
        error: { code: 'MALFORMED_SEPARATOR', index: 3 },
      });
    });

    it('detects double space', () => {
      const dec = decodeMorse('...  ---');
      expect(dec).toEqual({
        ok: false,
        error: { code: 'MALFORMED_SEPARATOR', index: 4 },
      });
    });

    it('detects slash without leading space', () => {
      const dec = decodeMorse('.../---');
      expect(dec).toEqual({
        ok: false,
        error: { code: 'MALFORMED_SEPARATOR', index: 3 },
      });
    });

    it('detects slash without leading space even if followed by space', () => {
      const dec = decodeMorse('.../ ---');
      expect(dec).toEqual({
        ok: false,
        error: { code: 'MALFORMED_SEPARATOR', index: 3 },
      });
    });

    it('detects slash without trailing space', () => {
      const dec = decodeMorse('... /---');
      expect(dec).toEqual({
        ok: false,
        error: { code: 'MALFORMED_SEPARATOR', index: 4 },
      });
    });

    it('detects leading slash without surrounding spaces', () => {
      const dec = decodeMorse('/ ...');
      expect(dec).toEqual({
        ok: false,
        error: { code: 'MALFORMED_SEPARATOR', index: 0 },
      });
    });

    it('detects trailing slash', () => {
      const dec = decodeMorse('... /');
      expect(dec).toEqual({
        ok: false,
        error: { code: 'MALFORMED_SEPARATOR', index: 4 },
      });
    });

    it('detects empty word after slash (trailing space)', () => {
      const dec = decodeMorse('... / ');
      expect(dec).toEqual({
        ok: false,
        error: { code: 'MALFORMED_SEPARATOR', index: 5 },
      });
    });

    it('detects empty word between slashes', () => {
      const dec = decodeMorse('... / / ...');
      expect(dec).toEqual({
        ok: false,
        error: { code: 'MALFORMED_SEPARATOR', index: 6 },
      });
    });

    it('detects double space after slash', () => {
      const dec = decodeMorse('... /  ...');
      expect(dec).toEqual({
        ok: false,
        error: { code: 'MALFORMED_SEPARATOR', index: 6 },
      });
    });
  });

  describe('UNKNOWN_PATTERN', () => {
    it('detects single unknown pattern at start of input', () => {
      const dec = decodeMorse('....-....');
      expect(dec).toEqual({
        ok: false,
        error: {
          code: 'UNKNOWN_PATTERN',
          index: 0,
          pattern: '....-....',
        },
      });
    });

    it('detects unknown pattern in the middle of a string with correct index', () => {
      const dec = decodeMorse('... ....-.... ---');
      expect(dec).toEqual({
        ok: false,
        error: {
          code: 'UNKNOWN_PATTERN',
          index: 4,
          pattern: '....-....',
        },
      });
    });

    it('detects unknown pattern at the end of input', () => {
      const dec = decodeMorse('... ....-....');
      expect(dec).toEqual({
        ok: false,
        error: {
          code: 'UNKNOWN_PATTERN',
          index: 4,
          pattern: '....-....',
        },
      });
    });
  });
});
